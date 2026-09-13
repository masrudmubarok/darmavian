import type { WorkspaceNode } from "@/types/workspace";

export interface NoteRef {
  title: string;
  path: string;
}

/** Flattens the workspace tree into a flat list of notes (title = filename without `.md`). */
export function flattenNotes(nodes: WorkspaceNode[]): NoteRef[] {
  const result: NoteRef[] = [];
  const walk = (list: WorkspaceNode[]) => {
    for (const node of list) {
      if (node.type === "note") {
        result.push({ title: node.name.replace(/\.md$/i, ""), path: node.path });
      } else if (node.children) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return result;
}
