/** 复制按钮从同一张卡片里的题目原文节点取文本，避免把长文本再存进 DOM 属性。 */
function initCopyButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-btn]').forEach((button) => {
    const label = button.querySelector<HTMLElement>('[data-copy-label]');
    const originalLabel = label?.textContent ?? '';

    button.addEventListener('click', async () => {
      const prompt = button.closest('[data-iq-card]')?.querySelector<HTMLElement>('.q-prompt-text')?.textContent?.trim();
      if (!prompt || !label) return;

      try {
        await navigator.clipboard.writeText(prompt);
        label.textContent = '已复制 ✓';
        button.classList.add('is-copied');
      } catch {
        label.textContent = '复制失败';
        button.classList.add('is-copied');
      }

      window.setTimeout(() => {
        label.textContent = originalLabel;
        button.classList.remove('is-copied');
      }, 1600);
    });
  });
}

initCopyButtons();

export {};
