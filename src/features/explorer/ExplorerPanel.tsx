import { useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { workspaceService } from "@/services/workspaceService";
import { noteService } from "@/services/noteService";
import { folderService } from "@/services/folderService";
import { ExplorerTree, DND_MIME, type DraggedNode } from "./ExplorerTree";
import { ContextMenu } from "./ContextMenu";
import { NewItemMenu } from "./NewItemMenu";

function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

export function ExplorerPanel() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const tree = useWorkspaceStore((s) => s.tree);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const error = useWorkspaceStore((s) => s.error);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const refreshTree = useWorkspaceStore((s) => s.refreshTree);
  const [rootDragOver, setRootDragOver] = useState(false);

  const handlePick = async () => {
    const path = await workspaceService.pickWorkspace();
    if (path) await openWorkspace(path);
  };

  return (
    <div className="flex h-full flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span
          className="truncate text-xs font-semibold uppercase tracking-wide opacity-70"
          title={rootPath ?? undefined}
        >
          {rootPath ? folderName(rootPath) : "Workspace"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePick}
            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-alt"
          >
            Open…
          </button>
          {rootPath && <NewItemMenu rootPath={rootPath} />}
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-1 py-2 ${rootDragOver ? "bg-surface-alt" : ""}`}
        onDragOver={(e) => {
          if (!rootPath || !e.dataTransfer.types.includes(DND_MIME)) return;
          e.preventDefault();
          setRootDragOver(true);
        }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={(e) => {
          setRootDragOver(false);
          if (!rootPath) return;
          const raw = e.dataTransfer.getData(DND_MIME);
          if (!raw) return;
          e.preventDefault();
          const dragged = JSON.parse(raw) as DraggedNode;
          void (async () => {
            try {
              if (dragged.kind === "folder") await folderService.move(dragged.path, rootPath);
              else await noteService.move(dragged.path, rootPath);
              await refreshTree();
            } catch (err) {
              useWorkspaceStore.setState({ error: String(err) });
            }
          })();
        }}
      >
        {!rootPath && (
          <p className="px-2 text-sm opacity-60">
            No workspace open. Click "Open…" to choose a folder.
          </p>
        )}
        {isLoading && <p className="px-2 text-sm opacity-60">Loading…</p>}
        {error && <p className="px-2 text-sm text-red-400">{error}</p>}
        {rootPath && !isLoading && <ExplorerTree nodes={tree} />}
      </div>

      <ContextMenu />
    </div>
  );
}
