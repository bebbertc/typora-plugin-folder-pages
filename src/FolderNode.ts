type Path = string;

export class FolderNode {
  private opening = false;

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
      ':scope > .file-library-node[data-is-directory="false"]',
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

      obs.observe(root, {
        subtree: true,
        // Typora может:
        // 1) поменять class на существующей ноде (attributes)
        // 2) пересоздать ноду папки целиком (childList)
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
      });
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

  async expandAndOpenFirstMd(): Promise<void> {
    if (this.opening) return;
    this.opening = true;
    try {
      if (!this.isExpanded()) {
        const expander = this.expander();
        if (expander) this.clickElement(expander);
      }

      await this.waitExpanded();
      await this.waitFirstMdFile();
      this.openFirstMdFile();
    } finally {
      this.opening = false;
    }
  }
}
