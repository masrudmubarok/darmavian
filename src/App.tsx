import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useUiStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEditorStore } from "@/stores/editorStore";
import { ExplorerPanel } from "@/features/explorer/ExplorerPanel";
import { EditorPanel } from "@/features/editor/EditorPanel";
import { ConflictModal } from "@/components/ConflictModal";
import { WindowControls } from "@/components/WindowControls";

const appWindow = getCurrentWindow();

export default function App() {
  const theme = useUiStore((s) => s.theme);
  const sidebarVisible = useUiStore((s) => s.sidebarVisible);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  useEffect(() => {
    void (async () => {
      await useWorkspaceStore.getState().restoreLastWorkspace();
      await useEditorStore.getState().restoreSession();
    })();
  }, []);

  return (
    <div
      data-theme={theme}
      className="flex h-screen w-screen flex-col overflow-hidden bg-surface"
      style={{ color: "var(--color-text)" }}
    >
      {/* Custom titlebar — the window itself is frameless (tauri.conf.json). No app
          name/logo here on purpose: it's redundant with the taskbar/Alt-Tab icon. */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-border">
        <div className="flex h-full items-center pl-1.5">
          <button
            type="button"
            onClick={toggleSidebar}
            title="Toggle sidebar"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-surface-alt"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2.5" width="14" height="11" rx="1.5" stroke="currentColor" />
              <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" />
            </svg>
          </button>
        </div>

        <div
          data-tauri-drag-region
          className="h-full flex-1"
          onDoubleClick={() => void appWindow.toggleMaximize()}
        />

        <div className="flex h-full items-center">
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-surface-alt"
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>
          <div className="mx-2 h-4 w-px bg-border" />
          <WindowControls />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <div className="w-64 shrink-0">
            <ExplorerPanel />
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-hidden">
          <EditorPanel />
        </main>
      </div>
      <ConflictModal />
    </div>
  );
}
