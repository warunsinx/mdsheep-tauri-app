import DOMPurify from "dompurify";
import { AlertCircle } from "lucide-react";
import { memo, useEffect, useId, useState } from "react";

type RenderState = { status: "loading" } | { status: "ready"; svg: string } | { status: "error"; message: string };

function readableError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const firstUsefulLine = raw.split("\n").find((line) => line.trim() && !line.includes("mermaid version"));
  return (firstUsefulLine || "Check the diagram syntax and try again.").replace(/^Error:\s*/i, "").slice(0, 180);
}

export const MermaidBlock = memo(function MermaidBlock({ code }: { code: string }) {
  const reactId = useId().replace(/:/g, "");
  const [state, setState] = useState<RenderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          htmlLabels: false,
          theme: "base",
          fontFamily: "var(--font-geist-sans)",
        });
        const { svg } = await mermaid.render(`mermaid-${reactId}-${Date.now()}`, code.trim());
        if (!cancelled) {
          const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
          setState({ status: "ready", svg: clean });
        }
      } catch (error) {
        document.querySelectorAll("body > [id^='dmermaid-']").forEach((element) => element.remove());
        if (!cancelled) setState({ status: "error", message: readableError(error) });
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, reactId]);

  if (state.status === "loading") {
    return <div className="my-6 h-32 animate-pulse rounded-md border border-neutral-200 bg-neutral-50 motion-reduce:animate-none dark:border-neutral-800 dark:bg-neutral-900" aria-label="Rendering Mermaid diagram" />;
  }
  if (state.status === "error") {
    return (
      <div className="my-6 flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div><strong className="block font-medium">Unable to render diagram</strong><span className="mt-1 block opacity-80">{state.message}</span></div>
      </div>
    );
  }
  return <div className="mermaid-output my-6 overflow-x-auto rounded-md border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-label="Mermaid diagram" dangerouslySetInnerHTML={{ __html: state.svg }} />;
});
