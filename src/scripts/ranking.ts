type SortKey = 'value' | 'effective' | 'recharge' | 'multiplier' | 'name';

const searchInput = document.querySelector<HTMLInputElement>('#plan-search');
const channelFilter = document.querySelector<HTMLSelectElement>('#channel-filter');
const sortSelect = document.querySelector<HTMLSelectElement>('#sort-select');
const modelTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-model-tab]'));
const rankingPanel = document.querySelector<HTMLElement>('#ranking-panel');
const rankingTitle = document.querySelector<HTMLElement>('#ranking-title');
const tableBody = document.querySelector<HTMLTableSectionElement>('#table-body');
const mobileList = document.querySelector<HTMLElement>('#mobile-list');
const resultCount = document.querySelector<HTMLElement>('#result-count');
const summaryCount = document.querySelector<HTMLElement>('#summary-count');
const summaryTopValue = document.querySelector<HTMLElement>('#summary-top-value');
const summaryNote = document.querySelector<HTMLElement>('#summary-note');
const emptyState = document.querySelector<HTMLElement>('#empty-state');
const sourceLabel = rankingPanel?.dataset.sourceLabel ?? '官方网站人工采集';

const getItems = (container: ParentNode | null): HTMLElement[] =>
  container ? Array.from(container.querySelectorAll<HTMLElement>('[data-plan-item]')) : [];

/** 获取当前激活的模型；没有可用 Tab 时返回空字符串，让页面安全地显示空状态。 */
function getActiveModel(): string {
  return modelTabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.dataset.modelTab ?? '';
}

/** 根据当前模型的 DOM 数据重建渠道选项，避免切换模型后出现无效渠道。 */
function updateChannelOptions(model: string): void {
  if (!channelFilter) return;

  const currentChannel = channelFilter.value;
  const channels = [
    ...new Set(
      getItems(tableBody)
        .filter((item) => item.dataset.model === model)
        .map((item) => item.dataset.channel ?? '')
        .filter(Boolean),
    ),
  ];
  channelFilter.replaceChildren(new Option('全部渠道', 'all'), ...channels.map((channel) => new Option(channel, channel)));
  channelFilter.value = channels.includes(currentChannel) ? currentChannel : 'all';
}

/**
 * 对桌面行和移动卡片执行当前模型的搜索、渠道筛选、排序和可见性更新。
 * 排名序号来自对应模型的构建时排名，切换模型不会与其他模型共享名次。
 */
function updateRanking(): void {
  const query = searchInput?.value.trim().toLocaleLowerCase() ?? '';
  const selectedModel = getActiveModel();
  const selectedChannel = channelFilter?.value ?? 'all';
  const sortKey = (sortSelect?.value ?? 'value') as SortKey;
  const tableItems = getItems(tableBody);
  const mobileItems = getItems(mobileList);
  const allItems = [...tableItems, ...mobileItems];

  const matches = (item: HTMLElement): boolean => {
    const searchText = item.dataset.search ?? item.dataset.name ?? '';
    const channel = item.dataset.channel ?? '';
    return (
      item.dataset.model === selectedModel &&
      (!query || searchText.includes(query)) &&
      (selectedChannel === 'all' || channel === selectedChannel)
    );
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
  allItems.forEach((item) => item.setAttribute('aria-hidden', String(!matches(item))));

  const modelItems = tableItems.filter((item) => item.dataset.model === selectedModel);
  const modelLabel = modelTabs.find((tab) => tab.dataset.modelTab === selectedModel)?.dataset.modelLabel ?? selectedModel;
  const topValue = Math.max(...modelItems.map((item) => Number(item.dataset.value ?? 0)), 0);
  if (rankingTitle) rankingTitle.textContent = `${modelLabel} 方案排名`;
  if (resultCount) resultCount.textContent = `${modelLabel} 显示 ${visibleItems.length} 条记录`;
  if (summaryCount) summaryCount.textContent = String(modelItems.length);
  if (summaryTopValue) summaryTopValue.textContent = topValue.toFixed(2);
  if (summaryNote) summaryNote.textContent = `当前显示 ${modelLabel}，模型独立排名；${sourceLabel}`;
  if (emptyState) emptyState.hidden = visibleItems.length > 0;
}

/** 激活一个模型 Tab，同步无障碍状态、渠道选项和当前榜单内容。 */
function activateModel(tab: HTMLButtonElement): void {
  modelTabs.forEach((modelTab) => modelTab.setAttribute('aria-selected', String(modelTab === tab)));
  rankingPanel?.setAttribute('aria-labelledby', tab.id);
  updateChannelOptions(tab.dataset.modelTab ?? '');
  updateRanking();
}

modelTabs.forEach((tab) => tab.addEventListener('click', () => activateModel(tab)));
searchInput?.addEventListener('input', updateRanking);
channelFilter?.addEventListener('change', updateRanking);
sortSelect?.addEventListener('change', updateRanking);
updateChannelOptions(getActiveModel());
updateRanking();
