import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useUiStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEditorStore } from "@/stores/editorStore";
import { noteService } from "@/services/noteService";
import { folderService } from "@/services/folderService";
import { importExportService } from "@/services/importExportService";
import { systemService } from "@/services/systemService";
import { PromptModal } from "@/components/PromptModal";

function parentOf(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx === -1 ? path : path.slice(0, idx);
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

type PendingAction =
  | { kind: "newNote"; targetFolder: string }
  | { kind: "newFolder"; targetFolder: string }
  | { kind: "rename"; path: string; isFolder: boolean; currentName: string };

export function ContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const close = useUiStore((s) => s.closeContextMenu);
  const refreshTree = useWorkspaceStore((s) => s.refreshTree);
  const closeTab = useEditorStore((s) => s.closeTab);
  const ref = useRef<HTMLDivElement>(null);
  const [busyError, setBusyError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menu, close]);

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      await refreshTree();
    } catch (err) {
      setBusyError(String(err));
      return;
    }
  };

  const handleConfirm = async (value: string) => {
    if (!pending) return;
    if (pending.kind === "newNote") {
      await run(async () => {
        const path = await noteService.create(pending.targetFolder, value);
        await useEditorStore.getState().openNote(path);
      });
    } else if (pending.kind === "newFolder") {
      await run(() => folderService.create(pending.targetFolder, value).then(() => {}));
    } else if (pending.kind === "rename") {
      await run(() =>
        (pending.isFolder ? folderService.rename(pending.path, value) : noteService.rename(pending.path, value)).then(
          () => {},
        ),
      );
    }
    setPending(null);
  };

  if (!menu) {
    return pending ? <PendingActionModal pending={pending} onConfirm={handleConfirm} onCancel={() => setPending(null)} /> : null;
  }

  const targetFolder = menu.kind === "folder" ? menu.path : parentOf(menu.path);

  return (
    <>
      <div
        ref={ref}
        style={{ top: menu.y, left: menu.x }}
        className="fixed z-50 min-w-[190px] rounded-md border border-border bg-surface py-1 shadow-lg"
      >
        {busyError && (
          <div className="border-b border-border px-3 py-1.5 text-xs text-red-400">{busyError}</div>
        )}
        <MenuItem
          label="New Note"
          onClick={() => {
            setPending({ kind: "newNote", targetFolder });
            close();
          }}
        />
        <MenuItem
          label="New Folder"
          onClick={() => {
            setPending({ kind: "newFolder", targetFolder });
            close();
          }}
        />
        <div className="my-1 border-t border-border" />
        {menu.kind === "folder" && (
          <>
            <MenuItem
              label="Import Files…"
              onClick={() => {
                close();
                void run(() => importExportService.importFiles(targetFolder).then(() => {}));
              }}
            />
            <MenuItem
              label="Import Folder…"
              onClick={() => {
                close();
                void run(() => importExportService.importFolder(targetFolder).then(() => {}));
              }}
            />
            <MenuItem
              label="Import ZIP…"
              onClick={() => {
                close();
                void run(() => importExportService.importZip(targetFolder).then(() => {}));
              }}
            />
            <MenuItem
              label="Export as ZIP…"
              onClick={() => {
                close();
                void importExportService.exportZip(menu.path, baseName(menu.path)).catch((err) => setBusyError(String(err)));
              }}
            />
            <div className="my-1 border-t border-border" />
          </>
        )}
        {menu.kind === "note" && (
          <>
            <MenuItem
              label="Export Note…"
              onClick={() => {
                close();
                void importExportService.exportNote(menu.path).catch((err) => setBusyError(String(err)));
              }}
            />
            <div className="my-1 border-t border-border" />
          </>
        )}
        <MenuItem
          label="Show in Explorer"
          onClick={() => {
            close();
            void systemService.revealInFileManager(menu.path).catch((err) => setBusyError(String(err)));
          }}
        />
        <MenuItem
          label="Move to…"
          onClick={async () => {
            close();
            const destination = await open({ directory: true, multiple: false });
            if (!destination || Array.isArray(destination)) return;
            await run(async () => {
              if (menu.kind === "folder") await folderService.move(menu.path, destination);
              else await noteService.move(menu.path, destination);
            });
          }}
        />
        <MenuItem
          label="Rename"
          onClick={() => {
            setPending({
              kind: "rename",
              path: menu.path,
              isFolder: menu.kind === "folder",
              currentName: menu.path.split(/[\\/]/).pop() ?? "",
            });
            close();
          }}
        />
        <MenuItem
          label="Delete"
          onClick={() =>
            run(async () => {
              const ok = window.confirm(`Move "${menu.path.split(/[\\/]/).pop()}" to Trash?`);
              if (!ok) return;
              if (menu.kind === "note") {
                await noteService.remove(menu.path);
                closeTab(menu.path);
              } else {
                await folderService.remove(menu.path);
              }
              close();
            })
          }
        />
      </div>

      {pending && (
        <PendingActionModal pending={pending} onConfirm={handleConfirm} onCancel={() => setPending(null)} />
      )}
    </>
  );
}

function PendingActionModal({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingAction;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  return (
    <PromptModal
      title={pending.kind === "newNote" ? "New Note" : pending.kind === "newFolder" ? "New Folder" : "Rename"}
      label={pending.kind === "newNote" ? "Note title" : pending.kind === "newFolder" ? "Folder name" : "New name"}
      defaultValue={
        pending.kind === "newNote" ? "Untitled" : pending.kind === "newFolder" ? "New Folder" : pending.currentName
      }
      confirmLabel={pending.kind === "rename" ? "Rename" : "Create"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-alt"
    >
      {label}
    </button>
  );
}
