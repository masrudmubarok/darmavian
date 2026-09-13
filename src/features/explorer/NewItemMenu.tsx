import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEditorStore } from "@/stores/editorStore";
import { noteService } from "@/services/noteService";
import { folderService } from "@/services/folderService";
import { importExportService } from "@/services/importExportService";
import { PromptModal } from "@/components/PromptModal";

interface Props {
  rootPath: string;
}

type PendingAction = "note" | "folder" | null;

function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? "workspace";
}

/** "+" button next to the workspace header: New Note/Folder and Import/Export at the workspace root. */
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

  const runImport = async (fn: () => Promise<boolean>) => {
    setError(null);
    try {
      const didImport = await fn();
      if (didImport) await refreshTree();
    } catch (err) {
      setError(String(err));
      return;
    }
    setOpen(false);
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
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[190px] rounded-md border border-border bg-surface py-1 shadow-lg">
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
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => void runImport(() => importExportService.importFiles(rootPath))}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-alt"
          >
            Import Files…
          </button>
          <button
            type="button"
            onClick={() => void runImport(() => importExportService.importFolder(rootPath))}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-alt"
          >
            Import Folder…
          </button>
          <button
            type="button"
            onClick={() => void runImport(() => importExportService.importZip(rootPath))}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-alt"
          >
            Import ZIP…
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void importExportService
                .exportZip(rootPath, folderName(rootPath))
                .catch((err) => setError(String(err)));
            }}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-alt"
          >
            Export Workspace as ZIP…
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
