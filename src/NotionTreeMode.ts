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
    console.log(folders, "!!!!!!!!!!!!!!");
    folders.forEach((folder) => this.applyToFolder(folder));
  }

  private applyToFolder(folderEl: HTMLElement) {
    const children = folderEl.querySelector<HTMLElement>(".file-node-children");
    console.log(children, "???????????????");
    if (!children) return;

    // 1) Скрываем ВСЕ файлы (включая index.md) — без проверок имени
    children
      .querySelectorAll<HTMLElement>(".file-node.file-node-file")
      .forEach((el) => (el.style.display = "none"));

    // 2) Оставляем только папки, но папку assets — скрываем
    children.querySelectorAll<HTMLElement>(".file-node.file-node-folder").forEach((el) => {
      const title = el.querySelector<HTMLElement>(".file-node-title")?.textContent?.trim() ?? "";
      if (title === "assets") {
        el.style.display = "none";
      } else {
        el.style.display = "";
      }
    });
  }
}
