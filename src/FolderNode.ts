type Path = string;

export class FolderNode {
  constructor(private readonly path: Path) {}

  private clickElement(el: HTMLElement): void {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }

  private treeRoot(): HTMLElement | null {
    return document.querySelector("#file-library-tree") as HTMLElement | null;
  }

  get(): HTMLElement | null {
    return document.querySelector(
      `.file-library-node[data-path="${CSS.escape(this.path)}"]`,
    ) as HTMLElement | null;
  }

  isExpanded(): boolean {
    return !!this.get()?.classList.contains("file-node-expanded");
  }

  expander(): HTMLElement | null {
    return this.get()?.querySelector(".file-node-open-state") as HTMLElement | null;
  }

  childrenContainer(): HTMLElement | null {
    return this.get()?.querySelector(".file-node-children") as HTMLElement | null;
  }

  getFirstMdFileNode(): HTMLElement | null {
    const children = this.childrenContainer();
    if (!children) return null;

    return children.querySelector(
      '.file-library-node[data-is-directory="false"]',
    ) as HTMLElement | null;
  }

  openFirstMdFile(): boolean {
    const firstMdNode = this.getFirstMdFileNode();
    if (!firstMdNode) return false;

    const title =
      (firstMdNode.querySelector(".file-node-title") as HTMLElement | null) ?? firstMdNode;

    this.clickElement(title);
    return true;
  }

  /** Ждём, когда папка станет expanded (DOM может перерисоваться, поэтому проверяем по path) */
  waitExpanded(): Promise<void> {
    if (this.isExpanded()) return Promise.resolve();

    const root = this.treeRoot();
    if (!root) return Promise.reject(new Error("file tree root not found"));

    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        if (this.isExpanded()) {
          obs.disconnect();
          resolve();
        }
      });

      obs.observe(root, { attributes: true, subtree: true, attributeFilter: ["class"] });
    });
  }

  /** Ждём, когда внутри появится md-файл */
  waitFirstMdFile(): Promise<void> {
    if (this.getFirstMdFileNode()) return Promise.resolve();

    const root = this.treeRoot();
    if (!root) return Promise.reject(new Error("file tree root not found"));

    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        if (this.getFirstMdFileNode()) {
          obs.disconnect();
          resolve();
        }
      });

      obs.observe(root, { childList: true, subtree: true });
    });
  }

  /** Раскрыть папку (если нужно) и открыть первый md, без таймаутов */
  async expandAndOpenFirstMd(): Promise<void> {
    // 1) если не раскрыта — кликаем по экспандеру
    if (!this.isExpanded()) {
      const expander = this.expander();
      if (expander) this.clickElement(expander);
    }

    // 2) ждём, пока реально станет expanded
    await this.waitExpanded();

    // 3) ждём, пока дорендерится md
    await this.waitFirstMdFile();

    // 4) открываем
    this.openFirstMdFile();
  }
}
