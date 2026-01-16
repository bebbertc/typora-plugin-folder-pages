const debugEmoji = "🐛";

const MODE_BY_DATA_ID = {
  "core.file-explorer": "folders-tree",
  "core.search": "search",
  "core.outline": "outline",
} as const;

type SidebarMode = (typeof MODE_BY_DATA_ID)[keyof typeof MODE_BY_DATA_ID] | "unknown";

type SidebarModeDataId = keyof typeof MODE_BY_DATA_ID;

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    const style = getComputedStyle(cur);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") && cur.scrollHeight > cur.clientHeight;

    if (isScrollable) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function restoreScroll(scrollEl: HTMLElement, top: number) {
  // Typora может сбросить scroll несколько раз подряд — восстанавливаем несколько кадров
  let frames = 0;

  const tick = () => {
    scrollEl.scrollTop = top;
    frames += 1;
    if (frames < 10) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

type SidebarModeListener = (prev: SidebarMode, next: SidebarMode) => void;

export class Sidebar {
  private treeScrollTop = 0;
  private treeScrollEl: HTMLElement | null = null;
  private onTreeScrollBound = () => this.onTreeScroll();
  private treeScrollRaf = 0;

  private rootSelector = "#file-library-tree";

  private currentMode: SidebarMode = "unknown";
  private modeListeners = new Set<SidebarModeListener>();

  private raf: number = 0;

  private subscribeToModeChange(fn: SidebarModeListener) {
    this.modeListeners.add(fn);
    return () => this.modeListeners.delete(fn); // unsubscribe
  }

  private setMode(next: SidebarMode) {
    if (next === this.currentMode) return;

    const prev = this.currentMode;
    this.currentMode = next;

    for (const fn of this.modeListeners) {
      fn(prev, next);
    }
  }

  private getRootElement(): HTMLElement | null {
    return document.querySelector<HTMLElement>(this.rootSelector);
  }

  private getSidebarModesPanelElement(): HTMLElement | null {
    return document.querySelector<HTMLElement>("header .typ-ribbon");
  }

  public start() {
    this.subscribeToSidebarModesChanges();
    this.subscribeToModeChange((prev, next) => this.modeChangeSubscriber(prev, next));
    this.syncSidebarMode();
  }

  private subscribeToSidebarModesChanges() {
    const sidebarModesPanel = this.getSidebarModesPanelElement();
    if (!sidebarModesPanel) return;

    const observer = new MutationObserver(() => this.scheduleSync());

    observer.observe(sidebarModesPanel, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
  }

  private isSidebarModeDataId(v: string): v is SidebarModeDataId {
    return v in MODE_BY_DATA_ID;
  }

  private scheduleSync() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.syncSidebarMode();
    });
  }

  private getTreeScrollEl(): HTMLElement | null {
    const tree = this.getRootElement();
    return findScrollParent(tree);
  }

  private attachTreeScrollListener() {
    const el = this.getTreeScrollEl();
    if (!el) return;

    if (this.treeScrollEl === el) return; // уже на том же элементе

    this.detachTreeScrollListener();
    this.treeScrollEl = el;

    // сразу снимем актуальное значение
    this.treeScrollTop = el.scrollTop;

    el.addEventListener("scroll", this.onTreeScrollBound, { passive: true });
  }

  private detachTreeScrollListener() {
    if (!this.treeScrollEl) return;
    this.treeScrollEl.removeEventListener("scroll", this.onTreeScrollBound);
    this.treeScrollEl = null;
    if (this.treeScrollRaf) cancelAnimationFrame(this.treeScrollRaf);
    this.treeScrollRaf = 0;
  }

  private onTreeScroll() {
    const el = this.treeScrollEl;
    if (!el) return;

    // rAF-дедуп, чтобы не писать 120 раз в секунду
    if (this.treeScrollRaf) return;
    this.treeScrollRaf = requestAnimationFrame(() => {
      this.treeScrollRaf = 0;
      if (this.treeScrollEl) this.treeScrollTop = this.treeScrollEl.scrollTop;
    });
  }

  private syncSidebarMode() {
    const sidebarModesPanelElement = this.getSidebarModesPanelElement();
    if (!sidebarModesPanelElement) return;

    const activeModeButton =
      sidebarModesPanelElement.querySelector<HTMLElement>(".typ-ribbon-item.active");

    const rawMode = activeModeButton?.getAttribute("data-id");
    const prevMode = this.currentMode;
    const nextMode: SidebarMode =
      rawMode && this.isSidebarModeDataId(rawMode) ? MODE_BY_DATA_ID[rawMode] : "unknown";

    if (nextMode === prevMode) return;
    this.setMode(nextMode);
  }

  private modeChangeSubscriber(prevMode: SidebarMode, nextMode: SidebarMode) {
    if (prevMode === "folders-tree") {
      this.detachTreeScrollListener();
    }

    if (nextMode === "folders-tree") {
      this.attachTreeScrollListener();

      const el = this.getTreeScrollEl();
      if (el) restoreScroll(el, this.treeScrollTop);
    }
  }
}
