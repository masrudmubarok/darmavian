import { tauriClient } from "./tauriClient";

export const folderService = {
  async create(parentPath: string, name: string): Promise<string> {
    return tauriClient.createFolder(parentPath, name);
  },

  async rename(path: string, newName: string): Promise<string> {
    return tauriClient.rename(path, newName);
  },

  async move(path: string, targetFolderPath: string): Promise<string> {
    return tauriClient.moveEntry(path, targetFolderPath);
  },

  async remove(path: string): Promise<void> {
    await tauriClient.deleteEntry(path);
  },
};
