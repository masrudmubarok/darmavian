import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

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

md.renderer.rules.table_open = (tokens, idx) => {
  const line = tokens[idx].attrGet("data-line");
  const attr = line !== null ? ` data-line="${line}"` : "";
  return `<div class="darmavian-table-wrap"${attr}><table>`;
};
md.renderer.rules.table_close = () => "</table></div>";
