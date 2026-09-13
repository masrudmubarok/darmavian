import { useState } from "react";
import type { WorkspaceNode } from "@/types/workspace";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEditorStore } from "@/stores/editorStore";
import { useUiStore } from "@/stores/uiStore";
import { noteService } from "@/services/noteService";
import { folderService } from "@/services/folderService";

export const DND_MIME = "application/x-darmavian-node";

export interface DraggedNode {
  path: string;
  kind: "note" | "folder";
}

interface Props {
  nodes: WorkspaceNode[];
  depth?: number;
}

export function ExplorerTree({ nodes, depth = 0 }: Props) {
  const expandedPaths = useWorkspaceStore((s) => s.expandedPaths);
  const toggleExpanded = useWorkspaceStore((s) => s.toggleExpanded);
  const refreshTree = useWorkspaceStore((s) => s.refreshTree);
  const openNote = useEditorStore((s) => s.openNote);
  const activePath = useEditorStore((s) => s.activePath);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const moveInto = async (dragged: DraggedNode, targetFolderPath: string) => {
    if (dragged.path === targetFolderPath) return;
    try {
      if (dragged.kind === "folder") await folderService.move(dragged.path, targetFolderPath);
      else await noteService.move(dragged.path, targetFolderPath);
      await refreshTree();
    } catch (err) {
      useWorkspaceStore.setState({ error: String(err) });
    }
  };

  return (
    <ul role="tree" style={{ paddingLeft: depth === 0 ? 0 : 14 }}>
      {sorted.map((node) => {
        const isFolder = node.type === "folder";
        const isExpanded = expandedPaths.has(node.path);
        const isActive = node.path === activePath;
        const isDragOver = isFolder && dragOverPath === node.path;

        return (
          <li key={node.path}>
            <button
              type="button"
              title={node.name}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(
                  DND_MIME,
                  JSON.stringify({ path: node.path, kind: node.type } satisfies DraggedNode),
                );
              }}
              onDragOver={
                isFolder
                  ? (e) => {
                      if (!e.dataTransfer.types.includes(DND_MIME)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverPath(node.path);
                    }
                  : undefined
              }
              onDragLeave={
                isFolder
                  ? () => setDragOverPath((p) => (p === node.path ? null : p))
                  : undefined
              }
              onDrop={
                isFolder
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverPath(null);
                      const raw = e.dataTransfer.getData(DND_MIME);
                      if (!raw) return;
                      void moveInto(JSON.parse(raw) as DraggedNode, node.path);
                    }
                  : undefined
              }
              onClick={() =>
                isFolder ? toggleExpanded(node.path) : openNote(node.path)
              }
              onContextMenu={(e) => {
                e.preventDefault();
                openContextMenu({
                  path: node.path,
                  kind: isFolder ? "folder" : "note",
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-surface-alt ${
                isActive ? "bg-surface-alt text-accent" : ""
              } ${isDragOver ? "outline outline-2 outline-accent -outline-offset-2" : ""}`}
            >
              <span className="w-3 shrink-0 text-[10px] opacity-60">
                {isFolder ? (isExpanded ? "▼" : "▶") : ""}
              </span>
              <span className="shrink-0 text-sm leading-none">
                {isFolder ? (isExpanded ? "📂" : "📁") : "📄"}
              </span>
              <span className="truncate">{node.name}</span>
            </button>
            {isFolder && isExpanded && node.children && (
              <ExplorerTree nodes={node.children} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
