/**
 * 读取各站点公开或登录后可见的倍率接口，并写入可审计的本地快照。
 *
 * 关键约束：
 * - 只更新成功返回且通过结构校验的站点；失败站点的旧快照原样保留。
 * - 只采集模型倍率，充值金额和美元面值仍由 src/data/plans.ts 人工维护。
 * - 任何日志都不得打印 Authorization 令牌，便于直接放进 GitHub Actions。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AutoRateOverride, ModelFamily } from '../src/data/plans';
import {
  rateSources,
  type ManualRateSourceConfig,
  type RateSourceConfig,
  type RightCodeSourceConfig,
  type Sub2ApiSourceConfig,
} from './rate-sources';

const defaultSnapshotPath = resolve(process.cwd(), 'src/data/auto-rates.json');
const requestTimeoutMs = 20_000;
const collectorUserAgent = 'cheap-token-rate-collector/1.0';

export interface StoredRateSnapshot {
  schemaVersion: number;
  generatedAt: string;
  overrides: AutoRateOverride[];
}

export type CollectionStatus = 'success' | 'skipped' | 'failed' | 'manual';

export interface CollectionResult {
  stationId: string;
  name: string;
  status: CollectionStatus;
  overrides: AutoRateOverride[];
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 生成上海时区日期，避免 GitHub Actions 的 UTC 日期在北京时间凌晨发生错位。 */
export function getShanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return [values.get('year'), values.get('month'), values.get('day')].join('-');
}

function idPart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  );
}

function toPositiveNumber(value: unknown, field: string): number {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(field + ' 为空');
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(field + ' 不是有效的正数字');
  }
  return parsed;
}

/** 解包 Sub2API 常见的 { code, data } 响应，同时拒绝业务错误响应。 */
export function unwrapResponse(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if ('code' in payload) {
    const code = Number(payload.code);
    if (Number.isFinite(code) && code !== 0) {
      throw new Error(String(payload.message ?? '接口返回业务错误'));
    }
    return payload.data;
  }
  // 兼容少数网关直接返回 { data: ... } 而不带 code 的成功响应。
  if (Object.keys(payload).length === 1 && 'data' in payload) return payload.data;
  return payload;
}

function createOverride(
  stationId: string,
  model: ModelFamily,
  channel: string,
  multiplier: number,
  sourceId: string,
  source: string,
  measuredAt: string,
): AutoRateOverride {
  return {
    id: ['auto', stationId, model.toLowerCase(), idPart(channel), idPart(sourceId)].join('-'),
    stationId,
    model,
    channel,
    multiplier,
    source,
    measuredAt,
    notes: '通过官网接口自动读取；充值金额和美元面值仍由人工维护。',
    status: 'active',
  };
}

/** 将用户侧分组接口转换为本站统一的模型-渠道-倍率覆盖记录。 */
export function parseSub2ApiGroups(
  payload: unknown,
  config: Sub2ApiSourceConfig,
  measuredAt: string,
): AutoRateOverride[] {
  const data = unwrapResponse(payload);
  if (!Array.isArray(data)) {
    throw new Error('groups/available 返回不是数组');
  }

  const source = config.baseUrl + '/api/v1/groups/available';
  const overrides: AutoRateOverride[] = [];
  data.forEach((item, index) => {
    if (!isRecord(item)) throw new Error('groups/available 包含非对象记录');
    const platform = String(item.platform ?? '').trim().toLowerCase();
    const model = config.platformModelMap[platform];
    if (!model) return;

    const channel = String(item.name ?? item.group_name ?? '').trim();
    if (!channel) throw new Error('分组记录缺少 name');
    const multiplier = toPositiveNumber(item.rate_multiplier, '分组 ' + channel + ' 的 rate_multiplier');
    const sourceId = String(item.id ?? index);
    overrides.push(createOverride(config.stationId, model, channel, multiplier, sourceId, source, measuredAt));
  });

  if (overrides.length === 0) {
    throw new Error('没有识别到已配置模型平台的分组，拒绝覆盖旧数据');
  }
  return overrides;
}

/**
 * 将 Right Code 的公开 upstream 列表转换为本站倍率记录。
 * 显式规则优先（可重命名渠道）；未命中的 upstream 按接口 type 兜底映射模型族，
 * 渠道保留站点原始名称，避免站点新增分组时被静默丢弃。
 */
export function parseRightCodeUpstreams(
  payload: unknown,
  config: RightCodeSourceConfig,
  measuredAt: string,
): AutoRateOverride[] {
  const data = unwrapResponse(payload);
  const items = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.upstreams) ? data.upstreams : null;
  if (!items) throw new Error('upstreams/public 返回缺少 upstreams 数组');

  const compiledRules = config.rules.map((rule) => ({ ...rule, expression: new RegExp(rule.match, 'i') }));
  const excludePattern = config.excludeNamePattern ? new RegExp(config.excludeNamePattern, 'i') : null;
  const source = config.baseUrl + '/upstreams/public';
  const overrides: AutoRateOverride[] = [];
  items.forEach((item, index) => {
    if (!isRecord(item) || item.is_active === false) return;
    const name = String(item.name ?? '').trim();
    const rule = compiledRules.find((candidate) => candidate.expression.test(name));
    let model: ModelFamily;
    let channel: string;
    if (rule) {
      model = rule.model;
      channel = rule.channel;
    } else {
      if (!name || (excludePattern && excludePattern.test(name))) return;
      const upstreamType = String(item.type ?? '').trim().toLowerCase();
      const fallbackModel = config.fallbackTypeModelMap[upstreamType];
      if (!fallbackModel) return;
      model = fallbackModel;
      channel = name;
    }
    const multiplier = toPositiveNumber(item.rate, '上游 ' + name + ' 的 rate');
    const sourceId = String(item.id ?? index);
    overrides.push(createOverride(config.stationId, model, channel, multiplier, sourceId, source, measuredAt));
  });

  if (overrides.length === 0) {
    throw new Error('没有匹配到 Right Code 配置的 upstream，拒绝覆盖旧数据');
  }
  return overrides;
}

async function requestJson(url: string, token?: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Language': 'zh-CN',
      'User-Agent': collectorUserAgent,
      'X-User-UI-Request': '1',
    };
    if (token) headers.Authorization = 'Bearer ' + token;

    const response = await fetch(url, { headers, signal: controller.signal });
    const body = await response.text();
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + '：' + body.replace(/\s+/g, ' ').slice(0, 180));
    }
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error('接口返回不是 JSON');
    }
  } finally {
    clearTimeout(timeout);
  }
}

function normalizedBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

/** 执行单个采集源；任何异常都会转为结果，不会中断其他站点。 */
export async function collectSource(
  config: RateSourceConfig,
  measuredAt: string,
): Promise<CollectionResult> {
  if (config.adapter === 'manual') {
    const manualConfig: ManualRateSourceConfig = config;
    return {
      stationId: manualConfig.stationId,
      name: manualConfig.name,
      status: 'manual',
      overrides: [],
      message: manualConfig.reason,
    };
  }

  try {
    if (config.adapter === 'sub2api') {
      const token = process.env[config.tokenEnv]?.trim();
      if (!token) {
        return {
          stationId: config.stationId,
          name: config.name,
          status: 'skipped',
          overrides: [],
          message: '未配置环境变量 ' + config.tokenEnv,
        };
      }
      const payload = await requestJson(
        normalizedBaseUrl(config.baseUrl) + '/api/v1/groups/available',
        token,
      );
      return {
        stationId: config.stationId,
        name: config.name,
        status: 'success',
        overrides: parseSub2ApiGroups(payload, config, measuredAt),
      };
    }

    const rightCodeConfig: RightCodeSourceConfig = config;
    const payload = await requestJson(normalizedBaseUrl(rightCodeConfig.baseUrl) + '/upstreams/public');
    return {
      stationId: rightCodeConfig.stationId,
      name: rightCodeConfig.name,
      status: 'success',
      overrides: parseRightCodeUpstreams(payload, rightCodeConfig, measuredAt),
    };
  } catch (error) {
    return {
      stationId: config.stationId,
      name: config.name,
      status: 'failed',
      overrides: [],
      message: errorMessage(error),
    };
  }
}

/** 读取已有快照；文件不存在时返回空快照，格式损坏则直接报错避免静默丢数据。 */
export async function readStoredSnapshot(filePath = defaultSnapshotPath): Promise<StoredRateSnapshot> {
  try {
    const content = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed) || !Array.isArray(parsed.overrides)) {
      throw new Error('自动倍率快照格式无效，必须包含 overrides 数组');
    }
    return {
      schemaVersion: Number(parsed.schemaVersion ?? 1),
      generatedAt: String(parsed.generatedAt ?? ''),
      overrides: parsed.overrides as AutoRateOverride[],
    };
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      return { schemaVersion: 1, generatedAt: '', overrides: [] };
    }
    throw error;
  }
}

/** 只替换本次成功的站点，失败或缺少令牌的站点继续沿用旧记录。 */
export function mergeSuccessfulOverrides(
  existing: AutoRateOverride[],
  results: CollectionResult[],
): AutoRateOverride[] {
  const successfulStations = new Set(
    results.filter((result) => result.status === 'success').map((result) => result.stationId),
  );
  const retained = existing.filter((item) => !successfulStations.has(item.stationId));
  const fresh = results
    .filter((result) => result.status === 'success')
    .flatMap((result) => result.overrides);
  return [...retained, ...fresh];
}

/** 运行整批采集；默认失败只告警，--strict 可用于本地验收时将失败转为非零退出码。 */
export async function runCollector(options: {
  strict?: boolean;
  filePath?: string;
  now?: Date;
} = {}): Promise<number> {
  const filePath = options.filePath ?? defaultSnapshotPath;
  const now = options.now ?? new Date();
  const measuredAt = getShanghaiDate(now);
  const previous = await readStoredSnapshot(filePath);
  const results = await Promise.all(rateSources.map((source) => collectSource(source, measuredAt)));

  results.forEach((result) => {
    if (result.status === 'success') {
      console.log('[' + result.name + '] 采集成功：' + result.overrides.length + ' 条倍率');
    } else if (result.status === 'manual') {
      console.log('[' + result.name + '] 保留人工数据：' + result.message);
    } else {
      const message = '[' + result.name + '] ' + result.status + '：' + result.message;
      console.warn('::warning::' + message);
    }
  });

  const merged = mergeSuccessfulOverrides(previous.overrides, results);
  const changed = JSON.stringify(previous.overrides) !== JSON.stringify(merged);
  if (changed) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({ schemaVersion: 1, generatedAt: now.toISOString(), overrides: merged }, null, 2) + '\n',
      'utf8',
    );
    console.log('已写入自动倍率快照：' + filePath);
  } else {
    console.log('倍率没有变化，不产生数据提交。');
  }

  const actionableFailures = options.strict
    ? results.filter((result) => result.status === 'failed' || result.status === 'skipped')
    : [];
  return actionableFailures.length > 0 ? 1 : 0;
}

const entryPoint = process.argv[1];
const isDirectRun = Boolean(entryPoint && pathToFileURL(resolve(entryPoint)).href === import.meta.url);
if (isDirectRun) {
  runCollector({ strict: process.argv.includes('--strict') })
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(errorMessage(error));
      process.exitCode = 1;
    });
}
