
# UI Preset MCP Server

MCP server for auto-configuring React UI against a swappable glassmorphic preset system. Integrates with your Monaco IDE to enforce design uniformity across all business builds.

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
│   │   └── correctionTools.ts      # autocorrect_component, validate_ui, generate_component, generate_tokens, apply_token_overrides
│   ├── routes/
│   │   └── uiRoutes.ts             # REST API + Design Studio dashboard (GET /, /api/*)
│   └── ui/
│       └── dashboardHtml.ts        # Embedded glassmorphic Design Studio HTML (7 sections)
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
    └── client-dark-minimal/        # Monochrome, reduced glass intensity
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

When running in HTTP mode, a glassmorphic **Design Studio** mini UI is served at `GET /`.

![OG Glass Design Studio](https://github.com/user-attachments/assets/c1ebb7f4-2a47-416b-ad1b-581a0b8df855)

### UI Sections

| Section | Description |
|---------|-------------|
| **Dashboard** | Active preset overview with component/layout stats and color palette preview |
| **Presets** | Browse all presets in cards; click Load to activate any preset instantly |
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

## Typical Workflow

```
1. load_preset("glassmorphic-base")          # Activate base preset
2. autocorrect_component(code)               # Fix component on save
3. validate_ui(code)                         # Get conformance score
4. generate_tokens({ format: "css" })        # Export CSS variables
5. swap_template("client-fintech")           # Switch to client variant
6. scaffold_preset({ preset_id: "client-x" })# Create new client preset
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
