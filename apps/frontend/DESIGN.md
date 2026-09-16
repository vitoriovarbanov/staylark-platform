---
name: Staylark
description: A property subscription platform where travelers book stays and operators run inventory — one geometric, restrained system for both.
colors:
  brand-identity: "#80A4FF"
  brand-button: "#4870E5"
  brand-button-hover: "#3A5DD0"
  brand-deep: "#1F3A9E"
  amber: "#E8A838"
  amber-bright: "#F5C842"
  amber-deep: "#9C6420"
  amber-tint: "#FEEFC7"
  surface-page: "#F8F9FC"
  surface-card: "#FFFFFF"
  surface-inset: "#F1F3F8"
  ink: "#1E2A3A"
  ink-muted: "#64748B"
  hairline: "#E9ECF2"
typography:
  display:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Figtree, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.45
  mono-eyebrow:
    fontFamily: "SF Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "1.6px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "32px"
spacing:
  xs: "10px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-button}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.brand-button-hover}"
    textColor: "{colors.surface-card}"
  button-subtle:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.brand-button}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  input-text:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  nav-header:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    height: "56px"
  empty-state-panel:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: "56px 24px"
---

# Design System: Staylark

## 1. Overview

**Creative North Star: "The Cartographer's Desk"**

Staylark is the surface where a traveler decides *where to live next* and an operator keeps the map running. The whole system is built like a cartographer's desk: a calm, precise instrument for plotting places, routes, and stays. Cool blue is the paper and the ink of the map; warm amber is the marked pin, the route highlighted, the thing that matters right now. The geometric register — contour fields, route arcs, blueprint grids — is not decoration; it is the literal language of "where, and when." This identity was arrived at deliberately, iterating through blueprint, city-pulse, and topographic concepts before landing on the one that says *booking platform* to a nomad without a word of copy.

It is **one system serving two densities**. The traveler side breathes — generous spacing, a search-first hierarchy, room for a place to feel like a place. The operator side packs in — dense tables, charts, ticket queues, pricing controls — without changing brand: the difference between the two is information density, never a second visual language. A button, a status, a card means the same thing whether you are booking Lisbon or triaging a Sofia ticket.

What it explicitly rejects: **generic AI-slop SaaS** (cream/parchment backgrounds, gradient text, an uppercase eyebrow over every section, identical icon-card grids, the big-number hero template); the **corporate enterprise dashboard** (gray Bootstrap monotony with no personality); and **loud consumer-travel patterns** (scarcity banners, red "only 1 left!" urgency, promo clutter). Staylark informs with quiet authority; it never pressures.

**Key Characteristics:**
- Cool-blue instrument surface with a single warm-amber signal accent.
- Geometric, map-derived motifs (routes, contours, blueprint grids) as the brand's native voice.
- Two densities, one vocabulary: traveler breathes, operator packs, both on-brand.
- Flat at rest; depth is earned by state, not sprinkled for decoration.
- Restrained, purposeful motion — state and feedback only, never choreography.

## 2. Colors

A cool, confident blue field with one warm amber signal — the map and the marked pin.

### Primary
- **Sky Wayfinder** (`#80A4FF`): The brand identity blue. Links, active states, the logo, light highlights, and selected affordances. This is the recognizable face of the brand, but it is *not* the action color — it sits one step lighter than the button.
- **Confident Cobalt** (`#4870E5`): The action blue. Filled primary buttons, primary CTAs, the "do it" color. Rich and saturated so a primary action is never in doubt. Hover deepens to **Cobalt Pressed** (`#3A5DD0`).
- **Deep Atlas** (`#1F3A9E`): The darkest blue. Doubles as (a) high-contrast text/accents on light backgrounds and (b) the filled **navy surface** behind heroes, empty-state panels, and feature blocks. Deep enough that 70% white secondary text stays legible (~5:1) and full white sits near 9:1.

### Secondary
- **Signal Amber** (`#E8A838`): The single warm accent against the cool blue field. Pricing highlights, featured tags, star ratings, destination pins, expiry/attention badges, and empty-state eyebrows. Its job is to mark *the one thing that matters*; rarity is what makes it work. **Amber Bright** (`#F5C842`) for on-navy highlights, **Amber Deep** (`#9C6420`) for amber text needing contrast on light, **Amber Tint** (`#FEEFC7`) for badge/icon backgrounds.

### Neutral
- **Ink** (`#1E2A3A`): Primary text. A blue-leaning near-black, never pure `#000`.
- **Ink Muted** (`#64748B`): Secondary text, captions, metadata. Holds ≥4.5:1 on the page surface — this is the *floor* for body text, not a starting point to lighten from.
- **Page** (`#F8F9FC`): The body background. A barely-cool off-white — the desk surface, never warm/cream.
- **Card** (`#FFFFFF`): Elevated content surfaces.
- **Inset** (`#F1F3F8`): Nested, disabled, or recessed areas — the second neutral layer for toolbars, wells, and grouped controls.
- **Hairline** (`#E9ECF2`): Borders and dividers. 1px, quiet.

### Named Rules
**The One Pin Rule.** Amber marks the single most important thing in view — the price, the featured stay, the badge demanding attention. If two amber things compete on one screen, one of them is wrong. Cool blue carries everything else.

**The Cool-Desk Rule.** The body surface is cool off-white (`#F8F9FC`), never warm. Warmth in this brand is carried *only* by the amber accent — never by a cream/sand/parchment background. A warm-tinted body bg is the AI-slop tell and is forbidden.

## 3. Typography

**Display Font:** Outfit (with system-ui, -apple-system fallback)
**Body Font:** Figtree (with system-ui, -apple-system fallback)
**Label/Mono Font:** SF Mono / ui-monospace (eyebrows and instrument-style micro-labels only)

**Character:** A geometric/humanist pairing on a genuine contrast axis — Outfit's geometric, slightly architectural caps for headings against Figtree's warmer, more humanist body. They are deliberately *not* two interchangeable geometric sans; the heading reads as "plotted," the body as "spoken." Explicitly not Inter.

### Hierarchy
- **Display** (Outfit 700, 2.125rem / 34px, lh 1.3): Page titles, the top of a route or property view. The ceiling — product UI does not shout louder than this.
- **Headline** (Outfit 700, 1.625rem / 26px, lh 1.35): Section headers, panel titles.
- **Title** (Outfit 700, 1.375rem / 22px, lh 1.4): Card titles, sub-sections, modal headers.
- **Body** (Figtree 400, 1rem / 16px, lh 1.55): Default reading text. Cap prose at 65–75ch; data and compact UI may run denser.
- **Label** (Figtree 500, 0.875rem / 14px): Buttons, nav links, form labels, table headers. The workhorse of the product surface.
- **Mono Eyebrow** (SF Mono 500, 11px, +1.6px tracking, uppercase): The *one* sanctioned all-caps micro-label — instrument readouts, empty-state kickers, status micro-copy. Its monospace + amber treatment makes it read as "instrument," not as the AI eyebrow trope.

### Named Rules
**The Outfit-Up / Figtree-Down Rule.** Outfit is for things that label and title; Figtree is for things that read. Never set body copy in Outfit; never set a page title in Figtree.

**The Mono-Is-The-Only-Caps Rule.** Uppercase tracked text is permitted *only* as the SF Mono amber eyebrow, used sparingly as a deliberate instrument motif. A generic uppercase tracked kicker over every section heading is forbidden — that is the AI-grammar tell this rule exists to block.

## 4. Elevation

Flat at rest, lifted by state. Surfaces sit nearly flush against the page with only a whisper of shadow to separate card from background; real depth appears as a *response* — hover, focus, overlay — never as ambient decoration. A page of Staylark should read as a clean desk of layered paper, not a pile of floating glass.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)`): The resting state of every card and Paper. Barely there — enough to lift off the page, not enough to announce itself.
- **Card Hover** (`box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`): Paired with a `translateY(-2px)` lift on interactive cards. The card rises *toward* you on hover.
- **Elevated** (`box-shadow: 0 8px 24px rgba(0,0,0,0.12)`): Reserved for true overlays — menus, popovers, modals that genuinely float above the surface.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow is a verb, not an ornament: it appears in response to hover, focus, or elevation, then recedes. If a static card carries a heavy drop shadow doing nothing, the shadow is wrong.

## 5. Components

Confident and restrained: saturated where it acts, quiet everywhere else, soft 8px corners throughout, motion only as feedback.

### Buttons
- **Shape:** Gently rounded (8px, `defaultRadius: md`). Weight 600. `transition: all 150ms ease`.
- **Primary:** Filled Confident Cobalt (`#4870E5`) with white label. The unambiguous action. Hover deepens to `#3A5DD0`; `:active` presses with `transform: scale(0.98)` (100ms) as tactile feedback.
- **Subtle / Ghost:** Transparent with brand-blue label, faint gray hover wash — secondary and tertiary actions, header sign-in.
- **Amber is not a button color by default.** Reserve amber buttons for genuinely value-led moments (a pricing CTA), not as a second primary.

### Cards / Containers
- **Corner Style:** 8px (md).
- **Background:** White (`#FFFFFF`) on the `#F8F9FC` page; Inset (`#F1F3F8`) for recessed/grouped areas.
- **Shadow Strategy:** Resting `Card` shadow; interactive cards adopt the `cardHover` lift (`translateY(-2px)` + `Card Hover` shadow). See Elevation.
- **Border:** Usually none — the resting shadow does the separating. A 1px Hairline (`#E9ECF2`) only where surfaces meet without a shadow gap.
- **Internal Padding:** 20px (lg) typical; 16px (md) in dense contexts. **Never nest a card inside a card.**

### Inputs / Fields
- **Style:** White field, 1px Hairline stroke, 8px radius, Label-size text.
- **Focus:** Border shifts to brand blue with Mantine's focus ring; `border-color` transitions 150ms. Visible focus is mandatory, never removed.
- **Error / Disabled:** Error uses Mantine red with helper text below; disabled drops to the Inset surface with muted ink. No full-saturation color on disabled controls.

### Navigation
- **Top bar only, 56px**, white with a 1px gray-2 bottom border — browse-first, no persistent sidebar for travelers. Logo left, contextual nav + avatar menu right.
- **Nav links:** Label size (14px), weight 500, 6px×12px padding, 8px radius, quiet hover wash. Active state in brand blue.
- **Roles:** USER sees browse links; MANAGER/ADMIN route to the admin surface (which adds a denser nav rail). Mobile collapses the link cluster, keeping the avatar menu.

### Status Pill (signature)
A per-status *treatment*, not a generic colored chip — booking state is communicated with intent. PENDING breathes (pulsing dot + animated border); CONFIRMED/ACTIVE carry date-aware treatments; COMPLETED reads as a stamp; CANCELLED gets a hatch overlay. Each treatment honors `prefers-reduced-motion`.

### Empty State (signature)
The unified "no data" component, in two variants. **Panel** — a branded Deep Atlas navy block with a subtle scanline texture, amber mono eyebrow, Outfit title, and a CTA slot — for full-page/primary empties. **Compact** — a light, amber-tinted icon circle over Outfit title + dimmed body — for table rows, chart cards, and small panels. Empty states *teach the next action*; they never say only "nothing here."

### Destination Routes (signature)
The auth-page identity: an animated SVG route map of 16 European cities joined by curved arcs, featured cities pulsing in amber, the user's home city emphasized with a breathing ring, travel dots orbiting select routes. The form card is offset right over a light gradient. This is the literal Cartographer's Desk — the brand's thesis rendered as motion. `position: fixed` keeps it stable across auth routes.

## 6. Do's and Don'ts

### Do:
- **Do** keep the body surface cool off-white (`#F8F9FC`). Carry all warmth through the amber accent.
- **Do** reserve amber for the single most important mark on a screen — price, featured, attention. Obey **The One Pin Rule**.
- **Do** use Confident Cobalt (`#4870E5`) for the one primary action; everything secondary is subtle/ghost.
- **Do** keep Ink Muted (`#64748B`) as the *floor* for body text. If contrast is even close, bump toward Ink (`#1E2A3A`).
- **Do** set Outfit for titles/labels and Figtree for reading text — never the reverse.
- **Do** keep surfaces flat at rest and let shadow respond to state (hover lift, overlay).
- **Do** give every interactive component its full state set: default, hover, focus, active, disabled, loading, error.
- **Do** honor `prefers-reduced-motion` on every animation — the breathing pills, hover lifts, and route map all need a reduced alternative.
- **Do** keep the same button, status, and form vocabulary across traveler and operator surfaces; density changes, brand does not.

### Don't:
- **Don't** use a cream / sand / parchment / warm-tinted body background. That is the **generic AI-slop SaaS** tell and is forbidden.
- **Don't** add gradient text, `background-clip: text`, or a colored `border-left`/`border-right` stripe as an accent. Emphasis comes from weight, size, and the amber pin.
- **Don't** put an uppercase tracked eyebrow over every section. Uppercase is permitted *only* as the SF Mono amber instrument label, used sparingly.
- **Don't** ship the big-number hero-metric template or endless identical icon-+-heading card grids.
- **Don't** drift toward the **corporate enterprise dashboard** — dense is fine, lifeless gray Bootstrap monotony is not.
- **Don't** import **loud consumer-travel** patterns: no scarcity banners, no red "only 1 left!" urgency, no promo clutter. Inform; never pressure.
- **Don't** nest a card inside a card, or leave a heavy drop shadow on a static resting surface.
- **Don't** reach for a modal as the first thought — exhaust inline and progressive alternatives first.
