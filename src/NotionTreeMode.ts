import * as path from "path";

export function nodeIsFolder(folderEl: HTMLElement): boolean {
  return folderEl.getAttribute("data-is-directory") === "true";
}

export class NotionTreeMode {
  private rootSelector = "#file-library-tree";
  private raf = 0;

  // чтобы не накапливать observers при hot-reload/dev
  private started = false;
  private mo: MutationObserver | null = null;
  private docMo: MutationObserver | null = null;

  // запоминаем, какую папку пометили active, чтобы аккуратно снять
  private activeFolderPath: string | null = null;

  start() {
    if (this.started) return;
    this.started = true;

    this.applyAll(); // первый прогон

    const root = document.querySelector<HTMLElement>(this.rootSelector);
    if (!root) return;

    this.mo = new MutationObserver(() => this.scheduleApply());
    this.mo.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // Страховочный Observer на всякий случай — если Typora пересоздаёт root целиком
    this.docMo = new MutationObserver(() => {
      const nextRoot = document.querySelector<HTMLElement>(this.rootSelector);
      if (nextRoot && nextRoot !== root) this.scheduleApply();
    });
    this.docMo.observe(document.body, { childList: true, subtree: true });
  }

  private scheduleApply() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.applyAll();
    });
  }

  private applyAll() {
    const tree = document.querySelector<HTMLElement>(this.rootSelector);
    if (!tree) return;

    // 1) Применяем notion-hide: скрываем файлы и assets
    const folders = Array.from(tree.querySelectorAll<HTMLElement>(".file-library-node")).filter(
      (el) => nodeIsFolder(el),
    );
    folders.forEach((folder) => this.applyToFolder(folder));

    // 2) Подсветка активной “папки-страницы”: переносим active с файла на папку
    this.syncActiveFolder(tree);
  }

  private applyToFolder(folderEl: HTMLElement) {
    const childrenNode = folderEl.querySelector<HTMLElement>(".file-node-children");
    if (!childrenNode) return;

    // 1) Скрываем все файлы внутри папки
    const files = Array.from(
      childrenNode.querySelectorAll<HTMLElement>(
        ':scope > .file-library-node[data-is-directory="false"]',
      ),
    );
    files.forEach((el) => {
      el.style.display = "none";
    });

    // 2) Скрываем папку assets (как сервисную)
    const subFolders = Array.from(
      childrenNode.querySelectorAll<HTMLElement>(
        ':scope > .file-library-node[data-is-directory="true"]',
      ),
    );
    subFolders.forEach((folder) => {
      const titleEl = folder.querySelector(".file-node-title-name-part");
      const title = titleEl?.textContent?.trim() || "";
      if (title === "assets") folder.style.display = "none";
    });
  }

  private syncActiveFolder(tree: HTMLElement) {
    // активный файл (md) Typora помечает как .active (ты это в DevTools видел)
    const activeFileNode = tree.querySelector<HTMLElement>(
      '.file-library-node[data-is-directory="false"].active',
    );

    if (!activeFileNode) {
      this.clearActiveFolder(tree);
      return;
    }

    const filePath = activeFileNode.getAttribute("data-path") ?? "";
    if (!filePath) {
      this.clearActiveFolder(tree);
      return;
    }

    const folderPath = path.dirname(filePath);
    if (this.activeFolderPath === folderPath) return;

    this.clearActiveFolder(tree);

    const folderNode = tree.querySelector<HTMLElement>(
      `.file-library-node[data-is-directory="true"][data-path="${CSS.escape(folderPath)}"]`,
    );
    if (!folderNode) return;

    // ⚡️ важное: используем нативный class "active", чтобы тема подсвечивала как обычно
    folderNode.classList.add("active");
    this.activeFolderPath = folderPath;
  }

  private clearActiveFolder(tree: HTMLElement) {
    if (!this.activeFolderPath) return;

    const prev = tree.querySelector<HTMLElement>(
      `.file-library-node[data-is-directory="true"].active[data-path="${CSS.escape(
        this.activeFolderPath,
      )}"]`,
    );
    prev?.classList.remove("active");

    this.activeFolderPath = null;
  }
}
