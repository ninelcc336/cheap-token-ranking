import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePlan, getRankedPlans, plans } from './plans';

test('初始方案会按未四舍五入的每元有效额度降序排列', () => {
  const ranked = getRankedPlans();

  assert.equal(ranked.length, 11);
  assert.equal(ranked[0]?.name, 'token bank plus');
  assert.equal(ranked[0]?.valuePerYuan, 10);
  assert.equal(ranked.at(-1)?.name, 'vibecc');
  assert.equal(ranked.at(-1)?.valuePerYuan, 2.4);
  assert.ok(ranked.every((plan, index) => index === 0 || plan.valuePerYuan <= ranked[index - 1]!.valuePerYuan));
});

test('金额或倍率不合法的方案不参与排名，但计算结果会标记为不可排名', () => {
  const invalidPlan = { ...plans[0]!, rechargeAmount: 0 };
  const calculated = calculatePlan(invalidPlan);

  assert.equal(calculated.isRankable, false);
  assert.equal(calculated.effectiveAmount, 0);
  assert.equal(getRankedPlans([invalidPlan]).length, 0);
});

test('非有限数值不会产生 Infinity 或 NaN 并进入排名', () => {
  const invalidPlan = { ...plans[0]!, multiplier: Number.NaN };
  const calculated = calculatePlan(invalidPlan);

  assert.equal(calculated.isRankable, false);
  assert.equal(calculated.valuePerYuan, 0);
  assert.equal(getRankedPlans([invalidPlan]).length, 0);
});
