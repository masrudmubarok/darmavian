import { useMemo, useRef } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useUiStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { flattenNotes } from "@/utils/tree";
import { CodeMirrorEditor, type ScrollSyncHandle } from "./CodeMirrorEditor";
import { EditorTabs } from "./EditorTabs";
import { StatusBar } from "./StatusBar";
import { ViewModeToggle } from "./ViewModeToggle";
import { PreviewPane } from "@/features/preview/PreviewPane";

export function EditorPanel() {
  const openTabs = useEditorStore((s) => s.openTabs);
  const activePath = useEditorStore((s) => s.activePath);
  const updateContent = useEditorStore((s) => s.updateContent);
  const viewMode = useUiStore((s) => s.viewMode);
  const tree = useWorkspaceStore((s) => s.tree);
  const noteRefs = useMemo(() => flattenNotes(tree), [tree]);

  const activeTab = openTabs.find((t) => t.path === activePath);
  const showEditor = activeTab && (viewMode === "editor" || viewMode === "split");
  const showPreview = activeTab && (viewMode === "preview" || viewMode === "split");

  const editorRef = useRef<ScrollSyncHandle>(null);
  const previewRef = useRef<ScrollSyncHandle>(null);
  const suppress = useRef({ editor: false, preview: false });

  const handleEditorScroll = (line: number) => {
    if (suppress.current.editor) {
      suppress.current.editor = false;
      return;
    }
    if (viewMode !== "split") return;
    suppress.current.preview = true;
    previewRef.current?.scrollToLine(line);
  };

  const handlePreviewScroll = (line: number) => {
    if (suppress.current.preview) {
      suppress.current.preview = false;
      return;
    }
    if (viewMode !== "split") return;
    suppress.current.editor = true;
    editorRef.current?.scrollToLine(line);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border">
        <EditorTabs />
        {activeTab && (
          <div className="shrink-0 pl-2 pr-3">
            <ViewModeToggle />
          </div>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {!activeTab && (
          <div className="flex h-full w-full items-center justify-center text-sm opacity-50">
            Select or create a note to start editing.
          </div>
        )}
        {showEditor && (
          <div className={viewMode === "split" ? "w-1/2 min-w-0 overflow-hidden border-r border-border" : "w-full min-w-0 overflow-hidden"}>
            <CodeMirrorEditor
              key={activeTab!.path}
              ref={editorRef}
              value={activeTab!.content}
              onChange={(content) => updateContent(activeTab!.path, content)}
              onScroll={handleEditorScroll}
              noteRefs={noteRefs}
            />
          </div>
        )}
        {showPreview && (
          <div className={viewMode === "split" ? "w-1/2 min-w-0 overflow-hidden" : "w-full min-w-0 overflow-hidden"}>
            <PreviewPane
              ref={previewRef}
              content={activeTab!.content}
              notePath={activeTab!.path}
              onScroll={handlePreviewScroll}
            />
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
}
