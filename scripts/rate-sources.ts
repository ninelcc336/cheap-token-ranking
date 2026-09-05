/**
 * 自动倍率采集源配置。
 *
 * 这里仅保存公开地址、适配器和模型映射，不保存任何账号令牌；令牌只从
 * 运行环境读取，便于本地调试和 GitHub Actions Secrets 分离管理。
 */
import type { ModelFamily } from '../src/data/plans';

export interface NameModelRule {
  /** 对分组名做不区分大小写的正则匹配；命中时优先于 platform 映射推断模型族。 */
  match: string;
  model: ModelFamily;
}

export interface Sub2ApiSourceConfig {
  adapter: 'sub2api';
  stationId: string;
  name: string;
  baseUrl: string;
  tokenEnv: string;
  /** 将站点后端 platform 映射为本站的模型族；未配置的平台会被安全忽略。 */
  platformModelMap: Record<string, ModelFamily>;
  /** 分组名规则：站点常把 Grok 等模型挂在 openai 协议下，名字比协议字段更能反映真实模型。 */
  nameModelRules?: NameModelRule[];
  /** 命中该正则（不区分大小写）的分组一律不采集，用于排除生图等非文本模型渠道。 */
  excludeNamePattern?: string;
}

export interface ManualRateSourceConfig {
  adapter: 'manual';
  stationId: string;
  name: string;
  reason: string;
}

export interface NewApiSourceConfig {
  adapter: 'new-api';
  stationId: string;
  name: string;
  baseUrl: string;
  /** new-api 的 /api/pricing 通常公开可读；配置了 tokenEnv 且环境变量存在时才携带令牌。 */
  tokenEnv?: string;
  /** 模型名规则：按顺序匹配 model_name 推断模型族，未命中的模型安全忽略。 */
  nameModelRules: NameModelRule[];
  /** 命中该正则（不区分大小写）的分组一律不采集，用于排除生图等非文本模型渠道。 */
  excludeNamePattern?: string;
}

export type RateSourceConfig = Sub2ApiSourceConfig | ManualRateSourceConfig | NewApiSourceConfig;

const commonPlatformModelMap: Record<string, ModelFamily> = {
  openai: 'GPT',
  anthropic: 'Claude',
  grok: 'Grok',
  gemini: 'Gemini',
};

/** 各 sub2api 站点共用的分组名模型规则；命中时优先于 platform 字段。 */
const commonNameModelRules: NameModelRule[] = [{ match: 'grok', model: 'Grok' }];

/** 各 sub2api 站点共用的分组排除表：生图、绘图等非文本模型渠道不进入榜单。 */
const commonExcludeNamePattern = 'image|生图|绘图|画图|draw';

/**
 * new-api 站点按模型名推断模型族的规则；按顺序匹配，命中即停。
 * gpt 规则放最后，避免 claude/grok/gemini 命名变体被提前误判。
 */
const commonNewApiNameModelRules: NameModelRule[] = [
  { match: 'claude', model: 'Claude' },
  { match: 'grok', model: 'Grok' },
  { match: 'gemini', model: 'Gemini' },
  { match: 'gpt|codex|o[0-9]', model: 'GPT' },
];

/** 当前仓库六个站点的采集配置；sub2api 站点全部接入令牌采集，new-api 站点走公开定价接口。 */
export const rateSources: RateSourceConfig[] = [
  {
    adapter: 'sub2api',
    stationId: 'token-bank',
    name: 'bank of token',
    baseUrl: 'https://api.boft.ai',
    tokenEnv: 'RATE_TOKEN_BANK',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
    excludeNamePattern: commonExcludeNamePattern,
  },
  {
    adapter: 'sub2api',
    stationId: 'pinai',
    name: 'pinai',
    baseUrl: 'https://app.pinaic.com',
    tokenEnv: 'RATE_PINAI',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
    excludeNamePattern: commonExcludeNamePattern,
  },
  {
    adapter: 'sub2api',
    stationId: 'ccvibe',
    name: 'ccvibe',
    baseUrl: 'https://cc-vibe.com',
    tokenEnv: 'RATE_CCVIBE',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
    excludeNamePattern: commonExcludeNamePattern,
  },
  {
    adapter: 'sub2api',
    stationId: 'galaxy',
    name: 'Galaxy',
    baseUrl: 'https://gpt.eacase.de5.net',
    tokenEnv: 'RATE_GALAXY',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
    excludeNamePattern: commonExcludeNamePattern,
  },
  {
    adapter: 'sub2api',
    stationId: 'didi-hub',
    name: 'Didi Hub',
    baseUrl: 'https://didisubapi.com',
    tokenEnv: 'RATE_DIDI',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
    excludeNamePattern: commonExcludeNamePattern,
  },
  {
    adapter: 'new-api',
    stationId: 'maoai',
    name: '猫艾',
    baseUrl: 'https://api.maoapi.org',
    nameModelRules: commonNewApiNameModelRules,
    excludeNamePattern: commonExcludeNamePattern,
  },
];
