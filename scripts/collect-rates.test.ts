import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeSuccessfulOverrides,
  parseSub2ApiGroups,
} from './collect-rates';
import type { CollectionResult } from './collect-rates';
import type { Sub2ApiSourceConfig } from './rate-sources';

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
