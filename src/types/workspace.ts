export type WorkspaceNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children?: WorkspaceNode[];
    }
  | {
      type: "note";
      name: string;
      path: string;
    };

export interface Note {
  path: string;
  title: string;
  content: string;
}

export interface NoteLink {
  source: string;
  target: string;
}

export interface Tag {
  name: string;
  notes: string[];
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
