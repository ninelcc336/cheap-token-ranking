type Theme = 'light' | 'dark';

const themeStorageKey = 'cheap-token-theme';
const themeToggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const themeIcon = document.querySelector<HTMLElement>('[data-theme-icon]');
const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

/** 只接受主题脚本支持的值，避免把损坏的本地存储内容写回页面状态。 */
function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

/** 读取用户明确保存的主题；读取失败时按未设置处理，不阻断页面交互。 */
function getSavedTheme(): Theme | null {
  try {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    return isTheme(savedTheme) ? savedTheme : null;
  } catch {
    return null;
  }
}

/** 将主题同步到 DOM、浏览器地址栏颜色和切换按钮的无障碍状态。 */
function updateThemeUi(theme: Theme): void {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  if (themeColorMeta) themeColorMeta.content = isDark ? '#09090b' : '#f4f7fa';
  if (themeIcon) themeIcon.textContent = isDark ? '☼' : '☾';
  if (themeToggle) {
    const nextThemeLabel = isDark ? '亮色' : '暗色';
    themeToggle.setAttribute('aria-label', `切换到${nextThemeLabel}主题`);
    themeToggle.title = `切换到${nextThemeLabel}主题`;
    themeToggle.setAttribute('aria-pressed', String(isDark));
  }
}

/** 应用主题并在用户点击切换时保存选择；系统偏好同步时不会覆盖用户选择。 */
function applyTheme(theme: Theme, persist = false): void {
  updateThemeUi(theme);
  if (!persist) return;

  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // 隐私模式或禁用存储时仍保留本次会话的主题切换。
  }
}

const initialTheme: Theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
updateThemeUi(initialTheme);

themeToggle?.addEventListener('click', () => {
  const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark', true);
});

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
/** 仅在用户没有手动选过主题时响应操作系统的深浅色变化。 */
const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
  if (!getSavedTheme()) applyTheme(event.matches ? 'dark' : 'light');
};

systemThemeQuery.addEventListener?.('change', handleSystemThemeChange);
