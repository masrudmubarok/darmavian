import { create } from "zustand";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { WorkspaceNode } from "@/types/workspace";
import { workspaceService } from "@/services/workspaceService";

const LAST_WORKSPACE_KEY = "darmavian:lastWorkspace";
const EXPANDED_PATHS_KEY = "darmavian:expandedPaths";

function readExpandedPaths(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_PATHS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

interface WorkspaceState {
  rootPath: string | null;
  tree: WorkspaceNode[];
  expandedPaths: Set<string>;
  isLoading: boolean;
  error: string | null;

  openWorkspace: (rootPath: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  toggleExpanded: (path: string) => void;
  restoreLastWorkspace: () => Promise<void>;
}

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
      set({ rootPath, tree, isLoading: false, expandedPaths: readExpandedPaths() });

      try {
        localStorage.setItem(LAST_WORKSPACE_KEY, rootPath);
      } catch {
        // Private window / storage disabled — silently skip remembering it.
      }

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
      try {
        localStorage.setItem(EXPANDED_PATHS_KEY, JSON.stringify([...next]));
      } catch {
        // Private window / storage disabled — silently skip remembering it.
      }
      return { expandedPaths: next };
    });
  },

  restoreLastWorkspace: async () => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_WORKSPACE_KEY);
    } catch {
      return;
    }
    if (last) await get().openWorkspace(last);
  },
}));
