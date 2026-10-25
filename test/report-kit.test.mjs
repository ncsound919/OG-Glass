import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

const { renderReportHtml, renderMarketingHtml, escapeHtml } = await import(
  pathToFileURL(join(dist, 'services', 'reportKit.js')).href
);
const { loadPreset } = await import(pathToFileURL(join(dist, 'services', 'presetLoader.js')).href);

const preset = await loadPreset('style-healthcare');

const report = {
  eyebrow: 'Evidence report',
  title: 'Overlay Oncology <script>alert(1)</script>',
  subtitle: 'What was measured, what is still a lead',
  summary: 'Research tooling only — not a diagnostic.',
  meta: [{ label: 'Build', value: '2026-10-23' }],
  sections: [
    {
      heading: 'Surfaces',
      body: ['Four surfaces ship together.'],
      bullets: ['Website', 'Android', 'Referee'],
      metrics: [{ label: 'Website tests', value: '1,021', tone: 'good', note: '135 files' }],
      table: {
        caption: 'Live checks',
        columns: ['Surface', 'Evidence'],
        rows: [['Website', '1,021 pass'], ['Referee', '63 pass']],
      },
      callout: { tone: 'warn', title: 'Honest gap', body: 'Deployment is not proof.' },
    },
  ],
  footer: 'Rendered by OG-Glass.',
};

test('report renders the document with the preset tokens', () => {
  const html = renderReportHtml(report, preset.tokens);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>Overlay Oncology &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/title>/);
  assert.ok(!html.includes('<script>alert(1)</script>'), 'the title is escaped, not executed');
  assert.match(html, /:root \{/);
  assert.match(html, /--color-accent-primary:/);
  assert.match(html, /<h2>Surfaces<\/h2>/);
  assert.match(html, /class="metric good"/);
  assert.match(html, /<th scope="col">Surface<\/th>/);
  assert.match(html, /Live checks/);
  assert.match(html, /class="callout warn"/);
  assert.match(html, /@media print/);
  assert.match(html, /Research tooling only/);
});

test('the same document renders byte-identically', () => {
  assert.equal(renderReportHtml(report, preset.tokens), renderReportHtml(report, preset.tokens));
});

test('empty optional fields do not leave broken markup', () => {
  const html = renderReportHtml({ title: 'Minimal', sections: [] }, preset.tokens);
  assert.match(html, /<h1>Minimal<\/h1>/);
  assert.ok(!html.includes('<dl class="meta">'));
  assert.ok(!html.includes('undefined'));
});

test('escapeHtml covers the five HTML metacharacters', () => {
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
});

test('marketing page renders hero, proof and a safe CTA', () => {
  const html = renderMarketingHtml(
    {
      brand: 'Overlay Oncology',
      tagline: 'Evidence-first research infrastructure',
      nav: [{ label: 'The book', href: '/book' }],
      hero: {
        eyebrow: 'Open research',
        title: 'Evidence you can re-run',
        lede: 'A deterministic audit trail for computational oncology claims.',
        primaryCta: { label: 'Read the field guide', href: '/book' },
        secondaryCta: { label: 'Not a link', href: 'javascript:alert(1)' },
      },
      proof: [{ value: '1,021', label: 'website tests', note: '0 failed' }],
      sections: [
        {
          heading: 'The problem',
          body: ['Claims outrun the evidence.'],
          bullets: ['No split provenance', 'No calibrated baselines'],
          cta: { label: 'See the method', href: '/method' },
        },
      ],
      closing: { title: 'Read the book', body: 'The mission, the tech, the limits.', cta: { label: 'Start', href: '/book' } },
      disclaimer: 'Research tooling only — not a diagnostic or a treatment recommendation.',
      footer: '© 2026 Overlay Oncology',
    },
    preset.tokens
  );
  assert.match(html, /Evidence you can re-run/);
  assert.match(html, /class="proof"/);
  assert.match(html, /href="\/book"/);
  assert.match(html, /href="#"/, 'a javascript: href is refused');
  assert.ok(!html.includes('javascript:alert'), 'the dangerous URL never reaches the page');
  assert.match(html, /not a diagnostic/);
  assert.match(html, /class="disclaimer"/);
});
