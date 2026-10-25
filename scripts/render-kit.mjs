#!/usr/bin/env node
// render-kit.mjs — render a report or marketing page from a JSON document.
//
//   node scripts/render-kit.mjs report    path/to/report.json    out/report.html    [preset]
//   node scripts/render-kit.mjs marketing path/to/landing.json   out/landing.html   [preset]
//
// Run `npm run build` first: this imports the compiled services. The output is
// one self-contained HTML file, safe to email, print, or serve statically.
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadPreset } from '../dist/services/presetLoader.js';
import { renderMarketingHtml, renderReportHtml } from '../dist/services/reportKit.js';

const [, , kind, inputPath, outputPath, presetId = 'style-healthcare'] = process.argv;

if (!kind || !inputPath || !outputPath) {
  console.error('usage: node scripts/render-kit.mjs <report|marketing> <input.json> <out.html> [preset]');
  process.exit(2);
}
if (kind !== 'report' && kind !== 'marketing') {
  console.error(`unknown kind '${kind}' (expected 'report' or 'marketing')`);
  process.exit(2);
}

const document = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const preset = await loadPreset(presetId);
const html = kind === 'report'
  ? renderReportHtml(document, preset.tokens)
  : renderMarketingHtml(document, preset.tokens);

await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
await fs.writeFile(outputPath, html, 'utf8');
console.log(JSON.stringify({
  ok: true,
  kind,
  preset_id: preset.manifest.id,
  input: inputPath,
  output: outputPath,
  bytes: Buffer.byteLength(html),
}, null, 2));
