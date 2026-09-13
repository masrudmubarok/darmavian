import { useUiStore, type ViewMode } from "@/stores/uiStore";

const MODES: { mode: ViewMode; label: string; title: string }[] = [
  { mode: "editor", label: "Edit", title: "Editor only" },
  { mode: "split", label: "Split", title: "Editor + Preview" },
  { mode: "preview", label: "Preview", title: "Preview only" },
];

export function ViewModeToggle() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded border border-border p-0.5">
      {MODES.map(({ mode, label, title }) => (
        <button
          key={mode}
          type="button"
          title={title}
          onClick={() => setViewMode(mode)}
          className={`rounded px-2 py-0.5 text-xs ${
            viewMode === mode ? "bg-surface-alt text-accent" : "opacity-70 hover:opacity-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
