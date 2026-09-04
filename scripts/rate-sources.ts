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
}

export interface RightCodeRule {
  /** 对公开接口返回的 upstream name 做不区分大小写的正则匹配。 */
  match: string;
  model: ModelFamily;
  channel: string;
}

export interface RightCodeSourceConfig {
  adapter: 'right-code';
  stationId: string;
  name: string;
  baseUrl: string;
  rules: RightCodeRule[];
  /**
   * 未命中显式规则的 upstream 按接口 type 推断模型族，渠道保留站点原始名称；
   * type 缺失或未配置映射时跳过该 upstream。
   */
  fallbackTypeModelMap: Record<string, ModelFamily>;
  /** 命中该正则（不区分大小写）的 upstream 一律不采集，用于排除画图、DeepSeek 等非榜单模型。 */
  excludeNamePattern?: string;
}

export interface ManualRateSourceConfig {
  adapter: 'manual';
  stationId: string;
  name: string;
  reason: string;
}

export type RateSourceConfig =
  | Sub2ApiSourceConfig
  | RightCodeSourceConfig
  | ManualRateSourceConfig;

const commonPlatformModelMap: Record<string, ModelFamily> = {
  openai: 'GPT',
  anthropic: 'Claude',
  grok: 'Grok',
  gemini: 'Gemini',
};

/** 各 sub2api 站点共用的分组名模型规则；命中时优先于 platform 字段。 */
const commonNameModelRules: NameModelRule[] = [{ match: 'grok', model: 'Grok' }];

/** 当前仓库七个站点的采集配置；全部站点均已接入接口采集，不再依赖人工兜底。 */
export const rateSources: RateSourceConfig[] = [
  {
    adapter: 'sub2api',
    stationId: 'token-bank',
    name: 'bank of token',
    baseUrl: 'https://api.boft.ai',
    tokenEnv: 'RATE_TOKEN_BANK',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
  },
  {
    adapter: 'sub2api',
    stationId: '259ai',
    name: '259AI',
    baseUrl: 'https://api.259aitoken.com',
    tokenEnv: 'RATE_259AI',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
  },
  {
    adapter: 'sub2api',
    stationId: 'codex-for',
    name: 'codex for',
    baseUrl: 'https://blackaicoding.com',
    tokenEnv: 'RATE_CODEX_FOR',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
  },
  {
    adapter: 'sub2api',
    stationId: 'pinai',
    name: 'pinai',
    baseUrl: 'https://app.pinaic.com',
    tokenEnv: 'RATE_PINAI',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
  },
  {
    adapter: 'sub2api',
    stationId: 'ccvibe',
    name: 'ccvibe',
    baseUrl: 'https://cc-vibe.com',
    tokenEnv: 'RATE_CCVIBE',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
  },
  {
    adapter: 'sub2api',
    stationId: 'galaxy',
    name: 'Galaxy',
    baseUrl: 'https://gpt.eacase.de5.net',
    tokenEnv: 'RATE_GALAXY',
    platformModelMap: { ...commonPlatformModelMap, antigravity: 'Claude' },
    nameModelRules: commonNameModelRules,
  },
  {
    adapter: 'right-code',
    stationId: 'right-code',
    name: 'Right Code',
    baseUrl: 'https://www.rightapi.ai',
    rules: [
      { match: '^Codex$', model: 'GPT', channel: 'Pro' },
      { match: '^Claude\\s+awsq$', model: 'Claude', channel: 'aws' },
      { match: '^Claude\\s+官方渠道$', model: 'Claude', channel: '官方' },
      // 前缀匹配覆盖后续新增的 Grok 变体名称，避免它们落进 responses→GPT 的兜底映射。
      { match: '^Grok', model: 'Grok', channel: '未知' },
    ],
    fallbackTypeModelMap: {
      responses: 'GPT',
      completions: 'GPT',
      messages: 'Claude',
      gemini: 'Gemini',
    },
    excludeNamePattern: 'deepseek|画图|绘图|draw|image|tts|audio|embedding|rerank|video',
  },
];
