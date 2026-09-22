/**
 * OG-Glass JEV design-direction engine.
 *
 * Per project, JEV decides the design direction over bounded questions (style,
 * palette, graphics, precision, dark/light) — each option carrying a criterion
 * that encodes awesome-design principles and current frontend practice, so the
 * local decision model "adheres to a top-notch prerequisite" every time. The
 * decisions then map to a preset, the chosen preset is run through the
 * deterministic quality gate, and a DESIGN.md contract is emitted.
 *
 * Honest contract (same as cheetah_jev): a non-2xx, timeout, or malformed
 * answer yields source="offline" with the real error and falls back to the
 * deterministic keyword classifier. A decision is never fabricated. An explicit
 * `overrides` argument always wins.
 */

import type { Preset } from "../types/index.js";
import { listAvailablePresets, loadPreset } from "./presetLoader.js";
import { RefinementStrategy, DEFAULT_STRATEGY } from "./refine.js";
import type { Harmony } from "./colorMath.js";

export interface DesignDecisionSettings {
  baseUrl: string;
  timeoutMs: number;
  enabled: boolean;
  maxAttempts: number;
}

const RETRYABLE = new Set([429, 529]);

export const STYLE_CRITERIA: Record<string, string> = {
  "glassmorphic-base": "translucent layered surfaces, backdrop blur, dark, modern SaaS",
  "style-aurora": "iridescent gradients, flowing color fields, premium creative",
  "style-brutalist": "raw structural grid, stark borders, high contrast, editorial-dev",
  "style-neon-cyberpunk": "neon accents, dense dark, electric energy",
  "style-neumorphic": "soft extruded shapes, low contrast, calm tactile",
  "style-soft-pastel": "gentle pastels, rounded, friendly consumer",
  "style-flat-corporate": "flat light surfaces, restrained blue, professional B2B",
  "style-material": "Material 3 elevation, tonal surfaces, Android/Google",
  "style-healthcare": "clean white/teal, high legibility, trustworthy clinical",
  "style-editorial": "serif typography, black/cream, magazine-like long-form",
  "style-minimal-light": "grayscale minimal, generous whitespace, quiet and precise",
};

export const PALETTE_CRITERIA: Record<string, string> = {
  monochrome: "single-hue scale, maximum restraint",
  "dual-tone": "two dominant hues, clear hierarchy",
  vibrant: "saturated accents on neutral base, energetic",
  "muted-pastel": "desaturated tones, calm and soft",
  "brand-first": "led by the brand accent, everything else neutral",
  "data-dense": "many distinguishable categorical colors for charts/tables",
};

export const GRAPHICS_CRITERIA: Record<string, string> = {
  glass: "backdrop blur surfaces with highlight edges",
  flat: "flat fills, no depth, crisp borders",
  editorial: "large type-driven composition, minimal decoration",
  "data-viz": "chart-first, grid-friendly, legible labels",
  playful: "rounded shapes, bright fills, approachable",
};

const GOAL_HINTS: Array<[string, { style: string; palette: string; graphics: string; precision: number; dark: number }]> = [
  ["healthcare|clinical|patient|wellness", { style: "style-healthcare", palette: "brand-first", graphics: "flat", precision: 1, dark: 0 }],
  ["fintech|bank|trading|portfolio", { style: "style-flat-corporate", palette: "dual-tone", graphics: "data-viz", precision: 1, dark: 0 }],
  ["saas|admin|dashboard|b2b|enterprise", { style: "style-flat-corporate", palette: "brand-first", graphics: "data-viz", precision: 1, dark: 0 }],
  ["marketing|landing|pitch|brand", { style: "style-aurora", palette: "vibrant", graphics: "editorial", precision: 0, dark: 0 }],
  ["game|esports|gaming", { style: "style-neon-cyberpunk", palette: "vibrant", graphics: "playful", precision: 0, dark: 1 }],
  ["art|creative|portfolio|design", { style: "style-editorial", palette: "monochrome", graphics: "editorial", precision: 0, dark: 0 }],
  ["consumer|social|community|mobile", { style: "style-soft-pastel", palette: "muted-pastel", graphics: "playful", precision: 1, dark: 0 }],
  ["analytics|charts|metrics|monitor", { style: "style-minimal-light", palette: "data-dense", graphics: "data-viz", precision: 1, dark: 0 }],
];

function classifyGoal(goal: string): { style: string; palette: string; graphics: string; precision: number; dark: number } {
  const text = goal.toLowerCase();
  for (const [pattern, res] of GOAL_HINTS) {
    if (new RegExp(pattern).test(text)) return res;
  }
  return { style: "style-minimal-light", palette: "monochrome", graphics: "flat", precision: 1, dark: 0 };
}

function answer<T>(answers: Record<string, unknown> | undefined, id: string, type: string): T | undefined {
  const a = answers?.[id];
  if (!a || typeof a !== "object" || (a as { type?: string }).type !== type) return undefined;
  return a as T;
}

export interface DesignDirection {
  ok: boolean;
  source: "localjev" | "offline";
  model?: string;
  latencyMs: number;
  decisions: Array<{ id: string; source: string; decision: string | number | boolean; confidence?: number; value?: unknown; error?: string }>;
  error?: string;
  chosen: { style: string; palette: string; graphics: string; precision: number; dark: number };
}

export async function decideDesignDirection(
  goal: string,
  settings: DesignDecisionSettings,
  overrides?: Partial<DesignDirection["chosen"]>,
): Promise<DesignDirection> {
  const started = Date.now();
  const classifier = classifyGoal(goal);
  const resolved = {
    style: overrides?.style ?? classifier.style,
    palette: overrides?.palette ?? classifier.palette,
    graphics: overrides?.graphics ?? classifier.graphics,
    precision: overrides?.precision ?? classifier.precision,
    dark: overrides?.dark ?? classifier.dark,
  };

  const decisions: DesignDirection["decisions"] = [];
  if (!settings.enabled) {
    for (const [id, d] of Object.entries(resolved)) decisions.push({ id, source: "offline", decision: d });
    return { ok: true, source: "offline", latencyMs: Date.now() - started, decisions, chosen: resolved };
  }

  const payload = {
    model: "jev-latest",
    state: {
      task: "Choose the design direction for a project.",
      goal: (goal || "").slice(0, 1200),
      style_criteria: STYLE_CRITERIA,
      palette_criteria: PALETTE_CRITERIA,
      graphics_criteria: GRAPHICS_CRITERIA,
      prerequisites: [
        "WCAG AA text contrast (4.5:1 body, 3:1 large) against the surface.",
        "Spacing on a 4pt grid.",
        "A strictly increasing type scale from the declared families.",
        "No off-palette colors; no off-scale px values.",
        "Depth only where the palette declares it (glass blur vs flat).",
      ],
      current_practice: "Choose a style that fits the content type (SaaS dashboard vs marketing vs data-viz vs editorial) rather than a default glassmorphism.",
    },
    questions: {
      style: { type: "choice", instructions: "Which design style fits this project best?", criteria: STYLE_CRITERIA },
      palette: { type: "choice", instructions: "Which color strategy?", criteria: PALETTE_CRITERIA },
      graphics: { type: "choice", instructions: "Which graphics treatment?", criteria: GRAPHICS_CRITERIA },
      precision: { type: "noul", instructions: "Enforce strict precision (WCAG AA + 4pt grid) or allow expressive freedom?", criteria: { "1": "strict", "0": "expressive" } },
      dark: { type: "noul", instructions: "Dark or light theme?", criteria: { "1": "dark", "0": "light" } },
    },
  };

  let lastError = "request failed";
  let model: string | undefined;
  let answers: Record<string, unknown> | undefined;
  let got = false;

  for (let attempt = 0; attempt < settings.maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, Math.min(300, 200 * attempt)));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
      let res: Response;
      try {
        res = await fetch(`${settings.baseUrl}/v1/systemone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (RETRYABLE.has(res.status)) {
        lastError = `HTTP ${res.status} (transient overload; retrying)`;
        continue;
      }
      if (res.status !== 200) {
        lastError = `POST /v1/systemone -> HTTP ${res.status}`;
        break;
      }
      const body = (await res.json()) as { answers?: Record<string, unknown>; model?: string };
      if (!body.answers) {
        lastError = "JEV response missing answers";
        break;
      }
      answers = body.answers;
      model = body.model;
      got = true;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      break;
    }
  }

  const pick = <T extends string>(id: string, list: Record<string, T>): T | undefined => {
    const a = answer<{ choice?: string }>(answers, id, "choice");
    return a?.choice && a.choice in list ? (a.choice as T) : undefined;
  };
  const noul = (id: string): number | undefined => {
    const a = answer<{ noul?: number }>(answers, id, "noul");
    return typeof a?.noul === "number" ? a.noul : undefined;
  };

  const finalStyle = overrides?.style ?? pick("style", STYLE_CRITERIA) ?? resolved.style;
  const finalPalette = overrides?.palette ?? pick("palette", PALETTE_CRITERIA) ?? resolved.palette;
  const finalGraphics = overrides?.graphics ?? pick("graphics", GRAPHICS_CRITERIA) ?? resolved.graphics;
  const pv = noul("precision");
  const dv = noul("dark");
  const finalPrecision = overrides?.precision ?? (typeof pv === "number" ? (pv >= 0.5 ? 1 : 0) : resolved.precision);
  const finalDark = overrides?.dark ?? (typeof dv === "number" ? (dv >= 0.5 ? 1 : 0) : resolved.dark);

  const chosen = { style: finalStyle, palette: finalPalette, graphics: finalGraphics, precision: finalPrecision, dark: finalDark };
  for (const [id, d] of Object.entries(chosen)) {
    if (overrides && id in overrides) {
      decisions.push({ id, source: "default", decision: d });
      continue;
    }
    const a = answers?.[id] as { type?: string; choice?: string; noul?: number; confidence?: number } | undefined;
    if (got && a && a.type === (id === "precision" || id === "dark" ? "noul" : "choice")) {
      decisions.push({
        id,
        source: "localjev",
        decision: d,
        confidence: a.confidence,
        value: a.type === "choice" ? a.choice : a.noul,
      });
    } else {
      decisions.push({ id, source: "offline", decision: d, error: got ? "answer malformed" : lastError });
    }
  }

  return { ok: true, source: got ? "localjev" : "offline", model, latencyMs: Date.now() - started, decisions, chosen, error: got ? undefined : lastError };
}

/** Resolve a decision's chosen style to a concrete preset id (validated on disk). */
export async function resolvePresetFor(style: string): Promise<{ found: boolean; preset?: Preset; available: string[] }> {
  const available = await listAvailablePresets();
  if (available.includes(style)) {
    try {
      const preset = await loadPreset(style);
      return { found: true, preset, available };
    } catch {
      /* fall through */
    }
  }
  if (available.includes("glassmorphic-base")) {
    try {
      return { found: true, preset: await loadPreset("glassmorphic-base"), available };
    } catch {
      /* ignore */
    }
  }
  return { found: false, available };
}

export function designSettings(env: Record<string, string | undefined> = process.env): DesignDecisionSettings {
  return {
    baseUrl: (env.OG_GLASS_JEV_URL ?? env.CHEETAH_JEV_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, ""),
    timeoutMs: Number(env.OG_GLASS_JEV_TIMEOUT ?? env.CHEETAH_JEV_TIMEOUT ?? 10) * 1000,
    enabled: (env.OG_GLASS_JEV_ENABLED ?? env.CHEETAH_JEV_ENABLED ?? "1") !== "0",
    maxAttempts: 3,
  };
}

// ---------------------------------------------------------------------------
// Refinement decisions — JEV picks HOW to improve the template, then math does it.
// ---------------------------------------------------------------------------

export const RATIO_CRITERIA: Record<string, string> = {
  golden: "golden ratio (φ=1.618) — the classic high-end proportional system",
  fourth: "perfect fourth (4:3) — generous, editorial",
  third: "major third (5:4) — dense, compact, data-heavy",
};

export const HARMONY_CRITERIA: Record<string, string> = {
  analogous: "hues adjacent on the wheel — calm, cohesive",
  complementary: "opposing hues — maximum energy and contrast",
  triadic: "three evenly spaced hues — balanced vibrance",
  "split-complementary": "base plus the two flanking opposites — rich but harmonious",
  monochrome: "single hue, tonal depth — quiet luxury",
};

export interface RefinementDirection {
  ok: boolean;
  source: "localjev" | "offline";
  decisions: Array<{ id: string; source: string; decision: string | number | boolean; confidence?: number; error?: string }>;
  strategy: RefinementStrategy;
  error?: string;
  latencyMs: number;
}

export async function decideRefinement(
  goal: string,
  templatePreset: string,
  settings: DesignDecisionSettings = designSettings(),
  overrides?: Partial<RefinementStrategy>,
): Promise<RefinementDirection> {
  const started = Date.now();
  const base: RefinementStrategy = { ...DEFAULT_STRATEGY };
  const resolved: RefinementStrategy = {
    ratio: overrides?.ratio ?? base.ratio,
    harmony: overrides?.harmony ?? base.harmony,
    precision: overrides?.precision ?? base.precision,
    detail: overrides?.detail ?? base.detail,
  };

  const decisions: RefinementDirection["decisions"] = [];
  if (!settings.enabled) {
    for (const [id, d] of Object.entries(resolved)) decisions.push({ id, source: "offline", decision: d });
    return { ok: true, source: "offline", decisions, strategy: resolved, latencyMs: Date.now() - started };
  }

  const payload = {
    model: "jev-latest",
    state: {
      task: "Choose how to refine a design template into a precise, high-end system.",
      goal: (goal || "").slice(0, 800),
      template_preset: templatePreset,
      ratio_criteria: RATIO_CRITERIA,
      harmony_criteria: HARMONY_CRITERIA,
      principles: [
        "Prefer the golden ratio for premium/luxury and editorial projects.",
        "Prefer major-third spacing for dense data dashboards.",
        "Harmony must keep the primary brand hue — every derived color is a tonal relative.",
        "Precision=1: enforce WCAG AA contrast + 4pt grid on the refined output.",
        "Detail=1: a 9-step type scale and full elevation for depth.",
      ],
    },
    questions: {
      ratio: { type: "choice", instructions: "Which proportional ratio for spacing + type?", criteria: RATIO_CRITERIA },
      harmony: { type: "choice", instructions: "Which color-harmony system?", criteria: HARMONY_CRITERIA },
      precision: { type: "noul", instructions: "Strict precision gate?", criteria: { "1": "strict", "0": "expressive" } },
      detail: { type: "noul", instructions: "Rich detail (9-step type, full depth)?", criteria: { "1": "rich", "0": "restrained" } },
    },
  };

  let lastError = "request failed";
  let answers: Record<string, unknown> | undefined;
  let got = false;
  for (let attempt = 0; attempt < settings.maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, Math.min(300, 200 * attempt)));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
      let res: Response;
      try {
        res = await fetch(`${settings.baseUrl}/v1/systemone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (RETRYABLE.has(res.status)) {
        lastError = `HTTP ${res.status} (transient overload; retrying)`;
        continue;
      }
      if (res.status !== 200) {
        lastError = `POST /v1/systemone -> HTTP ${res.status}`;
        break;
      }
      const body = (await res.json()) as { answers?: Record<string, unknown> };
      if (!body.answers) {
        lastError = "JEV response missing answers";
        break;
      }
      answers = body.answers;
      got = true;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      break;
    }
  }

  const pick = <T extends string>(id: string, list: Record<string, T>): T | undefined => {
    const a = answers?.[id] as { type?: string; choice?: string } | undefined;
    return a?.type === "choice" && a.choice && a.choice in list ? (a.choice as T) : undefined;
  };
  const noul = (id: string): number | undefined => {
    const a = answers?.[id] as { type?: string; noul?: number } | undefined;
    return a?.type === "noul" && typeof a.noul === "number" ? a.noul : undefined;
  };

  const ratio = overrides?.ratio ?? pick("ratio", RATIO_CRITERIA as Record<string, RefinementStrategy["ratio"]>) ?? resolved.ratio;
  const harmony = overrides?.harmony ?? pick("harmony", HARMONY_CRITERIA as Record<string, Harmony>) ?? resolved.harmony;
  const pv = noul("precision");
  const dv = noul("detail");
  const precision = overrides?.precision ?? (typeof pv === "number" ? (pv >= 0.5 ? 1 : 0) : resolved.precision);
  const detail = overrides?.detail ?? (typeof dv === "number" ? (dv >= 0.5 ? 1 : 0) : resolved.detail);
  const strategy: RefinementStrategy = { ratio, harmony, precision, detail };

  for (const [id, d] of Object.entries(strategy)) {
    if (overrides && id in overrides) decisions.push({ id, source: "default", decision: d });
    else decisions.push({ id, source: got ? "localjev" : "offline", decision: d, error: got ? undefined : lastError });
  }

  return { ok: true, source: got ? "localjev" : "offline", decisions, strategy, error: got ? undefined : lastError, latencyMs: Date.now() - started };
}