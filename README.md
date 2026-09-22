
# UI Preset MCP Server

MCP server for auto-configuring React UI against a swappable design preset system. Integrates with your Monaco IDE to enforce design uniformity across all business builds. Supports glassmorphism, neumorphism, neon cyberpunk, brutalism, soft pastels, aurora gradients, plus new flat/material/healthcare/editorial/minimal styles — a baby Canva for frontend development.

## Design precision + JEV decision process (v1.1)

Every project gets a **deep, per-project design decision** grounded in awesome-design
principles and current frontend practice:

| Tool | What it does |
| --- | --- |
| `decide_design_direction` | JEV decides style, palette strategy, graphics treatment, precision level, and dark/light over bounded questions whose criteria encode awesome-design + current-practice standards. Offline JEV falls back to a deterministic keyword classifier with the real error reported (never a fabricated decision). |
| `design_brief` | The full process: JEV direction → resolve preset on disk → run the **deterministic quality gate** → export a **DESIGN.md** contract. "Adheres each time" = decision + `quality.passed=true` + DESIGN.md emitted. |
| `validate_preset` | Deterministic precision gate: valid colors, WCAG AA text contrast vs base bg, spacing on the 4pt grid, strictly increasing type scale, zero unresolved `{{token:}}` refs. Returns score 0-100 + every finding. |
| `list_preset_quality` | Quality score for every preset, sorted. Use it to pick the most precise preset for a project. |
| `export_design_markdown` | Exports a preset's tokens as a Stitch/awesome-design-md `DESIGN.md` (palette, typography, spacing, depth, components, do's/don'ts, agent prompt guide). Deterministic. |

### Math-enhanced refinement (JEV decides, math improves)

Presets are **templates, not final output**. `design_brief` returns both:

- `design_md` — the template as-is
- `refined` — the template **creatively improved by math**: JEV picks the
  strategy (`decideRefinement`: golden-ratio / perfect-fourth / major-third
  spacing+type, analogous / complementary / triadic / split-complementary /
  monochrome harmony, precision, detail), then a deterministic engine applies it:

  - **Spacing** → golden-ratio scale `round4(4·φ^i)` kept on the 4pt grid
  - **Type** → modular scale `0.8125rem · ratio^i` (strictly increasing)
  - **Color** → harmonic accent family derived from the primary hue (HSL offsets)
  - **Radius** → proportional to the refined scale

Every change is logged in a `math_report` (`{field, before, after, math}`), the
refined preset passes the **quality gate**, and a refined `DESIGN.md` is emitted.
This is the deterministic math core (same substance as math-x's Pyodide/SymPy
subsystems) computed in-process — no LLM, and math-x's LLM-routed API is not called.

```json
{ "strategy": { "ratio": "golden", "harmony": "complementary", "precision": 1, "detail": 1 },
  "math_report": { "steps": [ { "field": "spacing.scale", "math": "round4(4 × φ^i)" } ] },
  "refined_quality": { "passed": true, "score": 100 },
  "refined_design_md": "# DESIGN.md — Flat Corporate (refined)" }
```

`refine_design` tool refines any preset; REST: `POST /api/design-brief` returns
the same shape.

The quality gate is the prerequisite: **all 14 presets pass it** (muted text in
the legacy dark presets was darkened to reach AA — the gate caught the failures).

### New style presets (beyond glassmorphism)

`style-flat-corporate`, `style-material`, `style-healthcare`, `style-editorial`,
`style-minimal-light` — each extends `glassmorphic-base`, overrides tokens
(palette, type, radius, depth), and inherits components. New base components:
`DataTable`, `StatCard`, `FormField`, `Modal`, `Toast`.

### Env

```
OG_GLASS_JEV_URL      # default http://127.0.0.1:8080 (System One)
OG_GLASS_JEV_ENABLED  # set 0 to force the offline classifier
OG_GLASS_JEV_TIMEOUT  # seconds per request
```

### Tests

```bash
npm test    # build + node --test (11 tests: color math, quality gate, DESIGN.md, JEV)
```

## Architecture

```
ui-preset-mcp-server/
├── src/
│   ├── index.ts                    # Server entry point (stdio + HTTP transports)
│   ├── constants.ts                # Shared constants and paths
│   ├── types/
│   │   └── index.ts                # All TypeScript types (tokens, presets, corrections)
│   ├── schemas/
│   │   └── toolSchemas.ts          # Zod validation schemas for every tool
│   ├── services/
│   │   ├── presetLoader.ts         # Reads + deep-merges preset files with caching
│   │   ├── sessionState.ts         # Active preset session management + overrides
│   │   ├── uiCorrector.ts          # AST correction engine (10 correction passes)
│   │   ├── tokenResolver.ts        # Resolves {{token:x.y.z}} placeholders + export generators
│   │   └── fileWatcher.ts          # Hot-reload presets on disk changes (dev mode)
│   ├── tools/
│   │   ├── presetTools.ts          # load_preset, swap_template, list_presets, diff_presets, scaffold_preset
│   │   ├── correctionTools.ts      # autocorrect_component, validate_ui, generate_component, generate_tokens, apply_token_overrides
│   │   └── styleTools.ts           # generate_color_palette, suggest_style, list_style_categories
│   ├── routes/
│   │   └── uiRoutes.ts             # REST API + Design Studio dashboard (GET /, /api/*)
│   └── ui/
│       └── dashboardHtml.ts        # Embedded Design Studio HTML (9 sections)
└── presets/
    ├── glassmorphic-base/          # Core preset (all others inherit from this)
    │   ├── manifest.json
    │   ├── tokens.json             # Full design token system
    │   ├── components/
    │   │   ├── shell/Sidebar.json
    │   │   ├── surfaces/GlassCard.json
    │   │   ├── settings/OptionGroup.json
    │   │   └── navigation/NavGroup.json
    │   └── layouts/DashboardLayout.json
    ├── client-fintech/             # Blue accent, dense spacing
    ├── client-saas/                # Purple accent, wider cards
    ├── client-dark-minimal/        # Monochrome, reduced glass intensity
    ├── style-neumorphic/           # Light soft UI, extruded shadows, no blur
    ├── style-neon-cyberpunk/       # Pitch-dark + neon accents, monospace type
    ├── style-brutalist/            # Raw B&W, zero radius, heavy typography
    ├── style-soft-pastel/          # Lavender background, pastel accents, generous rounding
    └── style-aurora/               # Deep navy + iridescent aurora purple/teal accents
```

## MCP Tools

### Preset Management
| Tool | Description |
|------|-------------|
| `load_preset` | Activate a preset bundle by ID |
| `swap_template` | Hot-swap active preset without restart |
| `list_presets` | List all available presets |
| `diff_presets` | Compare token/component differences between two presets |
| `scaffold_preset` | Generate a new preset directory from a parent |
| `get_session_state` | Check active preset and runtime overrides |

### Correction & Generation
| Tool | Description |
|------|-------------|
| `autocorrect_component` | Auto-fix React component against active preset |
| `validate_ui` | Validate component and get conformance score (0–100) |
| `generate_component` | Generate a component from a preset template |
| `generate_tokens` | Export tokens as CSS vars, JS, JSON, or Tailwind config |
| `apply_token_overrides` | Layer runtime token overrides on the active preset |

### Style & Color
| Tool | Description |
|------|-------------|
| `generate_color_palette` | Generate a harmonious color palette from a seed hex color using color theory (complementary, triadic, analogous, monochromatic, split-complementary, tetradic) |
| `suggest_style` | Get preset + token override suggestions from a natural-language aesthetic description (e.g. "dark hacker terminal", "friendly pastel kids app") |
| `list_style_categories` | List all available design style categories with principles, descriptions, and associated presets |

## Style Categories

| Category | Preset | Description |
|----------|--------|-------------|
| **Glassmorphic** | `glassmorphic-base`, `client-*` | Frosted-glass with backdrop blur, dark substrate |
| **Neumorphic** | `style-neumorphic` | Soft extruded shapes, dual shadows, light background |
| **Neon Cyberpunk** | `style-neon-cyberpunk` | Pitch-dark + vivid neon accents, monospace type |
| **Brutalist** | `style-brutalist` | Raw B&W, zero border-radius, maximum contrast |
| **Soft Pastel** | `style-soft-pastel` | Lavender base, pastel accents, generous rounding |
| **Aurora Gradient** | `style-aurora` | Deep navy + iridescent aurora purple/teal accents |

## Installation

```bash
npm install
npm run build
```

## Usage

### stdio (for Monaco IDE integration)
```bash
node dist/index.js
```

### HTTP server
```bash
TRANSPORT=http PORT=3001 node dist/index.js
```

### Dev mode with hot-reload
```bash
WATCH_PRESETS=true node dist/index.js
```

## Design Studio UI

When running in HTTP mode, a **Design Studio** mini UI is served at `GET /`.

### UI Sections

| Section | Description |
|---------|-------------|
| **Dashboard** | Active preset overview with component/layout stats and color palette preview |
| **Presets** | Browse all presets in cards; click Load to activate any preset instantly |
| **Style Gallery** | Visual style category browser — each card shows design principles and a color preview strip; load any style with one click |
| **Palette** | Color palette generator — pick a seed color, choose a color harmony rule, and generate a full palette with shades and semantic aliases; apply directly to active preset |
| **Tokens** | Visual token viewer — color swatches, typography scale, blur, spacing, animation |
| **Validate** | Paste React code and get a conformance score (0–100) with issue list |
| **Correct** | Auto-correct React code against the active preset; choose context and mode |
| **Export** | Generate CSS custom properties, TypeScript const, JSON, or Tailwind config |
| **Scaffold** | Form to create a new preset from any parent with optional accent color |

The UI communicates with the server via a REST API also available at `/api/*`.

### REST API (HTTP mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/presets` | GET | List all presets with metadata |
| `/api/presets/load` | POST | Load and activate a preset `{ preset_id }` |
| `/api/session` | GET | Get active preset and override state |
| `/api/tokens` | GET | Get effective tokens for the active preset |
| `/api/tokens/export` | POST | Export tokens `{ format: 'css'|'js'|'json'|'tailwind' }` |
| `/api/tokens/overrides` | POST | Apply runtime token overrides `{ overrides }` |
| `/api/validate` | POST | Validate React code `{ code, include_suggestions }` |
| `/api/correct` | POST | Autocorrect React code `{ code, context, dry_run }` |
| `/api/scaffold` | POST | Create new preset `{ preset_id, name, description, extends, accent_color }` |
| `/api/styles` | GET | List all design style categories with metadata |
| `/api/palette` | POST | Generate color palette `{ seed_color, harmony, include_shades }` |

## Typical Workflow

```
1. list_style_categories()                    # Discover available aesthetics
2. suggest_style("dark sci-fi dashboard")     # Get preset recommendation
3. load_preset("style-neon-cyberpunk")        # Activate chosen style
4. const palette = generate_color_palette({ seed_color: "#00ff88", harmony: "triadic" })
5. apply_token_overrides({
     overrides: {
       colors: {
         accent: {
           primary: palette.semantic.accent,
           highlight: palette.semantic.highlight
         }
       }
     }
   })
6. autocorrect_component(code)               # Fix component on save
7. validate_ui(code)                         # Get conformance score
8. generate_tokens({ format: "css" })        # Export CSS variables
9. scaffold_preset({ preset_id: "client-x", extends: "style-aurora" })
```

## Creating New Presets

New presets only need to override tokens that differ from the parent:

```json
// presets/client-newbrand/tokens.json
{
  "colors": {
    "accent": {
      "primary": "#e11d48"
    }
  }
}
```

```json
// presets/client-newbrand/manifest.json
{
  "id": "client-newbrand",
  "name": "New Brand",
  "extends": "glassmorphic-base",
  "version": "1.0.0",
  "styleCategory": "glassmorphic",
  "designPrinciples": ["backdrop-blur", "dark-substrate"],
  "tags": ["custom"],
  "components": [],
  "layouts": []
}
```

All base tokens, components, and layouts are inherited automatically.

## Correction Rules

The correction engine enforces these rules on every component:

- **no-hardcoded-colors** (error): All color values must use CSS custom properties
- **no-hardcoded-spacing** (warning): Spacing should use the token scale
- **enforce-glass-surface** (error): Surface elements must have `backdropFilter` + semi-transparent bg
- **no-hardcoded-font-family** (error): Font families must use typography tokens
- **use-animation-tokens** (warning): Transitions must use animation tokens
- **enforce-sidebar-components** (error): Sidebar content must use NavGroup/NavItem
- **enforce-settings-components** (error): Settings UI must use OptionGroup/OptionRow
- **a11y-img-alt** (warning): Images must have alt attributes
- **a11y-icon-button-label** (warning): Icon buttons need aria-label

## Monaco Integration

In your Monaco editor, call `autocorrect_component` on the save event:

```typescript
editor.onDidSaveModel(async () => {
  const code = editor.getValue();
  const result = await mcpClient.callTool('autocorrect_component', {
    code,
    context: 'auto',
    dry_run: false
  });
  if (result.corrected !== code) {
    editor.setValue(result.corrected);
  }
});
```
