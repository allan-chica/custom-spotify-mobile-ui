# Spotify Mobile Player (prototype)

Personal Chrome/Chromium WebExtension that injects a mobile-friendly player UI
on top of the desktop Spotify Web Player (`https://open.spotify.com`).

Spotify remains responsible for playback. Our UI only clicks / reads Spotify's
**existing DOM elements** — no Web API, no auth, no iframe.

## Structure

```text
.
├── manifest.json      # MV3, injects adapter -> ui -> content on open.spotify.com
├── spotifyAdapter.js  # ONLY file allowed to query Spotify's DOM
├── ui.js              # Mobile player UI, talks to Spotify via the adapter only
├── content.js         # Mounts the UI, re-mounts after SPA navigation
├── style.css          # Scoped under #spm-root, never rewrites Spotify styles
└── README.md
```

## How the adapter finds the player

Spotify is a React SPA with many duplicate `Play` buttons, so the adapter never
does a global `[aria-label="Play"]` lookup. Discovery order:

1. `footer [data-testid="now-playing-bar"]` (stable semantic anchor)
2. `<footer>` containing `button[data-testid="control-button-playpause"]`
3. Ancestor of the play/pause button that also contains skip-back/forward
4. Bottom-of-viewport position heuristic (last resort)

Buttons prefer `data-testid` (`control-button-shuffle`, `control-button-skip-back`,
`control-button-playpause`, `control-button-skip-forward`, `control-button-repeat`,
`cover-art-image`, `playback-progressbar`, `volume-bar`, `now-playing-widget`,
`context-item-link`, …) with `aria-label` fallbacks (English + a few locales)
and structural fallbacks (e.g. neighbours of the play toggle for prev/next).

State reads (empty string when nothing is loaded — never site chrome):

- `isPlaying()` — play/pause toggle's `aria-label` (`Pause*` ⇒ playing).
- Shuffle — `aria-checked` / `data-active`, else "Disable…" label ⇒ on.
- Repeat — returns `off | context | track` from `aria-checked` (`mixed` ⇒ track)
  and "Enable repeat one" / "Disable repeat" labels.
- Like — `button[data-testid="add-button"]` first, else a like-mentioning
  button strictly inside the widget/player (never document-wide, never
  "Dislike"); state from `aria-checked`/`aria-pressed`/`data-active`, then
  Add-vs-Remove label decoding.
- Track — `context-item-link`, else `/track/` or `/episode/` links only
  (podcasts included); a lone page footer is never mistaken for the player,
  so logged-out pages report "" instead of About/Jobs links.
- Artist — `/artist/` or `/show/` links (or their text parent) only.
- Time/duration — progress slider (`value`/`max` in ms) first, time texts second.
- Artwork — best of several sources, see below. `getArtwork()` keeps its
  signature; the UI never learns where the URL came from.

## Artwork: highest quality Spotify already provides

Spotify renders the same artwork at several resolutions. `getArtwork()`
ranks every URL Spotify actually provides (never rewritten or upscaled):

1. `navigator.mediaSession.metadata.artwork` — sized entries (usually
   64 / 300 / 640). Authoritative for the current track; this is what feeds
   the OS/Chrome media hubs. No DOM scraping needed.
2. Now Playing View sidebar/panel (`NPV_Panel_OpenDiv`, else an
   `aside`/`section` labelled "Now playing") — rendered much larger than
   the 64px widget.
3. Player-bar widget `img[data-testid="cover-art-image"]` (legacy fallback).
4. `srcset`'s largest entry wins when the image hasn't decoded yet
   (`naturalWidth === 0`).

Document-wide `i.scdn.co/image/` lookalikes (playlist cards, entity
headers…) are listed for context but NEVER auto-selected unless their URL
matches an already-confirmed current-track image.

Selection is pinned per track (no mid-track flicker as images load) but a
strictly-larger newcomer (e.g. NPV opened mid-track) still upgrades the pin.
Rank inputs are real decoded pixels first (`naturalWidth`), `srcset`/`sizes`
claims second. Full document sweeps run only on track change, when the
candidate set changes, or every 15s — snapshots otherwise use cheap scoped
lookups, so no layout thrash from per-second progress mutations.

Stability rules (added after a real bug where the cover flipped to a same-
artist variant mid-track):

- The NPV panel contributes ONLY `img[data-testid="cover-art-image"]` — its
  "About the artist" photos are never candidates. (The player bar keeps a
  generic `<img>` fallback since no artist photos live there.)
- Rank ties prefer `mediaSession` (authoritative track art, DOM-churn-proof).
- First cover per track is pinned; for ~10s after a track change a better
  source may still win (page still loading), then the pin freezes — a late,
  larger artist variant can never steal the slot.
- Empty/transient track keys (React mid-swap) never reset the pin.

Diagnostic (devtools console on the Spotify tab):

```js
SpotMobile.spotify.getArtworkCandidates()
// -> [{ source, url, srcset, naturalWidth, naturalHeight,
//       renderedWidth, renderedHeight, alt, ancestors, rank, confirmed }]
//    confirmed:false entries are context only, never auto-selected.
```

## UI: dark "Current Track" concept

`ui.js` + `style.css` implement the attached concept in dark mode: header
with circular chevron/like buttons around a "Current Track" label, large
squircle artwork, a slim seekable progress line with flanking times beneath
it, centered uppercase titles, controls in concept order (repeat, previous,
play, next, shuffle) with a cream play button, a Lyrics row that opens
Spotify's lyrics (no divider), and a slim Queue/Devices/volume aux row.
No lyric text is faked — only real Spotify state is shown. All Spotify
access still goes through the adapter.

Notes on the concept adaptation:

- Playback paints an interpolated estimate every animation frame (rebased
  against Spotify ~1/sec), so progress glides instead of stepping at
  snapshot cadence; ARIA updates stay at 1Hz. Rebase uses a drift leash —
  hard snaps only on track/play-state changes or >1.5s drift — because
  Spotify reports whole seconds and naive snapping caused a visible yank
  every beat.
- Icons are redrawn thin (1.5px strokes, plain triangles, rounded pause
  bars) to match the reference's delicate line style.
- The card follows the OS/browser theme automatically via
  `prefers-color-scheme`: dark by default, the reference cream in light
  mode. Same geometry, palette-only swap, no reload needed.
- Aux-row leading edge aligns with the Lyrics label; stage/ring/blob share
  one center axis.
- Dragging the artwork sideways changes tracks (left = next, right =
  previous): the art follows the finger live, flies out past the threshold,
  and the incoming cover glides in when Spotify delivers the new track.
  Taps and mostly-vertical drags do nothing; buttons remain the accessible
  path. Native image-dragging is disabled so PC mouse drags swipe instead
  of grabbing the file. If previous restarts the current song (Spotify
  behavior past ~3s) or the action is a no-op, the art glides home as soon
  as the snapshot proves it — never a 3s empty stage, never a stuck swipe.
  The blob now ripples harder (2nd/4th/6th/8th harmonics, still
  mirror-symmetric on all four sides with its center on the artwork).

## Mobile scaling: measured, not hardcoded

On phones (Quetta Android) Spotify serves its DESKTOP layout in a wide
layout viewport (~980–1280 CSS px) that the browser scales down to fit the
glass (~360–430 CSS px) — a fixed 380px card would render tiny, and the
`max-width: 640px` media query would never even match.

`SpotMobile.spotify.getViewportInfo()` reports the real numbers
(`innerWidth/Height`, `clientWidth/Height`, `visualViewport`, `screen`,
`devicePixelRatio`) plus a computed `zoom` and `sheet` flag:

- Two independent estimators of "layout px per visible px": visual
  (`layout / visualViewport`, catches pinch/overview scale) and glass
  (`layout / screen.width`, catches desktop-site-fit when overview mode
  reports layout==visual). `zoom = clamp(max(est1, est2, 1), 1, 4)`, active
  only above 1.12. No phone resolution is hardcoded anywhere.
- CSS `zoom: var(--spm-zoom)` on our root re-magnifies ONLY our box back to
  true physical size (layout-aware, so no transform-origin/overflow math;
  Chromium-only targets guarantee support). Desktop always measures zoom 1
  with vars equal to the viewport, so desktop rendering is unchanged.
- The tall bottom-sheet layout is toggled by `ui.js` (`.spm-sheet`, from the
  visible/glass width) instead of relying on the layout-viewport media
  query; the query is kept for desktop narrow windows. Recomputed on
  `resize`, `orientationchange`, and `visualViewport.resize`.

Phone debugging via `chrome://inspect`:

```js
SpotMobile.spotify.getViewportInfo()
// -> { innerWidth, innerHeight, clientWidth, clientHeight,
//      visualWidth, visualHeight, visualScale, devicePixelRatio,
//      screenWidth, screenHeight, estimatorVisual, estimatorScreen,
//      zoom, zoomActive, sheet, reason }
```

The UI also logs a one-line environment summary on mount.

Writes:

- Transport/mode buttons: `.click()` (React handlers require real element clicks).
- Seek/volume sliders: native `HTMLInputElement.value` setter + `input`/`change`
  events so React picks up the change; `role="slider"` keyboard fallback for seek.

Dynamics: a debounced `MutationObserver` (attributes + childList on
`documentElement`) emits snapshots to subscribers; a light 2s→5s fallback timer
only does real work while the player is missing. No aggressive polling.

## Limitations (honest)

- Locales: `aria-label` fallbacks cover English best; other languages work for
  play/pause (`Paus*` ⇒ playing) and partly for shuffle/repeat, but `data-testid`
  lookups (locale-independent) cover the main controls anyway.
- Logged-out / ad states: `getSnapshot().playerReady === false`, UI shows
  "Waiting for the Spotify player…".
- Lyrics / Queue / Devices click Spotify's real side buttons; if Spotify has no
  such control in the current state the call returns `false` and the UI shows a
  status hint instead of inventing behaviour.
- Volume slider scale (0..1 vs 0..100) is auto-detected; exotic builds fall back
  to the mute button.

## Try it

1. Open `chrome://extensions`, enable Developer mode → Load unpacked → select
   this folder.
2. Open `https://open.spotify.com`, log in, play something.
3. The mobile card appears bottom-right (bottom sheet on narrow screens).
   Collapse it to a mini FAB with the chevron; Spotify underneath is untouched.

To package for Quetta Android: zip the folder contents (`manifest.json` at the
zip root) and import the `.zip`.
