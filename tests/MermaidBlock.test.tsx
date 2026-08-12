import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MermaidBlock } from "@/components/MermaidBlock";
import { PreviewPane } from "@/components/PreviewPane";

const initialize = vi.fn();
const renderDiagram = vi.fn();

vi.mock("mermaid", () => ({
  default: {
    initialize,
    render: renderDiagram,
  },
}));

describe("MermaidBlock", () => {
  beforeEach(() => {
    initialize.mockClear();
    renderDiagram.mockReset();
  });

  it("preserves native SVG labels while sanitizing Mermaid output", async () => {
    renderDiagram.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><g><text>Rendered label</text><foreignObject><div>HTML label</div></foreignObject><script>alert(1)</script></g></svg>',
    });

    const { container } = render(<MermaidBlock code={"flowchart LR\n  A[Rendered label] --> B[Done]"} />);

    expect(await screen.findByText("Rendered label")).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: "strict", htmlLabels: false }));
    await waitFor(() => expect(renderDiagram).toHaveBeenCalledOnce());
    expect(container.querySelector("svg text")).toHaveTextContent("Rendered label");
    expect(container.querySelector("foreignObject")).not.toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();
  });

  it("keeps an unchanged Mermaid diagram mounted when unrelated Markdown changes", async () => {
    renderDiagram.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Stable diagram</text></svg>',
    });
    const diagramCode = "flowchart LR\n  A[Stable diagram] --> B[Done]";
    const markdown = (heading: string) => `# ${heading}\n\n\`\`\`mermaid\n${diagramCode}\n\`\`\``;

    const { rerender } = render(<PreviewPane markdown={markdown("First heading")} />);
    const diagram = await screen.findByLabelText("Mermaid diagram");
    await waitFor(() => expect(renderDiagram).toHaveBeenCalledOnce());

    rerender(<PreviewPane markdown={markdown("Changed heading")} />);
    expect(await screen.findByRole("heading", { name: "Changed heading" })).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    expect(renderDiagram).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Mermaid diagram")).toBe(diagram);
  });
});
