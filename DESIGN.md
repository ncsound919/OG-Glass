# DESIGN.md — Project Design System

> A plain-text design system that AI coding agents (and Google Stitch) read to generate visually consistent UI.
> Follows the Stitch DESIGN.md format used by the awesome-design-md collection.
> Fill in each section, or replace this file entirely with a brand DESIGN.md from github.com/VoltAgent/awesome-design-md.

## 1. Visual Theme & Atmosphere

- **Mood:** <!-- e.g. ultra-minimal, precise, technical -->
- **Density:** <!-- compact / comfortable / spacious -->
- **Design philosophy:** <!-- one or two sentences describing the guiding idea -->

## 2. Color Palette & Roles

| Token | Hex | Role |
|---|---|---|
| `color-primary` | #000000 | Primary actions, key accents |
| `color-background` | #FFFFFF | Main surface |
| `color-surface` | #F5F5F5 | Cards, raised panels |
| `color-text-primary` | #111111 | Body and headings |
| `color-text-muted` | #6B6B6B | Secondary text |
| `color-border` | #E5E5E5 | Dividers, input borders |
| `color-success` | #16A34A | Success states |
| `color-error` | #DC2626 | Error states |

## 3. Typography Rules

| Level | Font | Size / Weight | Usage |
|---|---|---|---|
| Display | <!-- family --> | 72px / 700 | Hero headlines |
| H1 | | 48px / 600 | Page titles |
| H2 | | 32px / 600 | Section headers |
| H3 | | 24px / 500 | Subsections |
| Body | | 16px / 400 | Default text |
| Small | | 14px / 400 | Captions, labels |
| Mono | | 14px / 400 | Code, technical values |

- Line height: <!-- e.g. 1.5 body, 1.1 display -->
- Letter spacing: <!-- e.g. tight (-0.02em) on headings -->

## 4. Component Stylings

- **Buttons:** <!-- radius, padding, states (hover/active/disabled), primary vs secondary -->
- **Cards:** <!-- radius, border, padding, hover behavior -->
- **Inputs:** <!-- height, border style, focus ring -->
- **Navigation:** <!-- layout, height, active state -->

## 5. Layout Principles

- Spacing scale: <!-- e.g. 4px base: 4, 8, 12, 16, 24, 32, 48, 64 -->
- Grid: <!-- e.g. 12-column, max-width 1200px, 24px gutters -->
- Whitespace philosophy: <!-- e.g. generous; let content breathe -->

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| 0 | none | Flat surfaces |
| 1 | 0 1px 3px rgba(0,0,0,0.08) | Cards |
| 2 | 0 4px 12px rgba(0,0,0,0.10) | Dropdowns, popovers |
| 3 | 0 12px 32px rgba(0,0,0,0.14) | Modals |

## 7. Do's and Don'ts

- DO: <!-- e.g. use the accent color only for primary CTAs -->
- DO: <!-- e.g. keep border radius consistent at 8px -->
- DON'T: <!-- e.g. introduce gradients not in the palette -->
- DON'T: <!-- e.g. use more than two font families -->

## 8. Responsive Behavior

- Breakpoints: <!-- e.g. 640px / 768px / 1024px / 1280px -->
- Touch targets: minimum 44×44px on mobile
- Collapsing strategy: <!-- e.g. sidebar becomes drawer below 1024px -->

## 9. Agent Prompt Guide

Quick reference for prompts: primary `#000000`, background `#FFFFFF`, radius `8px`, spacing base `4px`.

Example prompt:
> Use the DESIGN.md file in the project root as the visual reference for all styling decisions. Follow the spacing, typography, and color palette exactly.
