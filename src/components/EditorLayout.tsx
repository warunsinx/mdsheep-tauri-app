import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_DOC } from "@/lib/constants";
import { loadDocument } from "@/lib/storage";
import { useAutosave } from "@/hooks/useAutosave";
import { usePaneSplit } from "@/hooks/usePaneSplit";
import { EditorPane } from "./EditorPane";
import { PreviewPane } from "./PreviewPane";
import { Toolbar } from "./Toolbar";
import { PaneResizer } from "./PaneResizer";
import { useSettings } from "@/hooks/useSettings";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function getCollapseProgress(ratio: number, pane: "editor" | "preview") {
  const distance = pane === "editor" ? ratio : 100 - ratio;
  return distance > 0 && distance < 25 ? 1 - (distance / 25) ** 5 : 0;
}

export function EditorLayout() {
  const [markdown, setMarkdown] = useState(DEFAULT_DOC);
  const [ready, setReady] = useState(false);
  const paneModeId = useId();
  const editRadioId = `${paneModeId}-edit`;
  const previewRadioId = `${paneModeId}-preview`;
  const paneModeName = `${paneModeId}-pane-mode`;
  const editRadioRef = useRef<HTMLInputElement>(null);
  const { ratio, setRatio, commitRatio } = usePaneSplit();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { settings, updateSettings, reset, save, restore } = useSettings();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMarkdown(loadDocument(DEFAULT_DOC));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useAutosave(markdown, ready);
  const editorCollapseProgress = getCollapseProgress(ratio, "editor");
  const previewCollapseProgress = getCollapseProgress(ratio, "preview");
  const reopenEditor = useCallback(() => commitRatio(25), [commitRatio]);
  const reopenPreview = useCallback(() => commitRatio(75), [commitRatio]);
  const handleOpen = (content: string) => {
    setMarkdown(content);
    if (editRadioRef.current) editRadioRef.current.checked = true;
  };

  return (
    <div className="flex h-dvh min-h-[420px] flex-col overflow-hidden bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <input ref={editRadioRef} id={editRadioId} className="pane-mode-edit sr-only" type="radio" name={paneModeName} aria-label="Edit" defaultChecked />
      <input id={previewRadioId} className="pane-mode-preview sr-only" type="radio" name={paneModeName} aria-label="Preview" />
      <Toolbar markdown={markdown} editRadioId={editRadioId} previewRadioId={previewRadioId} onOpen={handleOpen} settings={settings} onSettingsChange={updateSettings} onSettingsReset={reset} onSettingsSave={save} onSettingsCancel={restore} />
      <main
        className={`pane-layout min-h-0 flex-1${isDesktop && ratio === 0 ? " pane-layout-editor-collapsed" : ""}${isDesktop && ratio === 100 ? " pane-layout-preview-collapsed" : ""}`}
        style={{
          "--editor-share": `${ratio}%`,
          "--editor-collapse-progress": editorCollapseProgress,
          "--preview-collapse-progress": previewCollapseProgress,
        } as CSSProperties}
      >
        <EditorPane value={markdown} onChange={setMarkdown} settings={settings} collapsed={isDesktop && ratio === 0} onReopen={reopenEditor} />
        <PaneResizer ratio={ratio} onChange={setRatio} onCommit={commitRatio} />
        <PreviewPane markdown={markdown} fontSize={settings.previewFontSize} collapsed={isDesktop && ratio === 100} onReopen={reopenPreview} />
      </main>
    </div>
  );
}
