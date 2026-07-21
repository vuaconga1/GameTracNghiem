# Player Experience Header Design

## Goal

Show the authenticated player's current level and rank-tier shield in the main app header badge, replacing the placeholder dash and Font Awesome shield.

## Student Experience

- The cream pill badge next to `WeWIN - {displayName}` shows the tier SVG and the numeric level.
- Level 1 with zero EXP still shows `tier-01.svg` and `1`.
- A profile load failure keeps the badge visible with level `1` and the wood shield so navigation remains usable.
- No progress bar, unlock animation, or tooltip in this phase.

## Data Flow

1. `(main)/layout.tsx` already requires a session.
2. After session lookup, the layout calls `getExperienceProfile(session.userId)` on the server.
3. It passes `{ level, tier }` into `MainShell` → `AppHeader`.
4. `AppHeader` resolves the icon with `rankIconForTier(tier)` and renders:
   - `<img src={...} alt="" width={14} height={14} />` (decorative beside the level number; the level text carries meaning)
   - `<span>{level}</span>` instead of `—`

Existing score and leaderboard APIs are unchanged. No client fetch is required for the initial badge paint.

## Components

- `AppHeader` gains optional `level` and `tier` props with defaults `1`.
- `MainShell` forwards those props.
- CSS keeps `.badge-rank`; add a small rule for the badge image so it aligns with the existing 11–12px icon size.

## Errors

- Profile helper errors during layout render fall back to `{ level: 1, tier: 1 }` and still render the shell.
- Auth failures continue to redirect to login as today.

## Testing

- Unit-test a small presentational helper or header render that maps level/tier to the expected icon path and level text.
- Smoke-test `AppHeader` with default props and with a higher tier.
- Run focused Vitest, TypeScript, lint, and build.

## Out of Scope

- Completing experience sessions from games (separate step).
- Client-side badge refresh after a grant without navigation.
- Profile page, progress bar, and unlock toast.
