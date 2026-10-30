// ─────────────────────────────────────────────────────────────────────────────
// services/creativeTokens.ts  –  Marketing deliverable token export
//
// Turns a UI preset into the tokens a creative renderer needs: print/digital
// canvas sizes, a safe inset, an optical type scale, a column grid, type
// pairings, art-direction looks and the glass recipe. Deterministic, no LLM.
//
// The looks and pairings are the shared contract between the MCP and GrowthOS:
// the app compiles the generated Kotlin instead of re-declaring the catalog.
// ─────────────────────────────────────────────────────────────────────────────

import type { Preset } from "../types/index.js";

export interface CreativePalette {
  id: string;
  background: string;
  foreground: string;
  accent: string;
  secondary: string;
  muted: string;
  /** Light or dark field, so a renderer can pick scrims without re-measuring. */
  field: "light" | "dark";
}

export interface CreativeDeliverable {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Shortest canvas side used to derive the type scale, widened for banner shapes. */
  unit: number;
  safe: number;
  headline: number;
  headlineMin: number;
  body: number;
  cta: number;
  kicker: number;
  radius: number;
  /** Layout grid: columns, outer margin and baseline step in canvas pixels. */
  columns: number;
  margin: number;
  baseline: number;
  /** Reserved for platform UI (story chrome); zero on print formats. */
  padTop: number;
  padBottom: number;
}

export interface GlassTypePairing {
  id: string;
  name: string;
  /** Bundled face id understood by GrowthOS FontLibrary. */
  displayFont: string;
  /** Text face: 'inter' is the bundled body face. */
  bodyFont: string;
  note: string;
}

export interface CreativeLook {
  id: string;
  name: string;
  note: string;
  template: string;
  palette: string;
  motif: string;
  /** Bundled display face id, or null for the app's default. */
  font: string | null;
  family: string;
  bestFor: string[];
}

export interface CreativeTokens {
  preset: string;
  generated: string;
  version: number;
  palettes: CreativePalette[];
  gradient: { angle: number; stops: string[] };
  glass: { tint: number; border: number; highlight: number; shadow: number; blur: number };
  type: { tracking: number; lineHeight: number };
  typePairings: GlassTypePairing[];
  deliverables: CreativeDeliverable[];
  looks: CreativeLook[];
}

/**
 * Curated art directions. Each carries a field, ink, primary and secondary
 * accent so a renderer can build gradients without asking the network or an LLM.
 * Values are hand-tuned for contrast at AA or better on the background.
 */
const PALETTES: CreativePalette[] = [
  { id: "glass",   background: "#0A0D14", foreground: "#EBEDF0", accent: "#6366F1", secondary: "#22D3EE", muted: "#9AA1AE", field: "dark" },
  { id: "ivory",   background: "#F7F3EA", foreground: "#16130E", accent: "#B4532A", secondary: "#D9A15B", muted: "#6B6256", field: "light" },
  { id: "cobalt",  background: "#07101F", foreground: "#F4F7FF", accent: "#2F6BFF", secondary: "#7DD3FC", muted: "#8FA1C0", field: "dark" },
  { id: "citrus",  background: "#FCF6E8", foreground: "#171407", accent: "#E4572E", secondary: "#F2B705", muted: "#6F6A57", field: "light" },
  { id: "forest",  background: "#0B1F18", foreground: "#EEF7F0", accent: "#3FBF7F", secondary: "#B7E4C7", muted: "#8FB3A2", field: "dark" },
  { id: "noir",    background: "#0B0B0C", foreground: "#F4EFE6", accent: "#C9A227", secondary: "#E5C76B", muted: "#9A9184", field: "dark" },
  { id: "bloom",   background: "#FDF1F2", foreground: "#2A1218", accent: "#D6336C", secondary: "#F59E0B", muted: "#8B6B72", field: "light" },
  { id: "studio",  background: "#F2F0EA", foreground: "#101318", accent: "#1F5EFF", secondary: "#FF5C35", muted: "#5C6068", field: "light" },
  // Second generation: warmer neutrals and sharper editorial fields. Chosen to
  // cover the tones commercial photography actually lands on, rather than more
  // saturated app colours.
  { id: "sand",    background: "#EDE4D3", foreground: "#1D1710", accent: "#9A3B26", secondary: "#C9A227", muted: "#6B6052", field: "light" },
  { id: "moss",    background: "#101A12", foreground: "#EDF4E6", accent: "#93C572", secondary: "#D9E8A3", muted: "#8FA089", field: "dark" },
  { id: "butter",  background: "#FBEFB0", foreground: "#17150A", accent: "#D7263D", secondary: "#2B59C3", muted: "#6B6250", field: "light" },
  { id: "oxblood", background: "#1A0E10", foreground: "#F7EDE6", accent: "#B32036", secondary: "#D9A15B", muted: "#A68F86", field: "dark" },
  { id: "ice",     background: "#EAF2F7", foreground: "#0C1620", accent: "#0F6FDE", secondary: "#76C7E8", muted: "#5C6B78", field: "light" },
  { id: "mono",    background: "#FBFBF9", foreground: "#0A0A0A", accent: "#F03B2F", secondary: "#0A0A0A", muted: "#6E6E6E", field: "light" }
];

interface DeliverableSeed {
  id: string;
  name: string;
  width: number;
  height: number;
}

/**
 * The delivered set. Sizes are the real export sizes; the grid and type scale
 * are derived, so adding a format cannot forget its safe area.
 */
const DELIVERABLES: DeliverableSeed[] = [
  { id: "flyer",          name: "Flyer",          width: 1080, height: 1350 },
  { id: "poster",         name: "Poster",         width: 1080, height: 1440 },
  { id: "event-poster",   name: "Event poster",   width: 1080, height: 1440 },
  { id: "square-ad",      name: "Square ad",      width: 1080, height: 1080 },
  { id: "story-ad",       name: "Story ad",       width: 1080, height: 1920 },
  { id: "coupon",         name: "Coupon",         width: 1080, height: 720 },
  { id: "loyalty-card",   name: "Loyalty card",   width: 1050, height: 600 },
  { id: "menu",           name: "Menu",           width: 1080, height: 1350 },
  { id: "web-banner",     name: "Web banner",     width: 1200, height: 628 },
  { id: "social-banner",  name: "Social banner",  width: 1500, height: 500 },
  { id: "email-header",   name: "Email header",   width: 1200, height: 400 },
  { id: "meme",           name: "Meme",           width: 1080, height: 1080 },
  { id: "logo-card",      name: "Logo card",      width: 1080, height: 1080 },
  { id: "business-card",  name: "Business card",  width: 1050, height: 600 },
  { id: "brand-banner",   name: "Brand banner",   width: 1500, height: 500 },
  { id: "profile-cover",  name: "Profile cover",  width: 1200, height: 400 },
  { id: "product-label",  name: "Product label",  width: 900,  height: 900 }
];

/**
 * Display + text pairings. The display ids must exist in GrowthOS's bundled
 * catalogue; the body is always the bundled Inter so small print stays legible
 * even when the display face has one weight.
 */
const TYPE_PAIRINGS: GlassTypePairing[] = [
  { id: "editorial",  name: "Editorial",  displayFont: "premium/bodoni_book_bt",                          bodyFont: "inter", note: "High-contrast serif against neutral text: fashion, beauty, culture." },
  { id: "classical",  name: "Classical",  displayFont: "premium/trajanpro_bold",                          bodyFont: "inter", note: "Roman capitals for heritage, hospitality and premium retail." },
  { id: "modernist",  name: "Modernist",  displayFont: "premium/futura_book_bt",                          bodyFont: "inter", note: "Geometric sans with generous air: design, architecture, tech." },
  { id: "brutalist",  name: "Brutalist",  displayFont: "premium/haettenschweiler_regular",                bodyFont: "inter", note: "Compressed poster type for offers, sport and loud retail." },
  { id: "bookish",    name: "Bookish",    displayFont: "premium/agaramondpro_regular",                    bodyFont: "inter", note: "Old-style serif for a warm, human, craft-led voice." },
  { id: "luxury",     name: "Luxury",     displayFont: "premium/acaslonpro_regular",                      bodyFont: "inter", note: "Fine-stroke Caslon for quiet, expensive restraint." },
  { id: "technical",  name: "Technical",  displayFont: "premium/myriadpro_blacksemiext",                  bodyFont: "inter", note: "Wide, confident sans for data, product and B2B." },
  { id: "retro",      name: "Retro",      displayFont: "premium/souvenir_demi_bt",                        bodyFont: "inter", note: "Soft seventies forms for food, music and neighbourhood brands." },
  { id: "poster",     name: "Poster",     displayFont: "premium/gill_sans_mt_ext_condensed_bold_bold",    bodyFont: "inter", note: "Extreme condensed for tickets, signage and stacked offers." },
  { id: "whisper",    name: "Whisper",    displayFont: "premium/abadi_mt_condensed_light_regular",        bodyFont: "inter", note: "Airy condensed for gallery captions and premium minimalism." }
];

/**
 * Art directions. These are real compositions in GrowthOS, not thumbnails:
 * the template ids and palette ids must exist in the renderer.
 */
const LOOKS: CreativeLook[] = [
  // ── Type as image
  { id: "monument-noir",   name: "Monument noir",   note: "Giant Bodoni, cropped to the bleed",        template: "monument", palette: "noir",    motif: "none",     font: "premium/bodoni_book_bt",          family: "Signature", bestFor: ["flyer", "poster", "story-ad", "square-ad"] },
  { id: "monument-butter", name: "Monument butter", note: "Black type on butter, red offer block",      template: "monument", palette: "butter",  motif: "none",     font: "premium/haettenschweiler_regular", family: "Signature", bestFor: ["flyer", "poster", "event-poster", "story-ad"] },
  { id: "monument-oxblood",name: "Monument oxblood",note: "Wine field, classical caps, gallery scale",  template: "monument", palette: "oxblood", motif: "none",     font: "premium/trajanpro_regular",       family: "Signature", bestFor: ["poster", "event-poster", "product-label"] },

  // ── Modular / technical
  { id: "index-cobalt",    name: "Index cobalt",    note: "Twelve-column register, technical grid",    template: "index",    palette: "cobalt",  motif: "crosshair",font: "premium/myriadpro_blacksemiext", family: "Systems",   bestFor: ["poster", "square-ad", "web-banner", "brand-banner"] },
  { id: "index-mono",      name: "Index mono",      note: "Newsprint grid, one red rule",               template: "index",    palette: "mono",    motif: "grid",     font: "premium/gill_sans_mt_ext_condensed_bold_bold", family: "Systems", bestFor: ["flyer", "poster", "menu", "business-card"] },
  { id: "index-ice",       name: "Index ice",       note: "Cool data field, wide sans",                 template: "index",    palette: "ice",     motif: "crosshair",font: "premium/myriadpro_boldsemiext", family: "Systems", bestFor: ["web-banner", "email-header", "profile-cover"] },

  // ── Photo-led reportage
  { id: "reportage-forest",name: "Reportage forest",note: "Full-bleed photo, serif caption block",      template: "reportage",palette: "forest",  motif: "none",     font: "premium/agaramondpro_regular",    family: "Documentary", bestFor: ["flyer", "poster", "story-ad", "square-ad"] },
  { id: "reportage-ink",   name: "Reportage ink",   note: "Documentary frame, bone caption",            template: "reportage",palette: "sand",    motif: "none",     font: "premium/acaslonpro_regular",      family: "Documentary", bestFor: ["flyer", "poster", "event-poster"] },
  { id: "reportage-noir",  name: "Reportage noir",  note: "Night photo, gold hairline",                 template: "reportage",palette: "noir",    motif: "none",     font: "premium/trajanpro_regular",       family: "Documentary", bestFor: ["story-ad", "poster", "profile-cover"] },

  // ── Quiet luxury
  { id: "quiet-ivory",     name: "Quiet ivory",     note: "One object, vast paper, Garamond",           template: "quiet",    palette: "ivory",   motif: "none",     font: "premium/agaramondpro_regular",    family: "Quiet", bestFor: ["poster", "product-label", "logo-card", "flyer"] },
  { id: "quiet-ice",       name: "Quiet ice",       note: "Cold light, Abadi whisper",                  template: "quiet",    palette: "ice",     motif: "none",     font: "premium/abadi_mt_condensed_light_regular", family: "Quiet", bestFor: ["poster", "square-ad", "brand-banner"] },
  { id: "quiet-moss",      name: "Quiet moss",      note: "Botanical still life, soft serif",           template: "quiet",    palette: "moss",    motif: "none",     font: "premium/acaslonpro_regular",      family: "Quiet", bestFor: ["product-label", "logo-card", "flyer"] },

  // ── Event / marquee
  { id: "marquee-citrus",  name: "Marquee citrus",  note: "Stacked date lockup, ticket energy",         template: "marquee",  palette: "citrus",  motif: "none",     font: "premium/haettenschweiler_regular", family: "Events", bestFor: ["event-poster", "flyer", "story-ad"] },
  { id: "marquee-bloom",   name: "Marquee bloom",   note: "Pink poster, classical caps",                template: "marquee",  palette: "bloom",   motif: "none",     font: "premium/trajanpro_bold",          family: "Events", bestFor: ["event-poster", "poster", "story-ad"] },
  { id: "marquee-glass",   name: "Marquee glass",   note: "After-dark line-up, neon rule",              template: "marquee",  palette: "glass",   motif: "orbit",    font: "premium/futura_medium_bt",        family: "Events", bestFor: ["event-poster", "story-ad", "flyer"] },

  // ── Menu / ledger
  { id: "ledger-studio",   name: "Ledger studio",   note: "Service list, dotted leaders",               template: "ledger",   palette: "studio",  motif: "rules",    font: "premium/futura_book_bt",          family: "Retail", bestFor: ["menu", "flyer", "business-card", "product-label"] },
  { id: "ledger-sand",     name: "Ledger sand",     note: "Warm paper, old-style serif prices",         template: "ledger",   palette: "sand",    motif: "none",     font: "premium/agaramondpro_regular",    family: "Retail", bestFor: ["menu", "flyer", "coupon"] },
  { id: "ledger-mono",     name: "Ledger mono",     note: "Black on white, hard red index",             template: "ledger",   palette: "mono",    motif: "none",     font: "premium/gill_sans_mt_ext_condensed_bold_bold", family: "Retail", bestFor: ["menu", "coupon", "loyalty-card"] },

  // ── Offer objects
  { id: "ticket-classic",  name: "Classic ticket",  note: "Citrus paper, perforated stub",             template: "ticket",   palette: "citrus",  motif: "none",     font: "premium/futura_medium_bt",        family: "Retail", bestFor: ["coupon", "loyalty-card"] },
  { id: "ticket-gold",     name: "Gold ticket",     note: "Oxblood field, gold seal",                  template: "ticket",   palette: "oxblood", motif: "none",     font: "premium/trajanpro_bold",          family: "Retail", bestFor: ["coupon", "loyalty-card"] },

  // ── Digital field
  { id: "aurora-indigo",   name: "Aurora indigo",   note: "Indigo light, glass panel",                  template: "aurora",   palette: "glass",   motif: "bloom",    font: "premium/futura_medium_bt",        family: "Digital", bestFor: ["flyer", "square-ad", "story-ad", "web-banner"] },
  { id: "aurora-frost",    name: "Aurora frost",    note: "Ice field, wide technical sans",            template: "aurora",   palette: "ice",     motif: "none",     font: "premium/myriadpro_blacksemiext",  family: "Digital", bestFor: ["flyer", "web-banner", "profile-cover"] },
  { id: "spectrum-mono",   name: "Spectrum mono",   note: "Red rule on white, hard sell",              template: "spectrum", palette: "mono",    motif: "none",     font: "premium/myriadpro_blacksemiext",  family: "Digital", bestFor: ["web-banner", "social-banner", "email-header"] }
];

function round(value: number): number {
  return Math.max(1, Math.round(value));
}

function metrics(width: number, height: number) {
  const short = Math.min(width, height);
  const aspect = Math.max(width, height) / short;
  // A banner reads at arm's length; widen the scale so a 400px-high header still has a voice.
  const unit = aspect > 2.4 ? short * 1.25 : short;
  const portraitStory = height / width >= 1.6;
  return {
    unit: round(unit),
    safe: round(unit * 0.06),
    headline: round(unit * 0.115),
    headlineMin: round(unit * 0.055),
    body: round(unit * 0.032),
    cta: round(unit * 0.028),
    kicker: round(unit * 0.021),
    radius: round(unit * 0.024),
    columns: aspect > 1.8 ? 12 : aspect > 1.1 ? 8 : 6,
    margin: round(unit * 0.058),
    baseline: round(unit * 0.021),
    // Story chrome covers the top and bottom of a 9:16 frame. Print formats keep 0.
    padTop: portraitStory ? round(height * 0.09) : 0,
    padBottom: portraitStory ? round(height * 0.14) : 0
  };
}

function deliverable(seed: DeliverableSeed): CreativeDeliverable {
  const m = metrics(seed.width, seed.height);
  return { ...seed, ...m };
}

function validatePresetId(presetId: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(presetId)) {
    throw new Error(`Invalid preset id '${presetId}'`);
  }
  return presetId;
}

/** Build the token document for a preset. Same input always produces the same output. */
export function buildCreativeTokens(preset: Preset, generated = "2026-10-30"): CreativeTokens {
  const presetId = validatePresetId(preset.manifest.id);
  const accent = (preset.tokens.colors.accent.primary ?? "#6366F1").toUpperCase();
  const secondary = (preset.tokens.colors.accent.secondary ?? "#22D3EE").toUpperCase();

  const palettes = PALETTES.map((palette) =>
    palette.id === "glass" ? { ...palette, accent, secondary } : { ...palette }
  );

  const paletteIds = new Set(palettes.map((p) => p.id));
  for (const look of LOOKS) {
    if (!paletteIds.has(look.palette)) {
      throw new Error(`Look '${look.id}' references unknown palette '${look.palette}'`);
    }
  }

  return {
    preset: presetId,
    generated,
    version: 2,
    palettes,
    gradient: {
      angle: 135,
      stops: [palettes[0].accent, palettes[0].secondary, "#8B5CF6"]
    },
    glass: { tint: 0.06, border: 0.1, highlight: 0.16, shadow: 0.35, blur: 24 },
    type: { tracking: -0.02, lineHeight: 0.96 },
    typePairings: TYPE_PAIRINGS,
    deliverables: DELIVERABLES.map(deliverable),
    looks: LOOKS
  };
}

function hexInt(hex: string): string {
  const clean = hex.replace("#", "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(clean)) {
    throw new Error(`Expected a 6-digit hex colour, got '${hex}'`);
  }
  return `0xFF${clean}.toInt()`;
}

function kotlinString(value: string): string {
  return JSON.stringify(value);
}

function kotlinList(values: string[]): string {
  return `listOf(${values.map(kotlinString).join(", ")})`;
}

/**
 * Emits a Kotlin object the GrowthOS app compiles directly. Keeping this in the
 * preset server means the renderer cannot silently drift from the design system.
 */
export function toKotlin(tokens: CreativeTokens): string {
  const paletteLines = tokens.palettes
    .map(
      (p) =>
        `        CreativePalette(${kotlinString(p.id)}, ${hexInt(p.background)}, ${hexInt(p.foreground)}, ` +
        `${hexInt(p.accent)}, ${hexInt(p.muted)}, ${hexInt(p.secondary)})`
    )
    .join(",\n");

  const deliverableLines = tokens.deliverables
    .map(
      (d) =>
        `        GlassDeliverable(${kotlinString(d.id)}, ${d.width}, ${d.height}, ${d.safe}, ${d.headline}, ` +
        `${d.headlineMin}, ${d.body}, ${d.cta}, ${d.kicker}, ${d.radius}, ${d.columns}, ${d.margin}, ` +
        `${d.baseline}, ${d.padTop}, ${d.padBottom})`
    )
    .join(",\n");

  const pairingLines = tokens.typePairings
    .map(
      (p) =>
        `        GlassTypePairing(${kotlinString(p.id)}, ${kotlinString(p.name)}, ` +
        `${kotlinString(p.displayFont)}, ${kotlinString(p.bodyFont)}, ${kotlinString(p.note)})`
    )
    .join(",\n");

  return `// Generated by OG-Glass MCP "export_creative_tokens" on ${tokens.generated}.
// Preset: ${tokens.preset}. Do not edit by hand: change the preset or the exporter and re-run.
package com.overlay365.marketingstudio.creative

internal object GlassCreativeTokens {
    const val PRESET = ${kotlinString(tokens.preset)}
    const val GENERATED = ${kotlinString(tokens.generated)}
    const val VERSION = ${tokens.version}

    val palettes: List<CreativePalette> = listOf(
${paletteLines}
    )

    val gradient = GlassGradient(${tokens.gradient.angle}f, listOf(${tokens.gradient.stops.map(hexInt).join(", ")}))

    val glass = GlassRecipe(
        tint = ${tokens.glass.tint}f,
        border = ${tokens.glass.border}f,
        highlight = ${tokens.glass.highlight}f,
        shadow = ${tokens.glass.shadow}f,
        blur = ${tokens.glass.blur}f
    )

    val type = GlassType(tracking = ${tokens.type.tracking}f, lineHeight = ${tokens.type.lineHeight}f)

    val typePairings: List<GlassTypePairing> = listOf(
${pairingLines}
    )

    val deliverables: List<GlassDeliverable> = listOf(
${deliverableLines}
    )

    fun deliverable(id: String): GlassDeliverable =
        deliverables.firstOrNull { it.id == id } ?: deliverables.first()

    fun pairing(id: String): GlassTypePairing =
        typePairings.firstOrNull { it.id == id } ?: typePairings.first()
}
`;
}

/**
 * Emits the look catalog as Kotlin. GrowthOS appends these to its curated
 * directions, so a new OG-Glass look ships without a hand edit in the app.
 */
export function toKotlinLooks(tokens: CreativeTokens): string {
  const lines = tokens.looks
    .map((look) => {
      const font = look.font ? kotlinString(look.font) : "null";
      return `        AdLook(
            id = ${kotlinString(look.id)},
            name = ${kotlinString(look.name)},
            note = ${kotlinString(look.note)},
            template = CreativeSpec.${look.template.toUpperCase().replace(/-/g, "_")},
            palette = ${kotlinString(look.palette)},
            motif = Motifs.${look.motif.toUpperCase().replace(/-/g, "_")},
            font = ${font},
            family = ${kotlinString(look.family)},
            bestFor = ${kotlinList(look.bestFor)}
        )`;
    })
    .join(",\n");

  return `// Generated by OG-Glass MCP "export_creative_tokens" on ${tokens.generated}.
// Preset: ${tokens.preset}. Do not edit by hand: change the look catalog and re-run.
package com.overlay365.marketingstudio.creative

import com.overlay365.marketingstudio.domain.model.CreativeSpec

/** Art directions produced by the design system and compiled into the studio. */
internal val glassLooks: List<AdLook> = listOf(
${lines}
)
`;
}

export function renderCreativeTokens(preset: Preset, format: "json" | "kotlin" | "looks"): string {
  const tokens = buildCreativeTokens(preset);
  if (format === "kotlin") return toKotlin(tokens);
  if (format === "looks") return toKotlinLooks(tokens);
  return JSON.stringify(tokens, null, 2);
}
