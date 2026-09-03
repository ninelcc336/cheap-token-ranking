export type PlanStatus = 'active' | 'expired' | 'unknown';

export type OfferKind = 'standard' | 'bundle';

/** 支持的模型族；暂时没有数据的模型也提前纳入类型，方便后续直接扩展。 */
export type ModelFamily = 'GPT' | 'Claude' | 'Grok' | 'Gemini' | 'Other';

/**
 * 中转站基础目录，只保存名称和站点信息。
 * 充值档位与模型倍率不放在这里，避免同一个站点被重复复制。
 */
export interface Station {
  id: string;
  name: string;
  website: string;
}

/**
 * 充值档位目录，金额和面值是站点的充值事实，不依赖具体模型。
 * modelRates 通过 offerIds 引用它，从而让同一充值档位可以复用于多个模型。
 */
export interface RechargeOffer {
  id: string;
  stationId: string;
  offerKind: OfferKind;
  offerLabel?: string;
  rechargeAmount: number;
  faceValue: number;
  source: string;
  measuredAt: string;
  notes: string;
  status: PlanStatus;
}

/**
 * 模型倍率目录。channel 保留站点原始渠道名称，例如 Plus、Pro、kiro 或 max；
 * 一个倍率可以明确引用一个或多个充值档位，避免对适用范围做隐式猜测。
 */
export interface ModelRate {
  id: string;
  stationId: string;
  model: ModelFamily;
  channel: string;
  multiplier: number;
  offerIds: string[];
  source: string;
  measuredAt: string;
  notes: string;
  status: PlanStatus;
}

export interface ExpandedPlan {
  id: string;
  stationId: string;
  stationName: string;
  website: string;
  model: ModelFamily;
  channel: string;
  offerKind: OfferKind;
  offerLabel?: string;
  rechargeAmount: number;
  faceValue: number;
  multiplier: number;
  source: string;
  measuredAt: string;
  notes: string;
  status: PlanStatus;
}

export interface CalculatedPlan extends ExpandedPlan {
  effectiveAmount: number;
  valuePerYuan: number;
  rank: number;
  isRankable: boolean;
}

const initialMeasuredAt = '2026-08-28';
const galaxyMeasuredAt = '2026-08-29';
const rightCodeMeasuredAt = '2026-08-29';
const officialManualSource = '官方网站人工采集';
const initialStatus: PlanStatus = 'active';
const standardOfferNotes = '官网充值档位';
const bundleOfferNotes = '官网特殊捆绑包';
const rateNotes = '官网倍率数据';

/**
 * 中转站基础目录。新增站点时只需要在这里增加一条名称和网址，不需要复制模型数据。
 */
export const stations: Station[] = [
  {
    id: 'token-bank',
    name: 'bank of token',
    website: 'https://api.boft.ai/',
  },
  {
    id: '259ai',
    name: '259AI',
    website: 'https://api.259aitoken.com/',
  },
  {
    id: 'codex-for',
    name: 'codex for',
    website: 'https://blackaicoding.com/',
  },
  {
    id: 'pinai',
    name: 'pinai',
    website: 'https://app.pinaic.com/',
  },
  {
    id: 'ccvibe',
    name: 'ccvibe',
    website: 'https://cc-vibe.com/',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    website: 'https://gpt.eacase.de5.net/',
  },
  {
    id: 'right-code',
    name: 'Right Code',
    website: 'https://www.rightapi.ai/',
  },
];

/**
 * 充值档位目录。相同站点的模型倍率通过 offerIds 复用这些金额和面值。
 * codex for 的 140 元记录单独保留为捆绑包，15 元记录作为普通档位。
 */
export const rechargeOffers: RechargeOffer[] = [
  {
    id: 'token-bank-1',
    stationId: 'token-bank',
    offerKind: 'standard',
    offerLabel: '1 元档',
    rechargeAmount: 1,
    faceValue: 1,
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: standardOfferNotes,
    status: initialStatus,
  },
  {
    id: '259ai-1',
    stationId: '259ai',
    offerKind: 'standard',
    offerLabel: '1 元档',
    rechargeAmount: 1,
    faceValue: 1,
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: standardOfferNotes,
    status: initialStatus,
  },
  {
    id: 'codex-for-140',
    stationId: 'codex-for',
    offerKind: 'bundle',
    offerLabel: '140 元',
    rechargeAmount: 140,
    faceValue: 1000,
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: bundleOfferNotes,
    status: initialStatus,
  },
  {
    id: 'codex-for-15',
    stationId: 'codex-for',
    offerKind: 'standard',
    offerLabel: '15 元',
    rechargeAmount: 15,
    faceValue: 100,
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: standardOfferNotes,
    status: initialStatus,
  },
  {
    id: 'pinai-10',
    stationId: 'pinai',
    offerKind: 'standard',
    offerLabel: '10 元档',
    rechargeAmount: 10,
    faceValue: 100,
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: standardOfferNotes,
    status: initialStatus,
  },
  {
    id: 'ccvibe-10',
    stationId: 'ccvibe',
    offerKind: 'standard',
    offerLabel: '10 元档',
    rechargeAmount: 10,
    faceValue: 120,
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: standardOfferNotes,
    status: initialStatus,
  },
  {
    id: 'galaxy-1',
    stationId: 'galaxy',
    offerKind: 'standard',
    offerLabel: '1 元档',
    rechargeAmount: 1,
    faceValue: 10,
    source: officialManualSource,
    measuredAt: galaxyMeasuredAt,
    notes: standardOfferNotes,
    status: initialStatus,
  },
  {
    id: 'right-code-1',
    stationId: 'right-code',
    offerKind: 'standard',
    offerLabel: '1 元档',
    rechargeAmount: 1,
    faceValue: 1,
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: standardOfferNotes,
    status: initialStatus,
  },
];

/**
 * 模型倍率目录。GPT 是原有数据，Claude 是本次新增数据；每条记录只写倍率和适用档位。
 * 没有额外说明的 Claude 倍率按对应站点的全部充值档位展开，适用范围可通过 offerIds 调整。
 */
export const modelRates: ModelRate[] = [
  // GPT 模型的原有 Plus / Pro 倍率；token-bank 渠道按最新口径更新。
  {
    id: 'gpt-token-bank-plus',
    stationId: 'token-bank',
    model: 'GPT',
    channel: 'Plus',
    multiplier: 0.12,
    offerIds: ['token-bank-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-token-bank-pro',
    stationId: 'token-bank',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 0.25,
    offerIds: ['token-bank-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-259ai-plus',
    stationId: '259ai',
    model: 'GPT',
    channel: 'Plus',
    multiplier: 0.158,
    offerIds: ['259ai-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-259ai-pro',
    stationId: '259ai',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 0.189,
    offerIds: ['259ai-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-codex-for-plus',
    stationId: 'codex-for',
    model: 'GPT',
    channel: 'Plus',
    multiplier: 1.2,
    offerIds: ['codex-for-140', 'codex-for-15'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-codex-for-pro',
    stationId: 'codex-for',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 1.4,
    offerIds: ['codex-for-140', 'codex-for-15'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-pinai-pro-2-5',
    stationId: 'pinai',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 2.5,
    offerIds: ['pinai-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-pinai-pro-3',
    stationId: 'pinai',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 3,
    offerIds: ['pinai-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-ccvibe-plus',
    stationId: 'ccvibe',
    model: 'GPT',
    channel: 'Plus',
    multiplier: 2,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-ccvibe-pro',
    stationId: 'ccvibe',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 5,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },

  // Claude 模型的新增倍率。
  {
    id: 'claude-codex-for-kiro',
    stationId: 'codex-for',
    model: 'Claude',
    channel: 'kiro',
    multiplier: 1.4,
    offerIds: ['codex-for-140', 'codex-for-15'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-pinai-max',
    stationId: 'pinai',
    model: 'Claude',
    channel: 'max',
    multiplier: 16,
    offerIds: ['pinai-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-pinai-kiro',
    stationId: 'pinai',
    model: 'Claude',
    channel: 'kiro',
    multiplier: 5,
    offerIds: ['pinai-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-pinai-aws',
    stationId: 'pinai',
    model: 'Claude',
    channel: 'aws',
    multiplier: 8,
    offerIds: ['pinai-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-pinai-cursor',
    stationId: 'pinai',
    model: 'Claude',
    channel: 'cursor',
    multiplier: 5,
    offerIds: ['pinai-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-ccvibe-max',
    stationId: 'ccvibe',
    model: 'Claude',
    channel: 'max',
    multiplier: 22,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-ccvibe-max-stable',
    stationId: 'ccvibe',
    model: 'Claude',
    channel: 'max稳定',
    multiplier: 28,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-ccvibe-aws',
    stationId: 'ccvibe',
    model: 'Claude',
    channel: 'aws',
    multiplier: 80,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-ccvibe-1m-stable',
    stationId: 'ccvibe',
    model: 'Claude',
    channel: '1M稳定',
    multiplier: 5,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-ccvibe-1m',
    stationId: 'ccvibe',
    model: 'Claude',
    channel: '1M',
    multiplier: 3,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-token-bank-kiro-01',
    stationId: 'token-bank',
    model: 'Claude',
    channel: 'kiro',
    multiplier: 0.12,
    offerIds: ['token-bank-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-token-bank-kiro-025',
    stationId: 'token-bank',
    model: 'Claude',
    channel: 'kiro',
    multiplier: 0.35,
    offerIds: ['token-bank-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-token-bank-max',
    stationId: 'token-bank',
    model: 'Claude',
    channel: 'max',
    multiplier: 0.95,
    offerIds: ['token-bank-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-259ai-max',
    stationId: '259ai',
    model: 'Claude',
    channel: 'max',
    multiplier: 1.08,
    offerIds: ['259ai-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-259ai-max-stable',
    stationId: '259ai',
    model: 'Claude',
    channel: 'max稳定',
    multiplier: 1.28,
    offerIds: ['259ai-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-259ai-antigravity',
    stationId: '259ai',
    model: 'Claude',
    channel: '反重力',
    multiplier: 0.58,
    offerIds: ['259ai-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-259ai-high-buffer',
    stationId: '259ai',
    model: 'Claude',
    channel: '高缓',
    multiplier: 0.38,
    offerIds: ['259ai-1'],
    source: officialManualSource,
    measuredAt: initialMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  // Galaxy 同一充值档位适用于 GPT 和 Claude 的全部渠道。
  {
    id: 'gpt-galaxy-plus',
    stationId: 'galaxy',
    model: 'GPT',
    channel: 'Plus',
    multiplier: 1,
    offerIds: ['galaxy-1'],
    source: officialManualSource,
    measuredAt: galaxyMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'gpt-galaxy-pro',
    stationId: 'galaxy',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 1.6,
    offerIds: ['galaxy-1'],
    source: officialManualSource,
    measuredAt: galaxyMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-galaxy-kiro',
    stationId: 'galaxy',
    model: 'Claude',
    channel: 'kiro',
    multiplier: 1.3,
    offerIds: ['galaxy-1'],
    source: officialManualSource,
    measuredAt: galaxyMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-galaxy-max',
    stationId: 'galaxy',
    model: 'Claude',
    channel: 'max',
    multiplier: 12,
    offerIds: ['galaxy-1'],
    source: officialManualSource,
    measuredAt: galaxyMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  // Right Code 的 GPT、Claude 渠道使用同一个 1 元充值档位。
  {
    id: 'gpt-right-code-pro',
    stationId: 'right-code',
    model: 'GPT',
    channel: 'Pro',
    multiplier: 0.4,
    offerIds: ['right-code-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-right-code-official',
    stationId: 'right-code',
    model: 'Claude',
    channel: '官方',
    multiplier: 2,
    offerIds: ['right-code-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-right-code-special',
    stationId: 'right-code',
    model: 'Claude',
    channel: '特惠',
    multiplier: 1.5,
    offerIds: ['right-code-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'claude-right-code-aws',
    stationId: 'right-code',
    model: 'Claude',
    channel: 'aws',
    multiplier: 0.3,
    offerIds: ['right-code-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  // Grok 渠道按各站点已有充值档位复用；codex for 因有两档会展开两行。
  {
    id: 'grok-right-code-unknown',
    stationId: 'right-code',
    model: 'Grok',
    channel: '未知',
    multiplier: 0.1,
    offerIds: ['right-code-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'grok-token-bank-heavy',
    stationId: 'token-bank',
    model: 'Grok',
    channel: 'Heavy',
    multiplier: 0.18,
    offerIds: ['token-bank-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'grok-galaxy-heavy',
    stationId: 'galaxy',
    model: 'Grok',
    channel: 'Heavy',
    multiplier: 2,
    offerIds: ['galaxy-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'grok-ccvibe-official',
    stationId: 'ccvibe',
    model: 'Grok',
    channel: '官方',
    multiplier: 2,
    offerIds: ['ccvibe-10'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'grok-pinai-unknown',
    stationId: 'pinai',
    model: 'Grok',
    channel: '未知',
    multiplier: 4,
    offerIds: ['pinai-10'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'grok-codex-for-unknown',
    stationId: 'codex-for',
    model: 'Grok',
    channel: '未知',
    multiplier: 1,
    offerIds: ['codex-for-140', 'codex-for-15'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
  {
    id: 'grok-259ai-heavy',
    stationId: '259ai',
    model: 'Grok',
    channel: 'Heavy',
    multiplier: 0.3,
    offerIds: ['259ai-1'],
    source: officialManualSource,
    measuredAt: rightCodeMeasuredAt,
    notes: rateNotes,
    status: initialStatus,
  },
];

/** 合并多个原始记录的状态；已过期优先，其次是未知，只有全部有效时才返回 active。 */
function resolveStatus(statuses: PlanStatus[]): PlanStatus {
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('unknown')) return 'unknown';
  return 'active';
}

/**
 * 将三层原始目录展开为可计算的中转站-模型-充值档位组合。
 * 引用缺失或站点不匹配时跳过该组合，避免构建阶段生成不完整的排名行；组合更新时间取两条原始记录中较新的日期。
 */
export function expandPlans(
  sourceStations: Station[] = stations,
  sourceOffers: RechargeOffer[] = rechargeOffers,
  sourceRates: ModelRate[] = modelRates,
): ExpandedPlan[] {
  const stationById = new Map(sourceStations.map((station) => [station.id, station]));
  const offerById = new Map(sourceOffers.map((offer) => [offer.id, offer]));

  return sourceRates.flatMap((rate) => {
    const station = stationById.get(rate.stationId);
    if (!station) return [];

    return rate.offerIds.flatMap((offerId) => {
      const offer = offerById.get(offerId);
      if (!offer || offer.stationId !== rate.stationId) return [];

      return [
        {
          id: `${rate.id}@${offer.id}`,
          stationId: station.id,
          stationName: station.name,
          website: station.website,
          model: rate.model,
          channel: rate.channel,
          offerKind: offer.offerKind,
          offerLabel: offer.offerLabel,
          rechargeAmount: offer.rechargeAmount,
          faceValue: offer.faceValue,
          multiplier: rate.multiplier,
          source: rate.source,
          measuredAt: rate.measuredAt >= offer.measuredAt ? rate.measuredAt : offer.measuredAt,
          notes: rate.notes,
          status: resolveStatus([rate.status, offer.status]),
        },
      ];
    });
  });
}

/**
 * 计算单个组合的有效额度和每元有效额度；金额、面值或倍率无效时禁止其参与排名。
 * 页面展示值会在外层格式化，计算本身保留完整数值，避免四舍五入影响排序。
 */
export function calculatePlan(plan: ExpandedPlan, rank = 0): CalculatedPlan {
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
 * 按未四舍五入的每元有效额度降序生成单模型排名，并稳定处理同分项。
 * 每次必须指定模型，确保 GPT、Claude 等模型不会共享同一套排名序号。
 */
export function getRankedPlans(
  model: ModelFamily,
  sourceRows: ExpandedPlan[] = expandPlans(),
): CalculatedPlan[] {
  return sourceRows
    .filter((plan) => plan.model === model)
    .map((plan) => calculatePlan(plan))
    .filter((plan) => plan.isRankable)
    .sort((left, right) => {
      const valueDifference = right.valuePerYuan - left.valuePerYuan;
      if (valueDifference) return valueDifference;

      const stationDifference = left.stationName.localeCompare(right.stationName, 'zh-CN');
      if (stationDifference) return stationDifference;

      const modelDifference = left.model.localeCompare(right.model, 'en');
      if (modelDifference) return modelDifference;

      const channelDifference = left.channel.localeCompare(right.channel, 'zh-CN');
      return channelDifference || left.id.localeCompare(right.id, 'en');
    })
    .map((plan, index) => ({ ...plan, rank: index + 1 }));
}

/** 从倍率目录中提取实际存在的模型 Tab，未录入数据的模型不会显示空选项。 */
export function getAvailableModels(sourceRates: ModelRate[] = modelRates): ModelFamily[] {
  return [...new Set(sourceRates.map((rate) => rate.model))];
}

/** 从倍率目录中提取渠道筛选项；指定模型后只返回该模型实际使用的渠道。 */
export function getAvailableChannels(
  sourceRates: ModelRate[] = modelRates,
  model?: ModelFamily,
): string[] {
  return [
    ...new Set(
      sourceRates.filter((rate) => !model || rate.model === model).map((rate) => rate.channel),
    ),
  ];
}

/** 返回倍率与充值档位中的最新测评日期；空数据集返回空字符串，避免模板访问 undefined。 */
export function getLatestMeasuredDate(
  sourceRecords: Array<{ measuredAt: string }> = [...rechargeOffers, ...modelRates],
): string {
  return sourceRecords.reduce((latest, record) => (record.measuredAt > latest ? record.measuredAt : latest), '');
}

/** 统一页面上的数值精度；计算和排序仍使用未格式化的数值。 */
export function formatMetric(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}
