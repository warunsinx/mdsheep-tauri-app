import { describe, expect, it } from "vitest";
import { buildStandaloneHtml } from "@/lib/export-html";

describe("standalone HTML export", () => {
  it("renders sanitized GFM into a complete offline HTML document", async () => {
    const html = await buildStandaloneHtml(
      "# Hello\n\n- [x] done\n\n![tracker](https://evil.test/pixel.png)\n\n<script>alert(1)</script>",
      "Draft <one>",
    );

    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("<title>Draft &lt;one&gt;</title>");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("evil.test");
    expect(html).toContain("Image omitted: tracker");
    expect(html).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:");
    expect(html).toContain("@media print");
  });

  it("embeds sanitized Mermaid SVG instead of diagram source", async () => {
    const renderMermaid = async (code: string) => `<svg aria-label="${code}"><text>diagram</text><script>alert(1)</script></svg>`;
    const html = await buildStandaloneHtml("```mermaid\ngraph TD\nA-->B\n```", "Diagram", renderMermaid);

    expect(html).toContain('class="mermaid-diagram"');
    expect(html).toContain("<svg");
    expect(html).toContain("<text>diagram</text>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("language-mermaid");
  });

  it("falls back to escaped Mermaid source when a diagram cannot render", async () => {
    const renderMermaid = async () => { throw new Error("invalid diagram"); };
    const html = await buildStandaloneHtml("```mermaid\ngraph <bad>\n```", "Diagram", renderMermaid);

    expect(html).toContain('class="language-mermaid"');
    expect(html).toContain("graph &lt;bad&gt;");
    expect(html).not.toContain("data-mermaid-export");
  });

  it("strips external resource loads from embedded Mermaid SVG", async () => {
    const escapedResource = `im\\61 ge-set("https:\\${"\n"}//evil.test/escaped.png" 1x)`;
    const renderMermaid = async () => `<svg><style>@import url(https://evil.test/font);.safe{fill:url(#gradient)}.bad{fill:url(https://evil.test/fill);background-image:image-set("https://evil.test/set.png" 1x)}.escaped{background-image:${escapedResource}}</style><image href="https://evil.test/pixel"/><a href="https://evil.test/click"><text>label</text></a><path marker-end="url(#arrow)" fill="url(https://evil.test/paint)"><set attributeName="href" to="https://evil.test/animated"/></path></svg>`;

    const html = await buildStandaloneHtml("```mermaid\ngraph TD\nA-->B\n```", "Diagram", renderMermaid);

    expect(html).not.toContain("evil.test");
    expect(html).toContain("<text>label</text>");
    expect(html).toContain("url(#gradient)");
    expect(html).toContain("url(#arrow)");
  });

  it("handles out-of-range SVG CSS escapes without dropping the diagram", async () => {
    const renderMermaid = async () => String.raw`<svg><style>.node{fill:\FFFFFF}</style><text>kept</text></svg>`;

    const html = await buildStandaloneHtml("```mermaid\ngraph TD\nA-->B\n```", "Diagram", renderMermaid);

    expect(html).toContain("<text>kept</text>");
    expect(html).not.toContain("language-mermaid");
  });

  it("removes Mermaid error artifacts before falling back", async () => {
    const artifact = document.createElement("div");
    artifact.id = "dmdsheep-export-failed";
    document.body.append(artifact);
    const renderMermaid = async () => { throw new Error("invalid diagram"); };

    await buildStandaloneHtml("```mermaid\ngraph bad\n```", "Diagram", renderMermaid);

    expect(document.getElementById("dmdsheep-export-failed")).toBeNull();
  });
});
