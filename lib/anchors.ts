// Third Eye is the only scar placed at a spot instead of covering the whole image.
// Real Chogs wear hats, so the default sits on the brow/hat area. Tune per token in the gallery.
export interface Anchor { x: number; y: number; size: number } // percent of the frame

export const DEFAULT_THIRD_EYE: Anchor = { x: 50, y: 36, size: 16 };

/** Per-token overrides after tuning, e.g. { 1049: { x: 51, y: 34, size: 15 } } */
export const THIRD_EYE_OVERRIDES: Record<number, Anchor> = {};

export function thirdEyeAnchor(tokenId?: number): Anchor {
  return (tokenId !== undefined && THIRD_EYE_OVERRIDES[tokenId]) || DEFAULT_THIRD_EYE;
}
