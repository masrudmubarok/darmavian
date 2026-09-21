import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { resolveRelativePath } from "@/utils/path";

export interface RenderEnv {
  baseDir?: string;
}

export const md: InstanceType<typeof MarkdownIt> = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
});

md.core.ruler.push("inject_source_line", (state) => {
  for (const token of state.tokens) {
    if (token.map && token.nesting !== -1) {
      token.attrSet("data-line", String(token.map[0]));
    }
  }
});

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = token.info.trim().split(/\s+/)[0] ?? "";
  const line = token.map ? token.map[0] : null;
  const dataLineAttr = line !== null ? ` data-line="${line}"` : "";

  if (lang === "mermaid") {
    return `<pre class="mermaid"${dataLineAttr}>${md.utils.escapeHtml(token.content)}</pre>`;
  }
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<pre class="hljs"${dataLineAttr}><code>${hljs.highlight(token.content, { language: lang }).value}</code></pre>`;
    } catch {
      // fall through to plain escaped output below
    }
  }
  return `<pre class="hljs"${dataLineAttr}><code>${md.utils.escapeHtml(token.content)}</code></pre>`;
};

const REMOTE_SRC_RE = /^([a-z][a-z0-9+.-]*:)?\/\//i;

md.renderer.rules.image = (tokens, idx, _options, envUntyped) => {
  const env = envUntyped as RenderEnv;
  const token = tokens[idx];
  const src = String(token.attrGet("src") ?? "");
  const alt = String(token.content ?? "");
  const isRemote = REMOTE_SRC_RE.test(src) || src.startsWith("data:");

  if (isRemote) {
    return `<img src="${md.utils.escapeHtml(src)}" alt="${md.utils.escapeHtml(alt)}" />`;
  }
  const resolved = resolveRelativePath(env?.baseDir ?? "", src);
  return `<img data-relsrc="${md.utils.escapeHtml(resolved)}" alt="${md.utils.escapeHtml(alt)}" />`;
};

md.renderer.rules.table_open = (tokens, idx) => {
  const line = tokens[idx].attrGet("data-line");
  const attr = line !== null ? ` data-line="${line}"` : "";
  return `<div class="darmavian-table-wrap"${attr}><table>`;
};
md.renderer.rules.table_close = () => "</table></div>";

const BLOCK_CLOSE_GLUE_RE = /(<\/(?:div|table|blockquote|ul|ol|section|article)>)(?=\S)/g;

function normalizeGluedHtmlBlocks(src: string): string {
  return src.replace(BLOCK_CLOSE_GLUE_RE, "$1\n\n");
}

function markdownEmphasisToHtml(text: string): string {
  return text
    .replace(/\\--&gt;/g, "-->")
    .replace(/\\#/g, "#")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\*\*([^\n*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^\n*]+?)\*/g, "<em>$1</em>");
}

md.core.ruler.push("humanize_raw_html_blocks", (state) => {
  for (const token of state.tokens) {
    if (token.type === "html_block") {
      token.content = markdownEmphasisToHtml(token.content);
    }
  }
});

export function renderMarkdown(src: string, env?: RenderEnv): string {
  return md.render(normalizeGluedHtmlBlocks(src), env as Record<string, unknown>);
}
