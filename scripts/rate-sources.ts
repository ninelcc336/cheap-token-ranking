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

export type RateSourceConfig = Sub2ApiSourceConfig | ManualRateSourceConfig;

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

/** 当前仓库五个站点的采集配置；全部站点均已接入接口采集，不再依赖人工兜底。 */
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
    stationId: 'codex-for',
    name: 'codex for',
    baseUrl: 'https://blackaicoding.com',
    tokenEnv: 'RATE_CODEX_FOR',
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
];
