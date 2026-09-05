import assert from 'node:assert/strict';
import test from 'node:test';
import autoRateSnapshotJson from './auto-rates.json' with { type: 'json' };
import {
  calculatePlan,
  expandPlans,
  getAvailableChannels,
  getAvailableModels,
  getRankedPlans,
  manualModelRates,
  mergeAutoRateOverrides,
  modelRates,
  rechargeOffers,
  stations,
} from './plans';
import type { AutoRateSnapshot, ModelFamily } from './plans';

const autoRateSnapshot = autoRateSnapshotJson as AutoRateSnapshot;

/**
 * 自动快照会随各站点分组实时变化，因此涉及快照内容的断言一律使用结构不变量；
 * 固定数值断言全部针对人工维护的数据基线（manualModelRates），
 * 保证自动采集刷新数据时测试不会失效。
 */
const manualExpanded = expandPlans(stations, rechargeOffers, manualModelRates);
const baselineModels: ModelFamily[] = ['GPT', 'Claude', 'Grok'];

test('人工维护的三层目录保持完整并展开为基础榜单', () => {
  assert.equal(stations.length, 7);
  assert.equal(rechargeOffers.length, 8);
  assert.equal(manualModelRates.length, 30);
  assert.equal(manualExpanded.length, 34);
  assert.deepEqual(getAvailableModels(manualModelRates), ['GPT', 'Claude', 'Grok']);
});

test('GPT 与 Claude 按人工基线分别生成独立排名', () => {
  const gptRanked = getRankedPlans('GPT', manualExpanded);
  const claudeRanked = getRankedPlans('Claude', manualExpanded);
  const ccvibeOneM = claudeRanked.find((plan) => plan.stationName === 'ccvibe' && plan.channel === '1M');
  const codexKiroBundle = claudeRanked.find(
    (plan) => plan.stationId === 'codex-for' && plan.channel === 'kiro' && plan.offerKind === 'bundle',
  );

  assert.equal(gptRanked.length, 12);
  assert.equal(claudeRanked.length, 16);
  assert.equal(gptRanked[0]?.rank, 1);
  assert.equal(claudeRanked[0]?.rank, 1);
  assert.ok(gptRanked.every((plan) => plan.model === 'GPT'));
  assert.ok(claudeRanked.every((plan) => plan.model === 'Claude'));
  assert.ok(claudeRanked.every((plan, index) => index === 0 || plan.valuePerYuan <= claudeRanked[index - 1]!.valuePerYuan));
  assert.equal(ccvibeOneM?.multiplier, 3);
  assert.equal(ccvibeOneM?.effectiveAmount, 40);
  assert.equal(ccvibeOneM?.valuePerYuan, 4);
  assert.equal(codexKiroBundle?.rechargeAmount, 140);
  assert.equal(codexKiroBundle?.faceValue, 1000);
  assert.equal(codexKiroBundle?.valuePerYuan, 1000 / 1.4 / 140);

  const galaxyGptPlus = gptRanked.find((plan) => plan.stationId === 'galaxy' && plan.channel === 'Plus');
  const galaxyClaudeMax = claudeRanked.find((plan) => plan.stationId === 'galaxy' && plan.channel === 'max');
  assert.equal(galaxyGptPlus?.faceValue, 10);
  assert.equal(galaxyGptPlus?.multiplier, 1);
  assert.equal(galaxyGptPlus?.valuePerYuan, 10);
  assert.equal(galaxyClaudeMax?.multiplier, 12);
  assert.equal(galaxyClaudeMax?.valuePerYuan, 10 / 12);
});

test('Grok 倍率按人工基线覆盖新旧站点并按充值档位展开', () => {
  const grokRanked = getRankedPlans('Grok', manualExpanded);

  assert.equal(grokRanked.length, 6);
  assert.ok(grokRanked.every((plan) => plan.model === 'Grok'));
  assert.equal(grokRanked[0]?.stationId, 'codex-for');
  assert.equal(grokRanked[0]?.channel, '未知');
  assert.equal(grokRanked[0]?.valuePerYuan, 1000 / 140);
  assert.equal(grokRanked.filter((plan) => plan.stationId === 'codex-for').length, 2);
  assert.deepEqual(getAvailableChannels(manualModelRates, 'Grok'), ['Heavy', '官方', '未知']);
});

test('渠道筛选项按模型隔离（人工基线）', () => {
  const gptChannels = getAvailableChannels(manualModelRates, 'GPT');
  const claudeChannels = getAvailableChannels(manualModelRates, 'Claude');

  assert.deepEqual(gptChannels, ['Plus', 'Pro']);
  assert.deepEqual(claudeChannels, [
    'kiro',
    'max',
    'aws',
    'cursor',
    'max稳定',
    '1M稳定',
    '1M',
  ]);
});

test('Claude 倍率目录完整保留用户提供的参数', () => {
  const claudeRates = manualModelRates
    .filter((rate) => rate.model === 'Claude')
    .map((rate) => [rate.stationId, rate.channel, rate.multiplier]);

  assert.deepEqual(claudeRates, [
    ['codex-for', 'kiro', 1.4],
    ['pinai', 'max', 16],
    ['pinai', 'kiro', 5],
    ['pinai', 'aws', 8],
    ['pinai', 'cursor', 5],
    ['ccvibe', 'max', 22],
    ['ccvibe', 'max稳定', 28],
    ['ccvibe', 'aws', 80],
    ['ccvibe', '1M稳定', 5],
    ['ccvibe', '1M', 3],
    ['token-bank', 'kiro', 0.12],
    ['token-bank', 'kiro', 0.35],
    ['token-bank', 'max', 0.95],
    ['galaxy', 'kiro', 1.3],
    ['galaxy', 'max', 12],
  ]);
});

test('合并自动快照后榜单包含全部有效覆盖且展开无丢失', () => {
  const expanded = expandPlans();
  assert.equal(expanded.length, modelRates.reduce((sum, rate) => sum + rate.offerIds.length, 0));

  // 快照里每条有效覆盖都必须出现在合并结果中，防止自动采集的数据被静默丢弃。
  const validStations = new Set(stations.map((station) => station.id));
  autoRateSnapshot.overrides.forEach((override) => {
    if (!validStations.has(override.stationId) || !override.channel?.trim()) return;
    if (!Number.isFinite(override.multiplier) || override.multiplier <= 0) return;
    const collected = modelRates.some(
      (rate) =>
        rate.stationId === override.stationId &&
        rate.model === override.model &&
        rate.channel === override.channel &&
        rate.multiplier === override.multiplier,
    );
    assert.ok(
      collected,
      '快照覆盖未进入榜单：' + override.stationId + ' ' + override.model + ' ' + override.channel,
    );
  });

  // 站点级替换：已被自动采集接管的站点，榜单上只剩与快照一一对应的自动行；
  // 未接管的站点人工数据必须原样保留。
  const coveredStations = new Set<string>();
  autoRateSnapshot.overrides.forEach((override) => {
    if (!validStations.has(override.stationId) || !override.channel?.trim()) return;
    if (!Number.isFinite(override.multiplier) || override.multiplier <= 0) return;
    coveredStations.add(override.stationId);
  });
  coveredStations.forEach((stationId) => {
    const snapshotRowCount = autoRateSnapshot.overrides.filter(
      (override) => override.stationId === stationId,
    ).length;
    const mergedRowCount = modelRates.filter((rate) => rate.stationId === stationId).length;
    assert.equal(mergedRowCount, snapshotRowCount, '站点 ' + stationId + ' 的榜单行数应与快照覆盖一一对应');
  });
  manualModelRates.forEach((rate) => {
    if (coveredStations.has(rate.stationId)) return;
    const present = modelRates.some(
      (merged) =>
        merged.stationId === rate.stationId &&
        merged.model === rate.model &&
        merged.channel === rate.channel,
    );
    assert.ok(present, '未采集站点的人工渠道被删除：' + rate.stationId + ' ' + rate.model + ' ' + rate.channel);
  });

  baselineModels.forEach((model) => {
    assert.ok(getAvailableModels().includes(model));
  });
});

test('快照中的 Gemini 覆盖会进入 Gemini 榜单', () => {
  const geminiRanked = getRankedPlans('Gemini');
  autoRateSnapshot.overrides
    .filter((override) => override.model === 'Gemini')
    .forEach((override) => {
      const collected = geminiRanked.some(
        (plan) =>
          plan.stationId === override.stationId &&
          plan.channel === override.channel &&
          plan.multiplier === override.multiplier,
      );
      assert.ok(collected, 'Gemini 覆盖未进入榜单：' + override.stationId + ' ' + override.channel);
    });
});

test('金额或倍率不合法的展开记录不参与排名', () => {
  const invalidPlan = { ...expandPlans()[0]!, rechargeAmount: 0 };
  const calculated = calculatePlan(invalidPlan);

  assert.equal(calculated.isRankable, false);
  assert.equal(calculated.effectiveAmount, 0);
  assert.equal(getRankedPlans(invalidPlan.model, [invalidPlan]).length, 0);
});

test('非有限数值不会产生 Infinity 或 NaN 并进入排名', () => {
  const invalidPlan = { ...expandPlans()[0]!, multiplier: Number.NaN };
  const calculated = calculatePlan(invalidPlan);

  assert.equal(calculated.isRankable, false);
  assert.equal(calculated.valuePerYuan, 0);
  assert.equal(getRankedPlans(invalidPlan.model, [invalidPlan]).length, 0);
});

test('自动采集接管站点后整体替换人工倍率并保留充值档位', () => {
  const merged = mergeAutoRateOverrides(manualModelRates, [
    {
      stationId: 'ccvibe',
      model: 'GPT',
      channel: 'Pro',
      multiplier: 0.25,
      source: '自动测试源',
      measuredAt: '2026-09-04',
      notes: '测试覆盖',
    },
  ]);

  // 该站点其余人工渠道（包括快照未覆盖的 max）一并移除，避免新旧渠道并存。
  assert.ok(!merged.some((rate) => rate.stationId === 'ccvibe' && rate.channel === 'max'));
  const ccvibeRows = merged.filter((rate) => rate.stationId === 'ccvibe');
  assert.equal(ccvibeRows.length, 1);
  assert.equal(ccvibeRows[0]?.multiplier, 0.25);
  assert.deepEqual(ccvibeRows[0]?.offerIds, ['ccvibe-10']);
  // 30 条人工数据减去 ccvibe 的 8 条人工行，再加上 1 条自动行。
  assert.equal(merged.length, 23);
  // 未被自动采集的站点人工数据原样保留。
  assert.ok(merged.some((rate) => rate.stationId === 'pinai' && rate.channel === 'max'));
});
