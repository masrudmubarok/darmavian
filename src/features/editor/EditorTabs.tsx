import { useEditorStore } from "@/stores/editorStore";

export function EditorTabs() {
  const openTabs = useEditorStore((s) => s.openTabs);
  const activePath = useEditorStore((s) => s.activePath);
  const setActive = useEditorStore((s) => s.setActive);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (openTabs.length === 0) return null;

  return (
    <div className="flex flex-1 overflow-x-auto bg-surface">
      {openTabs.map((tab) => {
        const isActive = tab.path === activePath;
        return (
          <div
            key={tab.path}
            onClick={() => setActive(tab.path)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 py-1.5 text-sm ${
              isActive ? "bg-surface-alt text-accent" : "opacity-70 hover:opacity-100"
            }`}
          >
            <span>
              {tab.title}
              {tab.isDirty ? " •" : ""}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
              className="rounded px-1 text-xs hover:bg-surface"
              aria-label={`Close ${tab.title}`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
