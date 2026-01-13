import "./style.scss";
import { Plugin } from "@typora-community-plugin/core";

export default class FolderNotesDebug extends Plugin {
  private onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Только клики внутри file tree
    if (!target.closest("#file-library-tree")) return;

    // Папка = file-library-node с data-is-directory="true"
    const folderNode = target.closest(".file-library-node") as HTMLElement | null;
    if (!folderNode) return;

    if (folderNode.getAttribute("data-is-directory") !== "true") return;

    // 1) Разрешаем дефолтное поведение для стрелки и иконки
    if (target.closest(".file-node-open-state")) return;
    if (target.closest(".file-node-icon")) return;

    // 2) Нас интересует только клик по названию
    const titleEl = target.closest(".file-node-title");
    if (!titleEl) return;

    e.preventDefault();
    e.stopPropagation();

    // контейнер детей папки
    const childrenEl = folderNode.querySelector(".file-node-children");
    if (!childrenEl) return;

    console.log("childrenEl:", childrenEl);
    const fileNode = Array.from(
      childrenEl.querySelectorAll('.file-library-node[data-is-directory="false"][data-path]'),
    ).find((n) => (n.getAttribute("data-path") || "").toLowerCase().endsWith("\\index.md"));

    if (fileNode) {
      const fileTitle = fileNode.querySelector<HTMLElement>(".file-node-title");
      fileTitle?.click();
    }
  };

  onload() {
    console.log("[folder-notes] loaded");
    // capture=true — чтобы отлавливать раньше встроенных обработчиков Typora
    document.addEventListener("click", this.onClick, true);
  }

  onunload() {
    document.removeEventListener("click", this.onClick, true);
  }
}
