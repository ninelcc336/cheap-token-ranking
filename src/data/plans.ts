export type PlanStatus = 'active' | 'expired' | 'unknown';

export type PlanType = 'Token' | 'Code' | '其他';

/**
 * 排行榜的数据源契约，只保存可追溯的原始字段，不把计算结果写回数据文件。
 * 充值金额按人民币记录，面值按美元记录；倍率和金额必须在计算前经过正数校验。
 */
export interface Plan {
  name: string;
  type: PlanType;
  rechargeAmount: number;
  faceValue: number;
  multiplier: number;
  source: string;
  measuredAt: string;
  notes: string;
  status: PlanStatus;
}

export interface CalculatedPlan extends Plan {
  effectiveAmount: number;
  valuePerYuan: number;
  rank: number;
  isRankable: boolean;
}

const initialMeasuredAt = '2026-08-28';

/**
 * 初始方案清单。这里刻意不保存有效额度、性价比或排名，避免修改原始数据时留下过期结果。
 * 类型依据方案名称中的产品线作最小归类，状态在未完成人工核验前保持 unknown。
 */
export const plans: Plan[] = [
  {
    name: 'token bank plus',
    type: 'Token',
    rechargeAmount: 1,
    faceValue: 1,
    multiplier: 0.1,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: '259',
    type: 'Token',
    rechargeAmount: 1,
    faceValue: 1,
    multiplier: 0.158,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'code for plus 140元',
    type: 'Code',
    rechargeAmount: 140,
    faceValue: 1000,
    multiplier: 1.2,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'code for plus',
    type: 'Code',
    rechargeAmount: 15,
    faceValue: 100,
    multiplier: 1.2,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: '259 Pro',
    type: 'Token',
    rechargeAmount: 1,
    faceValue: 1,
    multiplier: 0.189,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'code for pro 140元',
    type: 'Code',
    rechargeAmount: 140,
    faceValue: 1000,
    multiplier: 1.4,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'token bank pro',
    type: 'Token',
    rechargeAmount: 1,
    faceValue: 1,
    multiplier: 0.2,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'code for pro',
    type: 'Code',
    rechargeAmount: 15,
    faceValue: 100,
    multiplier: 1.4,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'pinai 2.5',
    type: 'Token',
    rechargeAmount: 10,
    faceValue: 100,
    multiplier: 2.5,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'pinai 3.0',
    type: 'Token',
    rechargeAmount: 10,
    faceValue: 100,
    multiplier: 3,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
  {
    name: 'vibecc',
    type: 'Token',
    rechargeAmount: 10,
    faceValue: 120,
    multiplier: 5,
    source: '用户提供（待核验）',
    measuredAt: initialMeasuredAt,
    notes: '初始数据，待补充官方说明。',
    status: 'unknown',
  },
];

/**
 * 计算单个方案的有效额度和每元有效额度；金额或倍率无效时保留方案但禁止其参与正式排名。
 * 这样调用方可以在后台检查异常数据，同时页面不会把无意义的 Infinity/NaN 展示给用户。
 */
export function calculatePlan(plan: Plan, rank = 0): CalculatedPlan {
  const isRankable =
    Number.isFinite(plan.faceValue) &&
    Number.isFinite(plan.rechargeAmount) &&
    Number.isFinite(plan.multiplier) &&
    plan.rechargeAmount > 0 &&
    plan.multiplier > 0;
  const effectiveAmount = isRankable ? plan.faceValue / plan.multiplier : 0;
  const valuePerYuan = isRankable ? effectiveAmount / plan.rechargeAmount : 0;

  return {
    ...plan,
    effectiveAmount,
    valuePerYuan,
    rank,
    isRankable,
  };
}

/**
 * 按未四舍五入的每元有效额度降序排名，排名只对金额和倍率都为正数的方案生成。
 * 同分时使用名称作为稳定的次级排序，避免数据顺序变化导致页面反复跳动。
 */
export function getRankedPlans(sourcePlans: Plan[] = plans): CalculatedPlan[] {
  return sourcePlans
    .map((plan) => calculatePlan(plan))
    .filter((plan) => plan.isRankable)
    .sort((left, right) => {
      const valueDifference = right.valuePerYuan - left.valuePerYuan;
      return valueDifference || left.name.localeCompare(right.name, 'en');
    })
    .map((plan, index) => ({ ...plan, rank: index + 1 }));
}

/**
 * 从原始方案中提取筛选器选项并保持首次出现顺序，避免页面层重复维护类型名单。
 */
export function getAvailableTypes(sourcePlans: Plan[] = plans): PlanType[] {
  return [...new Set(sourcePlans.map((plan) => plan.type))];
}

/**
 * 返回数据集中的最新测评日期；空数据集使用短横线，避免模板访问 undefined。
 */
export function getLatestMeasuredDate(sourcePlans: Plan[] = plans): string {
  return sourcePlans.reduce((latest, plan) => (plan.measuredAt > latest ? plan.measuredAt : latest), '');
}

/**
 * 统一页面上的数值精度；计算和排序仍使用原始 JavaScript 数值，不受展示四舍五入影响。
 */
export function formatMetric(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}
