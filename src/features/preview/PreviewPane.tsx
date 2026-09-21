import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { openUrl } from "@tauri-apps/plugin-opener";
import { renderMarkdown } from "./markdownRenderer";
import type { ScrollSyncHandle } from "@/features/editor/CodeMirrorEditor";
import { assetService } from "@/services/assetService";
import { dirname } from "@/utils/path";

const SANITIZE_OPTIONS = {
  ADD_TAGS: ["foreignObject"],
  ADD_ATTR: ["target", "data-line", "data-relsrc"],
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
  /** The open note's own path — local image references resolve relative to its folder. */
  notePath?: string;
  /** Fractional 0-indexed source line currently at the top of the viewport. */
  onScroll?: (line: number) => void;
}

export const PreviewPane = forwardRef<ScrollSyncHandle, Props>(function PreviewPane(
  { content, notePath, onScroll },
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
    const rendered = renderMarkdown(debouncedContent, { baseDir: notePath ? dirname(notePath) : "" });
    setHtml(DOMPurify.sanitize(rendered, SANITIZE_OPTIONS));
  }, [debouncedContent, notePath]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const images = container.querySelectorAll<HTMLImageElement>("img[data-relsrc]");
    images.forEach((img) => {
      const path = img.getAttribute("data-relsrc");
      if (!path) return;
      assetService
        .readAsDataUrl(path)
        .then((dataUrl) => {
          img.src = dataUrl;
        })
        .catch(() => {
          img.alt = `${img.alt} (missing: ${path})`;
        })
        .finally(refreshLineOffsets);
    });
  }, [html]);

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

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    e.preventDefault();
    void openUrl(href).catch((err) => console.error("Failed to open link:", err));
  };

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
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});
