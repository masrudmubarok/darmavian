import { EditorState, Range } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNodeRef } from "@lezer/common";

const HEADING_RE = /^ATXHeading([1-6])$/;

function selectionTouches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some((r) => r.from <= to && r.to >= from);
}

function handleNode(
  node: SyntaxNodeRef,
  state: EditorState,
  styles: Range<Decoration>[],
  hidden: Range<Decoration>[],
) {
  const type = node.type.name;

  const headingMatch = HEADING_RE.exec(type);
  if (headingMatch) {
    const level = headingMatch[1];
    const line = state.doc.lineAt(node.from);
    styles.push(
      Decoration.line({ class: `cm-lp-heading cm-lp-h${level}` }).range(line.from),
    );
    if (!selectionTouches(state, node.from, node.to)) {
      const mark = node.node.getChild("HeaderMark");
      if (mark) {
        let end = mark.to;
        if (state.doc.sliceString(end, end + 1) === " ") end += 1;
        hidden.push(Decoration.replace({}).range(mark.from, end));
      }
    }
    return;
  }

  if (type === "StrongEmphasis" || type === "Emphasis" || type === "StrikethroughMark" || type === "Strikethrough") {
    const cls =
      type === "StrongEmphasis" ? "cm-lp-strong" : type === "Emphasis" ? "cm-lp-em" : "cm-lp-strike";
    const editing = selectionTouches(state, node.from, node.to);
    const marks = node.node.getChildren("EmphasisMark").concat(node.node.getChildren("StrikethroughMark"));
    if (!editing && marks.length >= 2) {
      const first = marks[0];
      const last = marks[marks.length - 1];
      if (first.to < last.from) {
        styles.push(Decoration.mark({ class: cls }).range(first.to, last.from));
      }
      hidden.push(Decoration.replace({}).range(first.from, first.to));
      hidden.push(Decoration.replace({}).range(last.from, last.to));
    } else {
      styles.push(Decoration.mark({ class: cls }).range(node.from, node.to));
    }
    return;
  }

  if (type === "InlineCode") {
    const editing = selectionTouches(state, node.from, node.to);
    const marks = node.node.getChildren("CodeMark");
    if (!editing && marks.length >= 2) {
      const first = marks[0];
      const last = marks[marks.length - 1];
      if (first.to < last.from) {
        styles.push(Decoration.mark({ class: "cm-lp-code" }).range(first.to, last.from));
      }
      hidden.push(Decoration.replace({}).range(first.from, first.to));
      hidden.push(Decoration.replace({}).range(last.from, last.to));
    } else {
      styles.push(Decoration.mark({ class: "cm-lp-code" }).range(node.from, node.to));
    }
    return;
  }

  if (type === "FencedCode" || type === "CodeBlock") {
    const startLine = state.doc.lineAt(node.from);
    const endLine = state.doc.lineAt(node.to);
    for (let ln = startLine.number; ln <= endLine.number; ln++) {
      const line = state.doc.line(ln);
      styles.push(Decoration.line({ class: "cm-lp-codeblock" }).range(line.from));
    }
    return;
  }

  if (type === "Blockquote") {
    const startLine = state.doc.lineAt(node.from);
    const endLine = state.doc.lineAt(node.to);
    for (let ln = startLine.number; ln <= endLine.number; ln++) {
      const line = state.doc.line(ln);
      styles.push(Decoration.line({ class: "cm-lp-blockquote" }).range(line.from));
    }
    return;
  }

  if (type === "ListMark") {
    styles.push(Decoration.mark({ class: "cm-lp-listmark" }).range(node.from, node.to));
    return;
  }
}

function build(view: EditorView): { decorations: DecorationSet; hidden: DecorationSet } {
  const state = view.state;
  const styles: Range<Decoration>[] = [];
  const hidden: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => handleNode(node, state, styles, hidden),
    });
  }

  return {
    decorations: Decoration.set([...styles, ...hidden], true),
    hidden: Decoration.set(hidden, true),
  };
}

class LivePreviewPlugin {
  decorations: DecorationSet;
  hiddenRanges: DecorationSet;

  constructor(view: EditorView) {
    const built = build(view);
    this.decorations = built.decorations;
    this.hiddenRanges = built.hidden;
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      const built = build(update.view);
      this.decorations = built.decorations;
      this.hiddenRanges = built.hidden;
    }
  }
}

const theme = EditorView.theme({
  "&": {
    fontFamily: "var(--font-reading)",
    fontSize: "16px",
  },
  ".cm-content": {
    padding: "20px 28px",
    lineHeight: "1.65",
  },
  ".cm-line": { padding: "0 2px" },
  ".cm-lp-heading": { fontWeight: "700", lineHeight: "1.3" },
  ".cm-lp-h1": { fontSize: "1.9em", margin: "0.4em 0 0.2em" },
  ".cm-lp-h2": { fontSize: "1.6em", margin: "0.4em 0 0.2em" },
  ".cm-lp-h3": { fontSize: "1.35em", margin: "0.3em 0 0.2em" },
  ".cm-lp-h4": { fontSize: "1.15em", margin: "0.3em 0 0.2em" },
  ".cm-lp-h5": { fontSize: "1.05em", margin: "0.2em 0 0.1em" },
  ".cm-lp-h6": { fontSize: "1em", opacity: "0.85", margin: "0.2em 0 0.1em" },
  ".cm-lp-strong": { fontWeight: "700" },
  ".cm-lp-em": { fontStyle: "italic" },
  ".cm-lp-strike": { textDecoration: "line-through", opacity: "0.7" },
  ".cm-lp-code": {
    fontFamily: "var(--font-mono)",
    fontSize: "0.9em",
    background: "var(--color-surface-alt)",
    borderRadius: "3px",
    padding: "0.05em 0.3em",
  },
  ".cm-lp-codeblock": {
    fontFamily: "var(--font-mono)",
    fontSize: "0.9em",
    background: "var(--color-surface-alt)",
  },
  ".cm-lp-blockquote": {
    borderLeft: "3px solid var(--color-accent)",
    paddingLeft: "0.8em",
    opacity: "0.85",
    fontStyle: "italic",
  },
  ".cm-lp-listmark": { color: "var(--color-accent)", fontWeight: "700" },
});

export function livePreview() {
  const plugin = ViewPlugin.fromClass(LivePreviewPlugin, {
    decorations: (v) => v.decorations,
  });

  return [
    plugin,
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.hiddenRanges ?? Decoration.none),
    theme,
  ];
}
