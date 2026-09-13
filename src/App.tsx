import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { ExplorerPanel } from "@/features/explorer/ExplorerPanel";
import { EditorPanel } from "@/features/editor/EditorPanel";
import { ConflictModal } from "@/components/ConflictModal";

export default function App() {
  const theme = useUiStore((s) => s.theme);
  const sidebarVisible = useUiStore((s) => s.sidebarVisible);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  useEffect(() => {
    void useWorkspaceStore.getState().restoreLastWorkspace();
  }, []);

  return (
    <div
      data-theme={theme}
      className="flex h-screen w-screen flex-col overflow-hidden bg-surface"
      style={{ color: "var(--color-text)" }}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded px-2 py-0.5 text-sm hover:bg-surface-alt"
            title="Toggle sidebar"
          >
            ☰
          </button>
          <span className="text-sm font-semibold">Darmavian</span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded px-2 py-0.5 text-sm hover:bg-surface-alt"
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>
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
