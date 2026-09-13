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

  readAssetDataUrl: (path: string) =>
    invoke<string>("read_asset_data_url", { path }),

  importFiles: (targetFolder: string, sourcePaths: string[]) =>
    invoke<void>("import_files", { targetFolder, sourcePaths }),

  importFolder: (targetFolder: string, sourceFolder: string) =>
    invoke<string>("import_folder", { targetFolder, sourceFolder }),

  importZip: (targetFolder: string, zipPath: string) =>
    invoke<string>("import_zip", { targetFolder, zipPath }),

  exportNote: (sourcePath: string, destPath: string) =>
    invoke<void>("export_note", { sourcePath, destPath }),

  exportZip: (sourceFolder: string, destZipPath: string) =>
    invoke<void>("export_zip", { sourceFolder, destZipPath }),

  revealInFileManager: (path: string) =>
    invoke<void>("reveal_in_file_manager", { path }),
};
