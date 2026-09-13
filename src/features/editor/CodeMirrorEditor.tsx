import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { livePreview } from "./livePreview";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Fractional 0-indexed source line currently at the top of the viewport. */
  onScroll?: (line: number) => void;
}

export interface ScrollSyncHandle {
  /** Scrolls so the given fractional 0-indexed source line sits at the top. */
  scrollToLine: (line: number) => void;
}

export const CodeMirrorEditor = forwardRef<ScrollSyncHandle, Props>(function CodeMirrorEditor(
  { value, onChange, onScroll },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;

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
        keymap.of([...defaultKeymap, ...historyKeymap]),
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
