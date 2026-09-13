import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { search, searchKeymap } from "@codemirror/search";
import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { livePreview } from "./livePreview";
import type { NoteRef } from "@/utils/tree";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Fractional 0-indexed source line currently at the top of the viewport. */
  onScroll?: (line: number) => void;
  /** Workspace notes offered as `[[Wiki Link]]` completions. */
  noteRefs?: NoteRef[];
}

export interface ScrollSyncHandle {
  /** Scrolls so the given fractional 0-indexed source line sits at the top. */
  scrollToLine: (line: number) => void;
}

function wikiLinkSource(notesRef: RefObject<NoteRef[]>) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\[\[[^[\]]*/);
    if (!match) return null;
    const query = match.text.slice(2).toLowerCase();
    const options = (notesRef.current ?? [])
      .filter((n) => n.title.toLowerCase().includes(query))
      .slice(0, 50)
      .map((n) => ({ label: n.title, apply: `${n.title}]]`, type: "text" }));
    if (options.length === 0) return null;
    return { from: match.from + 2, options };
  };
}

export const CodeMirrorEditor = forwardRef<ScrollSyncHandle, Props>(function CodeMirrorEditor(
  { value, onChange, onScroll, noteRefs },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const noteRefsRef = useRef<NoteRef[]>(noteRefs ?? []);
  noteRefsRef.current = noteRefs ?? [];

  useImperativeHandle(ref, () => ({
    scrollToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const wholeLine = Math.max(1, Math.min(Math.floor(line) + 1, view.state.doc.lines));
      const fraction = line - (wholeLine - 1);
      const block = view.lineBlockAt(view.state.doc.line(wholeLine).from);
      view.scrollDOM.scrollTop = block.top + fraction * block.height;
    },
  }));

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        search({ top: true }),
        autocompletion({ override: [wikiLinkSource(noteRefsRef)] }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        markdown(),
        livePreview(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { height: "100%" },
          "&.cm-focused": { outline: "none" },
          ".cm-scroller": { overflow: "hidden auto" },
          ".cm-gutters": { display: "none" },
          ".cm-panels": {
            background: "var(--color-surface-alt)",
            color: "var(--color-text)",
          },
          ".cm-panel.cm-search": {
            padding: "6px 8px",
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            alignItems: "center",
          },
          ".cm-panel.cm-search input, .cm-panel.cm-search button": {
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: "4px",
            padding: "2px 6px",
          },
          ".cm-searchMatch": { backgroundColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)" },
          ".cm-searchMatch-selected": { backgroundColor: "var(--color-accent)", color: "#fff" },
          ".cm-tooltip-autocomplete": {
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          },
          ".cm-tooltip-autocomplete ul li[aria-selected]": {
            background: "var(--color-accent)",
            color: "#fff",
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    const scroller = view.scrollDOM;
    const handleScroll = () => {
      const block = view.lineBlockAtHeight(scroller.scrollTop);
      const topLine = view.state.doc.lineAt(block.from).number;
      const fraction = block.height > 0 ? (scroller.scrollTop - block.top) / block.height : 0;
      onScrollRef.current?.(topLine - 1 + fraction);
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      view.destroy();
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" />;
});
