import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEditorStore } from "@/stores/editorStore";
import { noteService } from "@/services/noteService";
import { folderService } from "@/services/folderService";
import { PromptModal } from "@/components/PromptModal";

interface Props {
  rootPath: string;
}

type PendingAction = "note" | "folder" | null;

/** "+" button next to the workspace header: quick New Note / New Folder at the workspace root. */
export function NewItemMenu({ rootPath }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const refreshTree = useWorkspaceStore((s) => s.refreshTree);
  const openNote = useEditorStore((s) => s.openNote);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleConfirm = async (title: string) => {
    try {
      if (pending === "note") {
        const path = await noteService.create(rootPath, title);
        await refreshTree();
        await openNote(path);
      } else if (pending === "folder") {
        await folderService.create(rootPath, title);
        await refreshTree();
      }
      setPending(null);
      setOpen(false);
    } catch (err) {
      setError(String(err));
      setPending(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen((v) => !v);
        }}
        title="New…"
        aria-label="New note or folder"
        className="rounded px-1.5 py-0.5 text-sm leading-none hover:bg-surface-alt"
      >
        +
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-border bg-surface py-1 shadow-lg">
          {error && (
            <div className="border-b border-border px-3 py-1.5 text-xs text-red-400">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => setPending("note")}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-alt"
          >
            <span>📄</span> New Note
          </button>
          <button
            type="button"
            onClick={() => setPending("folder")}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-alt"
          >
            <span>📁</span> New Folder
          </button>
        </div>
      )}

      {pending && (
        <PromptModal
          title={pending === "note" ? "New Note" : "New Folder"}
          label={pending === "note" ? "Note title" : "Folder name"}
          defaultValue={pending === "note" ? "Untitled" : "New Folder"}
          confirmLabel="Create"
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
