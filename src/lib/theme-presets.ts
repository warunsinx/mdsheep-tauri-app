export const THEME_PRESET_STORAGE_KEY = "md-editor:theme-preset:v1";
export const LEGACY_THEME_PRESET_KEYS = ["md-editor:accent-preset:v1", "md-editor:accent-preset"] as const;

export interface ThemePalette { app:string; chrome:string; panel:string; elevated:string; subtle:string; text:string; muted:string; border:string; code:string; codeText:string; accent:string; focus:string; accentText:string; accentSolid:string; accentContrast:string; accentSoft:string; selection:string; selectionText:string; rail:string }
const palette = (values: ThemePalette) => values;
export const THEME_PRESETS = [
  { id:"default", name:"Default", palettes:{ light:palette({app:"#ffffff",chrome:"#fafafa",panel:"#ffffff",elevated:"#ffffff",subtle:"#f5f5f5",text:"#171717",muted:"#6b6b6b",border:"#e5e5e5",code:"#f5f5f5",codeText:"#262626",accent:"#ea580c",focus:"#ea580c",accentText:"#c2410c",accentSolid:"#c2410c",accentContrast:"#ffffff",accentSoft:"#fff7ed",selection:"#fed7aa",selectionText:"#431407",rail:"#a3a3a3"}), dark:palette({app:"#0a0a0a",chrome:"#171717",panel:"#0a0a0a",elevated:"#171717",subtle:"#262626",text:"#f5f5f5",muted:"#a3a3a3",border:"#404040",code:"#262626",codeText:"#fafafa",accent:"#fb923c",focus:"#fb923c",accentText:"#fb923c",accentSolid:"#fb923c",accentContrast:"#0a0a0a",accentSoft:"#431407",selection:"#9a3412",selectionText:"#fff7ed",rail:"#737373"})}},
  { id:"gruvbox", name:"Gruvbox", palettes:{ light:palette({app:"#fbf1c7",chrome:"#f2e5bc",panel:"#f9f5d7",elevated:"#fbf1c7",subtle:"#ebdbb2",text:"#3c3836",muted:"#665c54",border:"#d5c4a1",code:"#ebdbb2",codeText:"#3c3836",accent:"#b57614",focus:"#b57614",accentText:"#9d0006",accentSolid:"#8f5d00",accentContrast:"#fffbe6",accentSoft:"#e9d6a0",selection:"#d79921",selectionText:"#282828",rail:"#a89984"}), dark:palette({app:"#282828",chrome:"#1d2021",panel:"#282828",elevated:"#32302f",subtle:"#3c3836",text:"#ebdbb2",muted:"#bdae93",border:"#504945",code:"#1d2021",codeText:"#ebdbb2",accent:"#fabd2f",focus:"#fabd2f",accentText:"#fabd2f",accentSolid:"#d79921",accentContrast:"#282828",accentSoft:"#504945",selection:"#665c54",selectionText:"#fbf1c7",rail:"#7c6f64"})}},
  { id:"nord", name:"Nord", palettes:{ light:palette({app:"#eceff4",chrome:"#e5e9f0",panel:"#f7f9fc",elevated:"#ffffff",subtle:"#e5e9f0",text:"#2e3440",muted:"#4c566a",border:"#d8dee9",code:"#e5e9f0",codeText:"#2e3440",accent:"#5e81ac",focus:"#5e81ac",accentText:"#4c6f91",accentSolid:"#4c6f91",accentContrast:"#ffffff",accentSoft:"#d8e3ef",selection:"#b8cadc",selectionText:"#2e3440",rail:"#7b88a1"}), dark:palette({app:"#2e3440",chrome:"#242933",panel:"#2e3440",elevated:"#3b4252",subtle:"#434c5e",text:"#eceff4",muted:"#d8dee9",border:"#4c566a",code:"#242933",codeText:"#e5e9f0",accent:"#88c0d0",focus:"#88c0d0",accentText:"#8fbcbb",accentSolid:"#88c0d0",accentContrast:"#2e3440",accentSoft:"#3b5362",selection:"#4c566a",selectionText:"#eceff4",rail:"#66738a"})}},
  { id:"dracula", name:"Dracula", palettes:{ light:palette({app:"#f8f8f2",chrome:"#eeeeea",panel:"#ffffff",elevated:"#ffffff",subtle:"#eeeef2",text:"#282a36",muted:"#626477",border:"#d7d7df",code:"#eeeef2",codeText:"#282a36",accent:"#8b39c7",focus:"#8b39c7",accentText:"#7b2cbf",accentSolid:"#8b39c7",accentContrast:"#ffffff",accentSoft:"#f0dcff",selection:"#dcc2f0",selectionText:"#282a36",rail:"#85869a"}), dark:palette({app:"#282a36",chrome:"#21222c",panel:"#282a36",elevated:"#343746",subtle:"#44475a",text:"#f8f8f2",muted:"#bfbfc9",border:"#56596d",code:"#21222c",codeText:"#f8f8f2",accent:"#bd93f9",focus:"#ff79c6",accentText:"#bd93f9",accentSolid:"#bd93f9",accentContrast:"#282a36",accentSoft:"#4b3b66",selection:"#44475a",selectionText:"#f8f8f2",rail:"#73768b"})}},
  { id:"solarized", name:"Solarized", palettes:{ light:palette({app:"#fdf6e3",chrome:"#eee8d5",panel:"#fffaf0",elevated:"#fdf6e3",subtle:"#eee8d5",text:"#073642",muted:"#52666d",border:"#d7cfb7",code:"#eee8d5",codeText:"#073642",accent:"#268bd2",focus:"#268bd2",accentText:"#0875b5",accentSolid:"#0875b5",accentContrast:"#ffffff",accentSoft:"#d9eaf0",selection:"#b8d8e6",selectionText:"#073642",rail:"#93a1a1"}), dark:palette({app:"#002b36",chrome:"#00212b",panel:"#002b36",elevated:"#073642",subtle:"#0b4652",text:"#eee8d5",muted:"#aab7b7",border:"#28515b",code:"#001f27",codeText:"#eee8d5",accent:"#2aa198",focus:"#268bd2",accentText:"#2aa198",accentSolid:"#2aa198",accentContrast:"#002b36",accentSoft:"#124b50",selection:"#075a64",selectionText:"#fdf6e3",rail:"#657b83"})}},
  { id:"tokyo-night", name:"Tokyo Night", palettes:{ light:palette({app:"#e6e7ed",chrome:"#dcdde5",panel:"#f2f3f7",elevated:"#ffffff",subtle:"#dfe1e8",text:"#343b58",muted:"#565f89",border:"#c8cad5",code:"#dfe1e8",codeText:"#343b58",accent:"#34548a",focus:"#34548a",accentText:"#2e5c9a",accentSolid:"#34548a",accentContrast:"#ffffff",accentSoft:"#ccd8ea",selection:"#b7c7df",selectionText:"#343b58",rail:"#8990ad"}), dark:palette({app:"#1a1b26",chrome:"#16161e",panel:"#1a1b26",elevated:"#24283b",subtle:"#292e42",text:"#c0caf5",muted:"#a9b1d6",border:"#3b4261",code:"#16161e",codeText:"#c0caf5",accent:"#7aa2f7",focus:"#7dcfff",accentText:"#7aa2f7",accentSolid:"#7aa2f7",accentContrast:"#16161e",accentSoft:"#283a5b",selection:"#33467c",selectionText:"#c0caf5",rail:"#565f89"})}},
] as const;
export type ThemePreset = typeof THEME_PRESETS[number]["id"];
export const DEFAULT_THEME_PRESET: ThemePreset = "default";
export const isThemePreset=(value:unknown):value is ThemePreset=>THEME_PRESETS.some(p=>p.id===value);
export const validateThemePreset=(value:unknown):ThemePreset=>isThemePreset(value)?value:DEFAULT_THEME_PRESET;
export function saveThemePreset(preset:ThemePreset){try{localStorage.setItem(THEME_PRESET_STORAGE_KEY,JSON.stringify({version:1,preset:validateThemePreset(preset)}));return true}catch{return false}}
export function loadThemePreset(): ThemePreset {
  if (typeof window === "undefined") return DEFAULT_THEME_PRESET;
  try {
    const raw = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
    if (raw) {
      try {
        const stored: unknown = JSON.parse(raw);
        if (
          typeof stored === "object" && stored !== null &&
          "version" in stored && stored.version === 1 &&
          "preset" in stored && isThemePreset(stored.preset)
        ) return stored.preset;
      } catch {
        // Fall through to legacy migration when the versioned record is malformed.
      }
    }
    for (const key of LEGACY_THEME_PRESET_KEYS) {
      if (localStorage.getItem(key) !== null) {
        if (saveThemePreset(DEFAULT_THEME_PRESET)) {
          for (const oldKey of LEGACY_THEME_PRESET_KEYS) localStorage.removeItem(oldKey);
        }
        return DEFAULT_THEME_PRESET;
      }
    }
  } catch {
    // Storage can be unavailable in private or restricted contexts.
  }
  return DEFAULT_THEME_PRESET;
}
