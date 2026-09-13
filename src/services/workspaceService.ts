import { open } from "@tauri-apps/plugin-dialog";
import { tauriClient } from "./tauriClient";
import type { WorkspaceNode } from "@/types/workspace";

export const workspaceService = {
  /** Opens the native folder picker and returns the chosen path, or null if cancelled. */
  async pickWorkspace(): Promise<string | null> {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;
    return selected;
  },

  async readTree(rootPath: string): Promise<WorkspaceNode[]> {
    return tauriClient.readTree(rootPath);
  },

  /** Starts watching `rootPath` for external changes; replaces any previous watch. */
  async watch(rootPath: string): Promise<void> {
    await tauriClient.watchWorkspace(rootPath);
  },
};
