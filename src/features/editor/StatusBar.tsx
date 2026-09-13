import { useEditorStore } from "@/stores/editorStore";

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved ✓",
  error: "Save failed ⚠",
};

export function StatusBar() {
  const activePath = useEditorStore((s) => s.activePath);
  const openTabs = useEditorStore((s) => s.openTabs);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const saveError = useEditorStore((s) => s.saveError);

  const activeTab = openTabs.find((t) => t.path === activePath);

  return (
    <div className="flex items-center justify-between border-t border-border bg-surface px-3 py-1 text-xs opacity-80">
      <span className={saveStatus === "error" ? "text-red-400" : ""}>
        {STATUS_LABEL[saveStatus]}
        {saveStatus === "error" && saveError ? ` — ${saveError}` : ""}
      </span>
      <span>
        {activeTab ? `Markdown · ${wordCount(activeTab.content)} words · UTF-8` : ""}
      </span>
    </div>
  );
}
