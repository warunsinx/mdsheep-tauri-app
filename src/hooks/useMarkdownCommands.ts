import { useCallback, useRef, type KeyboardEvent, type RefObject } from "react";
import {
  COMMAND_SHORTCUTS,
  applyCommand,
  indentLines,
  type CommandId,
  type EditResult,
} from "@/lib/markdown-commands";

const SHORTCUT_COMMANDS = new Map<string, CommandId>(
  Object.entries(COMMAND_SHORTCUTS).map(([id, key]) => [key, id as CommandId]),
);

// The narrowest range that turns the current value into the next one. Replacing
// only that range keeps the browser's native undo stack granular.
function diffRange(previous: string, next: string) {
  const limit = Math.min(previous.length, next.length);
  let start = 0;
  while (start < limit && previous[start] === next[start]) start += 1;
  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (previousEnd > start && nextEnd > start && previous[previousEnd - 1] === next[nextEnd - 1]) {
    previousEnd -= 1;
    nextEnd -= 1;
  }
  return { start, end: previousEnd, text: next.slice(start, nextEnd) };
}

export function useMarkdownCommands(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  onChange: (value: string) => void,
) {
  const isComposingRef = useRef(false);
  const applyEdit = useCallback(
    (element: HTMLTextAreaElement, result: EditResult) => {
      if (result.value !== element.value) {
        const { start, end, text } = diffRange(element.value, result.value);
        element.focus();
        element.setSelectionRange(start, end);
        // insertText keeps the edit on the native undo stack and fires a real
        // input event, so React's onChange updates state on its own. jsdom has
        // no execCommand, which is why the direct fallback below is load-bearing.
        let inserted = false;
        try {
          inserted = document.execCommand?.("insertText", false, text) ?? false;
        } catch {
          inserted = false;
        }
        if (!inserted) {
          element.value = result.value;
          onChange(result.value);
        }
      }
      element.focus();
      element.setSelectionRange(result.selectionStart, result.selectionEnd);
    },
    [onChange],
  );

  const runCommand = useCallback(
    (id: CommandId) => {
      if (isComposingRef.current) return;
      const element = editorRef.current;
      if (!element) return;
      const selection = { start: element.selectionStart, end: element.selectionEnd };
      applyEdit(element, applyCommand(id, element.value, selection));
    },
    [applyEdit, editorRef],
  );

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposingRef.current || event.nativeEvent.isComposing) return;
      const element = event.currentTarget;
      const selection = { start: element.selectionStart, end: element.selectionEnd };

      if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const spansLines = element.value.slice(selection.start, selection.end).includes("\n");
        if (!spansLines) return;
        event.preventDefault();
        applyEdit(element, indentLines(element.value, selection, event.shiftKey));
        return;
      }

      if (event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey)) return;
      const command = SHORTCUT_COMMANDS.get(event.key.toLowerCase());
      if (!command) return;
      event.preventDefault();
      applyEdit(element, applyCommand(command, element.value, selection));
    },
    [applyEdit],
  );

  const handleEditorCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleEditorCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  return { runCommand, handleEditorKeyDown, handleEditorCompositionStart, handleEditorCompositionEnd };
}
