import { useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import {
  Bold,
  Code,
  Heading,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  SquareCode,
  Strikethrough,
  Table,
  TextQuote,
  Workflow,
} from "lucide-react";
import { COMMAND_SHORTCUTS, type CommandId } from "@/lib/markdown-commands";

interface FormatToolbarProps {
  onCommand: (id: CommandId) => void;
  disabled?: boolean;
}

interface FormatCommand {
  id: CommandId;
  label: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const COMMAND_GROUPS: readonly FormatCommand[][] = [
  [
    { id: "bold", label: "Bold", Icon: Bold },
    { id: "italic", label: "Italic", Icon: Italic },
    { id: "heading", label: "Heading level", Icon: Heading },
    { id: "strikethrough", label: "Strikethrough", Icon: Strikethrough },
  ],
  [
    { id: "bulletList", label: "Bullet list", Icon: List },
    { id: "orderedList", label: "Numbered list", Icon: ListOrdered },
    { id: "taskList", label: "Task list", Icon: ListTodo },
  ],
  [
    { id: "quote", label: "Blockquote", Icon: TextQuote },
    { id: "code", label: "Inline code", Icon: Code },
    { id: "codeBlock", label: "Code block", Icon: SquareCode },
    { id: "table", label: "Table", Icon: Table },
    { id: "link", label: "Link", Icon: Link },
    { id: "image", label: "Image", Icon: Image },
    // Not "Mermaid diagram": that is MermaidBlock's aria-label on the rendered
    // figure, and a substring-matching label query must not resolve to both.
    { id: "mermaid", label: "Mermaid flowchart", Icon: Workflow },
  ],
];

const COMMANDS = COMMAND_GROUPS.flat();
const COMMAND_POSITIONS = new Map<CommandId, number>(COMMANDS.map((command, index) => [command.id, index]));

function describeCommand(command: FormatCommand) {
  const shortcut = COMMAND_SHORTCUTS[command.id];
  return shortcut ? `${command.label} (Ctrl+${shortcut.toUpperCase()})` : command.label;
}

export function FormatToolbar({ onCommand, disabled = false }: FormatToolbarProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving tabindex (WAI-ARIA APG): 14 buttons stay a single tab stop so they
  // never push the editor further down the tab order.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const targets: Record<string, number> = {
      ArrowLeft: Math.max(0, activeIndex - 1),
      ArrowRight: Math.min(COMMANDS.length - 1, activeIndex + 1),
      Home: 0,
      End: COMMANDS.length - 1,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    const nextIndex = targets[event.key];
    setActiveIndex(nextIndex);
    const button = buttonsRef.current[nextIndex];
    button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <div
      role="toolbar"
      aria-label="Markdown formatting"
      aria-orientation="horizontal"
      className="format-bar-scroll"
      onKeyDown={handleKeyDown}
    >
      {COMMAND_GROUPS.map((group, groupIndex) => (
        <div className="format-group" key={group[0].id}>
          {groupIndex > 0 ? <span className="format-divider" aria-hidden="true" /> : null}
          {group.map((command) => {
            const commandIndex = COMMAND_POSITIONS.get(command.id) ?? 0;
            const description = describeCommand(command);
            const shortcut = COMMAND_SHORTCUTS[command.id];
            return (
              <button
                key={command.id}
                ref={(node) => {
                  buttonsRef.current[commandIndex] = node;
                }}
                type="button"
                className="icon-button icon-button-sm"
                aria-label={description}
                title={description}
                aria-keyshortcuts={shortcut ? `Control+${shortcut.toUpperCase()}` : undefined}
                tabIndex={commandIndex === activeIndex ? 0 : -1}
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onFocus={() => setActiveIndex(commandIndex)}
                onClick={() => onCommand(command.id)}
              >
                <command.Icon className="size-4" aria-hidden={true} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
