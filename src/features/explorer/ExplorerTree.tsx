import type { WorkspaceNode } from "@/types/workspace";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEditorStore } from "@/stores/editorStore";
import { useUiStore } from "@/stores/uiStore";

interface Props {
  nodes: WorkspaceNode[];
  depth?: number;
}

export function ExplorerTree({ nodes, depth = 0 }: Props) {
  const expandedPaths = useWorkspaceStore((s) => s.expandedPaths);
  const toggleExpanded = useWorkspaceStore((s) => s.toggleExpanded);
  const openNote = useEditorStore((s) => s.openNote);
  const activePath = useEditorStore((s) => s.activePath);
  const openContextMenu = useUiStore((s) => s.openContextMenu);

  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <ul role="tree" style={{ paddingLeft: depth === 0 ? 0 : 14 }}>
      {sorted.map((node) => {
        const isFolder = node.type === "folder";
        const isExpanded = expandedPaths.has(node.path);
        const isActive = node.path === activePath;

        return (
          <li key={node.path}>
            <button
              type="button"
              title={node.name}
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
              }`}
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
