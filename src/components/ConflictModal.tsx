import { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";

/**
 * "File changed externally" dialog (plan §25). Mounted once, globally — it
 * reads `conflict` from the editor store itself so nothing needs to pass
 * props down to reach it.
 */
export function ConflictModal() {
  const conflict = useEditorStore((s) => s.conflict);
  const reload = useEditorStore((s) => s.resolveConflictReload);
  const keepCurrent = useEditorStore((s) => s.resolveConflictKeepCurrent);
  const [comparing, setComparing] = useState(false);

  if (!conflict) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="File changed externally"
        className={`rounded-lg border border-border bg-surface p-4 shadow-xl ${comparing ? "w-[720px]" : "w-[360px]"}`}
      >
        <h2 className="mb-1 text-sm font-semibold">File changed externally</h2>
        <p className="mb-3 text-xs opacity-70">
          "{conflict.title}" was modified outside Darmavian, and you have unsaved changes here too.
        </p>

        {comparing && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-xs font-medium opacity-70">Your version (unsaved)</div>
              <pre className="h-64 overflow-auto rounded border border-border bg-surface-alt p-2 text-xs whitespace-pre-wrap">
                {conflict.localContent}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium opacity-70">On disk</div>
              <pre className="h-64 overflow-auto rounded border border-border bg-surface-alt p-2 text-xs whitespace-pre-wrap">
                {conflict.diskContent}
              </pre>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {!comparing && (
            <button
              type="button"
              onClick={() => setComparing(true)}
              className="rounded px-3 py-1.5 text-sm hover:bg-surface-alt"
            >
              Compare
            </button>
          )}
          <button
            type="button"
            onClick={keepCurrent}
            className="rounded px-3 py-1.5 text-sm hover:bg-surface-alt"
          >
            Keep Current
          </button>
          <button
            type="button"
            onClick={reload}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
