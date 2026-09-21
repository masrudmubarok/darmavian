import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import type { SaveStatus } from "@/types/workspace";
import { noteService } from "@/services/noteService";

interface OpenNote {
  path: string;
  title: string;
  content: string;
  /** Last content confirmed to match what's on disk — the baseline for both
   *  the dirty flag and external-change detection (plan §25). */
  savedContent: string;
  isDirty: boolean;
}

export interface ExternalConflict {
  path: string;
  title: string;
  localContent: string;
  diskContent: string;
}

interface EditorState {
  openTabs: OpenNote[];
  activePath: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  conflict: ExternalConflict | null;

  openNote: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  save: (path: string) => Promise<void>;
  checkExternalChange: () => Promise<void>;
  resolveConflictReload: () => void;
  resolveConflictKeepCurrent: () => void;
  restoreSession: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTOSAVE_DEBOUNCE_MS = 500;
const SESSION_KEY = "darmavian:session";

export const useEditorStore = create<EditorState>((set, get) => ({
  openTabs: [],
  activePath: null,
  saveStatus: "idle",
  saveError: null,
  conflict: null,

  openNote: async (path: string) => {
    const existing = get().openTabs.find((t) => t.path === path);
    if (existing) {
      set({ activePath: path });
      return;
    }
    const note = await noteService.open(path);
    set((state) => ({
      openTabs: [...state.openTabs, { ...note, savedContent: note.content, isDirty: false }],
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
        t.path === path ? { ...t, content, isDirty: content !== t.savedContent } : t,
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
          t.path === path ? { ...t, savedContent: t.content, isDirty: false } : t,
        ),
        saveStatus: "saved",
      }));
    } catch (err) {
      set({ saveStatus: "error", saveError: String(err) });
    }
  },

  checkExternalChange: async () => {
    const { activePath, openTabs, conflict } = get();
    if (!activePath || conflict) return;
    const tab = openTabs.find((t) => t.path === activePath);
    if (!tab) return;

    let diskContent: string;
    try {
      diskContent = (await noteService.open(tab.path)).content;
    } catch {
      return;
    }

    if (diskContent === tab.savedContent) return;

    if (tab.content === tab.savedContent) {
      set((state) => ({
        openTabs: state.openTabs.map((t) =>
          t.path === tab.path ? { ...t, content: diskContent, savedContent: diskContent, isDirty: false } : t,
        ),
      }));
      return;
    }

    if (diskContent === tab.content) {
      set((state) => ({
        openTabs: state.openTabs.map((t) => (t.path === tab.path ? { ...t, savedContent: diskContent } : t)),
      }));
      return;
    }

    set({
      conflict: { path: tab.path, title: tab.title, localContent: tab.content, diskContent },
    });
  },

  resolveConflictReload: () => {
    const conflict = get().conflict;
    if (!conflict) return;
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.path === conflict.path
          ? { ...t, content: conflict.diskContent, savedContent: conflict.diskContent, isDirty: false }
          : t,
      ),
      conflict: null,
    }));
  },

  resolveConflictKeepCurrent: () => {
    set({ conflict: null });
  },

  restoreSession: async () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SESSION_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let saved: { paths: string[]; activePath: string | null };
    try {
      saved = JSON.parse(raw);
    } catch {
      return;
    }

    const tabs: OpenNote[] = [];
    for (const path of saved.paths ?? []) {
      try {
        const note = await noteService.open(path);
        tabs.push({ ...note, savedContent: note.content, isDirty: false });
      } catch {
        // File was deleted/moved outside the app since the last session — drop its tab.
      }
    }
    if (tabs.length === 0) return;

    const activePath = tabs.some((t) => t.path === saved.activePath)
      ? saved.activePath
      : tabs[tabs.length - 1].path;
    set({ openTabs: tabs, activePath });
  },
}));

void listen("workspace://changed", () => {
  void useEditorStore.getState().checkExternalChange();
});

let lastSessionSignature = "";
useEditorStore.subscribe((state) => {
  const signature = JSON.stringify({
    paths: state.openTabs.map((t) => t.path),
    activePath: state.activePath,
  });
  if (signature === lastSessionSignature) return;
  lastSessionSignature = signature;
  try {
    localStorage.setItem(SESSION_KEY, signature);
  } catch {
    // Private window / storage disabled — silently skip remembering it.
  }
});
