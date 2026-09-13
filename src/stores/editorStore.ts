import { create } from "zustand";
import type { SaveStatus } from "@/types/workspace";
import { noteService } from "@/services/noteService";

interface OpenNote {
  path: string;
  title: string;
  content: string;
  isDirty: boolean;
}

interface EditorState {
  openTabs: OpenNote[];
  activePath: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;

  openNote: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  save: (path: string) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTOSAVE_DEBOUNCE_MS = 500;

export const useEditorStore = create<EditorState>((set, get) => ({
  openTabs: [],
  activePath: null,
  saveStatus: "idle",
  saveError: null,

  openNote: async (path: string) => {
    const existing = get().openTabs.find((t) => t.path === path);
    if (existing) {
      set({ activePath: path });
      return;
    }
    const note = await noteService.open(path);
    set((state) => ({
      openTabs: [...state.openTabs, { ...note, isDirty: false }],
      activePath: path,
    }));
  },

  closeTab: (path: string) => {
    set((state) => {
      const openTabs = state.openTabs.filter((t) => t.path !== path);
      const activePath =
        state.activePath === path
          ? (openTabs[openTabs.length - 1]?.path ?? null)
          : state.activePath;
      return { openTabs, activePath };
    });
  },

  setActive: (path: string) => set({ activePath: path }),

  updateContent: (path: string, content: string) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.path === path ? { ...t, content, isDirty: true } : t,
      ),
    }));

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void get().save(path);
    }, AUTOSAVE_DEBOUNCE_MS);
  },

  save: async (path: string) => {
    const tab = get().openTabs.find((t) => t.path === path);
    if (!tab) return;
    set({ saveStatus: "saving", saveError: null });
    try {
      await noteService.save(path, tab.content);
      set((state) => ({
        openTabs: state.openTabs.map((t) =>
          t.path === path ? { ...t, isDirty: false } : t,
        ),
        saveStatus: "saved",
      }));
    } catch (err) {
      set({ saveStatus: "error", saveError: String(err) });
    }
  },
}));
