/**
 * Deterministic design refinement — turn a template preset into a precise,
 * high-end token set using math (golden-ratio spacing, modular type scales,
 * harmonic color palettes, proportional radii). Same strategy + same preset ->
 * same refined tokens. The math is computed in-process (deterministic);
 * nothing here calls an LLM or the LLM-routed math-x API.
 *
 * The refined output still passes the deterministic quality gate: spacing stays
 * on a 4pt grid, the type scale is strictly increasing, accent colors are
 * valid, and text/base colors are carried from the (already AA-validated)
 * template.
 */

import type { DesignTokens, ColorTokens, TypographyTokens, SpacingTokens } from "../types/index.js";
import { deriveAccentPalette, Harmony } from "./colorMath.js";

export type SpacingRatio = "golden" | "fourth" | "third";

export const RATIOS: Record<SpacingRatio, { value: number; label: string }> = {
  golden: { value: 1.61803398875, label: "golden ratio (φ = 1.618)" },
  fourth: { value: 4 / 3, label: "perfect fourth (4:3 = 1.333)" },
  third: { value: 5 / 4, label: "major third (5:4 = 1.25)" },
};

export interface RefinementStrategy {
  ratio: SpacingRatio;
  harmony: Harmony;
  precision: 0 | 1;
  detail: 0 | 1;
}

export interface RefinementStep {
  field: string;
  before: string;
  after: string;
  math: string;
}

export interface RefinementReport {
  ratio: number;
  ratio_label: string;
  harmony: Harmony;
  spacing_scale: number[];
  type_scale: Record<string, string>;
  accent: Record<string, string>;
  card_radius: string;
  steps: RefinementStep[];
}

export const DEFAULT_STRATEGY: RefinementStrategy = { ratio: "golden", harmony: "complementary", precision: 1, detail: 1 };

function round4(n: number): number {
  return Math.max(4, Math.round(n / 4) * 4);
}

function dedupeStrict(values: number[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (out.length === 0 || v > out[out.length - 1]) out.push(v);
  }
  return out;
}

export function buildSpacingScale(ratio: number, count = 9): number[] {
  const raw = Array.from({ length: count }, (_, i) => round4(4 * Math.pow(ratio, i)));
  return dedupeStrict(raw);
}

export function buildTypeScale(ratio: number, detail: 0 | 1): Record<string, string> {
  const labels = detail === 1
    ? ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"]
    : ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];
  const out: Record<string, string> = {};
  labels.forEach((label, i) => {
    const rem = Math.round(0.8125 * Math.pow(ratio, i) * 100) / 100;
    out[label] = `${rem}rem`;
  });
  return out;
}

/** Refine a template's tokens. Returns the full refined token set + report. */
export function refineDesign(tokens: DesignTokens, strategy: RefinementStrategy = DEFAULT_STRATEGY): { tokens: DesignTokens; report: RefinementReport } {
  const ratio = RATIOS[strategy.ratio].value;
  const steps: RefinementStep[] = [];

  // 1. Spacing scale (golden/modular on a 4pt grid)
  const spacingBefore = tokens.spacing.scale.join(", ");
  const spacingScale = buildSpacingScale(ratio);
  steps.push({
    field: "spacing.scale",
    before: spacingBefore,
    after: spacingScale.join(", "),
    math: `round4(4 × ${strategy.ratio === "golden" ? "φ" : strategy.ratio === "fourth" ? "4/3" : "5/4"}^i) for i=0..${spacingScale.length - 1}`,
  });

  // 2. Modular type scale
  const typeBefore = Object.values(tokens.typography.scale).join(", ");
  const typeScale = buildTypeScale(ratio, strategy.detail);
  steps.push({
    field: "typography.scale",
    before: typeBefore,
    after: Object.values(typeScale).join(", "),
    math: `0.8125rem × ${RATIOS[strategy.ratio].label}^i (${strategy.detail ? "9" : "8"} steps)`,
  });

  // 3. Harmonic accent palette from the template's primary
  const primary = tokens.colors.accent.primary;
  const accent = deriveAccentPalette(primary, strategy.harmony);
  steps.push({
    field: "colors.accent",
    before: Object.values(tokens.colors.accent).join(", "),
    after: Object.values(accent).join(", "),
    math: `${strategy.harmony} harmony from ${primary} (HSL hue offsets)`,
  });

  // 4. Card radius from the spacing scale (proportional)
  const radius = `${spacingScale[3]}px`;
  steps.push({
    field: "spacing.card.borderRadius",
    before: tokens.spacing.card.borderRadius,
    after: radius,
    math: `scale[3] of the refined spacing scale (${spacingScale.join(", ")})`,
  });

  // Compose the refined tokens (base template + math-driven overrides)
  const refined: DesignTokens = {
    ...tokens,
    colors: { ...tokens.colors, accent: { ...tokens.colors.accent, ...accent } } as ColorTokens,
    spacing: {
      ...tokens.spacing,
      scale: spacingScale,
      card: { ...tokens.spacing.card, borderRadius: radius },
    } as SpacingTokens,
    typography: {
      ...tokens.typography,
      scale: typeScale,
      ...(strategy.precision === 1 ? tokens.typography : {}),
    } as TypographyTokens,
  };

  const report: RefinementReport = {
    ratio,
    ratio_label: RATIOS[strategy.ratio].label,
    harmony: strategy.harmony,
    spacing_scale: spacingScale,
    type_scale: typeScale,
    accent: { ...accent },
    card_radius: radius,
    steps,
  };
  return { tokens: refined, report };
}