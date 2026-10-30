// ─────────────────────────────────────────────────────────────────────────────
// scripts/export-growthos.mjs  –  Write the generated design system into GrowthOS
//
// Usage:
//   GROWTHOS_DIR=/path/to/marketing-studio node scripts/export-growthos.mjs
//
// Writes:
//   app/src/main/java/.../creative/GlassCreativeTokens.kt
//   app/src/main/java/.../creative/GlassCreativeLooks.kt
//   app/src/test/resources/og-glass.creative.json
//   design/creative-kit.json
//
// Deterministic. Run `npm run export:growthos` after changing the catalog.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const growthos = process.env.GROWTHOS_DIR
  ? path.resolve(process.env.GROWTHOS_DIR)
  : path.resolve(root, "..", "..", "phone-apps", "marketing-studio");

const dist = path.join(root, "dist");
const { loadPreset } = await import(pathToFileURL(path.join(dist, "services", "presetLoader.js")).href);
const { buildCreativeTokens, toKotlin, toKotlinLooks } = await import(
  pathToFileURL(path.join(dist, "services", "creativeTokens.js")).href
);
const { buildDesignRecipe, RECIPE_CONCEPTS } = await import(
  pathToFileURL(path.join(dist, "services", "creativeRecipes.js")).href
);

const preset = await loadPreset("glassmorphic-base");
const tokens = buildCreativeTokens(preset);
const packageDir = path.join(
  growthos,
  "app",
  "src",
  "main",
  "java",
  "com",
  "overlay365",
  "marketingstudio",
  "creative"
);

const files = [
  [path.join(packageDir, "GlassCreativeTokens.kt"), toKotlin(tokens)],
  [path.join(packageDir, "GlassCreativeLooks.kt"), toKotlinLooks(tokens)],
  [
    path.join(growthos, "app", "src", "test", "resources", "og-glass.creative.json"),
    JSON.stringify(tokens, null, 2) + "\n"
  ],
  [
    path.join(growthos, "design", "creative-kit.json"),
    JSON.stringify(
      {
        ...tokens,
        concepts: RECIPE_CONCEPTS,
        examples: [
          buildDesignRecipe(tokens, { goal: "autumn menu for a neighbourhood bakery", deliverable: "menu", seed: "bakery" }),
          buildDesignRecipe(tokens, { goal: "premium skincare launch", deliverable: "poster", seed: "skincare" }),
          buildDesignRecipe(tokens, { goal: "late summer warehouse party", deliverable: "event-poster", seed: "party" }),
          buildDesignRecipe(tokens, { goal: "20% off first order", deliverable: "coupon", seed: "offer" })
        ]
      },
      null,
      2
    ) + "\n"
  ]
];

for (const [file, content] of files) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
  console.log(`wrote ${path.relative(growthos, file)} (${content.length} bytes)`);
}

console.log(
  `\n${tokens.palettes.length} palettes · ${tokens.deliverables.length} deliverables · ` +
    `${tokens.typePairings.length} pairings · ${tokens.looks.length} looks`
);
