/**
 * OG-Glass design-precision validator — deterministic, no LLM.
 *
 * A preset is "top-notch" when its tokens are internally consistent and
 * accessible: valid color values, WCAG AA text contrast, an on-scale spacing
 * system, a strictly increasing type scale, and zero unresolved token
 * references in component/layout templates. Every finding is a fact, not a
 * judgment — the JEV design process is then gated on this report so "adheres
 * each time" means "passed the deterministic quality gate".
 */

import type { Preset } from "../types/index.js";

export type Severity = "error" | "warn" | "info";

export interface QualityFinding {
  severity: Severity;
  rule: string;
  message: string;
  token?: string;
}

export interface QualityReport {
  presetId: string;
  passed: boolean;
  score: number; // 0..100
  findings: QualityFinding[];
  summary: { checked: number; errors: number; warnings: number };
}

const TOKEN_RE = /\{\{token:([^}]+)\}\}/g;

// ---------------------------------------------------------------------------
// Color math
// ---------------------------------------------------------------------------

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function hexToRgb(hex: string): RGBA | null {
  let h = hex.replace("#", "").trim();
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  if (/^[0-9a-fA-F]{8}$/.test(h)) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  return null;
}

function parseChannel(ch: string): number | null {
  const v = ch.trim();
  if (v.endsWith("%")) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? (n / 100) * 255 : null;
  }
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function parseColor(value: string): RGBA | null {
  const v = String(value ?? "").trim();
  const hex = hexToRgb(v);
  if (hex) return hex;
  let m = /^rgba?\(([^)]+)\)$/i.exec(v) ?? /^hsla?\(([^)]+)\)$/i.exec(v);
  if (!m) return null;
  const isHsl = /^hsl/i.test(v);
  const parts = m[1].split(",").map((p) => p.trim());
  if (parts.length < 3) return null;
  if (isHsl) {
    const h = parseFloat(parts[0]);
    const s = parseChannel(parts[1]) !== null ? parseChannel(parts[1])! / 255 : 0;
    const l = parseChannel(parts[2]) !== null ? parseChannel(parts[2])! / 255 : 0;
    const rgb = hslToRgb(h, s, l);
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    return { ...rgb, a: Number.isFinite(a) ? a : 1 };
  }
  const r = parseChannel(parts[0]);
  const g = parseChannel(parts[1]);
  const b = parseChannel(parts[2]);
  if (r === null || g === null || b === null) return null;
  const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  return { r, g, b, a: Number.isFinite(a) ? a : 1 };
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance(c: RGBA): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** Composite a possibly-translucent foreground over an opaque background. */
function composite(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

export function contrastRatio(a: RGBA, b: RGBA): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// Token traversal + template scanning
// ---------------------------------------------------------------------------

function resolvePath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

function collectTemplates(preset: Preset): string[] {
  const out: string[] = [];
  for (const comp of Object.values(preset.components)) {
    out.push(comp.template);
    for (const v of Object.values(comp.variants ?? {})) {
      if (v.template) out.push(v.template);
    }
  }
  for (const layout of Object.values(preset.layouts)) {
    out.push(layout.template);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

export function validatePreset(preset: Preset): QualityReport {
  const findings: QualityFinding[] = [];
  const tokens = preset.tokens;
  let checked = 0;

  const err = (rule: string, message: string, token?: string) =>
    findings.push({ severity: "error", rule, message, token });
  const warn = (rule: string, message: string, token?: string) =>
    findings.push({ severity: "warn", rule, message, token });

  // 1. Required sections
  for (const section of ["colors", "spacing", "typography", "blur"] as const) {
    checked++;
    if (!tokens[section]) err("missing-section", `missing required token section '${section}'`, section);
  }

  // 2. Color validity + contrast
  const colorKeys: Array<[string, string]> = [];
  const c = tokens.colors as Record<string, any> | undefined;
  if (c) {
    for (const [group, obj] of Object.entries(c)) {
      if (obj && typeof obj === "object") {
        for (const [key, val] of Object.entries(obj)) {
          if (typeof val === "string") colorKeys.push([`colors.${group}.${key}`, val]);
        }
      }
    }
  }
  for (const [path, raw] of colorKeys) {
    checked++;
    const parsed = parseColor(raw);
    if (!parsed) {
      err("invalid-color", `'${path}' is not a valid hex/rgb/hsl color: '${raw}'`, path);
    }
  }

  const bgRaw = c?.base?.bg as string | undefined;
  if (bgRaw) {
    const bg = parseColor(bgRaw);
    const text = c?.text as Record<string, string> | undefined;
    if (bg && text) {
      for (const [name, raw] of Object.entries(text)) {
        const fg = parseColor(raw);
        if (!fg) continue;
        if (name === "inverse") {
          // 'inverse' is text for inverse (light) surfaces, not the base bg.
          findings.push({ severity: "info", rule: "inverse-surface", message: `text '${name}' is evaluated against inverse surfaces, not the base background`, token: `colors.text.${name}` });
          continue;
        }
        checked++;
        const composited = composite(fg, bg);
        const ratio = contrastRatio(composited, bg);
        if (ratio < 3) {
          err("contrast-fail", `text '${name}' contrast ${ratio.toFixed(2)}:1 vs bg — below 3:1 (AA large)`, `colors.text.${name}`);
        } else if (ratio < 4.5) {
          warn("contrast-warn", `text '${name}' contrast ${ratio.toFixed(2)}:1 vs bg — below 4.5:1 (AA body)`, `colors.text.${name}`);
        }
      }
    }
  }

  // 3. Spacing scale on 4pt grid
  const scale = tokens.spacing?.scale;
  if (Array.isArray(scale) && scale.length) {
    for (const v of scale) {
      checked++;
      if (typeof v === "number" && v % 4 !== 0) {
        err("spacing-off-scale", `spacing scale value ${v} is not on the 4pt grid`, "spacing.scale");
      }
    }
  }

  // 4. Typography scale strictly increasing
  const tscale = tokens.typography?.scale as Record<string, string> | undefined;
  if (tscale) {
    const entries = Object.entries(tscale)
      .map(([k, v]) => [k, parseFloat(v)] as [string, number])
      .filter(([, n]) => Number.isFinite(n));
    for (let i = 1; i < entries.length; i++) {
      checked++;
      if (entries[i][1] <= entries[i - 1][1]) {
        err("type-scale", `type scale '${entries[i][0]}' (${entries[i][1]}) is not larger than '${entries[i - 1][0]}' (${entries[i - 1][1]})`, "typography.scale");
      }
    }
  }

  // 5. Unresolved token references in templates
  for (const tpl of collectTemplates(preset)) {
    for (const m of tpl.matchAll(TOKEN_RE)) {
      checked++;
      if (resolvePath(tokens, m[1]) === undefined) {
        err("unresolved-token", `template references unresolved token '${m[1]}'`, m[1]);
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warn").length;
  const score = Math.max(0, Math.min(100, 100 - errors * 10 - warnings * 3));
  return {
    presetId: preset.manifest.id,
    passed: errors === 0,
    score,
    findings,
    summary: { checked, errors, warnings },
  };
}