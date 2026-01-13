export function nodeIsFolder(folderEl: HTMLElement): boolean {
  return folderEl.getAttribute("data-is-directory") === "true";
}

export class NotionTreeMode {
  private rootSelector = "#file-library-tree";
  private raf = 0;

  start() {
    this.applyAll(); // первый прогон

    const root = document.querySelector<HTMLElement>(this.rootSelector);
    if (!root) return;

    const mo = new MutationObserver(() => this.scheduleApply());
    mo.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // на всякий случай — если Typora пересоздаёт root целиком
    // (можно убрать, если лишнее)
    const docMo = new MutationObserver(() => {
      const nextRoot = document.querySelector<HTMLElement>(this.rootSelector);
      if (nextRoot && nextRoot !== root) {
        this.scheduleApply();
      }
    });
    docMo.observe(document.body, { childList: true, subtree: true });
  }

  private scheduleApply() {
    console.log("scheduleApply");
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.applyAll();
    });
  }

  private applyAll() {
    const tree = document.querySelector<HTMLElement>(this.rootSelector);
    if (!tree) return;

    // Пробегаем по всем “узлам папок”, у которых есть children-контейнер
    const folders = Array.from(tree.querySelectorAll<HTMLElement>(".file-library-node")).filter(
      (folderEl: HTMLElement) => nodeIsFolder(folderEl),
    );
    folders.forEach((folder) => this.applyToFolder(folder));
  }

  private applyToFolder(folderEl: HTMLElement) {
    const childrenNode = folderEl.querySelector<HTMLElement>(".file-node-children");
    if (!childrenNode) return;

    const notFoldersArray = Array.from(
      childrenNode.querySelectorAll(':scope > .file-library-node[data-is-directory="false"]'),
    );
    // 1) Скрываем все файлы внутри папки
    notFoldersArray.forEach((el: HTMLElement) => {
      // Скрываем файл
      el.style.display = "none";
    });

    const foldersArray = Array.from(
      childrenNode.querySelectorAll(':scope > .file-library-node[data-is-directory="true"]'),
    );
    foldersArray.forEach((folder: HTMLElement) => {
      const folderTitle = folder.querySelector(".file-node-title-name-part");
      const tittle = folderTitle?.textContent?.trim() || "Unnamed";
      if (tittle === "assets") {
        folder.style.display = "none";
      }
    });
  }
}
