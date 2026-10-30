// ─────────────────────────────────────────────────────────────────────────────
// services/creativeRecipes.ts  –  Deterministic art-direction recipes
//
// A recipe is the bridge between a plain-language brief and the renderer: it
// names the concept, the look, the grid, the type pairing, the copy hierarchy
// and the format adaptations. No model call, so the same brief always produces
// the same direction. The craft rules come from the design references in
// ../docs/DESIGN-REFERENCES.md (Pentagram, Base, Manual, Aesop, Google/Meta
// creative guidance, NN/g promotion research).
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from "node:crypto";
import type {
  CreativeDeliverable,
  CreativeLook,
  CreativePalette,
  CreativeTokens,
  GlassTypePairing
} from "./creativeTokens.js";

export type RecipeFormat =
  | "flyer"
  | "poster"
  | "event-poster"
  | "square-ad"
  | "story-ad"
  | "coupon"
  | "loyalty-card"
  | "menu"
  | "web-banner"
  | "social-banner"
  | "email-header"
  | "logo-card"
  | "business-card"
  | "brand-banner"
  | "profile-cover"
  | "product-label";

export interface RecipeSlot {
  role: "kicker" | "headline" | "subhead" | "offer" | "cta" | "fineprint" | "brand";
  face: "display" | "text" | "label";
  size: string;
  maxLines: number;
  note: string;
}

export interface DesignRecipe {
  id: string;
  name: string;
  concept: string;
  rationale: string;
  look: CreativeLook;
  palette: CreativePalette;
  pairing: GlassTypePairing;
  deliverable: CreativeDeliverable;
  grid: {
    columns: number;
    margin: number;
    baseline: number;
    safeTop: number;
    safeBottom: number;
    rule: string;
  };
  hierarchy: RecipeSlot[];
  devices: string[];
  formats: Record<string, string>;
  copyRules: string[];
  avoid: string[];
}

interface Concept {
  id: string;
  name: string;
  concept: string;
  rationale: string;
  looks: string[];
  devices: string[];
  keywords: string[];
  formats: Record<string, string>;
}

const CONCEPTS: Concept[] = [
  {
    id: "monument",
    name: "Monument",
    concept: "Type as the hero image: one short statement at architectural scale, cropped to the bleed, with a small functional block for the offer.",
    rationale:
      "A single oversized idea survives a phone thumbnail and a street poster. Keep the display copy to 2–5 words and let the crop do the work; the practical details stay small and anchored.",
    looks: ["monument-noir", "monument-butter", "monument-oxblood"],
    devices: [
      "type-as-image at 60–110% of canvas height, allowed to bleed off two edges",
      "one functional module in the lower third for offer, date or CTA",
      "a hairline rule and a small index mark as the only ornament",
      "grain and a slight vignette to stop the flat field reading as a mockup"
    ],
    keywords: ["fashion", "beauty", "salon", "launch", "brand", "luxury", "bold", "statement", "poster"],
    formats: {
      flyer: "Display word fills the top two thirds; offer, code and CTA stay in a 3-line module at the base.",
      poster: "Increase the display crop by one step; keep the detail block within the outer margin.",
      "event-poster": "Push the display word up and open a date/venue lockup underneath it.",
      "square-ad": "Center the crop; one line of body copy and one CTA only.",
      "story-ad": "Keep the display word between 18% and 72% of the height; the top 9% and bottom 14% are platform UI."
    }
  },
  {
    id: "index",
    name: "Index",
    concept: "A modular, numbered system: strict columns, registration marks and small data that makes the claim feel measured rather than shouted.",
    rationale:
      "A visible grid signals rigour. Use it when the offer needs proof — a clinic, a SaaS launch, a membership, a service with numbers. One accent rule and one filled block are enough.",
    looks: ["index-cobalt", "index-mono", "index-ice"],
    devices: [
      "12/8/6-column grid with visible hairline rules and corner registration marks",
      "numbered index rows (01 / 02 / 03) for features, services or agenda",
      "one solid accent block carrying the offer or CTA",
      "small mono labels and tabular figures"
    ],
    keywords: ["saas", "tech", "clinic", "health", "data", "b2b", "membership", "service", "agency", "consulting", "menu"],
    formats: {
      flyer: "Headline spans columns 1–4; index rows occupy the lower half; the offer sits in the right column.",
      poster: "Headline in the left 70%; index runs down the right edge as a narrow data strip.",
      "web-banner": "Reflow to two columns: message left, three index rows right, CTA under the message.",
      "email-header": "One-line message, one index row, one CTA; nothing else.",
      "square-ad": "Headline top, three features in a row, offer block bottom-right."
    }
  },
  {
    id: "reportage",
    name: "Reportage",
    concept: "Documentary photography as evidence: a full-bleed real moment, a restrained serif caption, and one small mark.",
    rationale:
      "For mission-led or people-led brands, a specific photograph outperforms a generic lifestyle scene. Protect faces and hands; keep copy in a quiet zone with a scrim, not over the subject.",
    looks: ["reportage-forest", "reportage-ink", "reportage-noir"],
    devices: [
      "full-bleed photo, cover-cropped, with a directional scrim",
      "caption block set in a text serif, 45–65 characters per line",
      "one hairline and a small location/date line",
      "subtle duotone or warm grade to unify mixed photography"
    ],
    keywords: ["restaurant", "cafe", "food", "community", "nonprofit", "wellness", "travel", "music", "event", "story", "people"],
    formats: {
      flyer: "Photo top 60%, caption block bottom 40% on the solid field.",
      poster: "Photo full bleed; caption sits in the lower 30% over a strong scrim.",
      "story-ad": "Photo full bleed; caption starts below the top 12% and ends above the bottom 18%.",
      "square-ad": "Photo right 60%, copy left 40%; never split a face.",
      "profile-cover": "Crop wide; keep the subject in the right third and copy left."
    }
  },
  {
    id: "quiet",
    name: "Quiet",
    concept: "Expensive restraint: one object or mark, a large empty field, a small line of type and nothing else.",
    rationale:
      "Negative space is the most reliable luxury cue. Give the product or symbol 35–55% of the canvas, keep copy to one line plus one detail, and resist adding a second graphic device.",
    looks: ["quiet-ivory", "quiet-ice", "quiet-moss"],
    devices: [
      "single object or geometric still life with soft directional light",
      "at least 40% empty field",
      "one small line of type, optically centered off-axis",
      "a tiny maker's mark, batch number or seal"
    ],
    keywords: ["luxury", "skincare", "spa", "jewelry", "hotel", "boutique", "minimal", "premium", "organic", "candle", "product"],
    formats: {
      flyer: "Object upper two thirds; one line and a small mark in the lower left.",
      poster: "Object at 50% height, centered; type in the bottom 20%.",
      "product-label": "Mark centered; product line above; detail and batch number below.",
      "logo-card": "Mark at 30% width, centered; descriptor one line beneath.",
      "business-card": "Mark left, contact block right, no decoration."
    }
  },
  {
    id: "marquee",
    name: "Marquee",
    concept: "Event poster energy: a stacked date, a big name, a venue lockup and a ticketing stub, all on a saturated field.",
    rationale:
      "Events are read at three distances: the name from across the street, the date from the door, the details in the hand. Build those three zones explicitly and keep the date unmistakable.",
    looks: ["marquee-citrus", "marquee-bloom", "marquee-glass"],
    devices: [
      "stacked date lockup with day, date and time at three sizes",
      "one oversized name, allowed to wrap into a tight block",
      "ticket-stub or barcode strip for ticketed events",
      "saturated field with a single contrasting rule"
    ],
    keywords: ["event", "party", "festival", "concert", "opening", "show", "club", "workshop", "conference", "launch party", "live", "warehouse", "night out", "dj", "lineup"],
    formats: {
      "event-poster": "Name top 45%, date lockup at 55%, venue and ticket strip at 80%.",
      flyer: "Compress the name to three lines; date block becomes a horizontal band.",
      "story-ad": "Name 25–55%, date 60%, CTA above the bottom 16%.",
      "square-ad": "Name top half, date band across the middle, venue bottom."
    }
  },
  {
    id: "ledger",
    name: "Ledger",
    concept: "A printed service list: numbered rows, dotted leaders, prices and one warm heading. The menu is the poster.",
    rationale:
      "For restaurants, salons and studios the offer is a list, not a slogan. Set the rows on a baseline grid, use tabular figures, and let one dish or service carry the accent.",
    looks: ["ledger-studio", "ledger-sand", "ledger-mono"],
    devices: [
      "numbered rows with dotted leaders and right-aligned prices",
      "one accented row for the signature item",
      "small caps heading and a hairline under the section",
      "a stamp or seal for the set menu / package"
    ],
    keywords: ["menu", "restaurant", "cafe", "salon", "spa", "studio", "services", "price", "packages", "bar", "coffee"],
    formats: {
      menu: "Heading top, 6–9 rows on a 32px baseline, footnote and mark at the base.",
      flyer: "Reduce to 4 rows plus one hero item and a QR/booking line.",
      coupon: "Offer top, three rows of what is included, code and expiry at the base.",
      "business-card": "Three services left, contact right, one rule between."
    }
  },
  {
    id: "ticket",
    name: "Ticket",
    concept: "A real coupon object: offer, code, terms and a perforated stub that looks redeemable.",
    rationale:
      "A coupon earns trust when the value, eligibility and expiry are legible together. Put the specific saving in the largest type, pair the code with the CTA, and keep the fine print attached to the offer.",
    looks: ["ticket-classic", "ticket-gold"],
    devices: [
      "perforated stub with notches and a dashed cut line",
      "offer in the largest type; code and CTA as one block",
      "barcode or QR only when the redemption flow supports it",
      "seal or stamp for the value"
    ],
    keywords: ["coupon", "discount", "sale", "offer", "promo", "redeem", "voucher", "deal"],
    formats: {
      coupon: "Offer left, code under it, terms at the base; stub carries the seal and barcode.",
      "loyalty-card": "Reward left, stamps/progress right, join instruction at the base.",
      "square-ad": "Offer top, code block middle, CTA bottom; stub becomes a footer band."
    }
  },
  {
    id: "aurora",
    name: "Aurora",
    concept: "A lit digital field: a soft gradient with a glass panel, one sharp headline and a technical micro-label.",
    rationale:
      "Use when the product is digital or the brand wants a contemporary, high-polish surface. The gradient must do a job — light, depth or motion — not just decorate. Keep one glass panel, not five.",
    looks: ["aurora-indigo", "aurora-frost", "spectrum-mono"],
    devices: [
      "radial or linear light source behind a single object or orb",
      "one glass panel with a hairline and specular top edge",
      "mono micro-labels and a coordinate mark",
      "a single CTA with a drawn arrow"
    ],
    keywords: ["app", "software", "ai", "digital", "platform", "startup", "fintech", "crypto", "web3", "product launch"],
    formats: {
      flyer: "Panel lower 55%, orb upper right, micro-label top.",
      "web-banner": "Panel left 45%, orb right, one CTA; never stack more than two lines.",
      "story-ad": "Orb top third, panel middle, CTA above the bottom safe zone.",
      "square-ad": "Orb top right, panel bottom left, one line of proof."
    }
  }
];

const COPY_RULES = [
  "Headline: one promise, 2–7 words, no two ideas joined by 'and'.",
  "Kicker: a category or occasion, not a second headline.",
  "Subhead: one sentence of proof or eligibility; 45–65 characters per line.",
  "CTA: a verb plus the object ('Book the table', 'Claim the offer'), never 'Learn more'.",
  "Offer: the specific value and the minimum spend or eligibility beside it.",
  "Fine print: expiry, channel and exclusions in one block, at least 14px equivalent."
];

const AVOID_RULES = [
  "Do not set the headline in all caps unless the face is designed for it.",
  "Do not put small text over a busy photo without a scrim.",
  "Do not use more than one accent colour for functional elements.",
  "Do not stretch a layout: recompose for the format.",
  "Do not use a barcode or QR without a real redemption destination.",
  "Do not let decoration crowd the offer, code or expiry."
];

function hash(value: string): number {
  return createHash("sha256").update(value).digest().readUInt32BE(0);
}

function pick<T>(items: T[], seed: string): T {
  return items[hash(seed) % items.length];
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function scoreConcept(concept: Concept, brief: string): number {
  const text = ` ${normalise(brief)} `;
  return concept.keywords.reduce((score, keyword) => {
    const needle = ` ${keyword} `;
    return score + (text.includes(needle) ? (keyword.includes(" ") ? 4 : 2) : 0);
  }, 0);
}

const DELIVERABLE_BIAS: Record<string, string> = {
  "event-poster": "marquee",
  coupon: "ticket",
  "loyalty-card": "ticket",
  menu: "ledger"
};

function chooseConcept(brief: string, seed: string, deliverable?: string): Concept {
  const preferred = deliverable ? DELIVERABLE_BIAS[deliverable] : undefined;
  const ranked = CONCEPTS.map((concept) => ({
    concept,
    score: scoreConcept(concept, brief) + (preferred === concept.id ? 6 : 0)
  })).sort((a, b) => b.score - a.score);
  if (ranked[0].score > 0) {
    const top = ranked.filter((entry) => entry.score === ranked[0].score).map((entry) => entry.concept);
    return pick(top, `${seed}:${brief}`);
  }
  return pick(CONCEPTS, `${seed}:${brief}`);
}

function forDeliverable(
  tokens: CreativeTokens,
  deliverableId: string
): { deliverable: CreativeDeliverable; look: CreativeLook; palette: CreativePalette; pairing: GlassTypePairing } {
  const deliverable =
    tokens.deliverables.find((entry) => entry.id === deliverableId) ??
    tokens.deliverables.find((entry) => entry.id === "flyer") ??
    tokens.deliverables[0];
  const eligible = tokens.looks.filter(
    (look) => look.bestFor.length === 0 || look.bestFor.includes(deliverable.id)
  );
  const look = eligible[0] ?? tokens.looks[0];
  const palette = tokens.palettes.find((entry) => entry.id === look.palette) ?? tokens.palettes[0];
  const pairing =
    tokens.typePairings.find((entry) => entry.displayFont === look.font) ??
    tokens.typePairings.find((entry) => entry.id === "modernist") ??
    tokens.typePairings[0];
  return { deliverable, look, palette, pairing };
}

/**
 * Build a complete direction. [lookId] pins the look; otherwise the concept
 * chooses among its approved looks using the seed, so a brief can be re-rolled.
 */
export function buildDesignRecipe(
  tokens: CreativeTokens,
  input: { goal: string; deliverable?: string; seed?: string; lookId?: string }
): DesignRecipe {
  const brief = input.goal.trim() || "A launch for a small independent brand";
  const seed = input.seed ?? "growthos";
  const deliverableId = input.deliverable ?? "flyer";
  const concept = chooseConcept(brief, seed, deliverableId);
  const pinned = input.lookId ? tokens.looks.find((look) => look.id === input.lookId) : undefined;

  let resolved;
  if (pinned) {
    const palette = tokens.palettes.find((entry) => entry.id === pinned.palette) ?? tokens.palettes[0];
    const pairing =
      tokens.typePairings.find((entry) => entry.displayFont === pinned.font) ??
      tokens.typePairings.find((entry) => entry.id === "modernist") ??
      tokens.typePairings[0];
    const d =
      tokens.deliverables.find((entry) => entry.id === deliverableId) ??
      tokens.deliverables.find((entry) => entry.id === "flyer") ??
      tokens.deliverables[0];
    resolved = { look: pinned, palette, pairing, deliverable: d };
  } else {
    const conceptLooks = tokens.looks.filter((look) => concept.looks.includes(look.id));
    const look = pick(conceptLooks.length > 0 ? conceptLooks : tokens.looks, `${seed}:${brief}:${concept.id}`);
    const palette = tokens.palettes.find((entry) => entry.id === look.palette) ?? tokens.palettes[0];
    const pairing =
      tokens.typePairings.find((entry) => entry.displayFont === look.font) ??
      tokens.typePairings.find((entry) => entry.id === "modernist") ??
      tokens.typePairings[0];
    const d =
      tokens.deliverables.find((entry) => entry.id === deliverableId) ??
      tokens.deliverables.find((entry) => entry.id === "flyer") ??
      tokens.deliverables[0];
    resolved = { look, palette, pairing, deliverable: d };
  }

  const { look, palette, pairing, deliverable } = resolved;
  const headlineSize = `${Math.round(deliverable.headline / 10) / 10}px at ${deliverable.width}px wide`;
  const bodySize = `${deliverable.body}px`;

  const hierarchy: RecipeSlot[] = [
    { role: "kicker", face: "label", size: `${deliverable.kicker}px`, maxLines: 1, note: "Category or occasion. Letter-spaced, uppercase only if the face supports it." },
    { role: "headline", face: "display", size: headlineSize, maxLines: concept.id === "monument" ? 2 : 4, note: concept.id === "monument" ? "The display idea; 2–5 words, cropped to the bleed." : "The single promise; never more than four lines." },
    { role: "subhead", face: "text", size: bodySize, maxLines: 3, note: "Proof, eligibility or a human detail." },
    { role: "offer", face: "display", size: `${Math.round(deliverable.headline * 0.55)}px`, maxLines: 2, note: "Specific value, with minimum spend or eligibility beside it." },
    { role: "cta", face: "label", size: `${deliverable.cta}px`, maxLines: 1, note: "Verb + object. One CTA only." },
    { role: "fineprint", face: "text", size: `${Math.max(12, Math.round(deliverable.body * 0.8))}px`, maxLines: 2, note: "Expiry, channel and exclusions, attached to the offer." },
    { role: "brand", face: "label", size: `${deliverable.kicker}px`, maxLines: 1, note: "Mark or name as a recognition cue, not a competing headline." }
  ];

  return {
    id: `${concept.id}-${look.id}-${deliverable.id}`,
    name: `${concept.name} · ${look.name}`,
    concept: concept.concept,
    rationale: concept.rationale,
    look,
    palette,
    pairing,
    deliverable,
    grid: {
      columns: deliverable.columns,
      margin: deliverable.margin,
      baseline: deliverable.baseline,
      safeTop: deliverable.padTop,
      safeBottom: deliverable.padBottom,
      rule: `${deliverable.columns} columns · ${deliverable.margin}px outer margin · ${deliverable.baseline}px baseline · keep ${deliverable.padTop}px top / ${deliverable.padBottom}px bottom clear`
    },
    hierarchy,
    devices: concept.devices,
    formats: concept.formats,
    copyRules: COPY_RULES,
    avoid: AVOID_RULES
  };
}

/** Alternates for the studio picker: other concepts that suit the same brief. */
export function buildRecipeOptions(
  tokens: CreativeTokens,
  input: { goal: string; deliverable?: string; seed?: string }
): DesignRecipe[] {
  const primary = buildDesignRecipe(tokens, input);
  const seen = new Set([primary.look.id]);
  const options = [primary];
  for (const concept of CONCEPTS) {
    if (options.length >= 4) break;
    const looks = tokens.looks.filter((look) => concept.looks.includes(look.id) && !seen.has(look.id));
    if (looks.length === 0) continue;
    const look = pick(looks, `${input.seed ?? "growthos"}:${concept.id}`);
    const recipe = buildDesignRecipe(tokens, { ...input, lookId: look.id });
    options.push(recipe);
    seen.add(look.id);
  }
  return options;
}

export const RECIPE_CONCEPTS = CONCEPTS.map((concept) => ({
  id: concept.id,
  name: concept.name,
  concept: concept.concept,
  looks: concept.looks
}));
