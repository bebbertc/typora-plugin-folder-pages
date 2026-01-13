import "./style.scss";
import { Plugin } from "@typora-community-plugin/core";
import { FolderNode } from "./FolderNode";

function getFolderNodeFromTarget(target: HTMLElement): HTMLElement | null {
  if (!target) return null;

  // Проверяем, что клик был внутри панели библиотеки файлов
  if (!target.closest("#file-library-tree")) return null;

  // Ищем ближайший узел файла или папки
  const node = target.closest(".file-library-node") as HTMLElement | null;
  if (!node) return null;

  // Проверяем, что это папка
  if (node.getAttribute("data-is-directory") !== "true") return null;

  if (node.closest(".file-node-open-state")) return null;

  return node;
}

export default class FolderNotesDebug extends Plugin {
  private onClick = (e: MouseEvent) => {
    const folderNode = getFolderNodeFromTarget(e.target as HTMLElement);
    if (!folderNode) return;

    // Ключ по которому можно найти узел папки
    const FOLDER_NODE_PATH = folderNode.getAttribute("data-path")!;

    const folder = new FolderNode(FOLDER_NODE_PATH);
    folder.expandAndOpenFirstMd();
  };

  onload() {
    console.log("[folder-notes] loaded");
    document.addEventListener("click", this.onClick, true);
  }

  onunload() {
    document.removeEventListener("click", this.onClick, true);
  }
}
