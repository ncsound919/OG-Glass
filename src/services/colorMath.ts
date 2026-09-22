/**
 * Deterministic color mathematics — HSL conversions and harmonic palettes.
 *
 * This is the mathematical core that a high-end design system needs: derive a
 * full accent family from one primary hue using color-harmony angles, and keep
 * every derived color consistent. Pure, deterministic, no LLM. (The math-x
 * project's deterministic subsystems are the same kind of math; we compute it
 * in-process rather than calling its LLM-routed API.)
 */

export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h: ((h % 360) + 360) % 360, s, l };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function toHex(rgb: RGB): string {
  const p = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${p(rgb.r)}${p(rgb.g)}${p(rgb.b)}`;
}

/** Parse #rgb/#rrggbb (the token palette uses hex primaries). */
export function hexToRgb(hex: string): RGB | null {
  let h = hex.replace("#", "").trim();
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export type Harmony = "analogous" | "complementary" | "triadic" | "split-complementary" | "monochrome";

/** Hue offsets for each harmony family. Deterministic. */
export function harmonyOffsets(harmony: Harmony): number[] {
  switch (harmony) {
    case "analogous":
      return [0, 30, -30, 60];
    case "complementary":
      return [0, 180, 15, -15];
    case "triadic":
      return [0, 120, 240, 180];
    case "split-complementary":
      return [0, 150, 210, 30];
    case "monochrome":
    default:
      return [0, 0, 0, 0];
  }
}

export interface AccentDerivation {
  primary: string;
  primaryHover: string;
  secondary: string;
  danger: string;
  success: string;
  warning: string;
}

/**
 * Derive a full accent family from one primary hex using harmonic hue offsets
 * plus lightness/saturation shaping. `index` orders the offsets: primary uses
 * offset 0, then secondary/danger/success/warning follow a deterministic
 * rotation so the family reads as one coherent system.
 */
export function deriveAccentPalette(primaryHex: string, harmony: Harmony = "complementary"): AccentDerivation {
  const base = hexToRgb(primaryHex);
  if (!base) {
    return { primary: primaryHex, primaryHover: primaryHex, secondary: primaryHex, danger: primaryHex, success: primaryHex, warning: primaryHex };
  }
  const hsl = rgbToHsl(base.r, base.g, base.b);
  const offsets = harmonyOffsets(harmony);

  const at = (hueOffset: number, sMul = 1, lAdj = 0): string => {
    const h = (hsl.h + hueOffset + 360) % 360;
    const s = Math.max(0.05, Math.min(1, hsl.s * sMul));
    const l = Math.max(0.08, Math.min(0.92, hsl.l + lAdj));
    return toHex(hslToRgb(h, s, l));
  };

  return {
    primary: primaryHex,
    primaryHover: at(0, 1, -0.06),
    secondary: at(offsets[1] ?? 180, 0.7, 0.05),
    danger: at(offsets[2] ?? 180, 1, -0.02),
    success: at(offsets[3] ?? 120, 0.85, -0.05),
    warning: at(offsets[1] ?? 30, 0.9, 0.1),
  };
}