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

## 维护数据

方案原始数据位于 `src/data/plans.ts`，拆成三层目录维护，避免同一中转站或充值档位在不同模型中重复填写：

- `stations`：维护中转站 `id`、名称和官网链接。页面中的中转站名称可直接跳转到对应官网。
- `rechargeOffers`：维护站点的充值金额（人民币）、面值（美元）、`standard` / `bundle` 档位、数据来源、测评日期、备注和状态。
- `modelRates`：维护模型族、渠道、倍率，以及适用充值档位的 `offerIds`；同一站点的多个模型可以复用同一个充值档位。

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

当前数据由用户从官方网站人工采集，最近测评日期为 `2026-08-29`。排行榜只反映给定公式下的数值比较，不构成购买建议，也不代表服务稳定性、模型可用性或长期有效性。
