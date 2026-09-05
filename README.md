# Cheap Token

一个使用 Astro + TypeScript + 原生 CSS 构建的 Token 中转方案性价比排行榜。页面默认静态输出，数据与展示分离，适合部署到 GitHub Pages。

## 本地运行

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run check   # Astro 类型与模板检查
npm test        # 数据计算测试
npm run build   # 生成 dist 静态站点
npm run preview # 本地预览构建产物
```

## 自动采集倍率

仓库提供 scripts/collect-rates.ts 作为采集层，并把成功结果写入 src/data/auto-rates.json。页面构建时，只要某站点在自动快照中有有效数据，该站点的人工倍率行就会整体让位于自动数据（包括站点已改名或下架的旧渠道），避免同一渠道新旧名称并存；快照中没有的站点继续使用人工维护的倍率。充值金额和美元面值始终从 rechargeOffers 读取，所以自动采集不会改写人工维护的充值档位。

当前适配情况：

- bank of token、codex for、pinai、ccvibe、Galaxy：读取登录后可见的 /api/v1/groups/available，需要对应站点账号令牌。分组名称不拘泥于 Plus、Pro 等固定叫法，接口返回的分组名会原样作为渠道进入榜单；模型归属默认由接口的 platform 字段决定，但分组名命中名称规则时以名称优先（例如 Grok 分组常挂在 openai 协议下）。名字命中排除表的生图、绘图类渠道不会采集。
- Right Code：读取公开的 /upstreams/public，不需要令牌。显式名称规则优先（例如 Codex 映射为 Pro 渠道）；未命中规则的 upstream 按接口 type 兜底映射模型族并保留原始名称，DeepSeek、画图等非榜单渠道按排除表跳过。

本地运行时，把登录后浏览器存储中的站点令牌放入环境变量，再执行采集。PowerShell 示例：

    $env:RATE_TOKEN_BANK = '只在当前进程使用的令牌'
    npm run collect-rates

令牌不要写入仓库、日志或源码。部署到 GitHub 后，在仓库 Settings → Secrets and variables → Actions 中创建 RATE_TOKEN_BANK、RATE_CODEX_FOR、RATE_PINAI、RATE_CCVIBE、RATE_GALAXY，工作流会自动读取它们。建议为采集专门注册低权限账号，并按站点规则定期轮换令牌。

.github/workflows/deploy.yml 已配置每 30 分钟运行一次，并提供手动触发入口。GitHub Actions 的定时任务不是严格实时系统，实际启动时间可能因队列延迟而推迟；它更适合分钟级或小时级刷新。采集失败、令牌缺失或响应结构异常时只会告警并保留旧快照，不会用空数据覆盖榜单。

## 维护数据

方案原始数据位于 `src/data/plans.ts`，拆成三层目录维护，避免同一中转站或充值档位在不同模型中重复填写：

- `stations`：维护中转站 `id`、名称和官网链接。页面中的中转站名称可直接跳转到对应官网。
- `rechargeOffers`：维护站点的充值金额（人民币）、面值（美元）、`standard` / `bundle` 档位、数据来源、测评日期、备注和状态。
- `modelRates`：维护模型族、渠道、倍率，以及适用充值档位的 `offerIds`；同一站点的多个模型可以复用同一个充值档位。已被自动采集接管的站点，其人工倍率行保留在源码中作为兜底，但不会出现在榜单上。

构建时 `expandPlans()` 会根据 `stationId` 和 `offerIds` 展开为实际的站点-模型-充值组合，再计算排名。新增模型（如 Grok、Gemini）时，在 `modelRates` 增加对应记录即可；新增站点充值规则时，先增加 `rechargeOffers`，再在倍率记录中引用它。当前未单独提供充值档位的 Claude 参数，按该站点已有充值档位复用；例如 codex for 的 `kiro` 同时适用 140 元捆绑包和 15 元档位，如适用范围不同则只保留对应的 `offerIds`。

首页通过模型 Tab 分开展示榜单。GPT、Claude 等模型各自按每元有效额度独立排名，排名序号不会跨模型合并；Tab 内的渠道筛选只显示当前模型实际存在的渠道。

有效额度与每元有效额度由构建时计算：

```text
有效额度 = 面值 ÷ 倍率
每元有效额度 = 有效额度 ÷ 充值金额
```

排名按每元有效额度的完整数值降序生成，页面展示统一保留两位小数。充值金额或倍率小于等于 0、或为非有限数值的数据不会进入正式排名。状态支持 `active`、`expired`、`unknown`，过期项目仍可保留在数据中并在页面标识；榜单最后一列显示每条记录的更新时间。

## GitHub Pages

`.github/workflows/deploy.yml` 会在 `main` 分支构建并部署 `dist`。工作流会把 `GITHUB_REPOSITORY` 传给 Astro 配置：普通项目仓库自动使用 `/<仓库名>` 作为 `base`，用户名站点仓库 `用户名.github.io` 使用 `/`。

首次启用时，请在仓库 Settings → Pages → Build and deployment 中将 Source 设为 **GitHub Actions**。

如果仓库名是 `用户名.github.io`，默认配置已经适配根路径，无需额外修改。如果站点地址或仓库路径与默认推断不同，可以在构建环境设置：

```text
SITE_URL=https://example.com
BASE_PATH=/custom-path
```

不要在本地开发时手动写死项目仓库路径；本地没有 `GITHUB_REPOSITORY` 时，站点会使用根路径运行。

## 数据说明

当前充值档位由用户从官方网站人工采集，倍率支持通过官网接口自动刷新；最近测评日期为 `2026-08-29`。排行榜只反映给定公式下的数值比较，不构成购买建议，也不代表服务稳定性、模型可用性或长期有效性。
