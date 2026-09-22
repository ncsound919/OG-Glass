/**
 * Design-quality + JEV decision MCP tools.
 *
 * The `design_brief` tool is the deep per-project decision process: JEV decides
 * the design direction (style/palette/graphics/precision/dark) against
 * awesome-design + current-practice criteria, the chosen preset is run through
 * the deterministic quality gate, and a DESIGN.md contract is emitted — so
 * variety, precision, style, colors, and graphics always pass a top-notch
 * prerequisite before being used.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadPreset, listAvailablePresets } from "../services/presetLoader.js";
import { validatePreset } from "../services/quality.js";
import { exportDesignMarkdown } from "../services/designExport.js";
import { decideDesignDirection, designSettings, resolvePresetFor, STYLE_CRITERIA, PALETTE_CRITERIA, GRAPHICS_CRITERIA } from "../services/designDecisions.js";
import { ValidatePresetSchema, DesignBriefSchema, DecideDirectionSchema } from "../schemas/toolSchemas.js";

export function registerQualityTools(server: McpServer): void {
  server.registerTool(
    "validate_preset",
    {
      title: "Validate Preset",
      description: `Deterministic design-precision gate for a preset: valid colors, WCAG AA text
contrast vs the base background, spacing on the 4pt grid, strictly increasing type
scale, and zero unresolved token references in templates. Returns a 0-100 score
and every finding. Adherence prerequisite: passed=true.

Args:
  - preset_id (string): preset folder name.`,
      inputSchema: ValidatePresetSchema,
    },
    async ({ preset_id }) => {
      try {
        const preset = await loadPreset(preset_id as string);
        return { content: [{ type: "text", text: JSON.stringify(validatePreset(preset), null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Preset '${preset_id}' not found: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "list_preset_quality",
    {
      title: "List Preset Quality",
      description: `Runs the deterministic quality gate over every preset and reports preset_id,
passed, and score, sorted by score. Use to pick the most precise preset for a project.`,
      inputSchema: {},
    },
    async () => {
      const ids = await listAvailablePresets();
      const rows: Array<{ preset_id: string; passed: boolean; score: number; errors: number; warnings: number }> = [];
      for (const id of ids) {
        try {
          const report = validatePreset(await loadPreset(id));
          rows.push({ preset_id: id, passed: report.passed, score: report.score, errors: report.summary.errors, warnings: report.summary.warnings });
        } catch {
          rows.push({ preset_id: id, passed: false, score: 0, errors: -1, warnings: -1 });
        }
      }
      rows.sort((a, b) => b.score - a.score);
      return { content: [{ type: "text", text: JSON.stringify({ presets: rows }, null, 2) }] };
    },
  );

  server.registerTool(
    "export_design_markdown",
    {
      title: "Export DESIGN.md",
      description: `Exports a preset's tokens as a Stitch/awesome-design-md DESIGN.md contract
(palette, typography, spacing, depth, components, do's/don'ts, agent prompt guide).
Deterministic: same preset -> same bytes.`,
      inputSchema: ValidatePresetSchema,
    },
    async ({ preset_id }) => {
      try {
        const preset = await loadPreset(preset_id as string);
        return { content: [{ type: "text", text: exportDesignMarkdown(preset) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Preset '${preset_id}' not found: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "decide_design_direction",
    {
      title: "Decide Design Direction (JEV)",
      description: `Per-project JEV decision over style, palette, graphics, precision, and theme,
where every option carries awesome-design + current frontend practice criteria.
Honest contract: offline JEV falls back to a deterministic keyword classifier
and the real error is reported — a decision is never fabricated.`,
      inputSchema: DecideDirectionSchema,
    },
    async ({ goal }) => {
      const result = await decideDesignDirection(String(goal ?? ""), designSettings());
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { ok: result.ok, source: result.source, model: result.model, latency_ms: result.latencyMs, decisions: result.decisions, chosen: result.chosen, error: result.error, styles: STYLE_CRITERIA, palettes: PALETTE_CRITERIA, graphics: GRAPHICS_CRITERIA },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "design_brief",
    {
      title: "Design Brief (deep decision per project)",
      description: `Full per-project design process: JEV decides style/palette/graphics/precision/theme
against awesome-design + current-practice criteria; the chosen preset is resolved,
run through the deterministic quality gate, and a DESIGN.md contract is exported.
Adheres each time = JEV decision + quality gate passed + DESIGN.md emitted.`,
      inputSchema: DesignBriefSchema,
    },
    async (args) => {
      const goal = String(args.goal ?? "");
      const overrides = {
        ...(args.style ? { style: args.style as string } : {}),
        ...(args.palette ? { palette: args.palette as string } : {}),
        ...(args.graphics ? { graphics: args.graphics as string } : {}),
        ...(typeof args.precision === "boolean" ? { precision: args.precision ? 1 : 0 } : {}),
        ...(typeof args.dark === "boolean" ? { dark: args.dark ? 1 : 0 } : {}),
      };
      const direction = await decideDesignDirection(goal, designSettings(), overrides);
      const { found, preset, available } = await resolvePresetFor(direction.chosen.style);
      const quality = preset ? validatePreset(preset) : null;
      const design_md = preset ? exportDesignMarkdown(preset) : null;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: direction.ok && found,
                source: direction.source,
                decisions: direction.decisions,
                chosen: direction.chosen,
                preset_resolved: found ? preset?.manifest.id : null,
                available_presets: available,
                quality,
                design_md,
                note: found
                  ? "Quality gate must pass (passed=true) before this direction is used."
                  : `No preset on disk for '${direction.chosen.style}'; available: ${available.join(", ")}`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}