/**
 * OG-Glass design-grade engine — a deterministic S/A/B/C conformance score for
 * a preset's "high-end" quality. This is what makes "most high-end on the
 * market" measurable: a preset is graded across token completeness, WCAG
 * contrast, 4pt spacing, type scale, elevation depth, motion system, component
 * depth, and accessibility coverage of its templates. Deterministic: same
 * preset -> same grade.
 */

import type { Preset } from "../types/index.js";
import { validatePreset } from "./quality.js";

export interface GradeCategory {
  score: number;
  max: number;
  detail: string;
}

export interface DesignGrade {
  presetId: string;
  letter: "S" | "A" | "B" | "C" | "F";
  score: number; // 0..100
  categories: Record<string, GradeCategory>;
  findings: string[];
}

function cat(score: number, max: number, detail: string): GradeCategory {
  return { score: Math.max(0, Math.min(max, Math.round(score))), max, detail };
}

export function gradeDesign(preset: Preset): DesignGrade {
  const t = preset.tokens;
  const findings: string[] = [];
  const categories: Record<string, GradeCategory> = {};
  const q = validatePreset(preset);
  const errors = q.findings.filter((f) => f.severity === "error");
  const warnings = q.findings.filter((f) => f.severity === "warn");

  // 1. Token completeness (25)
  let tokensScore = 25;
  for (const section of ["colors", "spacing", "typography", "blur", "animation"] as const) {
    if (!t[section]) {
      tokensScore -= 5;
      findings.push(`missing token section: ${section}`);
    }
  }
  categories.tokens = cat(tokensScore, 25, `required token sections present: ${["colors", "spacing", "typography", "blur", "animation"].filter((s) => t[s as keyof typeof t]).length}/5`);

  // 2. Contrast (20)
  const contrastErrors = errors.filter((f) => f.rule === "contrast-fail").length;
  const contrastWarns = warnings.filter((f) => f.rule === "contrast-warn").length;
  categories.contrast = cat(20 - contrastErrors * 8 - contrastWarns * 3, 20, `${contrastErrors} contrast failures, ${contrastWarns} below-AA-body warnings`);
  if (contrastErrors) findings.push(`${contrastErrors} text token(s) below 3:1 contrast`);

  // 3. Spacing (10)
  const spacingErrors = errors.filter((f) => f.rule === "spacing-off-scale").length;
  categories.spacing = cat(10 - spacingErrors * 5, 10, `4pt grid violations: ${spacingErrors}`);

  // 4. Type scale (10)
  const typeErrors = errors.filter((f) => f.rule === "type-scale").length;
  categories.type = cat(10 - typeErrors * 5, 10, `type-scale ordering violations: ${typeErrors}`);

  // 5. Elevation depth (10)
  let elevScore = 0;
  if (t.blur?.elevation) {
    const keys = Object.keys(t.blur.elevation).length;
    elevScore = keys >= 5 ? 8 : keys >= 3 ? 5 : 2;
    if (t.colors.glass?.shadow) elevScore += 2;
  }
  categories.elevation = cat(elevScore, 10, `elevation levels: ${Object.keys(t.blur?.elevation ?? {}).length}/5${t.colors.glass?.shadow ? " + shadow color" : ""}`);

  // 6. Motion system (10)
  let motion = 0;
  const dur = Object.keys(t.animation?.duration ?? {}).length;
  const ease = Object.keys(t.animation?.easing ?? {}).length;
  const trans = Object.keys(t.animation?.transition ?? {}).length;
  motion = Math.min(10, dur * 2 + ease * 1 + trans * 1);
  categories.motion = cat(motion, 10, `durations:${dur} easings:${ease} transitions:${trans}`);

  // 7. Component depth (15) — count + variants + a11y coverage
  const comps = Object.values(preset.components);
  const withVariants = comps.filter((c) => c.variants && Object.keys(c.variants).length > 0).length;
  const a11yMarkers = /aria-|role=|\bfocus|disabled|aria-live|aria-label/i;
  const a11yCoverage = comps.length ? comps.filter((c) => a11yMarkers.test(c.template)).length / comps.length : 0;
  const depth = Math.min(1, comps.length / 10) * 6; // up to 6 for breadth
  const variantScore = comps.length ? (withVariants / comps.length) * 5 : 0; // up to 5
  const a11yScore = a11yCoverage * 4; // up to 4
  categories.components = cat(depth + variantScore + a11yScore, 15, `${comps.length} components, ${withVariants} with variants, a11y coverage ${Math.round(a11yCoverage * 100)}%`);
  if (comps.length < 6) findings.push(`component library is thin (${comps.length} components)`);
  if (a11yCoverage < 0.5) findings.push("a11y markers (aria/role/focus/disabled) missing from >50% of templates");

  // 8. Unresolved tokens / validity (10)
  const unresolved = errors.filter((f) => f.rule === "unresolved-token" || f.rule === "invalid-color").length;
  categories.validity = cat(10 - unresolved * 3, 10, `invalid colors / unresolved token refs: ${unresolved}`);

  const total = Math.max(0, Math.min(100, Math.round(
    categories.tokens.score + categories.contrast.score + categories.spacing.score +
    categories.type.score + categories.elevation.score + categories.motion.score +
    categories.components.score + categories.validity.score,
  )));
  const letter = total >= 90 ? "S" : total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : "F";

  return { presetId: preset.manifest.id, letter, score: total, categories, findings };
}