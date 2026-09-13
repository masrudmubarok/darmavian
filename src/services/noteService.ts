import { tauriClient } from "./tauriClient";
import type { Note } from "@/types/workspace";

function titleFromPath(path: string): string {
  const fileName = path.split(/[\\/]/).pop() ?? path;
  return fileName.replace(/\.md$/i, "");
}

export const noteService = {
  async open(path: string): Promise<Note> {
    const content = await tauriClient.readNote(path);
    return { path, title: titleFromPath(path), content };
  },

  async save(path: string, content: string): Promise<void> {
    await tauriClient.writeNote(path, content);
  },

  async create(folderPath: string, title: string): Promise<string> {
    return tauriClient.createNote(folderPath, title);
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
