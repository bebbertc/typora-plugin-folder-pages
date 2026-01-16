// Отвечает за скрытие файлов. Поддержание иллюзии "папка = страница" в боковой панели.

import { nodeIsFolder } from "./ActiveFolderHighlighter";

export class NotionTreeLayout {
  private rootSelector = "#file-library-tree";
  private started = false;
  private raf = 0;

  private mo: MutationObserver | null = null;
  private docMo: MutationObserver | null = null;

  private applyAll() {
    const tree = document.querySelector<HTMLElement>(this.rootSelector);
    if (!tree) return;

    // 1) Применяем notion-hide: скрываем файлы и assets
    const folders = Array.from(tree.querySelectorAll<HTMLElement>(".file-library-node")).filter(
      (el) => nodeIsFolder(el),
    );
    folders.forEach((folder) => this.applyToFolder(folder));
  }

  stop() {
    if (!this.started) return;
    this.started = false;

    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;

    this.mo?.disconnect();
    this.mo = null;

    this.docMo?.disconnect();
    this.docMo = null;

    // (опционально) можно ещё вернуть display обратно,
    // но это уже "режим выключили — вернуть как было" и требует хранения previous styles.
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
}
