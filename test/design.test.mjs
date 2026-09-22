import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

const { validatePreset, contrastRatio, parseColor } = await import(pathToFileURL(join(dist, 'services', 'quality.js')).href);
const { exportDesignMarkdown } = await import(pathToFileURL(join(dist, 'services', 'designExport.js')).href);
const { decideDesignDirection, designSettings, STYLE_CRITERIA } = await import(pathToFileURL(join(dist, 'services', 'designDecisions.js')).href);
const { loadPreset, listAvailablePresets } = await import(pathToFileURL(join(dist, 'services', 'presetLoader.js')).href);

// ---- color math -----------------------------------------------------------

test('parseColor + contrast', () => {
  assert.deepEqual(parseColor('#ffffff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.ok(parseColor('rgba(255, 255, 255, 0.92)'));
  assert.ok(parseColor('hsl(220, 80%, 50%)'));
  assert.equal(parseColor('notacolor'), null);
  // black on white = 21:1
  assert.ok(Math.abs(contrastRatio(parseColor('#000000'), parseColor('#ffffff')) - 21) < 0.2);
});

// ---- quality --------------------------------------------------------------

test('validatePreset on the real base preset passes the gate', async () => {
  const preset = await loadPreset('glassmorphic-base');
  const report = validatePreset(preset);
  assert.equal(report.passed, true, JSON.stringify(report.findings.filter((f) => f.severity === 'error')));
  assert.ok(report.score >= 80);
  assert.ok(report.findings.every((f) => f.severity !== 'error'));
});

test('validatePreset catches an off-scale spacing + invalid color', async () => {
  const preset = await loadPreset('glassmorphic-base');
  const broken = {
    ...preset,
    tokens: {
      ...preset.tokens,
      spacing: { ...preset.tokens.spacing, scale: [0, 4, 7, 16] },
      colors: { ...preset.tokens.colors, accent: { ...preset.tokens.colors.accent, primary: 'notacolor' } },
    },
  };
  const report = validatePreset(broken);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some((f) => f.rule === 'spacing-off-scale'));
  assert.ok(report.findings.some((f) => f.rule === 'invalid-color'));
});

test('all presets pass the deterministic quality gate', async () => {
  const ids = await listAvailablePresets();
  assert.ok(ids.includes('style-flat-corporate'));
  assert.ok(ids.includes('style-editorial'));
  for (const id of ids) {
    const report = validatePreset(await loadPreset(id));
    assert.equal(report.passed, true, `${id}: ${JSON.stringify(report.findings.filter((f) => f.severity === 'error').map((f) => f.message))}`);
  }
});

test('new style presets are diverse (different palettes/typography)', async () => {
  const flat = await loadPreset('style-flat-corporate');
  const editorial = await loadPreset('style-editorial');
  assert.notEqual(flat.tokens.colors.base.bg, editorial.tokens.colors.base.bg);
  assert.match(editorial.tokens.typography.fontFamily.body, /serif/i);
  assert.match(flat.tokens.typography.fontFamily.body, /sans-serif/i);
  assert.notEqual(flat.tokens.colors.accent.primary, editorial.tokens.colors.accent.primary);
});

// ---- DESIGN.md ------------------------------------------------------------

test('exportDesignMarkdown emits a Stitch DESIGN.md with palette + typography', async () => {
  const preset = await loadPreset('style-flat-corporate');
  const md = exportDesignMarkdown(preset);
  assert.ok(md.startsWith('# DESIGN.md — Flat Corporate'));
  assert.ok(md.includes('color-background'));
  assert.ok(md.includes('Typography Rules'));
  assert.ok(md.includes('Agent Prompt Guide'));
  assert.ok(md.includes('Do\'s and Don\'ts') || md.includes("Do's and Don'ts"));
  const again = exportDesignMarkdown(await loadPreset('style-flat-corporate'));
  assert.equal(md, again);
});

// ---- JEV decisions --------------------------------------------------------

test('decideDesignDirection: offline fallback is deterministic and honest', async () => {
  const settings = { baseUrl: 'http://127.0.0.1:9', timeoutMs: 250, enabled: false, maxAttempts: 2 };
  const r = await decideDesignDirection('a healthcare patient portal', settings);
  assert.equal(r.source, 'offline');
  assert.equal(r.chosen.style, 'style-healthcare');
  assert.equal(r.chosen.precision, 1);
  assert.ok(r.decisions.every((d) => d.source === 'offline'));
});

test('decideDesignDirection: unreachable JEV falls back with real error', async () => {
  const settings = { baseUrl: 'http://127.0.0.1:9', timeoutMs: 250, enabled: true, maxAttempts: 2 };
  const r = await decideDesignDirection('build a marketing landing page', settings);
  assert.equal(r.source, 'offline');
  assert.equal(r.chosen.style, 'style-aurora');
  assert.ok(r.error);
});

test('decideDesignDirection: maps JEV choices and honors overrides', async () => {
  const settings = { baseUrl: 'http://jev', timeoutMs: 300, enabled: true, maxAttempts: 2 };
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        model: 'localjev-test',
        answers: {
          style: { type: 'choice', choice: 'style-brutalist', confidence: 0.8 },
          palette: { type: 'choice', choice: 'vibrant' },
          graphics: { type: 'choice', choice: 'flat' },
          precision: { type: 'noul', noul: 0.9 },
          dark: { type: 'noul', noul: 0.1 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  const r = await decideDesignDirection('anything', settings);
  assert.equal(r.source, 'localjev');
  assert.equal(r.model, 'localjev-test');
  assert.equal(r.chosen.style, 'style-brutalist');
  assert.equal(r.chosen.precision, 1);
  assert.equal(r.chosen.dark, 0);

  const forced = await decideDesignDirection('anything', settings, { style: 'style-editorial' });
  assert.equal(forced.chosen.style, 'style-editorial');
  assert.ok(forced.decisions.find((d) => d.id === 'style').source === 'default');
  delete globalThis.fetch;
});

test('classifier covers all major content types', async () => {
  const settings = { baseUrl: 'http://x', timeoutMs: 10, enabled: false, maxAttempts: 1 };
  assert.equal((await decideDesignDirection('fintech trading dashboard', settings)).chosen.style, 'style-flat-corporate');
  assert.equal((await decideDesignDirection('game esports app', settings)).chosen.style, 'style-neon-cyberpunk');
  assert.equal((await decideDesignDirection('analytics metrics monitor', settings)).chosen.palette, 'data-dense');
  assert.ok(STYLE_CRITERIA['style-minimal-light']);
});

test('designSettings reads env', () => {
  assert.equal(designSettings({ OG_GLASS_JEV_URL: 'http://x:1/' }).baseUrl, 'http://x:1');
  assert.equal(designSettings({ OG_GLASS_JEV_ENABLED: '0' }).enabled, false);
});