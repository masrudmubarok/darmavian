import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { md } from "./markdownRenderer";
import type { ScrollSyncHandle } from "@/features/editor/CodeMirrorEditor";

const SANITIZE_OPTIONS = {
  ADD_TAGS: ["foreignObject"],
  ADD_ATTR: ["target", "data-line"],
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface LineOffset {
  line: number;
  top: number;
}

/** Every `[data-line]` element's scroll-container-relative top, sorted by line. */
function collectLineOffsets(root: HTMLElement, scrollRoot: HTMLElement): LineOffset[] {
  const scrollRect = scrollRoot.getBoundingClientRect();
  const offsets: LineOffset[] = [];
  root.querySelectorAll<HTMLElement>("[data-line]").forEach((el) => {
    const line = Number(el.getAttribute("data-line"));
    if (!Number.isFinite(line)) return;
    const top = el.getBoundingClientRect().top - scrollRect.top + scrollRoot.scrollTop;
    offsets.push({ line, top });
  });
  offsets.sort((a, b) => a.line - b.line);
  return offsets;
}

interface Props {
  content: string;
  /** Fractional 0-indexed source line currently at the top of the viewport. */
  onScroll?: (line: number) => void;
}

export const PreviewPane = forwardRef<ScrollSyncHandle, Props>(function PreviewPane(
  { content, onScroll },
  ref,
) {
  const debouncedContent = useDebounced(content, 200);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineOffsetsRef = useRef<LineOffset[]>([]);
  const [html, setHtml] = useState("");

  const refreshLineOffsets = () => {
    if (containerRef.current && scrollRef.current) {
      lineOffsetsRef.current = collectLineOffsets(containerRef.current, scrollRef.current);
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToLine(line: number) {
      const el = scrollRef.current;
      const offsets = lineOffsetsRef.current;
      if (!el || offsets.length === 0) return;

      let i = 0;
      while (i < offsets.length - 1 && offsets[i + 1].line <= line) i++;
      const a = offsets[i];
      const b = offsets[i + 1];
      const target =
        b && b.line !== a.line
          ? a.top + ((line - a.line) / (b.line - a.line)) * (b.top - a.top)
          : a.top;
      el.scrollTop = Math.max(0, target);
    },
  }));

  useEffect(() => {
    const rendered = md.render(debouncedContent);
    setHtml(DOMPurify.sanitize(rendered, SANITIZE_OPTIONS));
  }, [debouncedContent]);

  useEffect(() => {
    refreshLineOffsets();

    const container = containerRef.current;
    if (!container) return;
    const nodes = container.querySelectorAll<HTMLElement>("pre.mermaid");
    if (nodes.length === 0) return;

    let cancelled = false;

    import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) return;

      const root = getComputedStyle(document.documentElement);
      const fontFamily = root.getPropertyValue("--font-reading").trim();
      // Mermaid's built-in "neutral" theme is the standard, well-tested
      // palette for embedding diagrams in documentation (muted blue-gray
      // nodes, black text, gray edges) — used as-is rather than a custom
      // palette. It's designed for a light card, which `.darmavian-prose
      // pre.mermaid` provides with a fixed white background regardless of
      // the app's own dark/light theme, so contrast is always correct.
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
        themeVariables: { fontFamily },
      });
      mermaid
        .run({ nodes: Array.from(nodes) })
        .catch((err) => console.error("Mermaid render failed:", err))
        .finally(refreshLineOffsets);
    });

    return () => {
      cancelled = true;
    };
  }, [html]);

  const handleScroll = () => {
    const el = scrollRef.current;
    const offsets = lineOffsetsRef.current;
    if (!el || offsets.length === 0) return;

    const top = el.scrollTop;
    let i = 0;
    while (i < offsets.length - 1 && offsets[i + 1].top <= top) i++;
    const a = offsets[i];
    const b = offsets[i + 1];
    const line =
      b && b.top !== a.top
        ? a.line + ((top - a.top) / (b.top - a.top)) * (b.line - a.line)
        : a.line;
    onScroll?.(line);
  };

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto overflow-x-hidden">
      <div
        ref={containerRef}
        className="darmavian-prose px-8 py-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});
