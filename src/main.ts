import "./style.scss";
import { Plugin } from "@typora-community-plugin/core";
import { FolderNode } from "./FolderNode";
import { nodeIsFolder, NotionTreeMode } from "./NotionTreeMode";

export default class FolderNotesDebug extends Plugin {
  private NOTION_TREE_MODE_ON = true;

  getFolderNodeFromTarget(target: HTMLElement): HTMLElement | null {
    if (!target) return null;

    // Проверяем, что клик был внутри панели библиотеки файлов
    if (!target.closest("#file-library-tree")) return null;

    // Ищем ближайший узел файла или папки
    const node = target.closest(".file-library-node") as HTMLElement | null;
    if (!node) return null;

    // Проверяем, что это папка
    if (!nodeIsFolder(node)) return null;

    // Исключаем стрелку раскрытия/сворачивания
    if (target.closest(".file-node-open-state")) return null;

    return node;
  }

  private onClick = (e: MouseEvent) => {
    // Игнорируем не пользовательские события
    if (!e.isTrusted) return;

    const target = e.target as HTMLElement;
    const folderNode = this.getFolderNodeFromTarget(target);
    if (!folderNode) return;

    // ⚠️ ВАЖНО: мы забираем клик себе, Typora не должна делать toggle сама, никакие другие события не должны сработать
    e.preventDefault();
    e.stopPropagation();
    (e as any).stopImmediatePropagation?.();

    const FOLDER_NODE_PATH = folderNode.getAttribute("data-path")!;
    const folder = new FolderNode(FOLDER_NODE_PATH);
    void folder.expandAndOpenFirstMd();
  };

  onload() {
    // capture оставляем, но теперь мы гасим событие
    document.addEventListener("click", this.onClick, true);

    if (this.NOTION_TREE_MODE_ON) {
      const notionTreeMode = new NotionTreeMode();
      notionTreeMode.start();
    }
  }

  onunload() {
    document.removeEventListener("click", this.onClick, true);
  }
}
