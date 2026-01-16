// Подсвечивает в боковой панели папку, соответствующую открытому файлу

import * as path from "path";

export function nodeIsFolder(folderEl: HTMLElement): boolean {
  return folderEl.getAttribute("data-is-directory") === "true";
}

export class ActiveFolderHighlighter {
  private rootSelector = "#file-library-tree";
  private raf = 0;

  // чтобы не накапливать observers при hot-reload/dev
  private started = false;
  private mo: MutationObserver | null = null;
  private docMo: MutationObserver | null = null;

  // запоминаем, какую папку пометили active, чтобы аккуратно снять
  private activeFolderPath: string | null = null;

  stop() {
    // идемпотентность
    if (!this.started) return;
    this.started = false;

    // raf
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;

    // observers
    this.mo?.disconnect();
    this.mo = null;

    this.docMo?.disconnect();
    this.docMo = null;

    // убрать active, который мы могли повесить на папку
    const tree = document.querySelector<HTMLElement>(this.rootSelector);
    if (tree) this.clearActiveFolder(tree);
  }

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

    // 2) Подсветка активной “папки-страницы”: переносим active с файла на папку
    this.syncActiveFolder(tree);
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
