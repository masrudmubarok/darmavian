import { create } from "zustand";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { WorkspaceNode } from "@/types/workspace";
import { workspaceService } from "@/services/workspaceService";

interface WorkspaceState {
  rootPath: string | null;
  tree: WorkspaceNode[];
  expandedPaths: Set<string>;
  isLoading: boolean;
  error: string | null;

  openWorkspace: (rootPath: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  toggleExpanded: (path: string) => void;
}

// Module-scoped rather than in the store's state: it's plumbing for the
// external-change subscription (plan §25), not something the UI reads.
let stopWatching: UnlistenFn | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  rootPath: null,
  tree: [],
  expandedPaths: new Set(),
  isLoading: false,
  error: null,

  openWorkspace: async (rootPath: string) => {
    set({ isLoading: true, error: null });
    try {
      const tree = await workspaceService.readTree(rootPath);
      set({ rootPath, tree, isLoading: false });

      // Replace any previous workspace's subscription with this one, so a
      // file created/edited/deleted outside the app (Explorer, VS Code,
      // git, …) is reflected in the sidebar without user action.
      stopWatching?.();
      stopWatching = null;
      await workspaceService.watch(rootPath);
      stopWatching = await listen("workspace://changed", () => {
        void get().refreshTree();
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  refreshTree: async () => {
    const { rootPath } = get();
    if (!rootPath) return;
    try {
      const tree = await workspaceService.readTree(rootPath);
      set({ tree });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  toggleExpanded: (path: string) => {
    set((state) => {
      const next = new Set(state.expandedPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedPaths: next };
    });
  },
}));
