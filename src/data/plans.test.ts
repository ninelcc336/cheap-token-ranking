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

  assert.equal(stations.length, 5);
  assert.equal(rechargeOffers.length, 6);
  assert.equal(modelRates.length, 27);
  assert.equal(expanded.length, 30);
  assert.deepEqual(getAvailableModels(), ['GPT', 'Claude']);
});

test('GPT 与 Claude 分别生成独立排名', () => {
  const expanded = expandPlans();
  const gptRanked = getRankedPlans('GPT', expanded);
  const claudeRanked = getRankedPlans('Claude', expanded);
  const ccvibeOneM = claudeRanked.find((plan) => plan.stationName === 'ccvibe' && plan.channel === '1M');
  const codexKiroBundle = claudeRanked.find(
    (plan) => plan.stationId === 'codex-for' && plan.channel === 'kiro' && plan.offerKind === 'bundle',
  );

  assert.equal(gptRanked.length, 12);
  assert.equal(claudeRanked.length, 18);
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
});

test('渠道筛选项按模型隔离', () => {
  const gptChannels = getAvailableChannels(modelRates, 'GPT');
  const claudeChannels = getAvailableChannels(modelRates, 'Claude');

  assert.deepEqual(gptChannels, ['Plus', 'Pro']);
  assert.deepEqual(claudeChannels, ['kiro', 'max', 'aws', 'cursor', 'max稳定', '1M稳定', '1M', '反重力', '高缓']);
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
