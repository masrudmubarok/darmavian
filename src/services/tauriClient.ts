import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceNode } from "@/types/workspace";

export const tauriClient = {
  readTree: (rootPath: string) =>
    invoke<WorkspaceNode[]>("read_tree", { rootPath }),

  readNote: (path: string) => invoke<string>("read_note", { path }),

  writeNote: (path: string, content: string) =>
    invoke<void>("write_note", { path, content }),

  createNote: (folderPath: string, title: string) =>
    invoke<string>("create_note", { folderPath, title }),

  createFolder: (parentPath: string, name: string) =>
    invoke<string>("create_folder", { parentPath, name }),

  rename: (path: string, newName: string) =>
    invoke<string>("rename_entry", { path, newName }),

  moveEntry: (sourcePath: string, targetFolderPath: string) =>
    invoke<string>("move_entry", { sourcePath, targetFolderPath }),

  deleteEntry: (path: string) => invoke<void>("delete_entry", { path }),

  watchWorkspace: (rootPath: string) =>
    invoke<void>("watch_workspace", { rootPath }),

  unwatchWorkspace: () => invoke<void>("unwatch_workspace"),
};
