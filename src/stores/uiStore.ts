import { create } from "zustand";

export type ViewMode = "editor" | "preview" | "split";

interface UiState {
  theme: "light" | "dark";
  sidebarVisible: boolean;
  viewMode: ViewMode;
  contextMenu: { path: string; kind: "note" | "folder"; x: number; y: number } | null;

  toggleTheme: () => void;
  toggleSidebar: () => void;
  setViewMode: (mode: ViewMode) => void;
  openContextMenu: (menu: UiState["contextMenu"]) => void;
  closeContextMenu: () => void;
}

const THEME_KEY = "darmavian:theme";
const SIDEBAR_KEY = "darmavian:sidebarVisible";
const VIEW_MODE_KEY = "darmavian:viewMode";

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private window / storage disabled — silently skip remembering it.
  }
}

export const useUiStore = create<UiState>((set) => ({
  theme: readStored(THEME_KEY, "light"),
  sidebarVisible: readStored(SIDEBAR_KEY, true),
  viewMode: readStored(VIEW_MODE_KEY, "editor"),
  contextMenu: null,

  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === "dark" ? "light" : "dark";
      writeStored(THEME_KEY, theme);
      return { theme };
    }),
  toggleSidebar: () =>
    set((state) => {
      const sidebarVisible = !state.sidebarVisible;
      writeStored(SIDEBAR_KEY, sidebarVisible);
      return { sidebarVisible };
    }),
  setViewMode: (mode) => {
    writeStored(VIEW_MODE_KEY, mode);
    set({ viewMode: mode });
  },
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
