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

type SidebarModeListener = (prev: SidebarMode, next: SidebarMode) => void;

export class TreeScrollKeeper {
  private isRestoring = false;
  private restoreToken = 0;
  private treeScrollTop = 0;
  private treeScrollEl: HTMLElement | null = null;
  private onTreeScrollBound = () => this.onTreeScroll();
  private treeScrollRaf = 0;

  private rootSelector = "#file-library-tree";

  private currentMode: SidebarMode = "unknown";
  private modeListeners = new Set<SidebarModeListener>();

  private raf: number = 0;
  private started = false;

  private unsubscribeModeChange: (() => void) | null = null;
  private observer: MutationObserver | null = null;

  private subscribeToModeChange(fn: SidebarModeListener) {
    this.modeListeners.add(fn);
    return () => this.modeListeners.delete(fn); // unsubscribe
  }

  public restoreScroll(scrollEl: HTMLElement, top: number) {
    const token = ++this.restoreToken;
    this.isRestoring = true;

    scrollEl.scrollTop = top;

    let frames = 0;
    const tick = () => {
      if (token !== this.restoreToken) return;

      scrollEl.scrollTop = top;
      frames += 1;

      if (frames < 10) {
        requestAnimationFrame(tick);
      } else {
        this.isRestoring = false;
      }
    };

    requestAnimationFrame(tick);
  }

  private getScrollEl(): HTMLElement | null {
    const tree = document.querySelector<HTMLElement>(this.rootSelector);
    return findScrollParent(tree);
  }

  capture(): number {
    const el = this.getScrollEl();
    return el?.scrollTop ?? 0;
  }

  restore(top: number) {
    const el = this.getScrollEl();
    if (el) this.restoreScroll(el, top);
  }

  runPreservingScroll(action: () => void) {
    const top = this.capture();
    action();
    this.restore(top);
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
    if (this.started) return;
    this.started = true;

    this.subscribeToSidebarModesChanges();

    this.unsubscribeModeChange = this.subscribeToModeChange((prev, next) =>
      this.modeChangeSubscriber(prev, next),
    );

    this.syncSidebarMode();
  }

  public stop() {
    if (!this.started) return;
    this.started = false;

    this.observer?.disconnect();
    this.observer = null;

    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;

    this.detachTreeScrollListener();

    this.unsubscribeModeChange?.();
    this.unsubscribeModeChange = null;

    this.modeListeners.clear();

    this.currentMode = "unknown";
  }

  private subscribeToSidebarModesChanges() {
    const sidebarModesPanel = this.getSidebarModesPanelElement();
    if (!sidebarModesPanel) return;

    this.observer?.disconnect();
    this.observer = new MutationObserver(() => this.scheduleSync());

    this.observer.observe(sidebarModesPanel, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
      childList: true,
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

    if (this.treeScrollEl === el) return;

    this.detachTreeScrollListener();
    this.treeScrollEl = el;

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

    if (this.isRestoring) return;

    const nextTop = el.scrollTop;

    if (nextTop === 0 && this.treeScrollTop > 0) {
      const expectedPrev = this.treeScrollTop;

      requestAnimationFrame(() => {
        if (!this.treeScrollEl) return;
        if (this.isRestoring) return;

        const stableTop = this.treeScrollEl.scrollTop;

        if (stableTop === 0) {
          this.treeScrollTop = 0;
        } else {
          this.treeScrollTop = expectedPrev;
        }
      });

      return;
    }

    this.treeScrollTop = nextTop;
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
    if (nextMode === "search" || nextMode === "folders-tree") {
      this.attachTreeScrollListener();

      const el = this.getTreeScrollEl();
      if (el) this.restoreScroll(el, this.treeScrollTop);
    }

    if (nextMode === "outline") {
      this.detachTreeScrollListener();
    }
  }
}
