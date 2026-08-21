import DOMPurify from "dompurify";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { markdownSanitizeSchema } from "@/lib/markdown";

export type MermaidSvgRenderer = (code: string, index: number) => Promise<string>;

const baseExportComponents: Components = {
  a({ children, ...props }) {
    return <a {...props} rel="noreferrer noopener">{children}</a>;
  },
  img({ alt }) {
    return <span className="image-placeholder">Image omitted: {alt || "external image"}</span>;
  },
};

function renderMarkdown(markdown: string, components: Components) {
  return renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
      components={components}
    >{markdown}</ReactMarkdown>,
  );
}

async function defaultMermaidSvgRenderer(code: string, index: number) {
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", htmlLabels: false, theme: "base" });
  const { svg } = await mermaid.render(`mdsheep-export-${Date.now()}-${index}`, code.trim());
  return svg;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function decodeCssEscapes(value: string) {
  return value
    .replace(/\\(?:\r\n|[\n\r\f])/g, "")
    .replace(/\\([0-9a-f]{1,6}[\t\n\f\r ]?|.)/gi, (_match, escaped: string) => {
      const hex = escaped.trim();
      if (!/^[0-9a-f]+$/i.test(hex)) return escaped;
      const codePoint = Number.parseInt(hex, 16);
      return codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)
        ? "\uFFFD"
        : String.fromCodePoint(codePoint);
    });
}

function containsExternalResource(value: string) {
  return /(?:https?|data|file|ftp|javascript):|(?:^|[\s('"=])\/\//i.test(decodeCssEscapes(value));
}

function stripExternalCssResources(css: string) {
  const withoutImports = decodeCssEscapes(css).replace(/@import\s+[^;}]+;?/gi, "");
  return withoutImports
    .replace(/url\(([^)]*)\)/gi, (match, raw: string) => {
      const target = raw.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
      return target.startsWith("#") ? match : "none";
    })
    .replace(/\b(?:-webkit-)?image-set\([^)]*\)/gi, "none")
    .replace(/\bcross-fade\([^)]*\)/gi, "none");
}

function sanitizeExportedSvg(svg: string) {
  const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
  const documentNode = new DOMParser().parseFromString(clean, "image/svg+xml");
  if (documentNode.querySelector("parsererror")) return "";

  documentNode.querySelectorAll("style").forEach((style) => {
    const sanitized = stripExternalCssResources(style.textContent ?? "");
    style.textContent = containsExternalResource(sanitized) ? "" : sanitized;
  });
  documentNode.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name !== "xmlns" && name !== "xmlns:xlink" && containsExternalResource(value)) {
        element.removeAttribute(attribute.name);
      } else if ((name === "href" || name === "xlink:href" || name === "src") && !value.startsWith("#")) {
        element.removeAttribute(attribute.name);
      } else if (name === "style" || /url\(/i.test(value) || /@import/i.test(value)) {
        const sanitized = stripExternalCssResources(value);
        if (containsExternalResource(sanitized)) element.removeAttribute(attribute.name);
        else element.setAttribute(attribute.name, sanitized);
      }
    });
  });
  return new XMLSerializer().serializeToString(documentNode.documentElement);
}

const DOCUMENT_CSS = `
:root{color-scheme:light;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;background:#fff}
body{max-width:52rem;margin:0 auto;padding:3rem 1.5rem;line-height:1.65}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.8em 0 .65em}h1{font-size:2.25rem}h2{font-size:1.65rem;border-bottom:1px solid #e5e5e5;padding-bottom:.3em}
a{color:#9a3412}blockquote{margin:1.5rem 0;border-left:4px solid #ea580c;padding:.25rem 1rem;color:#525252}
pre,code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#f5f5f5;border-radius:.35rem}code{padding:.15em .3em}pre{overflow:auto;padding:1rem;border:1px solid #e5e5e5}pre code{padding:0;background:transparent}
table{width:100%;border-collapse:collapse;margin:1.5rem 0}th,td{border:1px solid #d4d4d4;padding:.5rem .65rem;text-align:left}th{background:#f5f5f5}svg{max-width:100%;height:auto}.image-placeholder{display:inline-block;color:#525252;font-style:italic}hr{border:0;border-top:1px solid #d4d4d4;margin:2rem 0}
.mermaid-diagram{overflow:auto;margin:1.5rem 0;padding:1rem;border:1px solid #e5e5e5;border-radius:.5rem;text-align:center}
@media(max-width:640px){body{padding:1.5rem 1rem;overflow-wrap:anywhere}table{display:block;overflow-x:auto}}
@media print{body{max-width:none;padding:0}a{color:inherit;text-decoration:underline}pre{white-space:pre-wrap}.mermaid-diagram{break-inside:avoid}}
`;

export async function buildStandaloneHtml(markdown: string, title = "MdSheep document", renderMermaid: MermaidSvgRenderer = defaultMermaidSvgRenderer) {
  const mermaidBlocks: string[] = [];
  const bodyWithPlaceholders = renderMarkdown(markdown, {
    ...baseExportComponents,
    code({ className, children, ...props }) {
      if (/\blanguage-mermaid\b/.test(className ?? "")) {
        const index = mermaidBlocks.push(String(children).replace(/\n$/, "")) - 1;
        return <span data-mermaid-export={index} />;
      }
      return <code className={className} {...props}>{children}</code>;
    },
  });

  let body = bodyWithPlaceholders;
  for (let index = 0; index < mermaidBlocks.length; index += 1) {
    try {
      const svg = await renderMermaid(mermaidBlocks[index], index);
      const clean = sanitizeExportedSvg(svg);
      body = body.replace(
        `<pre><span data-mermaid-export="${index}"></span></pre>`,
        `<div class="mermaid-diagram" role="img" aria-label="Mermaid diagram">${clean}</div>`,
      );
    } catch {
      document.querySelectorAll("body > [id^='dmdsheep-export-']").forEach((element) => element.remove());
      const fallback = `<pre><code class="language-mermaid">${escapeHtml(mermaidBlocks[index])}</code></pre>`;
      body = body.replace(`<pre><span data-mermaid-export="${index}"></span></pre>`, fallback);
    }
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
<main>${body}</main>
</body>
</html>
`;
}
