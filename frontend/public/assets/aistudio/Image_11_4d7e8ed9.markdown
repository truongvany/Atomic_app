---
name: Sovereign Supply
colors:
  surface: '#fff8f7'
  surface-dim: '#ffced0'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0f0'
  surface-container: '#ffe9e9'
  surface-container-high: '#ffe1e2'
  surface-container-highest: '#ffdada'
  on-surface: '#3d040e'
  on-surface-variant: '#554243'
  inverse-surface: '#591a22'
  inverse-on-surface: '#ffedec'
  outline: '#887272'
  outline-variant: '#dbc0c1'
  surface-tint: '#9f3e4a'
  primary: '#540316'
  on-primary: '#ffffff'
  primary-container: '#721c2a'
  on-primary-container: '#f9848f'
  inverse-primary: '#ffb2b7'
  secondary: '#9b4500'
  on-secondary: '#ffffff'
  secondary-container: '#fd8a42'
  on-secondary-container: '#682c00'
  tertiary: '#55001d'
  on-tertiary: '#ffffff'
  tertiary-container: '#7c062f'
  on-tertiary-container: '#ff7f97'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b7'
  on-primary-fixed: '#40000e'
  on-primary-fixed-variant: '#802734'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb68e'
  on-secondary-fixed: '#331200'
  on-secondary-fixed-variant: '#763300'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#ffb2bd'
  on-tertiary-fixed: '#400014'
  on-tertiary-fixed-variant: '#8a1538'
  background: '#fff8f7'
  on-background: '#3d040e'
  surface-variant: '#ffdada'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  title-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-data-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-data-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-data-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system establishes a high-precision, executive-level atmosphere for mission-critical logistics, warehouse orchestration, and multi-tier distribution networks. Rejecting the clinical and generic look of standard enterprise dashboards, it marries the utilitarian clarity of high-density operational software with the stately elegance of an editorial ledger.

- **Audience:** Supply chain directors, freight coordinators, operations managers, and warehouse controllers demanding absolute clarity under high-throughput data conditions.
- **Emotional Resonance:** Quiet authority, unyielding reliability, tactical precision, and refined luxury.
- **Design Movement:** Modern Structural Minimalism infused with Editorial Elegance. The interface pairs delicate warm-white milk tones with deep, authoritative wine-reds. Structural boundaries rely on fine, hairline borders, dense typographic hierarchies, and monospaced tabular numerals rather than heavy drop shadows or cartoonish pill shapes.

## Colors
The palette balances warm organic surfaces with razor-sharp structural tones, accented by aged gold and deep crimson accents.

### Color Architecture
- **Canvas & Surface Tier:**
  - `Surface-0 (App Canvas)`: `#FDFBF7` (Milk White Pure)
  - `Surface-1 (Containers & Panels)`: `#F7F4EE` (Milk White Layered)
  - `Surface-2 (Inputs, Inset Cells & Headers)`: `#EDE8DF` (Muted Bone)
  - `Border Hairline`: `#DDD7CC` for low-contrast structure; `#721C2A` (15% opacity) for contextual table dividers.
- **Primary Wine Tier:**
  - `Brand Primary`: `#721C2A` (Deep Plum / Wine) — key actions, active navigation states, selected row markers.
  - `Brand Deep`: `#4A0E17` (Imperial Wine / Deep Burgundy) — primary text, high-emphasis headers, brand focal points.
  - `Brand Vibrant`: `#881337` (Crimson Burgundy) — interactive hover, active indicators, batch run counters.
- **Signal & Status Tier:**
  - `Alert / In-Transit / Warning`: `#B45309` (Amber Gold) — bottleneck flags, customs holds, expedited order alerts.
  - `Critical Error / Stockout`: `#991B1B` (Oxblood Red)
  - `Fulfilled / Dispatched`: `#15803D` (Spruce Green)
  - `Neutral Data`: `#5C554E` (Warm Mineral Umber) for secondary labels and metadata.

## Typography
The system employs an authoritative tripartite typography pairing:
1. **Newsreader (Headlines & High-Level Metrics):** Brings formal editorial sophistication to logistics summaries, KPIs, and executive reporting views.
2. **Hanken Grotesk (Body & Structural Navigation):** Highly legible, sharp neo-grotesque providing frictionless scanning for manifest rows, form labels, and customer details.
3. **JetBrains Mono (Data & Ledger Identifiers):** Applied strictly to SKU IDs, tracking hashes, monetary values, timestamps, and volumetric counts. Must always be styled with `font-variant-numeric: tabular-nums` to ensure strict vertical alignment across rows.

## Layout & Spacing
A fluid 12-column system optimized for compact information density. Logistics workspaces demand rapid scanning across high-volume inventories without wasted canvas space.

- **Breakpoints:**
  - **Desktop (≥ 1280px):** 12 columns, 2.5rem margins, 1.5rem gutters. Sidebars anchor at fixed 260px; primary data tables and analytics split into fluid multi-pane layouts.
  - **Tablet (768px – 1279px):** 8 columns, 1.5rem margins, 1rem gutters. Detail panels switch from side docks to bottom drawers or stacked views.
  - **Mobile (< 768px):** 4 columns, 1rem margins, 0.75rem gutters. Complex tables convert to card stacks displaying mono-tagged SKU headers and collapsed metrics.
- **Rhythm & Padding:** Built on a tight 4px base unit. Micro-spaces (`space-xs`, `space-sm`) control the dense relationships between data labels and tabular values. `space-md` acts as standard table cell padding (12px vertical, 16px horizontal).

## Elevation & Depth
Elevation in this system eschews heavy, diffuse shadows in favor of razor-sharp tonal stepping and low-contrast hairline borders, evoking high-end bespoke stationery and financial ledgers.

- **Surface Tiers:**
  - Base canvas sits at `#FDFBF7`.
  - Nested container panels sit at `#F7F4EE`, bounded by `1px solid #DDD7CC`.
  - Inset data displays and table headers use `#EDE8DF`.
- **Shadow Profile:** When temporary overlays (modals, dropdown manifests) require depth, use a single crisp offset tinted with the primary neutral:
  - `box-shadow: 0 4px 16px -2px rgba(74, 14, 23, 0.08), 0 1px 3px 0 rgba(74, 14, 23, 0.04);`
- **Active / Selection Highlighting:** Selection is not indicated by elevation or blur, but by a crisp `2px solid #721C2A` left-border accent accompanied by an alternating row tint of `#F4EFE6`.

## Shapes
Sharp, architectural, and restrained. Soft cornering (`0.25rem` / `4px`) is the absolute maximum for interactive nodes, preserving the structured feel of physical cargo manifestations and ledger sheets.

- **Inputs, Buttons, and Data Cells:** Styled with `rounded` (`4px`) or completely square edges (`0px`) on continuous grouped toolbars.
- **Modal Containers & Cards:** Capped at `rounded-lg` (`8px`) to prevent visual softness.
- **Pill Shapes:** Strictly prohibited except for micro status dots (4px-6px indicator marks).

## Components

### Buttons
- **Primary:** Background `#721C2A`, text `#FDFBF7`, 1px border `#4A0E17`. Hover state changes to `#881337`. Active state depresses with 1px transform.
- **Secondary:** Background `#F7F4EE`, text `#4A0E17`, 1px border `#DDD7CC`. Hover shifts background to `#EDE8DF`.
- **Destructive / Flag:** Background transparent, text `#991B1B`, border `1px solid #991B1B`.

### Data Tables & Ledger Grids
- **Header:** Background `#EDE8DF`, 1px border top and bottom `#DDD7CC`. Text: `label-data-sm`, uppercase, tracked out (+0.04em), color `#5C554E`.
- **Rows:** Alternating subtle zebra striping (`#FDFBF7` / `#F7F4EE`). Cell height 40px for compact efficiency. Numeric columns right-aligned using `JetBrains Mono`.
- **Hover & Selected:** Hover adds `#F2ECE1`; selected rows feature a left hairline accent (`3px solid #721C2A`).

### Chips & Status Badges
- Compact rectangular geometry (4px radius, 20px height, uppercase `label-data-sm`).
- **In-Transit / Pending:** `#FEF3C7` background, `#B45309` text, `1px solid #FCD34D`.
- **Cleared / Dispatched:** `#DCFCE7` background, `#15803D` text, `1px solid #86EFAC`.
- **Critical / Delayed:** `#FEE2E2` background, `#991B1B` text, `1px solid #FCA5A5`.
- **SKU Tag:** `#EDE8DF` background, `#4A0E17` text, `1px solid #DDD7CC`.

### Input Fields & Selectors
- Background `#FFFFFF` (contrasted against `#F7F4EE` card bodies). Border `1px solid #DDD7CC`.
- Focus state: Border shifts immediately to `#721C2A` with an inner outline of `1px solid #721C2A` (no diffuse halo).
- Placeholder text in `#8C827A`. Label text in `title-md` (`Hanken Grotesk`, `#4A0E17`).

### Checkboxes & Radio Controls
- Square 16px boxes with 2px corner radius.
- Unchecked: `#FFFFFF` fill, `1px solid #DDD7CC`.
- Checked: `#721C2A` fill with `#FDFBF7` checkmark.

### Domain-Specific Components
- **Consignment Tracking Strip:** A segmented progress bar with sharp geometric chevron divides. Cleared waypoints fill in `#721C2A`; active waypoint pulses `#B45309`.
- **Barcode & Manifest Matrix Block:** Monospaced summary card enclosing a real-time scannable Code-128 / QR symbology adjacent to order routing metadata.