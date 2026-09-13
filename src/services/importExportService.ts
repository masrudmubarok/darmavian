import { open, save } from "@tauri-apps/plugin-dialog";
import { tauriClient } from "./tauriClient";

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export const importExportService = {
  /** Prompts for one or more .md/.txt files and copies them into `targetFolder`. Returns false if cancelled. */
  async importFiles(targetFolder: string): Promise<boolean> {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Markdown / Text", extensions: ["md", "txt"] }],
    });
    if (!selected) return false;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length === 0) return false;
    await tauriClient.importFiles(targetFolder, paths);
    return true;
  },

  /** Prompts for a folder and copies it (preserving hierarchy) into `targetFolder`. Returns false if cancelled. */
  async importFolder(targetFolder: string): Promise<boolean> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return false;
    await tauriClient.importFolder(targetFolder, selected);
    return true;
  },

  /** Prompts for one or more .zip files and extracts each into its own folder under `targetFolder`. */
  async importZip(targetFolder: string): Promise<boolean> {
    const selected = await open({
      multiple: true,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!selected) return false;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length === 0) return false;
    for (const zipPath of paths) {
      await tauriClient.importZip(targetFolder, zipPath);
    }
    return true;
  },

  /** Prompts for a destination and copies a single note there. Returns false if cancelled. */
  async exportNote(sourcePath: string): Promise<boolean> {
    const dest = await save({
      defaultPath: baseName(sourcePath),
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!dest) return false;
    await tauriClient.exportNote(sourcePath, dest);
    return true;
  },

  /** Prompts for a destination .zip and archives `sourceFolder`'s contents into it. Returns false if cancelled. */
  async exportZip(sourceFolder: string, suggestedName: string): Promise<boolean> {
    const dest = await save({
      defaultPath: `${suggestedName}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!dest) return false;
    await tauriClient.exportZip(sourceFolder, dest);
    return true;
  },
};
