# Product

## Register

product

## Users

Staylark has two co-primary audiences, and the design system optimizes for both:

- **Travelers / digital nomads (USER role)** — browse-first customers searching by city + dates, booking subscription stays, leaving voice/text feedback, and reporting problems. Mobile-aware, low-patience, exploring rather than administering. Their context is "where do I want to live next, and is this place right?"
- **Property managers & admins (MANAGER / ADMIN roles)** — staff working dense tooling: property CRUD, dynamic pricing, feedback dashboards, ticket triage. Their context is operational throughput — scan, decide, act across tables and charts without friction.

The customer side is browse-first and emotive; the staff side is dense and operational. The system must serve both without letting either degrade the other.

## Product Purpose

A property subscription/booking platform with AI-assisted features (voice feedback transcription + analysis, problem reporting, dynamic pricing). It exists to make medium-to-long-term stays feel as fluid to book as a hotel night, while giving operators the signal (feedback, tickets, pricing) to run inventory well. Success looks like: a traveler finding and booking a place in minutes with confidence, and an operator resolving feedback/tickets and tuning prices without fighting the interface.

It is a solo-developer, LLM-assisted project — every library was chosen for strong training-data coverage. Design decisions should stay legible and conventional enough that future AI-assisted work extends them cleanly.

## Brand Personality

**Confident, restrained, geometric.** A modern proptech "command center" voice — calm authority, not hype. Communicates competence and trust to a traveler choosing a home, and clarity and control to an operator running the business.

- Voice: plain, direct, quietly assured. No exclamation-mark urgency, no growth-hack nudging.
- Emotional goals: traveler feels *confidence* and *ease*; operator feels *control* and *clarity*.
- Motion is deliberate and minimal (staggered reveal, route transitions, card hover, micro-feedback) — never decorative, never loud.

## Anti-references

- **Generic AI-slop SaaS** — cream/sand/parchment body backgrounds, gradient text, tiny tracked-uppercase eyebrows above every section, identical icon-+-heading card grids, the big-number hero-metric template. The brand was deliberately iterated *away* from this; do not regress toward it.
- **Corporate enterprise dashboard** — dense gray Bootstrap/Material admin panels, navy-and-gray monotony, zero personality. The staff side must stay dense but never lifeless.
- **Loud consumer travel/booking** — Booking.com / Airbnb-style scarcity urgency, red "only 1 left!" banners, promo clutter, manipulative nudges. Staylark informs; it does not pressure.

## Design Principles

1. **Two registers, one system.** Customer-side breathes and persuades; staff-side packs density and speed. Both draw from the same tokens, type, and motion vocabulary so the product feels like one product — the difference is information density, not a different brand.
2. **Confident restraint.** Earn attention through hierarchy, spacing, and a disciplined accent (blue primary, amber for value/highlights), not through volume. When unsure, remove rather than add.
3. **Browse-first clarity.** The customer's first question is "where, and when?" Lead surfaces with the search/decision the user actually came to make; defer everything secondary.
4. **Signal over chrome for operators.** Staff screens exist to surface the decision (this feedback, this ticket, this price). Tables, charts, and empty states should make the next action obvious, not bury it in scaffolding.
5. **Legible and conventional by design.** This is an LLM-assisted solo build; favor patterns that are easy to extend correctly over clever one-offs. Distinctiveness lives in the established brand identity, not in unpredictable structure.

## Accessibility & Inclusion

Best-effort, following good practice without a formal conformance commitment. Concretely: keep body text at ≥4.5:1 contrast (no light-gray-on-tint), maintain visible keyboard focus states, and honor `prefers-reduced-motion` with a crossfade/instant alternative for every animation (consistent with the existing restrained-motion philosophy). Treat WCAG 2.1 AA as the practical target to aim for even though it is not a hard contractual requirement.
