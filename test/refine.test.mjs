import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

const { deriveAccentPalette, rgbToHsl, hslToRgb, toHex, hexToRgb, harmonyOffsets } = await import(pathToFileURL(join(dist, 'services', 'colorMath.js')).href);
const { refineDesign, buildSpacingScale, buildTypeScale, DEFAULT_STRATEGY } = await import(pathToFileURL(join(dist, 'services', 'refine.js')).href);
const { decideRefinement, RATIO_CRITERIA, HARMONY_CRITERIA } = await import(pathToFileURL(join(dist, 'services', 'designDecisions.js')).href);
const { validatePreset } = await import(pathToFileURL(join(dist, 'services', 'quality.js')).href);
const { loadPreset } = await import(pathToFileURL(join(dist, 'services', 'presetLoader.js')).href);

// ---- color math -----------------------------------------------------------

test('rgb<->hsl round trip + toHex', () => {
  const rgb = hexToRgb('#6750a4');
  assert.deepEqual(rgb, { r: 103, g: 80, b: 164 });
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const back = hslToRgb(hsl.h, hsl.s, hsl.l);
  assert.equal(toHex(back).toLowerCase(), '#6750a4');
});

test('harmony offsets are deterministic', () => {
  assert.deepEqual(harmonyOffsets('complementary'), [0, 180, 15, -15]);
  assert.deepEqual(harmonyOffsets('triadic'), [0, 120, 240, 180]);
});

test('deriveAccentPalette keeps primary and shapes a coherent family', () => {
  const p = deriveAccentPalette('#6750a4', 'complementary');
  assert.equal(p.primary, '#6750a4');
  // secondary in a complementary system sits on the opposite hue (~180°)
  const primaryHsl = rgbToHsl(...Object.values(hexToRgb('#6750a4')));
  const secondaryHsl = rgbToHsl(...Object.values(hexToRgb(p.secondary)));
  const diff = Math.abs(primaryHsl.h - secondaryHsl.h);
  assert.ok(diff > 150 && diff < 210, `expected complementary separation, got ${diff}`);
  assert.ok(/^#[0-9a-fA-F]{6}$/.test(p.success));
});

// ---- refinement -----------------------------------------------------------

test('spacing scale is golden-ratio but stays on the 4pt grid', () => {
  const scale = buildSpacingScale(1.61803398875);
  assert.ok(scale.every((v) => v % 4 === 0));
  for (let i = 1; i < scale.length; i++) assert.ok(scale[i] > scale[i - 1]);
  assert.equal(scale[0], 4);
});

test('type scale is strictly increasing', () => {
  const scale = buildTypeScale(1.25, 1);
  const values = Object.values(scale).map((s) => parseFloat(s));
  for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1]);
  assert.ok(Object.keys(scale).includes('5xl'));
});

test('refineDesign is deterministic and the refined preset passes the quality gate', async () => {
  const preset = await loadPreset('style-flat-corporate');
  const a = refineDesign(preset.tokens, DEFAULT_STRATEGY);
  const b = refineDesign(preset.tokens, DEFAULT_STRATEGY);
  assert.deepEqual(a.tokens, b.tokens);
  assert.deepEqual(a.report, b.report);

  const refinedPreset = {
    ...preset,
    manifest: { ...preset.manifest, id: `${preset.manifest.id}-refined` },
    tokens: a.tokens,
  };
  const q = validatePreset(refinedPreset);
  assert.equal(q.passed, true, JSON.stringify(q.findings.filter((f) => f.severity === 'error')));
});

test('refinement math report documents every change', async () => {
  const preset = await loadPreset('glassmorphic-base');
  const { report } = refineDesign(preset.tokens, { ratio: 'fourth', harmony: 'analogous', precision: 1, detail: 0 });
  assert.ok(report.steps.some((s) => s.field === 'spacing.scale'));
  assert.ok(report.steps.some((s) => s.field === 'colors.accent'));
  assert.ok(report.steps.some((s) => s.field === 'spacing.card.borderRadius'));
  assert.match(report.ratio_label, /perfect fourth/);
  assert.match(report.steps[0].math, /4pt grid|round4/);
});

test('refined accent differs from the template accent (creatively improved)', async () => {
  const preset = await loadPreset('style-flat-corporate');
  const { tokens } = refineDesign(preset.tokens, { ratio: 'golden', harmony: 'triadic', precision: 1, detail: 1 });
  assert.notDeepEqual(tokens.colors.accent, preset.tokens.colors.accent);
});

// ---- JEV refinement decisions ----------------------------------------------

test('decideRefinement: offline fallback is deterministic', async () => {
  const settings = { baseUrl: 'http://127.0.0.1:9', timeoutMs: 250, enabled: false, maxAttempts: 2 };
  const r = await decideRefinement('a premium SaaS dashboard', 'style-flat-corporate', settings);
  assert.equal(r.source, 'offline');
  assert.equal(r.strategy.ratio, 'golden');
  assert.equal(r.strategy.harmony, 'complementary');
  assert.equal(r.strategy.precision, 1);
});

test('decideRefinement: maps JEV choices + overrides win', async () => {
  const settings = { baseUrl: 'http://jev', timeoutMs: 300, enabled: true, maxAttempts: 2 };
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        answers: {
          ratio: { type: 'choice', choice: 'fourth' },
          harmony: { type: 'choice', choice: 'triadic' },
          precision: { type: 'noul', noul: 0.9 },
          detail: { type: 'noul', noul: 0.1 },
        },
      }),
      { status: 200 },
    );
  const r = await decideRefinement('x', 'glassmorphic-base', settings);
  assert.equal(r.source, 'localjev');
  assert.equal(r.strategy.ratio, 'fourth');
  assert.equal(r.strategy.harmony, 'triadic');
  assert.equal(r.strategy.precision, 1);
  assert.equal(r.strategy.detail, 0);

  const forced = await decideRefinement('x', 'glassmorphic-base', settings, { ratio: 'golden' });
  assert.equal(forced.strategy.ratio, 'golden');
  assert.ok(forced.decisions.find((d) => d.id === 'ratio').source === 'default');
  delete globalThis.fetch;
});

test('RATIO_CRITERIA + HARMONY_CRITERIA are complete', () => {
  for (const k of ['golden', 'fourth', 'third']) assert.ok(RATIO_CRITERIA[k]);
  for (const k of ['analogous', 'complementary', 'triadic', 'split-complementary', 'monochrome']) assert.ok(HARMONY_CRITERIA[k]);
});