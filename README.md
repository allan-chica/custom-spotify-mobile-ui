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
├── tests/             # dev-only fake-Spotify harness (never packaged)
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
  The name is a button that clicks Spotify's own artist link
  (`context-item-info-artist`), so the artist page opens as in-app
  navigation; placeholders stay inert.
- Context — where the song plays from, as a tappable name (no "From"
  prefix). Primary source is the Now Playing view header itself: an
  `<a href="/playlist/…?uid=…&uri=spotify:track:…">` (or album / artist /
  show / collection) — no "Playing from" text and no heading exists there,
  so the `uri=` track-binding on the href is the signal (query params
  stripped for the destination, `/track/` + `/episode/` never count). The
  Now Playing view sidebar leads the search, so the player-bar aside (whose
  cover/album/artist links come first in DOM order) can never win, and
  player-widget links are excluded outright (they describe the track, not
  the source). With no view sidebar, the widget's album link plus
  mediaSession's album name serve as the fallback label — never the song
  title.
  Fallback is the Queue's
  "Next from:" phrasing with strict anti-spoof rules. Tapping it clicks
  Spotify's OWN header link (inside its React tree), so its router handles
  it as in-app navigation — a copied URL from outside that tree forces a
  full page load instead. Tapping playlist or artist always minimizes the
  full player so the destination is visible. Cached per track; "" when
  unknown and the UI hides the line instead of guessing.
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
No lyric text is faked — only real Spotify
state is shown. All Spotify access still goes through the adapter.

Mini-player + gestures:

- Mini and full are two states of one component fed by the same snapshot
  (art, title, artist, play, like stay in sync in both). The mini is the
  collapsed state on every viewport, including desktop. State transitions
  hand off in ~60ms (outgoing starts sinking as the incoming view blooms,
  so there is never a dead transparent frame); `prefers-reduced-motion`
  gets instant swaps.
- Mobile opens on the mini-player by default (first run; afterwards the
  remembered choice wins).
- Mini-player: floating bar (art, title, artist, like, prev, play, next),
  same palette/borders/blur, light/dark aware, with a glossy progress
  hairline hugging its top edge that is itself a slider (drag + arrow
  keys). Taps open instantly on pointerup (never waiting on the browser's
  click); tap, swipe up to expand. Sideways drags on the mini do nothing
  (swipe-to-skip was removed — it kept eating taps via accidental
  commits); use the prev/next buttons instead. Quick, short touch slides
  anywhere count as sloppy taps and never skip tracks.
- Full card collapses via downward swipe from ANYWHERE except controls,
  links, and the bars — including the artwork (one gesture owner decides
  by dominant axis: horizontal-on-art swipes tracks, vertical-down
  collapses). The card follows the finger 1:1 and snaps back under
  ~max(56px, 12% height) (or 32px + fling). The card pins touch-action so
  the page can never steal a gesture mid-drag; the volume slider is a
  custom pointer bar for the same reason.
- Like discovery: `add-button` testid, then like-mentioning buttons in the
  widget + player bar (never document-wide, never Dislike); state from
  checked/pressed/active, then Add-vs-Remove labels (past-tense "Added to"
  / "Saved to" count as saved), then the + icon's own shape (plus strokes
  vs check/filled glyph) as a last resort. If the heart still disagrees,
  run `SpotMobile.spotify.getLikeInfo()` in devtools and send the output.
- Transitions are a simple directional handoff: expanding sinks the mini
  down and away while the fullscreen card rises up into place (and vice
  versa), overlapping mid-flight with entry floors so coverage never hits
  zero. No shared-element plumbing — deliberately simple, flicker-free.
  `prefers-reduced-motion` gets instant swaps.
- EXPERIMENTAL glow progress: while playing, the white fill breathes with
  a soft outward bloom (above/below the line, never into the empty track;
  the track is deliberately unclipped) plus a halo on the knob. The glow
  lives on a pseudo-element whose opacity transitions, so it fades in/out
  on play/pause instead of popping — and a dancing halo (breathing core +
  two counter-orbiting cover-tinted wisps at different rhythms, mobile
  sheet only — desktop stays flat and free) breathes behind the album
  artwork (the art slides in and out of its light on track swipes). One
  self-contained CSS block — delete it to get the flat bar back.
  Reduced-motion disables everything. Animations freeze while
  paused (play-state), so idle costs nothing.
- Time honesty: the clock paints from an interpolated estimate every
  animation frame, but throttled webviews/background tabs stall rAF —
  which used to leave time jumping in multi-second snapshot steps. A 500ms
  interval now backs the loop up and keeps the readout per-second whenever
  frames go quiet (it stays silent during a healthy loop).
- Mobile sheet is true fullscreen (edge-to-edge, safe-area aware); the
  mini-player stays a floating bar.

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

## Devices: custom sheet over Spotify's real Connect picker

The Devices button keeps its look but no longer shows Spotify's own picker:
tapping it opens our bottom sheet (slide-up, dimming backdrop, drag handle,
edge-to-edge on phones, centered 560px panel on desktop, light/dark aware,
reduced-motion aware). Swipe the handle down, tap the chevron, tap the
backdrop, or press Escape to close; a downward fling closes from a short
drag, a slow drag has to travel further. A swipe up from the bottom edge of
the player opens it too.

Timing: the sheet responds to the press-release (`pointerup`) rather than
the browser's synthesised `click`, which on touch can be swallowed by
scroll slop, `touch-action`, or a cancelled pointer — that is what made
"tap Devices" feel random while holding it always worked. Open/close is
~0.26s, and the first device read is deferred until the slide has landed:
reading opens Spotify's own panel, and doing that mid-animation made the
open stutter (the cached list is on screen immediately).

Spotify stays the source of truth — the sheet is only a presentation layer:

```text
Spotify device state -> adapter -> sheet -> user tap -> adapter -> Spotify transfer
```

The adapter opens Spotify's own Connect picker to READ it and keeps it out
of sight the whole time (a temporary veil stylesheet rule + inline
`visibility:hidden !important`), so the user never sees a desktop popover
behind our sheet; it only closes a picker it opened itself. Tapping a row
dispatches the click on the element Spotify's transfer handler listens to,
so the switch is a REAL playback transfer. `selectDevice()` reports success
only once Spotify's own picker shows the new device as current — otherwise
the UI says "Couldn't switch to …" and never marks a device active.

Markup contract (extracted from Spotify's shipped web-player bundle, never
guessed; generated class names are never used):

- row: `[data-testid="device-picker-row-sidepanel"]`, `role="group"`,
  `aria-labelledby="listrow-title-<deviceId>"`
- title: `[data-testid="list-row-title"]` / `id="listrow-title-<deviceId>"`;
  subtitle: `id="listrow-subtitle-<deviceId>"` (real status text, may be empty)
- icons: `[data-testid="main-icon"]` (remote device), `device-icon` (current)
- list: `[data-testid^="devices-list-"]`; the current device lives in the
  panel header block (key `device-picker-header`) and is NOT in that list
- click: the transfer handler sits on the wrapping `<li role="listitem">`,
  so the click is dispatched there (the row's own onClick is a no-op)
- empty: `[data-testid="device-picker-section-heading"]` ("No other devices
  found") + `[data-testid="device-picker-troubleshooting-list"]`
- panel: `<aside id="Desktop_PanelContainer_Id">` with
  `[data-testid="PanelHeader_CloseButton"]`

Only real Spotify text is shown: the device name and Spotify's own subtitle
("Unavailable", …). Device *types* are not in the DOM (only icons), so no
type is ever invented; when the list holds only the current device the sheet
says "No other devices found" — Spotify's own words.

Switching is patient and honest. A real Connect handshake is not instant (a
sleeping speaker can take seconds to answer), so the adapter waits for
Spotify's own picker to move the row into the current-device slot instead of
deciding after ~2.5s. If the handshake is still unresolved when the wait
expires, the row keeps its spinner and the sheet says "Still connecting to
X…" — never "Couldn't switch" for something that then succeeds. The list
itself is the verdict: the moment that device shows up as current the
spinner and the notice clear (deadline: 15s, after which the sheet admits it
couldn't switch). Rows Spotify already flags (an "Unavailable"-style status
line) are not given that grace — they fail fast, since Spotify has already
told us they cannot answer. Spotify's own panel is never closed while a
handshake is in flight, because that used to race the transfer.

Loading, empty and error states are distinct: a spinner while the first read
is in flight, a retry button when the picker refuses to open, and an honest
notice when a background refresh fails but a stale list is still shown.

Refresh is deliberately unaggressive: opening paints Spotify's last-known
list instantly and reads fresh once; while the sheet is visible a time-gated
beat re-reads every 5s, and an unchanged list repaints nothing (scroll and
focus stay put). No polling loop of our own.

Device API (all Spotify DOM access stays in the adapter):

```js
SpotMobile.spotify.getDevices()        // fresh read (2.5s cache, single-flight)
SpotMobile.spotify.getCachedDevices()  // last known list, no Spotify round-trip
SpotMobile.spotify.refreshDevices()    // force a fresh read
SpotMobile.spotify.getDevicesState()   // { ok, reason, empty, updatedAt, pickerOpen }
SpotMobile.spotify.selectDevice(dev)   // real transfer -> { ok, reason?, devices }
SpotMobile.spotify.inspectDevices()    // diagnostics: parsed rows + cache/picker state
```

Diagnostic (devtools on the Spotify tab):

```js
SpotMobile.spotify.inspectDevices()
```

A dependency-free fake-Spotify harness lives in `tests/` (dev only, never
packaged): `node tests/serve.js` then open
`http://127.0.0.1:8787/tests/harness.html`. It loads the real extension
files unmodified, watches for the native panel ever becoming visible behind
the sheet, and reports picker opens / transfers / violations live.

## Save / Add to Playlist: heart-driven draft sheet over Spotify's curation

The heart IS the playlist control (no separate Save button), mirroring
Spotify's own button order exactly: tapping it on an unsaved track Likes
instantly; tapping it on a saved track opens our bottom sheet (same slide-up,
backdrop, handle, swipe-down, search, light/dark and reduced-motion treatment
as Devices). The tap branches on Spotify's live liked state, and the heart
visual itself mirrors the bottom-bar button's tristate.

Spotify stays the source of truth — the sheet is only a presentation layer:

```text
Spotify playlist state -> adapter -> sheet -> user tap -> adapter -> Spotify row click
```

Reverse-engineered from Spotify's shipped web-player bundle (never guessed;
generated class names are never used). Bundle anchor: `CurationSheet` with
`initiallySelectedUris` / per-row `isSelected` / `saveChanges` — webpack
closures expose no stable globals (and content scripts run in an isolated
JS world), so clicking Spotify's real button is the equivalent: its handler
runs, nothing is reimplemented.

PRIMARY source — bottom-bar curation button + sheet (exact URIs, artwork,
verified checkbox toggles for add AND remove):

- Trigger: `button[data-encore-id="buttonTertiary"][aria-checked]` in the
  player bar. Unsaved: `aria-checked="false"`, `aria-label="Add to Liked
  Songs"` (plus icon) — a click really Likes (no sheet). Saved:
  `aria-checked="true"`, `aria-label="Add to playlist"` (check icon) — a
  click opens the sheet (no toggle). The button never unlikes directly, and
  its tristate is what `isLiked()` (and hence our heart) mirrors.
- Sheet: `form` with title `Add to playlist`, search
  `input[role="searchbox"][aria-label="Find a playlist"]`, and
  `ul#curation-sheet-list[aria-label="Add to playlist menu"]` holding
  `li > button[role="menuitemcheckbox"][aria-checked]` rows, with
  `p[data-encore-id="listRowTitle"]` names and
  `img[data-testid="entity-image"]` artwork, plus a Cancel button. The list
  is virtualized — reads sweep it via the sheet's own scroll viewport.
- Row identity comes from `listrow-title-<spotify:collection:tracks|
  spotify:playlist:<id>|new-playlist>` (exact, no name matching). **This lives
  on the inner `div[data-encore-id="listRow"][role="group"]`, not on the
  `<button>`** — the button is bare. So it is resolved from the row's own
  `aria-labelledby`, then any nested one, then the title element's `id`
  (the same dual shape the device rows use). Keying rows by the button's own
  attributes yields zero rows, which silently drops the read to the fallback
  library scrape and shows the *wrong* playlist list.
- Playlist ids are read with the same character class everywhere
  (`[A-Za-z0-9_-]+`, as `parsePlaylistHref` already used) so an id is never
  truncated to a prefix.
- `aria-checked` on the rows IS the membership truth (Liked included);
  clicking a row really toggles it, verified by polling the flip.
- The sheet mounts inside a tippy popper, so the "hide Spotify's menus while
  we drive them" veil **dims poppers with `opacity: 0` instead of hiding them
  with `visibility: hidden`**. A popper that cannot lay out never mounts its
  rows, and the read then silently degrades to the Your Library scrape — the
  wrong list, with no error anywhere. If a build still refuses to mount a
  dimmed popper, the open helpers drop the veil and look once more rather than
  report failure.
- Unsaved tracks need a transient-like dance to open the sheet (click#1
  Likes for real, click#2 opens); before closing, the sheet's own Liked row
  is toggled back off (verified), so the net state change is exactly zero.

FALLBACK source — tippy context menu (add-only, no membership marks): the
song menu holds the `Add to playlist` trigger (`button[role="menuitem"]
[aria-expanded]`), whose hover mounts `div[data-tippy-root] >
ul[role="menu"][data-depth="1"]` with the same `Find a playlist` searchbox, a
`New playlist` row, and leaf `button[role="menuitem"]` rows (folders carry
`aria-expanded` and are skipped; leafs carry none). Discovery anchors on the
searchbox, so the depth-0 song menu (`Save to your Liked Songs`, `Add to
queue`, …) can never leak into the list.

Honest consequences (load-bearing, see `spotifyAdapter.js` header):

- List = the curation sheet's real rows (exact URIs, real names + artwork).
  Nothing invented. The tippy submenu + Your-Library sidebar stay as the
  fallback for builds without the curation button.
- Membership (`containsTrack`) is the rows' own `aria-checked` — including
  the Liked Songs row, which stays in sync with the heart through the same
  tristate.
- Our sheet stages like Spotify's: row taps only flip the draft; Done diffs
  it against the server truth loaded at open and commits every change through
  Spotify's real rows in one batch (verified per row, committed via their
  Done); Cancel/backdrop/swipe/Escape discards. Unchecking everything —
  including Liked Songs — and hitting Done unlikes the track, so the heart
  correctly unfills via the next snapshot.
- `addToPlaylist()` / `removeFromPlaylist()` drive the verified curation
  toggle (falling back to the tippy submenu / song-menu Remove item); a row
  that can't be flipped returns `{ok:false, reason:"…"}` so the UI shows
  `Couldn't update playlist` instead of faking it.
- Reads open Spotify's UI hidden (temporary veil, like Devices) and always
  close it + restore focus; synthetic dismissals carry a mark our own sheets
  ignore (otherwise every read would shut the sheet that asked for it —
  caught by the jsdom smoke test, not by inspection).
- Refresh is event-driven (open, track change, like change, user action).
  Deliberately NO timer: opening Spotify's UI steals focus, so polling
  would fight the user (unlike Devices, whose picker read is focus-safe).

Playlist API (all Spotify DOM access stays in the adapter):

```js
SpotMobile.spotify.getPlaylists()          // fresh read (8s cache, single-flight)
SpotMobile.spotify.getCachedPlaylists()    // last known list, no round-trip
SpotMobile.spotify.getPlaylistMembership() // [{ id, uri, name, containsTrack, isLikedSongs }]
SpotMobile.spotify.refreshPlaylists()      // force a fresh read
SpotMobile.spotify.getPlaylistsState()     // { list, ok, reason, empty, updatedAt, trackKey }
SpotMobile.spotify.addToPlaylist(pl)       // verified curation toggle -> { ok, reason?, list? }
SpotMobile.spotify.removeFromPlaylist(pl)  // verified curation toggle, or { ok:false, reason:"…" }
SpotMobile.spotify.togglePlaylist(pl)      // add or remove by current membership
SpotMobile.spotify.toggleLikeAsync(want)   // symmetric button, else sheet's Liked row
SpotMobile.spotify.savePlaylistDraft(changes) // [{uri,id,name,isLikedSongs,want}] -> {ok,failed,list}
SpotMobile.spotify.inspectPlaylists()      // diagnostics: curation button/rows + cache
```

Diagnostics (devtools on the Spotify tab):

```js
SpotMobile.spotify.inspectPlaylists()
```

The harness models the same contract with modes
(`harness.setPlaylistMode("check"|"nocuration"|"pempty"|"perror"|"addonly")`):
curation checkbox toggles (with the real two-click open dance), hidden-button
tippy fallback, empty sheet, rejected row clicks, and legacy add-only tippy
rows. A jsdom smoke test (dev only, in the temp dir — not packaged) executes
Flows A–H against the real adapter + UI files: curation tristate, URIs,
artwork, transient-dance hygiene, add/remove/multi with verified flips,
like-sync both directions, sheet open, search filter, track-change reload,
reopen persistence, Escape + swipe-down close.

### Buttons inside the sheet header

The sheets have **no close button**: they close by swipe-down, tapping the
backdrop, or Escape. Both sheet headers bind `pointerdown` to start the
swipe-down gesture and that handler calls `preventDefault()`, which makes
browsers suppress the compatibility mouse events — **including the `click`** —
so anything button-like in a header would be inert anyway. Both drag handlers
therefore ignore a press that started on a control.

Worth knowing when testing: a bare `element.click()` cannot catch that class of
bug, because it never goes through `pointerdown`. `tests/probe-ui.js` dispatches
a real pointerdown → pointerup → click sequence and honours `dispatchEvent`'s
return value, which is false exactly when the default was prevented.

### The ghost click that opened Devices

Tapping the mini player expands it on `pointerup`, which reveals `.spm-card`
*under the finger*. The browser then synthesises its `click` by hit-testing the
**new** layout, so the click is dispatched to whatever card control now occupies
that point — the Devices button, typically. Neither the mini's own guards nor a
`stopPropagation` inside the mini can help: the click never reaches the mini.

`expandAnimated(true)` arms a short-lived guard (450ms) and a capture-phase
listener on `document` swallows that one click. It is armed **only** on the
pointer path: when expanding from the click fallback the click is already being
dispatched and the capture listener has already run for it, so arming there
would eat the user's next deliberate tap.

### Mid-edit reloads (the "random" staging)

The sheet reloads when it believes the track changed. That belief was wrong in
three separate ways, each of which blanked the sheet to "Loading…" and threw away
the user's staged checks — on a phone that happens often enough to look random:

- The key was `track | artist`. Playlist membership is **per-track**, and
  Spotify frequently renders the title before the artist, so a late-loading
  artist looked like a new track. The key is now the track alone.
- A snapshot with no track at all is a transient glitch (Spotify mid-re-render),
  not a change. Those are ignored outright.
- The open-time key was seeded from `lastSnap`, which *lags* the real track
  (snapshots are mutation- or 2s-cadence driven), so the very first snapshot
  after opening always looked like a change. It is now seeded from the live
  `getSnapshot()`.

A genuine track change still reloads and still discards the draft, but keeps the
rows on screen rather than blanking to a spinner — only the membership values
are stale, and an empty flash reads as breakage.

### The tap was only ever a `click`, and on Android that opened nothing

This is the root cause of the whole intermittent saga, and it explains the
symptom nobody could pin down: **the menu never appeared at all.**

`#curation-sheet-list` does not exist in the DOM until a curation button opens
its popper — measured in `tests/diagnose-playlists.js` **GATE 0**, which reports
the popper/list/searchbox count *before* the tap. So the tap is the entire read:
if it does not open the popper, there is nothing to scrape and the read silently
degrades to the Your Library scrape. A short list is what that fallback returns.

The adapter was firing:

```js
el.click();   // a single `click` event
```

A real tap is `pointerdown → mousedown → pointerup → mouseup → click`, and
popper libraries open on the pointer/mouse **down**, not on click. On desktop a
bare `click` happened to be enough; on Android it did nothing.

Reproduced in `tests/real-dom-lazy-popper.html` — no popper in the DOM at all,
and the button opens on `pointerdown`:

| | events the button saw | poppers created | rows read |
| --- | --- | --- | --- |
| bare `el.click()` | `["click","click","click"]` | **0** | **1** (library) |
| full tap | `["pointerdown","click"]` | 1 | **7** (correct) |

`userClick()` now presents the same sequence a finger would — Spotify's own
handler still runs, we are not simulating anything extra. It is used for every
**Spotify-owned** control we drive: the curation heart, the Connect button, the
sheet's Done/Cancel, and the symmetric like button. (Rows we click inside
Spotify's sheet keep a plain `click()`.)

`openFromSaved()` also distinguishes "the tap landed but nothing mounted" from
"the tap did nothing at all": if the popper/list surface is completely unchanged
after a tap it taps again (up to twice) before moving on to another button.

### Tippy keeps every popper it ever opened (the filtered/short list)

This was the real cause of the "randomly filtered and incomplete playlist list".

The page accumulates one `div[data-tippy-root]` per menu instance for the whole
session — `tippy-36` from the bottom-bar heart, `tippy-37` from the track-row
heart, and so on. Each popper keeps its own `#curation-sheet-list` **and its own
"Find a playlist" input**, holding whatever query was last typed into it.

The reader did:

```js
document.getElementById("curation-sheet-list")   // <-- the FIRST match
```

That returns whichever popper happens to be first in document order, regardless
of which one is live. So the read could:

- pick a **stale, already-closed** popper → `isVisible` fails → the whole read
  aborts → silent fallback to the Your Library scrape (a different list);
- pick a stale popper that is **still measurable and still filtered** → return
  that short, filtered list as if it were the truth.

Reproduced in `tests/real-dom-stale-popper.html`: two poppers, the first still on
screen holding a leftover `MMXXVI` query. The old finder returns **4 rows**; the
new one returns all 8.

Fixes:

- `findCurationList()` enumerates **every** candidate and returns the first
  *visible* one, newest first (tippy appends new popper roots to the end of
  `<body>`). It no longer trusts `getElementById`.
- `findCurationButtons()` returns **all** curation buttons (bottom-bar heart and
  track-row heart each render one) and `ensureCurationSheet()` tries them in turn
  until one actually opens a sheet, instead of betting the read on whichever is
  first in the DOM.
- `stageRowClick()` scopes its flip verification to **the popper the row came
  from**. A document-wide search for "the row with this uri" can match a
  *different* popper's untouched duplicate and report a successful add as a
  failure. The same scoping applies to every row-level operation.

### Card buttons vs the card's own scrolling

`.spm-card` is an `overflow-y: auto` scroller and every button used to be
`touch-action: manipulation` — which still permits panning. On a phone the small
finger movement of an ordinary tap could tip the browser into a scroll; it then
fires `pointercancel` and suppresses the `click`, so the button's own
`pointerup`/`click` never ran and the tap did nothing. That is why **Connect
devices** (and the rest of the card's controls) felt random: it depended on
whether the card happened to be scrollable at that moment, which the desktop
harness never reproduces.

- `#spm-root .spm-card button` is now `touch-action: none`, so a press on a
  control can never be stolen by the card's scroll.
- `Connect devices` activates on press-release, and a release that **travelled**
  (>12px) is rejected — that was a scroll or a drag, not a tap. The synthesized
  click that follows is suppressed too, so a scroll can never open the sheet by
  accident. A clean tap still opens it, and a bare `.click()` (keyboard) still
  works.

### Two lists, randomly: the cache was painting the wrong source

The sheet kept a playlist list in memory, and that was the whole bug:

- `getCachedPlaylists()` returned the list with **no record of where it came
  from**, and `beginPSheet` painted it synchronously. If the previous read had
  fallen back to the Your Library scrape, the sheet showed *that* list instantly
  and then visibly flipped to the real one a beat later. Two different lists,
  appearing at random.
- `loadPSheetPlaylists` then called `getPlaylists()` **without `fresh`**, so
  after painting the cache it re-read the cache. Whichever source won last stayed
  on screen for its whole TTL, and one failed read pinned the wrong list for
  seconds.

Now:

- The cache is a **paint-only** optimisation, and only when it is trustworthy —
  `viaCuration === true` and `complete !== false`. A wrong-source or
  possibly-short cache shows a loading state instead of being passed off as the
  playlist list.
- Every open follows with a **fresh** read (`refreshPlaylists()`), so the sheet
  converges on Spotify's own sheet each time rather than replaying the cache.

### Reading the whole sheet reliably

`sweepCurationRows` collects rows by URI while scrolling the virtualized list.
Two things made it return partial or *filtered* results:

- **A leftover "Find a playlist" query.** Spotify keeps it in component state
  and the tippy popper is reused across opens, so a read could inherit a query
  and return a filtered list — decided entirely by whether an earlier write (via
  `ensureVisible`) had seeded the box. Every read now clears it first.
- **A bad end-of-list signal.** The sweep used to give up when `scrollTop` stopped
  moving, which is not reliable: on a short phone viewport rows mount lazily, so
  the scroller can sit still with rows still pending. It now prefers
  `aria-setsize` and otherwise requires actually reaching the bottom, confirmed
  twice.

A sweep that cannot *prove* it saw every row marks the result `complete: false`,
and such a list is cached for only 1.2s instead of 25s. Without that, one short
read became sticky for the whole TTL and every subsequent open replayed it —
which is precisely the "randomly missing playlists" symptom. `getPlaylistsState()`
exposes `complete` and a `sweep` log (`steps`, `target`, `rows`, `complete`, `ms`)
so a short read is visible instead of silent.

### Sheet-open latency

Opening a sheet used to mean a quarter-second spinner even when a correct list
was already in memory, because the cached paint sat behind the same deferred
timer as the fresh read. Now `beginPSheet` paints the cache **synchronously**
before the slide starts, and only defers the reconciliation. A curation-backed
list is server truth read from Spotify's own sheet, so it is cached for 25s
instead of 8s — re-reading it means driving that sheet again, which is the
slowest thing we do; our own writes update that cache in place, so the longer TTL
cannot show stale membership.

## The Liked flourish

Tapping the heart on an unsaved track Likes it, and the filled state gets a
short burst: a cream/purple bloom, an expanding ring, and 14 shards on an even
angular spread. Colours come from the same `--spm-halo-*` vars the artwork
halos use, so it follows the light theme with no extra rules.

Three things that were not obvious, and cost a screenshot each:

- **The FX layer cannot live inside the heart.** `.spm-card` sets
  `overflow-x: clip; overflow-y: auto`, and the heart sits in the card's
  top-right corner — a radial burst is cropped to nothing. The layers are
  therefore children of `#spm-root` (which does not clip), re-anchored to the
  heart's centre from `offset*` coordinates on every burst. `getBoundingClientRect`
  would be wrong here: it returns post-`zoom` visual pixels, not the root's box.
- **`spm-like-fire` and `spm-like-fx` are the same element**, so the bloom and
  ring must use `.spm-like-fx.spm-like-fire::before`. Writing it as
  `.spm-like-fire .spm-like-fx::before` is a *descendant* combinator that never
  matches, and it fails completely silently — no bloom, no ring, no error.
- **Only the visible heart bursts.** Both hearts track the same snapshot, but the
  mini bar is `display: none` unless collapsed; bursting from a hidden button
  anchors to a zero rect and throws the effect across the screen.

It fires on the OFF→ON transition rather than on the tap, so an external Like
(from Spotify's own UI, a keyboard shortcut, another tab) gets the same
feedback. Unliking never celebrates. `prefers-reduced-motion` drops the bloom
and shards entirely — the heart still fills, it just does not throw confetti.

To see it frozen mid-burst: `node tests/cdp-shot.js
"tests/preview-flourish.html?frozen=1" out.png 420 780` (set `SPM_LIGHT=1` for
the light palette).

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
- The environment is treated as a property of the GLASS, not of the moment.
  Spotify's own Connect panel shifts the layout for a frame or two while the
  adapter reads it, and re-deriving `--spm-zoom` from such a reading used to
  shrink and grow the whole UI mid-connection. So: resize bursts are
  debounced (140ms), the environment is frozen while our sheet is open (and
  re-read when it closes), and a new zoom is only adopted when two
  consecutive readings agree on it and it differs by ≥0.12 — a real rotation
  still lands, a transient panel never does.

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

## Tests

`npm test` runs both suites headlessly in Chrome (no dependencies and no dev
server — they drive `file://` over the Chrome DevTools Protocol):

| Script | What it covers |
| --- | --- |
| `npm run test:curation` | `tests/real-dom-curation.html` — the curation sheet built from DOM pasted off open.spotify.com. Asserts all rows are parsed (id / uri / name / artwork / membership) and that add, remove and bulk-draft really commit, with no Like leaked by the transient dance. |
| `npm run test:tippy` | `tests/real-dom-tippy.html` — the same sheet inside its real `div[data-tippy-root] > div#context-menu` portal, driven by a fake popper that only lays out once it is actually visible. This is what caught the veil deadlock below. |
| `npm run test:stale` | `tests/real-dom-stale-popper.html` — **two** poppers, the first still on screen holding a leftover search query, exactly as a real session accumulates. Asserts the full list is read and an add commits. The old `getElementById` finder returns 4 of 8 rows here. |
| `npm run test:lazy` | `tests/real-dom-lazy-popper.html` — **no** popper or list in the DOM to begin with, and the button opens on `pointerdown`. Models the Android case where a bare `el.click()` opens nothing. The old click fires 3 clicks, builds 0 poppers and reads 1 row; the full tap builds the popper and reads the whole list. |
| `npm run test:sheet` | `tests/harness.html` + `tests/probe-sheet.js` — taps our own heart, asserts the sheet lists **every** playlist, then stages a row, samples the sheet while snapshots stream in (it must neither blank nor revert), presses Done, and verifies against the harness's server-side membership. Also asserts no native menu leaked. |
| `npm run test:fallback` | `tests/harness.html` + `tests/probe-fallback.js` — forces the fallback (curation button hidden) and asserts the merged library+submenu list has no duplicates, no rows without an id, and exact `spotify:` uris. |
| `npm run test:ui` | `tests/harness.html` + `tests/probe-ui.js` — the sheets have **no** close button but still close by backdrop and by header swipe; card buttons are immune to the card's own scrolling and a travelling press never opens Devices; expanding the mini player does **not** ghost-click a card control; and the heart flourish fires on the OFF→ON transition only, survives the icon swap, cleans up, skips hidden hearts, and respects reduced-motion. |
| `npm run test:flaky` | `tests/harness.html` + `tests/probe-flaky.js` — hammers the intermittent paths: taps **Connect devices** 25 times (every tap must open it), opens the playlist sheet 12 times (every open must list every row, from the curation source, with no failure reason), then forces the library fallback and asserts a wrong-source cache is **never** painted as if it were the playlist list. Written because both bugs were intermittent and a single check proved nothing. |

`tests/cdp-run.js` and `tests/cdp-probe.js` are the two drivers (both take a
repo-relative path). The harness's fake rows deliberately mirror the real row
shape — label on the inner `listRow` group, hyphenated ids — so a regression in
row keying fails here instead of only against the live site.

### Diagnosing on a real Spotify tab

`npm run diagnose` points at `tests/diagnose-playlists.html`. Open it, copy
`tests/diagnose-playlists.js`, and paste it into the DevTools console of a
loaded `open.spotify.com` tab. It reports, gate by gate, whether the extension
is really reading Spotify's own Add-to-playlist sheet:

```text
GATE 0  does the menu exist BEFORE we tap? (popper/list/searchbox counts)
GATE 1  curation button found (and why not, if it isn't)
GATE 2  liked state
GATE 3  does clicking it open the sheet, and how long it took
GATE 4  rows in the sheet, and how each row's identity resolved
GATE 5  source that won: "curation" (correct) or "library" (wrong),
        plus whether the sweep could prove it read every row
GATE 6  the sheet opened 6 times in a row: rows per open, source, and
        whether any open came back possibly-short
SHEET    the rows currently rendered in OUR OWN bottom sheet
```

GATE 5 is the one that matters — `library` means the sheet read lost and the
wrong list is being shown. GATE 6 exists because the bug is intermittent: one
clean read proves nothing.

## Limitations (honest)

- Locales: `aria-label` fallbacks cover English best; other languages work for
  play/pause (`Paus*` ⇒ playing) and partly for shuffle/repeat, but `data-testid`
  lookups (locale-independent) cover the main controls anyway.
- Logged-out / ad states: `getSnapshot().playerReady === false`, UI shows
  "Waiting for the Spotify player…".
- Lyrics / Queue click Spotify's real side buttons; if Spotify has no such
  control in the current state the call returns `false` and the UI shows a
  status hint instead of inventing behaviour. Devices no longer opens that
  picker — see "Devices: custom sheet" above (`openDevices()` remains for
  compatibility/diagnostics).
- Volume slider scale (0..1 vs 0..100) is auto-detected; exotic builds fall back
  to the mute button.

## Try it

1. Open `chrome://extensions`, enable Developer mode → Load unpacked → select
   this folder.
2. Open `https://open.spotify.com`, log in, play something.
3. The mini-player bar appears (bottom sheet on narrow screens).
   Collapse it from the full card's chevron; Spotify underneath is untouched.

To package for Quetta Android: zip the folder contents (`manifest.json` at the
zip root) and import the `.zip`.
