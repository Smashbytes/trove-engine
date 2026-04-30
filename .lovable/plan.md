# Trove Engine — Editorial Pass + Story Studio

## Part 1 — Visual overhaul (kill the "AI-generic" look)

The Trove brand IS magenta/violet/pink on dark — that stays. What changes is **how often** we use it and **what fills the space instead**. Right now every card glows, every CTA is a gradient, every category is an emoji. We're going to swap that for **real photography, monochrome surfaces, gradient as accent only**.

### Rules going forward
- **Gradient = accent only.** Used on the logo mark, the primary CTA, and one hero element per page. Not on every card border, every icon tile, every chip.
- **No emojis in product UI.** Replace every emoji with a real photo (categories, spot types, dashboard tiles, listing-type pickers) or a thin Lucide icon where a photo doesn't fit.
- **Real photography for every category.** Generate one wide editorial photo per spot type and per listing category (lodge, spa, gallery, festival, paintball, skydive, sip & paint, food fest, wine fest, etc.). Used on cards, the onboarding tiles, the listing-type picker, and the seekers preview.
- **Surfaces go quieter.** Cards become near-black with a 1px hairline border. Hover lifts with a subtle shadow, not a glow. The radial pink wash on `body` gets dialed down ~60%.
- **Editorial typography.** More whitespace, tighter tracking on display, all-caps eyebrows in a narrow weight, body in a slightly larger size. Magenta is reserved for live status, key numbers, and the active nav item.

### Files touched
- `src/styles.css` — soften `--gradient-radial`, add `--surface-1/2/3`, `--hairline`, new utility `.card-flat`, `.eyebrow`. Keep brand tokens.
- `src/assets/categories/*.jpg` — generate ~12 editorial photos (lodge, spa, gallery, festival, club-night, paintball, skydive, food-fest, wine-fest, sip-paint, expo, hike).
- `src/lib/trove-store.ts` — replace `icon: emoji` with `image: <path>` on `SPOT_TYPES` and listing-type meta. Keep an optional Lucide icon for compact contexts.
- `src/routes/onboarding.tsx` — tiles become photo cards, not emoji chips.
- `src/routes/listings.new.tsx` — type picker becomes 5 photo cards.
- `src/routes/listings.index.tsx` — listing cards use real cover, drop the gradient border.
- `src/routes/dashboard.tsx` — KPI tiles flat (one is allowed to be gradient).
- `src/routes/promote.tsx` — drop gradient social-button rainbow, use mono buttons + Lucide.
- `src/components/trove/AppShell.tsx` — sidebar active state thinned out.

## Part 2 — Trove Story Studio (the new high-ticket feature)

A native, in-platform reel creator. Replaces the static "IG story creative" panel on `/promote` with a full studio. Reels live on Trove for **48 hours**, **max 10 active per Spot**, push to the Seekers app as a "Story Update" on that Spot's profile, and can be downloaded as MP4 to share elsewhere.

### How it shows up for the user
- New route `/studio` in the sidebar ("Story Studio" with a NEW chip).
- Studio dashboard: grid of active reels with countdown ("expires in 31h"), counter `7 / 10 active reels`, "Create Reel" CTA.
- Reel editor (full-screen modal):
  1. **Pick a base** — start blank, from a listing's cover, or upload a clip/photo.
  2. **Compose** — 9:16 canvas with layers: media → overlays (title, price, CTA pill, location chip) → music (mock track picker) → duration (3/5/10s) → transitions.
  3. **Preview** — in-frame phone mock playing the reel in a loop.
  4. **Publish** — "Save Draft", "Download MP4", "Publish to Seekers (48h)". Publishing deducts one of the 10 slots.
- Seekers preview drawer shows where the reel will appear (rail of avatars at the top of the Seekers feed, mock).

### OpenReel integration plan
The repo (`Augani/openreel-video`) is a Next.js app, not a published npm package. So we **port the editor** as a vendored module rather than installing a package:
- Add `src/components/studio/openreel/` containing the timeline, canvas, layer system, and export (MediaRecorder + Canvas/WebCodecs) — adapted to our Tailwind v4 / shadcn stack and TanStack Start (client-only — `'use client'`-equivalent: dynamic import in the route, no SSR for canvas pieces).
- Wrap it in our `<StoryStudio />` component with Trove-themed chrome (presets for listings: title, price, CTA pill auto-filled from selected listing).
- Required deps (added via `bun add`): `@dnd-kit/core`, `@dnd-kit/sortable`, `framer-motion` (already in), `wavesurfer.js` (audio scrub), `file-saver`. No native binaries.
- Export uses `MediaRecorder` on a hidden `<canvas>` stream → MP4/WebM blob → `file-saver` for download. All client-side, works in the Worker SSR model because it's gated to client only.

### Data model (mock, localStorage)
```ts
type Reel = {
  id: string;
  spotId: string;
  listingId?: string;
  title: string;
  thumbnail: string;       // dataURL of frame 0
  videoBlobKey: string;    // IndexedDB key for the exported blob
  durationMs: number;
  layers: Layer[];         // re-editable
  status: 'draft' | 'published';
  publishedAt?: number;
  expiresAt?: number;      // publishedAt + 48h
};
```
- Stored under `trove_reels_v1` (metadata in localStorage, blobs in IndexedDB so we don't blow the 5MB cap).
- Selectors: `useActiveReels(spotId)` filters `published && expiresAt > now`, enforces the 10-reel ceiling at publish time.

### Files added
- `src/routes/studio.tsx` — studio dashboard (list + create CTA + countdowns).
- `src/components/studio/StoryStudio.tsx` — full-screen editor.
- `src/components/studio/openreel/` — vendored editor pieces (Canvas, Timeline, LayerPanel, Exporter, Presets).
- `src/lib/reels-store.ts` — Reel CRUD, IndexedDB blob helpers, 48h expiry, 10-reel cap.
- `src/lib/idb.ts` — tiny IndexedDB wrapper (no extra dep).

### Files edited
- `src/routes/promote.tsx` — IG Story panel becomes "Open in Story Studio →".
- `src/components/trove/AppShell.tsx` — new "Studio" nav item with NEW badge.
- `src/routeTree.gen.ts` — auto-generated, will regenerate.

## Part 3 — Out of scope (explicit)
- No real video upload to a server (all client-side blobs).
- No auth changes.
- We're not pulling in OpenReel's whole Next.js project — we port the editor primitives only and re-style them.

## Notes for the technical reviewer
- Studio editor is dynamically imported in `studio.tsx` via `React.lazy` to keep canvas/MediaRecorder client-only and out of SSR.
- The 10-reel cap is enforced at publish (not save), so users can keep unlimited drafts.
- Countdown uses a single `requestAnimationFrame`-throttled hook, not per-card intervals.
- All new photography is generated once into `src/assets/categories/` and imported as ES modules so Vite hashes them.
