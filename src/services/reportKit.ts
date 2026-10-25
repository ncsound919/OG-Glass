// ─────────────────────────────────────────────────────────────────────────────
// services/reportKit.ts  –  Deterministic HTML for reports and marketing pages
//
// OG-Glass already owns the design tokens. This module spends them: it turns a
// small, typed document model into a self-contained HTML file (no CDN, no web
// font, no script) that can be emailed, printed, or served as a static page.
//
// Why a document model instead of templating arbitrary HTML: the oncology
// estate publishes evidence, and a report that silently drops a section or
// renders an unescaped string is worse than no report. Every string here is
// escaped, every section type is finite, and the same input always produces
// byte-identical output.
// ─────────────────────────────────────────────────────────────────────────────

import { generateCSSVariables } from "./tokenResolver.js";
import type { DesignTokens } from "../types/index.js";

export interface ReportMetric {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}

export interface ReportTable {
  caption?: string;
  columns: string[];
  rows: string[][];
}

export interface ReportCallout {
  tone?: "info" | "warn" | "bad" | "good";
  title: string;
  body: string;
}

export interface ReportSection {
  heading: string;
  body?: string[];
  bullets?: string[];
  metrics?: ReportMetric[];
  table?: ReportTable;
  callout?: ReportCallout;
}

export interface ReportDocument {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  summary?: string;
  meta?: Array<{ label: string; value: string }>;
  sections: ReportSection[];
  footer?: string;
}

export interface MarketingDocument {
  brand: string;
  tagline?: string;
  nav?: Array<{ label: string; href: string }>;
  hero: {
    eyebrow?: string;
    title: string;
    lede: string;
    primaryCta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  proof?: Array<{ value: string; label: string; note?: string }>;
  sections: Array<{
    heading: string;
    body?: string[];
    bullets?: string[];
    cta?: { label: string; href: string };
  }>;
  closing?: { title: string; body: string; cta?: { label: string; href: string } };
  disclaimer?: string;
  footer?: string;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: unknown): string {
  // Same set as text, but a javascript: URL is refused rather than escaped.
  const href = String(value ?? "").trim();
  if (/^(javascript|data|vbscript):/i.test(href)) return "#";
  return escapeHtml(href);
}

function shell(title: string, css: string, body: string, bodyClass: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="OG-Glass report kit">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body class="${escapeAttr(bodyClass)}">
${body}
</body>
</html>`;
}

const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; }
a { color: var(--color-accent-primary); }
h1, h2, h3 { font-family: var(--font-display); line-height: 1.15; margin: 0; }
p { margin: 0; }
.eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--color-accent-primary);
}
.muted { color: var(--color-text-muted); }
.btn {
  display: inline-block;
  padding: 12px 20px;
  border-radius: var(--card-radius);
  border: 1px solid var(--color-border);
  text-decoration: none;
  font-weight: 600;
  transition: var(--transition-default);
}
.btn-primary {
  background: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: var(--color-text-inverse);
}
.btn-secondary { background: transparent; color: var(--color-text-primary); }
.btn:hover { transform: translateY(-1px); }
`;

const REPORT_CSS = `
.report { max-width: 980px; margin: 0 auto; padding: 56px 28px 80px; }
.report-header { border-bottom: 1px solid var(--color-border); padding-bottom: 28px; margin-bottom: 32px; }
.report-header h1 { font-size: clamp(2rem, 4.4vw, 3rem); margin: 10px 0 12px; }
.report-header .subtitle { color: var(--color-text-secondary); font-size: var(--text-lg, 1.125rem); max-width: 68ch; }
.report-summary {
  margin: 28px 0 8px;
  padding: 20px 22px;
  background: var(--color-glass-tint);
  border: 1px solid var(--color-border);
  border-radius: var(--card-radius);
  color: var(--color-text-secondary);
}
.meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-top: 26px; }
.meta div { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--card-radius); padding: 14px 16px; }
.meta dt { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .08em; }
.meta dd { margin: 4px 0 0; font-weight: 600; }
.section { margin: 40px 0; }
.section h2 { font-size: clamp(1.35rem, 2.4vw, 1.8rem); margin-bottom: 14px; }
.section p + p { margin-top: 12px; }
.section ul { margin: 14px 0 0; padding-left: 20px; }
.section li { margin: 6px 0; }
.metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 16px; }
.metric { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--card-radius); padding: 16px; }
.metric .value { display: block; font-family: var(--font-display); font-size: 1.7rem; font-variant-numeric: tabular-nums; }
.metric .label { display: block; color: var(--color-text-secondary); font-size: var(--text-sm, .875rem); margin-top: 4px; }
.metric .note { display: block; color: var(--color-text-muted); font-size: var(--text-xs); margin-top: 6px; }
.metric.good .value { color: var(--color-accent-success, var(--color-accent-primary)); }
.metric.warn .value { color: var(--color-accent-warning, var(--color-accent-primary)); }
.metric.bad .value { color: var(--color-accent-danger, var(--color-accent-primary)); }
.table-wrap { margin-top: 16px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: var(--text-sm, .875rem); }
caption { text-align: left; color: var(--color-text-muted); padding-bottom: 8px; font-family: var(--font-mono); font-size: var(--text-xs); }
th, td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: top; }
th { color: var(--color-text-secondary); font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
.callout { margin-top: 16px; padding: 16px 18px; border-left: 3px solid var(--color-accent-primary); background: var(--color-glass-tint); border-radius: 0 var(--card-radius) var(--card-radius) 0; }
.callout strong { display: block; margin-bottom: 4px; }
.callout.warn { border-left-color: var(--color-accent-warning, var(--color-accent-primary)); }
.callout.bad { border-left-color: var(--color-accent-danger, var(--color-accent-primary)); }
.callout.good { border-left-color: var(--color-accent-success, var(--color-accent-primary)); }
.report-footer { margin-top: 56px; padding-top: 18px; border-top: 1px solid var(--color-border); color: var(--color-text-muted); font-size: var(--text-xs); }
@media print {
  :root { color-scheme: light; }
  body { background: #fff; color: #111; }
  .report { max-width: none; padding: 0; }
  .meta div, .metric, .callout { background: #fff; border-color: #ddd; }
  .report-footer { color: #555; }
  .section { break-inside: avoid; }
}
`;

const MARKETING_CSS = `
.nav { display: flex; align-items: center; justify-content: space-between; gap: 24px; max-width: 1120px; margin: 0 auto; padding: 22px 24px; }
.brand { font-family: var(--font-display); font-weight: 700; letter-spacing: -.01em; text-decoration: none; color: var(--color-text-primary); }
.nav-links { display: flex; gap: 18px; flex-wrap: wrap; }
.nav-links a { color: var(--color-text-secondary); text-decoration: none; font-size: var(--text-sm, .875rem); }
.hero {
  position: relative;
  overflow: hidden;
  padding: clamp(64px, 11vw, 128px) 24px;
  background:
    radial-gradient(900px 420px at 12% 0%, color-mix(in srgb, var(--color-accent-primary) 22%, transparent), transparent 70%),
    radial-gradient(700px 380px at 88% 18%, color-mix(in srgb, var(--color-accent-secondary, var(--color-accent-primary)) 18%, transparent), transparent 72%),
    var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}
.hero-inner { max-width: 980px; margin: 0 auto; }
.hero h1 { font-size: clamp(2.4rem, 6vw, 4.2rem); margin: 14px 0 18px; max-width: 22ch; }
.hero .lede { font-size: clamp(1.05rem, 1.6vw, 1.3rem); color: var(--color-text-secondary); max-width: 62ch; }
.hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; }
.proof { max-width: 1120px; margin: 0 auto; padding: 34px 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; border-bottom: 1px solid var(--color-border); }
.proof .value { display: block; font-family: var(--font-display); font-size: 1.9rem; font-variant-numeric: tabular-nums; }
.proof .label { display: block; color: var(--color-text-secondary); font-size: var(--text-sm, .875rem); }
.proof .note { display: block; color: var(--color-text-muted); font-size: var(--text-xs); margin-top: 4px; }
.market-section { padding: clamp(44px, 7vw, 84px) 24px; }
.market-section:nth-of-type(even) { background: var(--color-glass-tint); border-block: 1px solid var(--color-border); }
.market-inner { max-width: 980px; margin: 0 auto; }
.market-section h2 { font-size: clamp(1.6rem, 3vw, 2.3rem); margin-bottom: 16px; }
.market-section p { color: var(--color-text-secondary); max-width: 68ch; }
.market-section p + p { margin-top: 12px; }
.market-section ul { margin: 18px 0 0; padding-left: 20px; color: var(--color-text-secondary); }
.market-section li { margin: 7px 0; }
.market-section .btn { margin-top: 24px; }
.closing { padding: clamp(56px, 8vw, 96px) 24px; text-align: center; border-top: 1px solid var(--color-border); }
.closing h2 { font-size: clamp(1.8rem, 3.4vw, 2.6rem); margin-bottom: 14px; }
.closing p { color: var(--color-text-secondary); max-width: 62ch; margin: 0 auto; }
.disclaimer { max-width: 980px; margin: 0 auto; padding: 18px 24px 0; color: var(--color-text-muted); font-size: var(--text-xs); border-top: 1px solid var(--color-border); }
.site-footer { max-width: 1120px; margin: 0 auto; padding: 26px 24px 44px; color: var(--color-text-muted); font-size: var(--text-xs); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
@media print { .nav, .hero-ctas, .closing .btn { display: none; } }
`;

function renderMeta(meta: Array<{ label: string; value: string }> | undefined): string {
  if (!meta?.length) return "";
  const items = meta
    .map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`)
    .join("");
  return `<dl class="meta">${items}</dl>`;
}

function renderMetrics(metrics: ReportMetric[] | undefined): string {
  if (!metrics?.length) return "";
  const items = metrics
    .map((metric) => {
      const tone = metric.tone && metric.tone !== "neutral" ? ` ${metric.tone}` : "";
      return `<div class="metric${tone}"><span class="value">${escapeHtml(metric.value)}</span><span class="label">${escapeHtml(metric.label)}</span>${
        metric.note ? `<span class="note">${escapeHtml(metric.note)}</span>` : ""
      }</div>`;
    })
    .join("");
  return `<div class="metrics">${items}</div>`;
}

function renderTable(table: ReportTable | undefined): string {
  if (!table) return "";
  const head = table.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("");
  const rows = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="table-wrap"><table>${table.caption ? `<caption>${escapeHtml(table.caption)}</caption>` : ""}<thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderCallout(callout: ReportCallout | undefined): string {
  if (!callout) return "";
  const tone = callout.tone && callout.tone !== "info" ? ` ${callout.tone}` : "";
  return `<div class="callout${tone}"><strong>${escapeHtml(callout.title)}</strong>${escapeHtml(callout.body)}</div>`;
}

function renderSection(section: ReportSection): string {
  const paragraphs = (section.body ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const bullets = section.bullets?.length
    ? `<ul>${section.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";
  return `<section class="section"><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${bullets}${renderMetrics(
    section.metrics
  )}${renderTable(section.table)}${renderCallout(section.callout)}</section>`;
}

/** Render a report document as one self-contained HTML file. */
export function renderReportHtml(document: ReportDocument, tokens: DesignTokens): string {
  const body = `<main class="report">
  <header class="report-header">
    ${document.eyebrow ? `<p class="eyebrow">${escapeHtml(document.eyebrow)}</p>` : ""}
    <h1>${escapeHtml(document.title)}</h1>
    ${document.subtitle ? `<p class="subtitle">${escapeHtml(document.subtitle)}</p>` : ""}
    ${renderMeta(document.meta)}
    ${document.summary ? `<p class="report-summary">${escapeHtml(document.summary)}</p>` : ""}
  </header>
  ${document.sections.map(renderSection).join("\n  ")}
  <footer class="report-footer">${escapeHtml(document.footer ?? "Rendered by OG-Glass.")}</footer>
</main>`;
  return shell(document.title, `${generateCSSVariables(tokens)}\n${BASE_CSS}\n${REPORT_CSS}`, body, "og-report");
}

/** Render a marketing page from the same tokens. */
export function renderMarketingHtml(document: MarketingDocument, tokens: DesignTokens): string {
  const navLinks = (document.nav ?? [])
    .map((link) => `<a href="${escapeAttr(link.href)}">${escapeHtml(link.label)}</a>`)
    .join("");
  const ctas = [
    document.hero.primaryCta
      ? `<a class="btn btn-primary" href="${escapeAttr(document.hero.primaryCta.href)}">${escapeHtml(
          document.hero.primaryCta.label
        )}</a>`
      : "",
    document.hero.secondaryCta
      ? `<a class="btn btn-secondary" href="${escapeAttr(document.hero.secondaryCta.href)}">${escapeHtml(
          document.hero.secondaryCta.label
        )}</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  const proof = document.proof?.length
    ? `<section class="proof">${document.proof
        .map(
          (item) =>
            `<div><span class="value">${escapeHtml(item.value)}</span><span class="label">${escapeHtml(item.label)}</span>${
              item.note ? `<span class="note">${escapeHtml(item.note)}</span>` : ""
            }</div>`
        )
        .join("")}</section>`
    : "";
  const sections = document.sections
    .map(
      (section) => `<section class="market-section"><div class="market-inner"><h2>${escapeHtml(section.heading)}</h2>${(
        section.body ?? []
      )
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("")}${
        section.bullets?.length
          ? `<ul>${section.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
          : ""
      }${
        section.cta
          ? `<a class="btn btn-secondary" href="${escapeAttr(section.cta.href)}">${escapeHtml(section.cta.label)}</a>`
          : ""
      }</div></section>`
    )
    .join("\n");
  const closing = document.closing
    ? `<section class="closing"><h2>${escapeHtml(document.closing.title)}</h2><p>${escapeHtml(
        document.closing.body
      )}</p>${
        document.closing.cta
          ? `<p style="margin-top:24px"><a class="btn btn-primary" href="${escapeAttr(
              document.closing.cta.href
            )}">${escapeHtml(document.closing.cta.label)}</a></p>`
          : ""
      }</section>`
    : "";
  const disclaimer = document.disclaimer
    ? `<aside class="disclaimer">${escapeHtml(document.disclaimer)}</aside>`
    : "";
  const footer = `<footer class="site-footer"><span>${escapeHtml(
    document.footer ?? `© ${new Date().getUTCFullYear()} ${document.brand}`
  )}</span><span>${escapeHtml(document.tagline ?? "")}</span></footer>`;

  const body = `<header class="nav"><a class="brand" href="#">${escapeHtml(
    document.brand
  )}</a><nav class="nav-links">${navLinks}</nav></header>
<section class="hero"><div class="hero-inner">
  ${document.hero.eyebrow ? `<p class="eyebrow">${escapeHtml(document.hero.eyebrow)}</p>` : ""}
  <h1>${escapeHtml(document.hero.title)}</h1>
  <p class="lede">${escapeHtml(document.hero.lede)}</p>
  ${ctas ? `<div class="hero-ctas">${ctas}</div>` : ""}
</div></section>
${proof}
${sections}
${closing}
${disclaimer}
${footer}`;
  return shell(document.brand, `${generateCSSVariables(tokens)}\n${BASE_CSS}\n${MARKETING_CSS}`, body, "og-marketing");
}
