# Brand and visual-system brief

## Brand layers
1. **Team brand: The Boys** — supplied team logo. Preserve it as a team mark for presentation/about/credits.
2. **Product brand: Повод** — must work as a standalone consumer leisure product.
3. **Platform context: MAX** — use platform-native interaction patterns where useful, but do not make the product visually indistinguishable from MAX itself.

The team logo should inform compatibility, not force the entire mini-app to copy its exact visual language.

Current scope is governed by [authority](../current/POVOD_SOURCE_AUTHORITY.md). Brand implementation belongs to T110. Map/Follow/Smart are P1; plan/invite are Stretch. The existing UI and real MAX nickname are unchanged by T101. Typography/palette below are verification guidance; accepted design tokens are in the canonical imports, and must be verified in the target UI. Earlier TBD brief is preserved in artifacts/t101/BASELINE_DOCUMENTS.json.

## Required visual outputs
- exact logo asset inventory and provenance;
- sampled logo colors from the original file (not from a compressed chat preview);
- approved product primary/neutral/accent palette with WCAG contrast checks;
- typography stack with Cyrillic support and licence/provenance;
- radius, spacing, elevation, icon, motion and state tokens;
- light theme first; dark theme only if the chosen donor/product direction supports it well;
- event-card, filters/search, detail, map, saved/plan/invite, empty/loading/error states;
- presentation master using the same typography/color tokens;
- one-page designer handoff: colors, fonts, logo clear space/min sizes, components and do/don't examples.

## Donor rule
Run the donor before adopting it. Capture the original at representative mobile widths, then adapt a narrow vertical slice. Do not redesign the whole application before the team approves the direction.

## Typography
Do not commit a font choice until licence, Cyrillic quality, rendering in MAX web/mobile, and presentation availability are checked. Prefer a robust open font family or a system-compatible stack.

## Palette
Do not invent final HEX values from the screenshot preview. Sample the original logo asset, then build product tokens around contrast and event imagery. Product cards will contain visually noisy photography, so backgrounds/text/overlays need strong neutral structure.
