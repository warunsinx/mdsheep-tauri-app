export const CONTENT_STORAGE_KEY = "md-editor:content:v1";
export const THEME_STORAGE_KEY = "md-editor:theme:v1";
export const AUTOSAVE_DELAY = 500;

export const DEFAULT_DOC = `# A small map of an idea

Write on the left. See polished **GitHub Flavored Markdown** and diagrams appear on the right.

## Why this editor?

- [x] Your draft stays on this device
- [x] Mermaid diagrams render as you type
- [ ] Turn this example into your own document

| Feature | Status |
| :-- | --: |
| GFM tables | Ready |
| Safe preview | Ready |
| Markdown export | Ready |

\`\`\`mermaid
flowchart LR
  A[Write Markdown] --> B{Preview}
  B --> C[Read formatted text]
  B --> D[See Mermaid diagram]
  C --> E[Export .md]
  D --> E
\`\`\`

> Everything is saved locally and never leaves your browser.

Try editing this document, or paste in one of your own. ~~Old ideas~~ become better ones.
`;
