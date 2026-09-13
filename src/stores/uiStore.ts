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

export const useUiStore = create<UiState>((set) => ({
  theme: "light",
  sidebarVisible: true,
  viewMode: "editor",
  contextMenu: null,

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  toggleSidebar: () =>
    set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  setViewMode: (mode) => set({ viewMode: mode }),
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
