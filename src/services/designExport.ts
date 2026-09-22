/**
 * DESIGN.md exporter — turns a preset's tokens into the Stitch/awesome-design-md
 * format used by AI coding agents. Deterministic: same preset -> same bytes.
 * This is what lets a project's frontend generator (Cheetah components,
 * OG-Glass presets) follow one contract.
 */

import type { Preset } from "../types/index.js";
import { parseColor } from "./quality.js";

function hexish(raw: string): string {
  const parsed = parseColor(raw);
  if (!parsed) return raw;
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(Math.round(parsed.r))}${toHex(Math.round(parsed.g))}${toHex(Math.round(parsed.b))}`;
}

export function exportDesignMarkdown(preset: Preset): string {
  const t = preset.tokens;
  const m = preset.manifest;
  const lines: string[] = [];

  lines.push(`# DESIGN.md — ${m.name}`, "");
  lines.push(
    `> ${m.description}`,
    `> Auto-generated from OG-Glass preset \`${m.id}\` (deterministic; zero LLM).`,
    `> Follow this contract for all styling decisions: spacing, typography, color, depth, and component look.`,
    "",
  );

  lines.push("## 1. Visual Theme & Atmosphere", "");
  const mood =
    m.styleCategory
      ? { glassmorphic: "translucent, layered, depth-forward", neumorphic: "soft, tactile, understated", brutalist: "raw, high-contrast, structural", cyberpunk: "neon, electric, dense" }[m.styleCategory]
      : undefined;
  lines.push(`- **Mood:** ${mood ?? (m.tags.join(", ") || "custom")}`);
  lines.push(`- **Density:** ${/dark/i.test(m.tags.join(" ")) ? "comfortable" : "spacious"}`);
  lines.push(`- **Design philosophy:** ${m.designPrinciples?.join(" ") ?? m.description}`);
  lines.push("");

  // Colors
  lines.push("## 2. Color Palette & Roles", "");
  lines.push("| Token | Value | Role |", "|---|---|---|");
  const c = t.colors;
  const rows: Array<[string, string, string]> = [];
  rows.push(["color-background", hexish(c.base.bg), "Main surface"]);
  rows.push(["color-surface", hexish(c.base.surface ?? c.base.bg), "Cards, raised panels"]);
  rows.push(["color-border", hexish(c.base.border ?? c.base.bg), "Dividers, input borders"]);
  rows.push(["color-overlay", hexish(c.base.overlay ?? "#000000"), "Modals, overlays"]);
  for (const [key, val] of Object.entries(c.accent)) {
    const role = key === "primary" ? "Primary actions" : key === "danger" ? "Error states" : key === "success" ? "Success states" : `Accent: ${key}`;
    rows.push([`color-${key}`, hexish(val), role]);
  }
  rows.push(["color-text-primary", hexish(c.text.primary), "Body and headings"]);
  rows.push(["color-text-secondary", hexish(c.text.secondary), "Secondary text"]);
  rows.push(["color-text-muted", hexish(c.text.muted), "Muted text"]);
  for (const [token, value, role] of rows) {
    lines.push(`| \`${token}\` | ${value} | ${role} |`);
  }
  lines.push("");

  // Typography
  lines.push("## 3. Typography Rules", "");
  lines.push("| Level | Font | Size | Weight | Usage |", "|---|---|---|---|---|");
  const fam = t.typography.fontFamily;
  const scale = t.typography.scale;
  const levelMap: Array<[string, string]> = [
    ["Display", scale["4xl"] ?? scale["3xl"] ?? "2.25rem"],
    ["H1", scale["3xl"] ?? "1.875rem"],
    ["H2", scale["2xl"] ?? "1.5rem"],
    ["H3", scale["xl"] ?? "1.25rem"],
    ["Body", scale["base"] ?? "0.9375rem"],
    ["Small", scale["sm"] ?? "0.8125rem"],
    ["Mono", scale["sm"] ?? "0.8125rem"],
  ];
  for (const [level, size] of levelMap) {
    const weight = level === "Body" ? "400" : level === "Display" ? "700" : "600";
    lines.push(`| ${level} | \`${fam.body}\` | ${size} / ${weight} | ${level === "Mono" ? "Code, technical values" : level === "Display" ? "Hero headlines" : `${level} text`} |`);
  }
  lines.push("", "- Line height: " + (t.typography.lineHeight?.normal ?? "1.5"));
  lines.push("");

  // Spacing
  lines.push("## 4. Spacing & Layout", "");
  lines.push(`- Spacing scale: ${Array.isArray(t.spacing.scale) ? t.spacing.scale.join(", ") + " (4pt base)" : "4pt base"}`);
  const card = t.spacing.card;
  lines.push(`- Card radius: ${card?.borderRadius ?? "16px"} | Card padding: ${card?.padding ?? "20px"} | Card gap: ${card?.gap ?? "16px"}`);
  lines.push(`- Sidebar: ${t.spacing.sidebar?.width ?? "260px"} (collapsed ${t.spacing.sidebar?.collapsedWidth ?? "64px"})`);
  lines.push("");

  // Depth & elevation
  lines.push("## 5. Depth & Elevation", "");
  lines.push("| Level | Treatment | Usage |", "|---|---|---|");
  const elev = t.blur.elevation;
  const depthMap: Array<[string, string, string]> = [
    ["0", elev?.[0] ?? "none", "Flat surfaces"],
    ["1", elev?.[1] ?? "blur(8px)", "Cards"],
    ["2", elev?.[2] ?? "blur(16px)", "Sidebar, panels"],
    ["3", elev?.[3] ?? "blur(28px)", "Modals"],
    ["4", elev?.[4] ?? "blur(44px)", "Popovers, tooltips"],
  ];
  for (const [level, treat, usage] of depthMap) {
    lines.push(`| ${level} | \`${treat}\` | ${usage} |`);
  }
  lines.push("", `- Glass tint: \`${c.glass?.tint ?? "rgba(255,255,255,0.04)"}\` | shadow: \`${c.glass?.shadow ?? "rgba(0,0,0,0.4)"}\``, "");

  // Components
  const compNames = Object.keys(preset.components);
  if (compNames.length) {
    lines.push("## 6. Component Stylings", "");
    for (const name of compNames) {
      const comp = preset.components[name];
      lines.push(`- **${name}** (${comp.category}): ${comp.description}`);
    }
    lines.push("");
  }

  // Do's / don'ts
  lines.push("## 7. Do's and Don'ts", "");
  lines.push("- DO: use the token palette exactly — never introduce colors outside it.");
  lines.push("- DO: keep spacing on the 4pt grid.");
  lines.push("- DO: use the declared type scale and font families only.");
  if (m.styleCategory === "glassmorphic" || /glass/i.test(m.tags.join(" "))) {
    lines.push("- DO: apply backdrop-filter only to glass surfaces (surfaces, cards).");
    lines.push("- DON'T: stack blur on flat/static content — it costs performance and readability.");
  } else {
    lines.push("- DO: keep elevation flat where the palette has no glass tokens.");
    lines.push("- DON'T: add drop shadows not present in the depth table.");
  }
  lines.push("- DON'T: use more than the two declared font families (body + mono).");
  lines.push("- DON'T: hardcode px values that are off the spacing scale.");
  lines.push("");

  // Agent prompt guide
  lines.push("## 8. Agent Prompt Guide", "");
  lines.push(
    `Quick reference: primary \`${hexish(c.accent.primary ?? "#000000")}\`, background \`${hexish(c.base.bg)}\`, radius \`${card?.borderRadius ?? "16px"}\`, spacing base \`4px\`.`
  );
  lines.push("", "> Use the DESIGN.md file in the project root as the visual reference for all styling decisions. Follow the spacing, typography, and color palette exactly.");
  lines.push("");

  return lines.join("\n");
}