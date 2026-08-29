import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculatePlan,
  expandPlans,
  getAvailableChannels,
  getAvailableModels,
  getRankedPlans,
  modelRates,
  rechargeOffers,
  stations,
} from './plans';

test('三层数据目录会展开为正确数量的模型与充值组合', () => {
  const expanded = expandPlans();

  assert.equal(stations.length, 7);
  assert.equal(rechargeOffers.length, 8);
  assert.equal(modelRates.length, 42);
  assert.equal(expanded.length, 46);
  assert.deepEqual(getAvailableModels(), ['GPT', 'Claude', 'Grok']);
});

test('GPT 与 Claude 分别生成独立排名', () => {
  const expanded = expandPlans();
  const gptRanked = getRankedPlans('GPT', expanded);
  const claudeRanked = getRankedPlans('Claude', expanded);
  const ccvibeOneM = claudeRanked.find((plan) => plan.stationName === 'ccvibe' && plan.channel === '1M');
  const codexKiroBundle = claudeRanked.find(
    (plan) => plan.stationId === 'codex-for' && plan.channel === 'kiro' && plan.offerKind === 'bundle',
  );

  assert.equal(gptRanked.length, 15);
  assert.equal(claudeRanked.length, 23);
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

  const rightCodeGptPro = gptRanked.find((plan) => plan.stationId === 'right-code' && plan.channel === 'Pro');
  const rightCodeClaudeAws = claudeRanked.find((plan) => plan.stationId === 'right-code' && plan.channel === 'aws');
  assert.equal(rightCodeGptPro?.faceValue, 1);
  assert.equal(rightCodeGptPro?.multiplier, 0.4);
  assert.equal(rightCodeGptPro?.valuePerYuan, 2.5);
  assert.equal(rightCodeClaudeAws?.multiplier, 0.3);
  assert.equal(rightCodeClaudeAws?.valuePerYuan, 10 / 3);
});

test('Grok 倍率覆盖新旧站点并按充值档位展开', () => {
  const grokRanked = getRankedPlans('Grok');

  assert.equal(grokRanked.length, 8);
  assert.ok(grokRanked.every((plan) => plan.model === 'Grok'));
  assert.equal(grokRanked[0]?.stationId, 'right-code');
  assert.equal(grokRanked[0]?.channel, '未知');
  assert.equal(grokRanked[0]?.valuePerYuan, 1 / 0.1);
  assert.equal(grokRanked.filter((plan) => plan.stationId === 'codex-for').length, 2);
  assert.deepEqual(getAvailableChannels(modelRates, 'Grok'), ['未知', 'Heavy', '官方']);
});

test('渠道筛选项按模型隔离', () => {
  const gptChannels = getAvailableChannels(modelRates, 'GPT');
  const claudeChannels = getAvailableChannels(modelRates, 'Claude');

  assert.deepEqual(gptChannels, ['Plus', 'Pro']);
  assert.deepEqual(claudeChannels, [
    'kiro',
    'max',
    'aws',
    'cursor',
    'max稳定',
    '1M稳定',
    '1M',
    '反重力',
    '高缓',
    '官方',
    '特惠',
  ]);
});

test('Claude 倍率目录完整保留用户提供的参数', () => {
  const claudeRates = modelRates
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
    ['token-bank', 'kiro', 0.1],
    ['token-bank', 'kiro', 0.25],
    ['token-bank', 'max', 0.95],
    ['259ai', 'max', 1.08],
    ['259ai', 'max稳定', 1.28],
    ['259ai', '反重力', 0.58],
    ['259ai', '高缓', 0.38],
    ['galaxy', 'kiro', 1.3],
    ['galaxy', 'max', 12],
    ['right-code', '官方', 2],
    ['right-code', '特惠', 1.5],
    ['right-code', 'aws', 0.3],
  ]);
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
