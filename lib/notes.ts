import notes from "../shared/notes.json";

const FALLBACK = "Something happened. He's not sure what.";

/** Turns a noteId from the contract/engine into its pre-written line. */
export function noteText(noteId: number): string {
  return (notes.entries as Record<string, string>)[String(noteId)] ?? FALLBACK;
}

export const UI = notes.ui;
export const ORIGIN_CINEMATIC: string[] = notes.originCinematic;
export const STANDING_INFO = [UI.standing["0"], UI.standing["1"], UI.standing["2"], UI.standing["3"]];

/** Fill {tokens} in a UI string: fill(UI.chapter, { n: 2 }) */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Deterministic pick so the same Chog state shows the same line until it changes. */
export function pickLine(lines: string[], seed: number): string {
  return lines[Math.abs(Math.floor(seed)) % lines.length];
}
