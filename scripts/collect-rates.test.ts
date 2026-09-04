import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeSuccessfulOverrides,
  parseRightCodeUpstreams,
  parseSub2ApiGroups,
} from './collect-rates';
import type { CollectionResult } from './collect-rates';
import type { RightCodeSourceConfig, Sub2ApiSourceConfig } from './rate-sources';

const sub2ApiConfig: Sub2ApiSourceConfig = {
  adapter: 'sub2api',
  stationId: 'token-bank',
  name: 'bank of token',
  baseUrl: 'https://api.boft.ai',
  tokenEnv: 'RATE_TOKEN_BANK',
  platformModelMap: {
    openai: 'GPT',
    anthropic: 'Claude',
  },
};

const rightCodeConfig: RightCodeSourceConfig = {
  adapter: 'right-code',
  stationId: 'right-code',
  name: 'Right Code',
  baseUrl: 'https://www.rightapi.ai',
  rules: [
    { match: '^Codex$', model: 'GPT', channel: 'Pro' },
    { match: '^Claude\\s+awsq$', model: 'Claude', channel: 'aws' },
    { match: '^Claude\\s+官方渠道$', model: 'Claude', channel: '官方' },
    { match: '^Grok', model: 'Grok', channel: '未知' },
  ],
  fallbackTypeModelMap: {
    responses: 'GPT',
    completions: 'GPT',
    messages: 'Claude',
    gemini: 'Gemini',
  },
  excludeNamePattern: 'deepseek|画图|绘图|draw|image|tts|audio|embedding|rerank|video',
};

test('Sub2API 分组响应会解包、映射模型并保留字符串倍率', () => {
  const rows = parseSub2ApiGroups(
    {
      code: 0,
      data: [
        { id: 11, name: 'Plus', platform: 'openai', rate_multiplier: '0.12' },
        { id: 12, name: 'kiro', platform: 'anthropic', rate_multiplier: 0.35 },
        { id: 13, name: '未配置平台', platform: 'deepseek', rate_multiplier: 1 },
      ],
    },
    sub2ApiConfig,
    '2026-09-04',
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => [row.model, row.channel, row.multiplier]),
    [
      ['GPT', 'Plus', 0.12],
      ['Claude', 'kiro', 0.35],
    ],
  );
  assert.equal(rows[0]?.measuredAt, '2026-09-04');
});

test('分组名命中名称规则时优先于 platform 推断模型族', () => {
  const rows = parseSub2ApiGroups(
    {
      code: 0,
      data: [
        { id: 1, name: 'grok', platform: 'openai', rate_multiplier: 1 },
        { id: 2, name: 'Grok Openai协议', platform: 'openai', rate_multiplier: '3' },
        { id: 3, name: 'Grok 视频', platform: 'openai', rate_multiplier: 1 },
        { id: 4, name: '纯pro渠道', platform: 'openai', rate_multiplier: 1.4 },
      ],
    },
    { ...sub2ApiConfig, nameModelRules: [{ match: 'grok', model: 'Grok' }] },
    '2026-09-04',
  );

  assert.deepEqual(
    rows.map((row) => [row.model, row.channel, row.multiplier]),
    [
      ['Grok', 'grok', 1],
      ['Grok', 'Grok Openai协议', 3],
      ['Grok', 'Grok 视频', 1],
      ['GPT', '纯pro渠道', 1.4],
    ],
  );
});

test('分组名命中排除表的生图渠道不会被采集', () => {
  const rows = parseSub2ApiGroups(
    {
      code: 0,
      data: [
        { id: 1, name: '[GPT] Image2', platform: 'openai', rate_multiplier: 1 },
        { id: 2, name: '生图', platform: 'openai', rate_multiplier: 1.4 },
        { id: 3, name: 'GPT[生图4k]', platform: 'openai', rate_multiplier: 10 },
        { id: 4, name: '[GPT] Plus', platform: 'openai', rate_multiplier: 0.12 },
      ],
    },
    { ...sub2ApiConfig, excludeNamePattern: 'image|生图|绘图|画图|draw' },
    '2026-09-04',
  );

  assert.deepEqual(rows.map((row) => [row.channel, row.multiplier]), [['[GPT] Plus', 0.12]]);
});

test('异常倍率会阻止整个站点覆盖旧快照', () => {
  assert.throws(
    () =>
      parseSub2ApiGroups(
        { data: [{ id: 1, name: 'Pro', platform: 'openai', rate_multiplier: 'not-a-number' }] },
        sub2ApiConfig,
        '2026-09-04',
      ),
    /不是有效的正数字/,
  );
});

test('Right Code 公开 upstream 会按显式规则生成倍率记录', () => {
  const rows = parseRightCodeUpstreams(
    {
      upstreams: [
        { id: 1, name: 'Codex', type: 'responses', rate: 0.4, is_active: true },
        { id: 2, name: 'Claude 官方渠道', type: 'messages', rate: '2', is_active: true },
        { id: 3, name: 'Claude awsq', type: 'messages', rate: 0.3, is_active: true },
        { id: 4, name: 'Grok', type: 'responses', rate: 0.1, is_active: true },
        { id: 5, name: 'Grok 5', type: 'responses', rate: 0.2, is_active: true },
        { id: 6, name: '停用渠道', type: 'responses', rate: 99, is_active: false },
      ],
    },
    rightCodeConfig,
    '2026-09-04',
  );

  assert.deepEqual(
    rows.map((row) => [row.model, row.channel, row.multiplier]),
    [
      ['GPT', 'Pro', 0.4],
      ['Claude', '官方', 2],
      ['Claude', 'aws', 0.3],
      ['Grok', '未知', 0.1],
      ['Grok', '未知', 0.2],
    ],
  );
});

test('Right Code 未命中规则的 upstream 按 type 兜底映射并保留原始名称', () => {
  const rows = parseRightCodeUpstreams(
    {
      upstreams: [
        { id: 1, name: 'Gemini', type: 'gemini', rate: 0.6, is_active: true },
        { id: 2, name: 'DeepSeek V4 - OpenAI格式', type: 'completions', rate: 1, is_active: true },
        { id: 3, name: '画图', type: 'completions', rate: 1, is_active: true },
        { id: 4, name: '神秘渠道', type: 'weird-type', rate: 1, is_active: true },
        { id: 5, name: '', type: 'responses', rate: 1, is_active: true },
      ],
    },
    rightCodeConfig,
    '2026-09-04',
  );

  assert.deepEqual(
    rows.map((row) => [row.model, row.channel, row.multiplier]),
    [['Gemini', 'Gemini', 0.6]],
  );
});

test('合并快照时成功站点替换自身，失败站点保留旧记录', () => {
  const existing = [
    {
      id: 'old-token-bank',
      stationId: 'token-bank',
      model: 'GPT' as const,
      channel: 'Plus',
      multiplier: 0.2,
      source: '旧来源',
      measuredAt: '2026-09-03',
      notes: '',
    },
    {
      id: 'old-ccvibe',
      stationId: 'ccvibe',
      model: 'GPT' as const,
      channel: 'Plus',
      multiplier: 2,
      source: '旧来源',
      measuredAt: '2026-09-03',
      notes: '',
    },
  ];
  const results: CollectionResult[] = [
    {
      stationId: 'token-bank',
      name: 'bank of token',
      status: 'failed',
      overrides: [],
      message: '网络失败',
    },
    {
      stationId: 'ccvibe',
      name: 'ccvibe',
      status: 'success',
      overrides: [
        {
          id: 'new-ccvibe',
          stationId: 'ccvibe',
          model: 'GPT',
          channel: 'Plus',
          multiplier: 1.5,
          source: '新来源',
          measuredAt: '2026-09-04',
          notes: '',
        },
      ],
    },
  ];

  const merged = mergeSuccessfulOverrides(existing, results);
  assert.equal(merged.find((row) => row.stationId === 'token-bank')?.multiplier, 0.2);
  assert.equal(merged.find((row) => row.stationId === 'ccvibe')?.multiplier, 1.5);
});
