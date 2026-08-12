import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { markdownSanitizeSchema } from "@/lib/markdown";
import { isExternalHref, openInSystemBrowser } from "@/lib/native-shell";
import { MermaidBlock } from "./MermaidBlock";

interface PreviewPaneProps { markdown: string; fontSize?: number; collapsed?: boolean; onReopen?: () => void }

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-([\w-]+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    if (match?.[1] === "mermaid") return <MermaidBlock code={code} />;
    return <code className={className} {...props}>{children}</code>;
  },
  a({ children, href, onClick, ...props }) {
    return <a {...props} href={href} rel="noreferrer noopener" onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented && href && isExternalHref(href)) {
        event.preventDefault();
        void openInSystemBrowser(href);
      }
    }}>{children}</a>;
  },
};

export const PreviewPane = memo(function PreviewPane({ markdown, fontSize = 16, collapsed = false, onReopen }: PreviewPaneProps) {
  return (
    <section id="preview-panel" aria-label="Rendered preview" className={`preview-pane flex min-h-0 flex-1 flex-col bg-white dark:bg-neutral-950${collapsed ? " pane-collapsed" : ""}`}>
      <div className={`pane-content-shell${collapsed ? " pane-content-shell-collapsed" : ""}`} aria-hidden={collapsed}>
        <div className="pane-heading"><span className="pane-heading-title">Preview</span><span className="pane-heading-meta font-normal text-neutral-600 dark:text-neutral-400">Live</span></div>
        <div className="preview-scroll min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-8">
          <article data-pane-content="preview" aria-label="Preview content" style={{ fontSize: `${fontSize}px` }} className="prose prose-neutral mx-auto max-w-3xl dark:prose-invert prose-headings:scroll-mt-4 prose-a:text-orange-600 prose-a:underline-offset-4 dark:prose-a:text-orange-400 prose-pre:border prose-pre:border-neutral-200 prose-pre:bg-neutral-950 prose-pre:text-neutral-100 dark:prose-pre:border-neutral-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
              components={markdownComponents}
            >{markdown}</ReactMarkdown>
          </article>
        </div>
      </div>
      <button type="button" className="pane-rail pane-rail-right" aria-label={collapsed ? "Reopen Preview pane" : undefined} onClick={onReopen}>
        <span className="pane-rail-label" aria-hidden="true">Preview</span>
      </button>
    </section>
  );
});
