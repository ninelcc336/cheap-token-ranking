import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeSuccessfulOverrides,
  parseNewApiPricing,
  parseSub2ApiGroups,
} from './collect-rates';
import type { CollectionResult } from './collect-rates';
import type { NewApiSourceConfig, Sub2ApiSourceConfig } from './rate-sources';

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

const newApiConfig: NewApiSourceConfig = {
  adapter: 'new-api',
  stationId: 'maoai',
  name: '猫艾',
  baseUrl: 'https://api.maoapi.org',
  nameModelRules: [
    { match: 'claude', model: 'Claude' },
    { match: 'grok', model: 'Grok' },
    { match: 'gemini', model: 'Gemini' },
    { match: 'gpt|codex|o[0-9]', model: 'GPT' },
  ],
};

test('new-api pricing 按分组倍率和模型族生成覆盖记录', () => {
  const rows = parseNewApiPricing(
    {
      success: true,
      data: [
        {
          model_name: 'claude-fabel-5',
          enable_groups: ['ccmax', 'claude kiro'],
          group_billing_modes: { ccmax: 'ratio', 'claude kiro': 'ratio' },
        },
        {
          model_name: 'gpt-5.6',
          enable_groups: ['OpenAI稳定通道', 'ccmax'],
          group_billing_modes: { OpenAI稳定通道: 'ratio', ccmax: 'ratio' },
        },
        { model_name: 'deepseek-v4', enable_groups: ['ccmax'], group_billing_modes: { ccmax: 'ratio' } },
      ],
      group_ratio: { ccmax: 0.85, 'claude kiro': 0.2, OpenAI稳定通道: 0.15 },
    },
    newApiConfig,
    '2026-09-05',
  );

  assert.deepEqual(
    rows.map((row) => [row.model, row.channel, row.multiplier]),
    [
      ['Claude', 'ccmax', 0.85],
      ['Claude', 'claude kiro', 0.2],
      ['GPT', 'OpenAI稳定通道', 0.15],
      ['GPT', 'ccmax', 0.85],
    ],
  );
  assert.equal(rows[0]?.source, 'https://api.maoapi.org/api/pricing');
  assert.equal(rows[0]?.measuredAt, '2026-09-05');
});

test('new-api 按次计费分组、排除表分组和未知模型不会采集', () => {
  const rows = parseNewApiPricing(
    {
      success: true,
      data: [
        {
          model_name: 'gemini-3.5-flash',
          enable_groups: ['gemini cli', 'gemini cli 按量', 'image-2生图'],
          group_billing_modes: {
            'gemini cli': 'per_request',
            'gemini cli 按量': 'ratio',
            'image-2生图': 'per_request',
          },
        },
        { model_name: 'kimi-k2', enable_groups: ['ccmax'], group_billing_modes: { ccmax: 'ratio' } },
      ],
      group_ratio: { 'gemini cli': 1, 'gemini cli 按量': 0.45, ccmax: 0.85 },
    },
    { ...newApiConfig, excludeNamePattern: 'image|生图|绘图|画图|draw' },
    '2026-09-05',
  );

  assert.deepEqual(rows.map((row) => [row.model, row.channel, row.multiplier]), [
    ['Gemini', 'gemini cli 按量', 0.45],
  ]);
});

test('new-api 分组全部不可定价时拒绝覆盖旧快照', () => {
  assert.throws(
    () =>
      parseNewApiPricing(
        {
          success: true,
          data: [
            { model_name: 'claude-fabel-5', enable_groups: ['ccmax'], group_billing_modes: { ccmax: 'ratio' } },
          ],
          group_ratio: {},
        },
        newApiConfig,
        '2026-09-05',
      ),
    /没有识别到可定价的文本模型分组/,
  );
});
