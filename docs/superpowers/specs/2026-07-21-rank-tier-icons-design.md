# Rank Tier Icons Design

## Goal

Create ten reusable SVG shield assets for the player experience tiers, plus a client-safe TypeScript helper that maps player tier or level to the correct public asset path.

This phase produces assets and mapping only. It does not change `AppHeader`, call experience APIs, or add unlock animations.

## Storage and Naming

Assets live at:

```text
web/public/icons/rank/tier-01.svg
web/public/icons/rank/tier-02.svg
...
web/public/icons/rank/tier-10.svg
```

Application code references them as `/icons/rank/tier-01.svg` through `/icons/rank/tier-10.svg`.

The mapping helper lives at `web/lib/rankIcons.ts`.

## Shared Visual Language

- Every asset uses `viewBox="0 0 24 24"`.
- All ten icons share one shield silhouette and a vertical two-tone split.
- Artwork is flat vector: no raster images, external fonts, filters, gradients, or embedded scripts.
- Shapes remain recognizable at 16–24 CSS pixels.
- The palette follows the existing WeWIN header:
  - Navy: `#0D2B6E`
  - Orange: `#F57F17`
  - Badge gold: `#E4C28E`
  - Badge yellow: `#FFE082`
- Each SVG includes a concise English `<title>` for standalone inspection. UI consumers remain responsible for meaningful `alt` text when rendered as an image.

## Tier Progression

1. Levels 1–5: wood shield, warm brown split and simple center brace.
2. Levels 6–10: bronze shield with two small rivets.
3. Levels 11–15: silver shield with navy chevron.
4. Levels 16–20: gold shield with orange center stripe.
5. Levels 21–25: gold shield with a centered star.
6. Levels 26–30: royal shield with a small gold crown.
7. Levels 31–35: emerald shield with a faceted gem.
8. Levels 36–40: crimson shield with an orange flame.
9. Levels 41–45: blue-violet shield with a diamond.
10. Levels 46–50: navy legendary crest with gold wings, crown, and center star.

Details become progressively richer while the base silhouette remains stable so users recognize all ten as one rank family.

## Mapping API

`web/lib/rankIcons.ts` exports:

```ts
export const RANK_TIER_COUNT = 10;
export const RANK_TIER_ICONS: Readonly<Record<RankTier, string>>;
export type RankTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function normalizeRankTier(tier: number): RankTier;
export function rankTierForLevel(level: number): RankTier;
export function rankIconForTier(tier: number): string;
export function rankIconForLevel(level: number): string;
```

Normalization rules:

- Non-finite, zero, and negative values fall back to tier/level 1.
- Decimal values are floored.
- Tier values above 10 clamp to 10.
- Level values above 50 map to tier 10.
- Every five levels advance one tier using `floor((level - 1) / 5) + 1`.

## Testing

- Verify all ten exact public paths.
- Verify tier normalization at invalid, decimal, and upper-bound inputs.
- Verify level boundaries 1, 5, 6, 10, 46, and 50.
- Verify every mapped SVG file exists, starts with SVG markup, and uses the required viewBox.
- Run focused Vitest, TypeScript, ESLint, and production build checks.

## Out of Scope

- Rendering the icon in `AppHeader` or profile UI.
- Loading player profile data.
- Unlock animations or locked-tier variants.
- Administrator controls.
- PNG/WebP exports.
