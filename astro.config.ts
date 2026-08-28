import { defineConfig } from 'astro/config';

const repository = process.env.GITHUB_REPOSITORY;
const [owner, repositoryName] = repository?.split('/') ?? [];
const isUserSite = Boolean(
  owner && repositoryName?.toLowerCase() === `${owner.toLowerCase()}.github.io`,
);
const base = process.env.BASE_PATH ?? (repositoryName && !isUserSite ? `/${repositoryName}` : '/');
const site =
  process.env.SITE_URL ??
  (owner ? `https://${owner}.github.io${base === '/' ? '' : base}` : 'http://localhost:4321');

export default defineConfig({
  // GitHub Actions 会根据仓库环境自动计算项目站点的路径前缀。
  site,
  base,
  output: 'static',
});
