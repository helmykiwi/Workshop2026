# FoodLink Design System

## North star

**Klang Valley Dispatch Ledger** — a professional circular-supply marketplace that combines the authority of a logistics control room with the clarity of a commercial ledger. The interface should feel useful to Malaysian SME operators, not decorative or idealistic.

## Visual language

- Ledger ink `#101710` and dispatch deep `#07110b` establish authority.
- Working paper `#f2f3ed` and clean surface `#fbfcf7` keep dense information readable.
- Signal lime `#d8ff45` is scarce: use it for primary actions, active state and measurable progress only.
- Manrope carries decisions, headings and quantities; IBM Plex Mono carries system state, identifiers and metadata.
- Panels use 14px corners, controls use 8px, and structural 1px borders are preferred over shadows.

## Layout

Public pages use full-width operational bands and a headline/dispatch-board hero. The signed-in app uses a 252px navigation rail, sticky 72px header and a working canvas up to 1540px. Grids reduce at 1100px and become task-focused single columns below 690px.

## Components

- Primary button: lime fill, ink text, 48px minimum height.
- Ink button: dark fill, light text, 48px minimum height.
- Input: 52px height, clean surface, visible label or accessible name.
- Listing card: commodity field, category, item, seller, quantity/location, then price and fit.
- Metric tile: one value plus explicit source or estimate context.
- Dispatch board: route nodes, supplier/stops and a bordered three-column summary.

## Product rules

- Label demo, illustrative and estimated values where they appear.
- Never imply an audited impact claim or live event when the value is seeded.
- Keep quantity, location, price, reliability and estimate status visible when they affect a decision.
- Preserve 44px touch targets, visible keyboard focus and reduced-motion support.
- Do not introduce glassmorphism, glossy gradients, excessive shadow or generic pastel SaaS styling.
