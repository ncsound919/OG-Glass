// ─────────────────────────────────────────────────────────────────────────────
// tools/creativeTools.ts  –  Marketing deliverable token + recipe tools
// ─────────────────────────────────────────────────────────────────────────────

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadPreset } from "../services/presetLoader.js";
import { buildCreativeTokens, toKotlin, toKotlinLooks } from "../services/creativeTokens.js";
import { buildDesignRecipe, buildRecipeOptions } from "../services/creativeRecipes.js";
import { ExportCreativeTokensSchema, DesignRecipeSchema } from "../schemas/toolSchemas.js";

export function registerCreativeTools(server: McpServer): void {

  // ── export_creative_tokens ──────────────────────────────────────────────────
  server.registerTool(
    "export_creative_tokens",
    {
      title: "Export Creative Tokens",
      description: `Export the design system as marketing deliverable tokens.

Returns the canvas sizes, column grids, safe areas and optical type scale for
flyers, posters, event posters, coupons, loyalty cards, menus, banners and brand
cards, plus fourteen art-direction palettes, ten display/text pairings, the
look catalog and the glass recipe (tint, border, highlight, shadow, blur).

Args:
  - preset_id (string): Preset whose accent seeds the palette (default: 'glassmorphic-base')
  - format ('json'|'kotlin'|'looks'): 'json' to inspect, 'kotlin' for the GrowthOS
    token object, 'looks' for the generated art-direction catalog.

Deterministic: the same preset always produces the same tokens and code.`,
      inputSchema: ExportCreativeTokensSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ preset_id, format }) => {
      try {
        const preset = await loadPreset(preset_id ?? "glassmorphic-base");
        const kind = format === "kotlin" ? "kotlin" : format === "looks" ? "looks" : "json";
        const tokens = buildCreativeTokens(preset);
        const output = kind === "kotlin" ? toKotlin(tokens) : kind === "looks" ? toKotlinLooks(tokens) : JSON.stringify(tokens, null, 2);
        return {
          content: [{ type: "text", text: output }],
          structuredContent: kind === "json"
            ? (tokens as unknown as Record<string, unknown>)
            : {
                preset: tokens.preset,
                format: kind,
                palettes: tokens.palettes.length,
                deliverables: tokens.deliverables.length,
                pairings: tokens.typePairings.length,
                looks: tokens.looks.length,
              },
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `Could not export creative tokens: ${String(err)}` }],
        };
      }
    }
  );

  // ── design_recipe ───────────────────────────────────────────────────────────
  server.registerTool(
    "design_recipe",
    {
      title: "Design Recipe",
      description: `Turn a plain-language brief into a complete, deterministic art direction.

Returns the concept and rationale, the look and palette, the display/text pairing
with bundled font ids, the column grid and safe areas, the copy hierarchy with
sizes and line limits, the visual devices to draw, per-format adaptations, copy
rules and anti-patterns.

Args:
  - goal (string): the brief, e.g. 'autumn menu for a neighbourhood bakery'
  - deliverable (string): flyer, poster, event-poster, coupon, web-banner, menu, ...
  - seed (string): optional; re-rolls the direction deterministically
  - look_id (string): pin a look instead of choosing one from the concept
  - include_alternates (boolean): return up to four directions (default true)

No model call. The craft rules come from the studio references in the repo.`,
      inputSchema: DesignRecipeSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ goal, deliverable, seed, look_id, include_alternates }) => {
      try {
        const preset = await loadPreset("glassmorphic-base");
        const tokens = buildCreativeTokens(preset);
        const input = { goal, deliverable, seed, lookId: look_id };
        const primary = buildDesignRecipe(tokens, input);
        const recipes = include_alternates === false ? [primary] : buildRecipeOptions(tokens, input);
        return {
          content: [{ type: "text", text: JSON.stringify({ primary, alternates: recipes.slice(1) }, null, 2) }],
          structuredContent: { primary, alternates: recipes.slice(1) } as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `Could not build a design recipe: ${String(err)}` }],
        };
      }
    }
  );
}
