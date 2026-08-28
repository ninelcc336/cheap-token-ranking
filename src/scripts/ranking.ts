type SortKey = 'value' | 'effective' | 'recharge' | 'multiplier' | 'name';

const searchInput = document.querySelector<HTMLInputElement>('#plan-search');
const typeFilter = document.querySelector<HTMLSelectElement>('#type-filter');
const sortSelect = document.querySelector<HTMLSelectElement>('#sort-select');
const tableBody = document.querySelector<HTMLTableSectionElement>('#table-body');
const mobileList = document.querySelector<HTMLElement>('#mobile-list');
const resultCount = document.querySelector<HTMLElement>('#result-count');
const emptyState = document.querySelector<HTMLElement>('#empty-state');

const getItems = (container: ParentNode | null): HTMLElement[] =>
  container ? Array.from(container.querySelectorAll<HTMLElement>('[data-plan-item]')) : [];

/**
 * 对桌面行和移动卡片执行相同的筛选、排序和可见性更新，保持两种布局的数据状态一致。
 * DOM 中保留服务端渲染内容，因此即使脚本不可用，静态页面仍然可以阅读。
 */
function updateRanking(): void {
  const query = searchInput?.value.trim().toLocaleLowerCase() ?? '';
  const selectedType = typeFilter?.value ?? 'all';
  const sortKey = (sortSelect?.value ?? 'value') as SortKey;
  const allItems = [...getItems(tableBody), ...getItems(mobileList)];
  const tableItems = getItems(tableBody);
  const mobileItems = getItems(mobileList);

  const matches = (item: HTMLElement): boolean => {
    const name = item.dataset.name ?? '';
    const type = item.dataset.type ?? '';
    return (!query || name.includes(query)) && (selectedType === 'all' || type === selectedType);
  };

  const compare = (left: HTMLElement, right: HTMLElement): number => {
    if (sortKey === 'name') {
      return (left.dataset.name ?? '').localeCompare(right.dataset.name ?? '', 'en');
    }
    const leftValue = Number(left.dataset[sortKey] ?? 0);
    const rightValue = Number(right.dataset[sortKey] ?? 0);
    return rightValue - leftValue;
  };

  const visibleItems = tableItems.filter(matches);
  const sortContainer = (items: HTMLElement[], container: ParentNode | null): void => {
    items.sort(compare).forEach((item) => {
      item.hidden = !matches(item);
      if (container) container.append(item);
    });
  };

  sortContainer(tableItems, tableBody);
  sortContainer(mobileItems, mobileList);
  allItems.forEach((item) => {
    item.setAttribute('aria-hidden', String(!matches(item)));
  });

  const visibleCount = visibleItems.length;
  if (resultCount) {
    resultCount.textContent = `显示 ${visibleCount} 个方案`;
  }
  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
  }
}

searchInput?.addEventListener('input', updateRanking);
typeFilter?.addEventListener('change', updateRanking);
sortSelect?.addEventListener('change', updateRanking);
updateRanking();
