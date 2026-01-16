import "./style.scss";
import { Plugin } from "@typora-community-plugin/core";
import { FolderPageManager } from "./FolderPageManager";
import { nodeIsFolder, ActiveFolderHighlighter } from "./ActiveFolderHighlighter";
import { TreeScrollKeeper } from "./TreeScrollKeeper";
import { NotionTreeLayout } from "./NotionTreeLayout";

export const debugEmoji = "🐛";

export default class FolderNotesDebug extends Plugin {
  private treeScrollKeeper: TreeScrollKeeper | null = null;
  private activeFolderHighlighter: ActiveFolderHighlighter | null = null;
  private notionTreeLayout: NotionTreeLayout | null = null;
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

    // ВАЖНО: мы забираем клик себе, Typora не должна делать toggle сама, никакие другие события не должны сработать
    e.preventDefault();
    e.stopPropagation();
    (e as any).stopImmediatePropagation?.();

    const FOLDER_NODE_PATH = folderNode.getAttribute("data-path")!;
    const folderPageManager = new FolderPageManager(FOLDER_NODE_PATH, this.treeScrollKeeper);
    void folderPageManager.expandAndOpenFirstMd();
  };

  onload() {
    this.treeScrollKeeper = new TreeScrollKeeper();
    this.treeScrollKeeper.start();

    this.activeFolderHighlighter = new ActiveFolderHighlighter();
    this.activeFolderHighlighter.start();

    if (this.NOTION_TREE_MODE_ON) {
      this.notionTreeLayout = new NotionTreeLayout();
      this.notionTreeLayout.start();
    }

    document.addEventListener("click", this.onClick, true);
  }

  onunload() {
    document.removeEventListener("click", this.onClick, true);

    this.notionTreeLayout?.stop();
    this.notionTreeLayout = null;

    this.activeFolderHighlighter?.stop();
    this.activeFolderHighlighter = null;

    this.treeScrollKeeper?.stop();
    this.treeScrollKeeper = null;
  }
}
