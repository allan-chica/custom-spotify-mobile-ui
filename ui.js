/* Spotify Mobile Prototype — ui.js
 *
 * Custom mobile-style player UI (dark adaptation of the "Current Track"
 * concept: header with circular buttons, squircle artwork with a slim seekable progress line beneath, centered titles, minimal controls,
 * lyrics row). This file must ONLY talk to Spotify through
 * window.SpotMobile.spotify (the adapter). No direct document.querySelector
 * calls into Spotify's DOM are allowed here — only queries scoped to our
 * own container (root.querySelector).
 */

(function () {
  "use strict";

  var SVG = {
    play: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="6.4" y="5" width="4.2" height="14" rx="1.6"/><rect x="13.4" y="5" width="4.2" height="14" rx="1.6"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M7 6l8 6-8 6z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M17 6l-8 6 8 6z"/></svg>',
    shuffle:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>',
    repeat:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    heartFill:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    volume:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>',
    mute:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    queue:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><line x1="15.5" y1="15.5" x2="20" y2="20"/></svg>',
    playlistRow:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><line x1="7" y1="9.5" x2="17" y2="9.5"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="16.5" x2="13" y2="16.5"/></svg>',
    devices:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 19h6"/><path d="M18 9h3a1 1 0 011 1v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-9a1 1 0 011-1h4z"/></svg>',
    deviceRow:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 19h6"/><path d="M18 9h3a1 1 0 011 1v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-9a1 1 0 011-1h4z"/></svg>',
    chevDown:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12.5 10 17.5 19 7"/></svg>',
    spinner:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 019 9"/></svg>',
    chevLeft:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 5 8 12 15 19"/></svg>',
    expand:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  };



  function formatTime(totalSeconds) {
    var s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    var ss = String(sec).padStart(2, "0");
    return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function createMobilePlayer(spotify) {
    var root = el("div", null, null);
    root.id = "spm-root";
    root.innerHTML =
      '<div class="spm-card" role="region" aria-label="Mobile player">' +

      '<div class="spm-glow" aria-hidden="true"></div>' +
      '<header class="spm-top">' +
      '<button class="spm-circle spm-collapse" type="button" aria-label="Minimize player">' +
      SVG.chevLeft +
      "</button>" +
      '<div class="spm-top-title">Current Track</div>' +
      '<button class="spm-circle spm-like" type="button" aria-label="Add to Liked Songs" aria-pressed="false">' +
      SVG.heart +
      "</button>" +
      "</header>" +
      '<div class="spm-context" role="note" hidden><button class="spm-context-link" type="button"></button></div>' +
      '<div class="spm-stage">' +
      '<div class="spm-halos" aria-hidden="true"></div>' +
      '<div class="spm-blob">' +
      '<img class="spm-art" alt="Album artwork" draggable="false" />' +
      '<div class="spm-art-fallback" aria-hidden="true">' + SVG.note + "</div>" +
      "</div>" +
      "</div>" +
      '<div class="spm-titles"><h2 class="spm-title">Nothing playing</h2>' +
      '<p class="spm-artist"><button class="spm-artist-link" type="button" disabled>Open Spotify and press play</button></p></div>' +
      '<div class="spm-progress">' +
      '<div class="spm-bar" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
      '<div class="spm-track"><div class="spm-fill"></div></div>' +
      "</div>" +
      '<div class="spm-timerow"><span class="spm-cur">0:00</span><span class="spm-dur">0:00</span></div>' +
      "</div>" +
      '<div class="spm-main">' +
      '<button class="spm-mini spm-repeat" type="button" aria-label="Enable repeat" aria-pressed="false">' + SVG.repeat + '<span class="spm-badge">1</span></button>' +
      '<button class="spm-mini spm-prev" type="button" aria-label="Previous">' + SVG.prev + "</button>" +
      '<button class="spm-play" type="button" aria-label="Play">' + SVG.play + "</button>" +
      '<button class="spm-mini spm-next" type="button" aria-label="Next">' + SVG.next + "</button>" +
      '<button class="spm-mini spm-shuffle" type="button" aria-label="Enable shuffle" aria-pressed="false">' + SVG.shuffle + "</button>" +
      "</div>" +
      '<div class="spm-lyrics">' +
      "<span>Lyrics</span>" +
      '<button class="spm-expand spm-lyrics-open" type="button" aria-label="Open lyrics in Spotify">' + SVG.expand + "</button>" +
      "</div>" +
      '<div class="spm-aux">' +
      '<button class="spm-ghost spm-queue" type="button" aria-label="Queue">' + SVG.queue + "<span>Queue</span></button>" +
      '<button class="spm-ghost spm-devices" type="button" aria-label="Connect to a device">' + SVG.devices + "<span>Devices</span></button>" +
      '<div class="spm-vol">' +
      '<button class="spm-voltbtn spm-mute" type="button" aria-label="Mute">' + SVG.volume + "</button>" +
      '<div class="spm-vol-bar" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">' +
      '<div class="spm-vol-track"><div class="spm-vol-fill"></div></div>' +
      '<div class="spm-vol-knob"></div>' +
      "</div>" +
      "</div>" +
      "</div>" +
      '<p class="spm-status" role="status"></p>' +
      "</div>" +
      '<div class="spm-miniplayer" role="region" aria-label="Mini player">' +
      '<div class="spm-mini-progress" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="spm-mini-progress-fill"></div></div>' +
      '<div class="spm-mini-halos" aria-hidden="true"></div>' +
      '<div class="spm-mini-artwrap"><img class="spm-mini-art" alt="" draggable="false" />' +
      '<div class="spm-mini-fallback" aria-hidden="true">' + SVG.note + "</div></div>" +
      '<div class="spm-mini-titles"><div class="spm-mini-title">Nothing playing</div>' +
      '<div class="spm-mini-artist">Open Spotify</div></div>' +
      '<button class="spm-mini-like" type="button" aria-label="Add to Liked Songs" aria-pressed="false">' +
      SVG.heart +
      "</button>" +
      '<button class="spm-mini-prev" type="button" aria-label="Previous">' + SVG.prev + "</button>" +
      '<button class="spm-mini-play" type="button" aria-label="Play">' + SVG.play + "</button>" +
      '<button class="spm-mini-next" type="button" aria-label="Next">' + SVG.next + "</button>" +
      "</div>" +
      // --- custom Devices bottom sheet (our own layer over the player) ---
      '<div class="spm-dbackdrop" hidden></div>' +
      '<section class="spm-dsheet" role="dialog" aria-modal="true" aria-labelledby="spm-dsheet-title" hidden>' +
      '<div class="spm-dgrab"><span class="spm-dhandle" aria-hidden="true"></span></div>' +
      '<header class="spm-dhead">' +
      '<h3 class="spm-dtitle" id="spm-dsheet-title">Devices</h3>' +
      '<button class="spm-circle spm-dclose" type="button" aria-label="Close devices">' +
      SVG.chevDown +
      "</button>" +
      "</header>" +
      '<div class="spm-dbody">' +
      '<ul class="spm-dlist"></ul>' +
      '<div class="spm-dstate" hidden></div>' +
      "</div>" +
      '<p class="spm-dnotice" role="status" hidden></p>' +
      "</section>" +
      // --- custom Save / Add-to-Playlist bottom sheet (same pattern as Devices) ---
      '<div class="spm-pbackdrop" hidden></div>' +
      '<section class="spm-psheet" role="dialog" aria-modal="true" aria-labelledby="spm-psheet-title" hidden>' +
      '<div class="spm-pgrab"><span class="spm-phandle" aria-hidden="true"></span></div>' +
      '<header class="spm-phead">' +
      '<h3 class="spm-ptitle" id="spm-psheet-title">Add to playlist</h3>' +
      '<button class="spm-circle spm-pclose" type="button" aria-label="Close playlist picker">' +
      SVG.chevDown +
      "</button>" +
      "</header>" +
      '<div class="spm-psearch" role="search">' +
      '<span class="spm-psearch-icon" aria-hidden="true">' + SVG.search + "</span>" +
      '<input class="spm-psearch-input" type="search" placeholder="Search playlists..." aria-label="Search playlists" autocomplete="off" />' +
      "</div>" +
      '<div class="spm-pbody">' +
      '<ul class="spm-plist"></ul>' +
      '<div class="spm-pstate" hidden></div>' +
      "</div>" +
      '<div class="spm-pfoot">' +
      '<button class="spm-pcancel" type="button">Cancel</button>' +
      '<button class="spm-pdone" type="button">Done</button>' +
      "</div>" +
      '<p class="spm-pnotice" role="status" hidden></p>' +
      "</section>";

    // All queries below are scoped to our own container — never Spotify's DOM.
    var q = function (sel) {
      return root.querySelector(sel);
    };
    var cardEl = q(".spm-card");
    var mini = q(".spm-miniplayer");
    var miniArt = q(".spm-mini-art");
    var miniFallback = q(".spm-mini-fallback");
    var miniTitle = q(".spm-mini-title");
    var miniArtist = q(".spm-mini-artist");
    var miniLike = q(".spm-mini-like");
    var miniPrev = q(".spm-mini-prev");
    var miniPlay = q(".spm-mini-play");
    var miniNext = q(".spm-mini-next");
    var miniProgressFill = q(".spm-mini-progress-fill");
    var miniProgress = q(".spm-mini-progress");
    var art = q(".spm-art");
    var artFallback = q(".spm-art-fallback");
    var titleEl = q(".spm-title");
    var artistEl = q(".spm-artist");
    var artistBtn = q(".spm-artist-link");
    var likeBtn = q(".spm-like");
    var playBtn = q(".spm-play");
    var prevBtn = q(".spm-prev");
    var nextBtn = q(".spm-next");
    var shuffleBtn = q(".spm-shuffle");
    var repeatBtn = q(".spm-repeat");
    var bar = q(".spm-bar");
    var fill = q(".spm-fill");
    var blob = q(".spm-blob");

    var curEl = q(".spm-cur");
    var durEl = q(".spm-dur");
    var statusEl = q(".spm-status");
    var muteBtn = q(".spm-mute");
    var volBar = q(".spm-vol-bar");
    var volFill = q(".spm-vol-fill");
    var volKnob = q(".spm-vol-knob");
    var collapseBtn = q(".spm-collapse");
    var contextEl = q(".spm-context");
    var contextLink = q(".spm-context-link");
    var lyricsBtn = q(".spm-lyrics-open");
    var queueBtn = q(".spm-queue");
    var devicesBtn = q(".spm-devices");
    var sheetEl = q(".spm-dsheet");
    var backdropEl = q(".spm-dbackdrop");
    var grabEl = q(".spm-dgrab");
    var sheetClose = q(".spm-dclose");
    var sheetList = q(".spm-dlist");
    var sheetState = q(".spm-dstate");
    var sheetHead = q(".spm-dhead");
    var sheetBody = q(".spm-dbody");
    var sheetNotice = q(".spm-dnotice");
    // Save / Add-to-Playlist sheet refs (own layer, same pattern as Devices).
    var psheetEl = q(".spm-psheet");
    var pbackdropEl = q(".spm-pbackdrop");
    var pgrabEl = q(".spm-pgrab");
    var psheetClose = q(".spm-pclose");
    var psheetListEl = q(".spm-plist");
    var psheetState = q(".spm-pstate");
    var psheetHead = q(".spm-phead");
    var psheetBody = q(".spm-pbody");
    var psheetNotice = q(".spm-pnotice");
    var psheetSearchInput = q(".spm-psearch-input");
    var psheetCancelBtn = q(".spm-pcancel");
    var psheetDoneBtn = q(".spm-pdone");

    var collapsed = false;
    var seeking = false;
    var seekPreview = 0;
    var lastSnap = null;
    var rafId = 0;
    var currentArtwork = "";
    var envInfo = null;
    var envApplyZoom = 0; // last zoom actually written to CSS
    var envSample = null; // previous reading, for two-sample agreement
    var envSampleAt = 0;
    var envTimer = 0;
    var sheetLoadTimer = 0;
    var transitionTimer = 0;
    var miniDrag = null;
    var miniSuppressClick = false;
    // Skeleton loading: true until the first real track arrives. While set,
    // render() shows shimmer placeholders instead of the "Nothing playing"
    // dummy text (see .spm-loading in style.css).
    var hasEverLoaded = false;
    root.classList.add("spm-loading");
    try {
      root.setAttribute("aria-busy", "true");
    } catch (e) {}

    /* Responsive environment: on phones Spotify renders its desktop layout
     * in a wide layout viewport that is scaled down to fit the glass, which
     * would shrink our player too. We compensate with a MEASURED factor
     * (adapter.getViewportInfo(), never a hardcoded phone size): CSS `zoom`
     * on our root re-magnifies our own box back to true physical size, and
     * the tall sheet layout is driven by the VISIBLE width rather than the
     * layout-viewport media query (which never matches a desktop layout).
     * On desktop the factor is exactly 1 and the vars equal the viewport,
     * so desktop rendering is bit-identical to before. */
    // The environment is a property of the GLASS, not of the moment. Spotify's
    // own Connect panel (which the adapter opens behind the scenes to read the
    // device list) shifts the layout for a frame or two; re-deriving `--spm-zoom`
    // from such a reading is what made the whole UI shrink and grow again while
    // the sheet was connecting. So: debounce resize bursts, never recompute
    // while our sheet is open (it is re-applied on close), and only adopt a new
    // zoom when two consecutive readings agree on it (with hysteresis against
    // small wobbles).
    function scheduleEnvironment() {
      if (envTimer) window.clearTimeout(envTimer);
      envTimer = window.setTimeout(function () {
        envTimer = 0;
        applyEnvironment();
      }, 140);
    }

    function applyEnvironment() {
      // Frozen while either sheet is up (both open Spotify's own UI behind
      // the scenes to read state, which shifts the layout for a frame or two).
      if (typeof sheetOpen !== "undefined" && sheetOpen) return;
      if (typeof psheetOpen !== "undefined" && psheetOpen) return;
      var info = null;
      try {
        info = spotify.getViewportInfo();
      } catch (e) {
        return;
      }
      if (!info) return;
      // Never let a garbage reading (NaN / zero / absurd zoom from a
      // spoofed viewport) blank or blow up the layout: only finite, sane
      // numbers reach CSS, otherwise the stylesheet defaults stand. The
      // sheet flag itself still applies from whatever we got.
      var zoom = Number(info.zoom);
      var vw = Math.round(Number(info.sheetWidth));
      var vh = Math.round(Number(info.sheetHeight));
      var sane =
        isFinite(zoom) && zoom > 0 && zoom <= 8 &&
        isFinite(vw) && vw > 0 && isFinite(vh) && vh > 0;
      envInfo = info;
      if (sane) {
        var now = nowMs();
        var agreed =
          envSample !== null &&
          now - envSampleAt >= 60 &&
          Math.abs(envSample - zoom) < 0.1;
        envSample = zoom;
        envSampleAt = now;
        if (!envApplyZoom) {
          envApplyZoom = zoom; // first reading always applies
        } else if (agreed && Math.abs(zoom - envApplyZoom) >= 0.12) {
          envApplyZoom = zoom; // settled change (rotation): adopt it
        }
        try {
          root.style.setProperty("--spm-zoom", String(envApplyZoom));
          root.style.setProperty("--spm-vw", vw + "px");
          root.style.setProperty("--spm-vh", vh + "px");
        } catch (e) {}
      }
      root.classList.toggle("spm-sheet", !!info.sheet);
    }

    function watchEnvironment() {
      try {
        window.addEventListener("resize", scheduleEnvironment, { passive: true });
        window.addEventListener("orientationchange", scheduleEnvironment, { passive: true });
        if (window.visualViewport && window.visualViewport.addEventListener) {
          window.visualViewport.addEventListener("resize", scheduleEnvironment, { passive: true });
        }
      } catch (e) {}
    }

    function setStatus(text) {
      if (statusEl.textContent !== text) statusEl.textContent = text;
    }

    function setCollapsed(next) {
      collapsed = next;
      root.classList.toggle("spm-collapsed", collapsed);
      collapseBtn.setAttribute("aria-label", collapsed ? "Expand player" : "Minimize player");
      try {
        localStorage.setItem("spm-collapsed", collapsed ? "1" : "0");
      } catch (e) {}
    }

    function prefersReducedMotion() {
      try {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } catch (e) {
        return false;
      }
    }

    function clearTransitionTimer() {
      if (transitionTimer) {
        try {
          window.clearTimeout(transitionTimer);
        } catch (e) {}
        transitionTimer = 0;
      }
    }

    // Animated state flips (mini <-> full feel like one component
    // transforming, not two boxes swapping). Reduced-motion users and
    // first paint get the instant swap instead.
    function expandAnimated() {
      if (!collapsed) return;
      clearTransitionTimer();
      mini.classList.remove("spm-leaving");
      cardEl.classList.remove("spm-leaving-card");
      cardEl.style.transform = "";
      cardEl.style.opacity = "";
      setCollapsed(false);
    }

    function collapseAnimated() {
      if (collapsed) return;
      clearTransitionTimer();
      if (prefersReducedMotion()) {
        setCollapsed(true);
        return;
      }
      // Card sinks down and away; the flip lands mid-sink (~60ms) so the
      // blooming mini overlaps it.
      cardEl.classList.add("spm-leaving-card");
      transitionTimer = window.setTimeout(function () {
        transitionTimer = 0;
        cardEl.classList.remove("spm-leaving-card");
        setCollapsed(true);
      }, 60);
    }

    // Drag-release path: the card is already mid-flight under the finger,
    // so glide it the rest of the way out, then swap to the mini-player.
    function finishDragCollapse() {
      clearTransitionTimer();
      cardEl.classList.remove("spm-card-drag");
      var h = cardHeight();
      cardEl.style.transform = "translateY(" + Math.round(h * 1.1) + "px)";
      cardEl.style.opacity = "0";
      if (prefersReducedMotion()) {
        cardEl.style.transform = "";
        cardEl.style.opacity = "";
        setCollapsed(true);
        return;
      }
      transitionTimer = window.setTimeout(function () {
        transitionTimer = 0;
        cardEl.style.transform = "";
        cardEl.style.opacity = "";
        setCollapsed(true);
      }, 120);
    }

    function applyStoredState() {
      var stored = null;
      try {
        stored = localStorage.getItem("spm-collapsed");
      } catch (e) {}
      if (stored === "1") setCollapsed(true);
      else if (stored === "0") setCollapsed(false);
      // Mobile opens on the mini-player by default (first run only —
      // afterwards the remembered choice wins).
      else if (envInfo && envInfo.sheet) setCollapsed(true);
      else setCollapsed(false);
    }

    function pressFeedback(btn) {
      btn.classList.remove("spm-press");
      // Force reflow so rapid taps retrigger the animation.
      void btn.offsetWidth;
      btn.classList.add("spm-press");
      setTimeout(function () {
        btn.classList.remove("spm-press");
      }, 140);
    }

    // Optimistic play/pause flip: paint the opposite icon the moment the
    // finger lands instead of waiting for the Spotify-DOM round trip
    // (click -> React -> mutation -> snapshot -> render), which is what
    // feels laggy on phone CPUs. The next snapshot reconciles via render's
    // churn guard, so a failed click self-corrects within a beat.
    // Double-taps keep parity (two flips), so they stay correct too.
    function optimisticPlayFlip() {
      var showingPause = playBtn.getAttribute("data-state") === "pause";
      var next = !showingPause;
      playBtn.innerHTML = next ? SVG.pause : SVG.play;
      playBtn.setAttribute("data-state", next ? "pause" : "play");
      playBtn.setAttribute("aria-label", next ? "Pause" : "Play");
      miniPlay.innerHTML = next ? SVG.pause : SVG.play;
      miniPlay.setAttribute("data-state", next ? "pause" : "play");
      miniPlay.setAttribute("aria-label", next ? "Pause" : "Play");
      root.classList.toggle("spm-playing", next);
    }

    // --- transport wiring (adapter only) ---
    playBtn.addEventListener("click", function () {
      pressFeedback(playBtn);
      optimisticPlayFlip();
      spotify.togglePlay();
    });
    prevBtn.addEventListener("click", function () {
      pressFeedback(prevBtn);
      spotify.previous();
    });
    nextBtn.addEventListener("click", function () {
      pressFeedback(nextBtn);
      spotify.next();
    });
    shuffleBtn.addEventListener("click", function () {
      pressFeedback(shuffleBtn);
      spotify.toggleShuffle();
    });
    repeatBtn.addEventListener("click", function () {
      pressFeedback(repeatBtn);
      spotify.toggleRepeat();
    });
    // Heart follows Spotify's own order: unsaved -> tap Likes instantly;
    // saved -> tap opens OUR playlist sheet (never Spotify's menu). The
    // decision reads Spotify's LIVE state (not the last snapshot, which can
    // lag a beat behind external changes); the sheet always loads truth on
    // open, so a wrong branch self-corrects either way.
    function heartTap(btn) {
      pressFeedback(btn);
      var liked = false;
      try {
        liked = !!spotify.isLiked();
      } catch (e) {
        liked = !!(lastSnap && lastSnap.liked);
      }
      if (liked) {
        openPSheet();
        return;
      }
      try {
        if (spotify.toggleLikeAsync) spotify.toggleLikeAsync(true);
        else spotify.toggleLike();
      } catch (e) {
        try {
          spotify.toggleLike();
        } catch (e2) {}
      }
    }
    likeBtn.addEventListener("click", function () {
      heartTap(likeBtn);
    });
    lyricsBtn.addEventListener("click", function () {
      if (spotify.openLyrics() === false) setStatus("Lyrics is not available right now.");
    });
    contextLink.addEventListener("click", function () {
      // Open it the Spotify way: the adapter clicks Spotify's OWN context
      // link (inside its React tree), so its router handles it as in-app
      // navigation. Clicking a copy of the URL from our overlay bypasses
      // the router and forces a full page load instead.
      var ok = false;
      try {
        ok = spotify.openContext() !== false;
      } catch (e) {
        ok = false;
      }
      if (!ok) {
        setStatus("Playlist is not available right now.");
        return;
      }
      // Minimize so the destination is visible.
      try {
        if (!collapsed) setCollapsed(true);
      } catch (e) {}
    });
    artistBtn.addEventListener("click", function () {
      // Same mechanism as the context link: click Spotify's own artist
      // link so navigation stays in-app.
      var ok = false;
      try {
        ok = spotify.openArtist() !== false;
      } catch (e) {
        ok = false;
      }
      if (!ok) {
        setStatus("Artist page is not available right now.");
        return;
      }
      // Minimize so the destination is visible.
      try {
        if (!collapsed) setCollapsed(true);
      } catch (e) {}
    });
    queueBtn.addEventListener("click", function () {
      if (spotify.openQueue() === false) setStatus("Queue is not available right now.");
    });
    // Devices now opens our own sheet (see the Devices sheet section above).
    muteBtn.addEventListener("click", function () {
      spotify.toggleMute();
    });
    collapseBtn.addEventListener("click", function () {
      collapseAnimated();
    });

    // --- mini-player wiring (same component, compact state) ---
    miniPlay.addEventListener("click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      pressFeedback(miniPlay);
      optimisticPlayFlip();
      spotify.togglePlay();
    });
    miniLike.addEventListener("click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      heartTap(miniLike);
    });
    miniPrev.addEventListener("click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      pressFeedback(miniPrev);
      spotify.previous();
    });
    miniNext.addEventListener("click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      pressFeedback(miniNext);
      spotify.next();
    });
    mini.addEventListener("click", function (e) {
      var t = e && e.target;
      if (t && t.closest && (t.closest("button") || t.closest(".spm-mini-progress"))) return; // buttons + hairline act alone
      if (miniSuppressClick) {
        miniSuppressClick = false; // a swipe release may still fire click
        return;
      }
      expandAnimated();
    });

    // Custom volume slider -> adapter (no Spotify DOM access here).
    // Native <input type=range> can't be used: the card pins touch-action
    // so collapse drags are never stolen, which would also pin the native
    // slider. This pointer-driven bar behaves the same (drag + keys).
    var volDragging = false;
    var volDebounce = 0;

    function volRatioFromEvent(e) {
      var r = volBar.getBoundingClientRect();
      var x = e.clientX !== undefined ? e.clientX : r.left;
      return Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width)));
    }

    function paintVol(vv) {
      vv = Math.max(0, Math.min(100, Math.round(vv)));
      if (volFill) volFill.style.transform = "scaleX(" + vv / 100 + ")";
      if (volKnob) volKnob.style.left = vv + "%";
      volBar.setAttribute("aria-valuemax", "100");
      volBar.setAttribute("aria-valuenow", String(vv));
      volBar.setAttribute("aria-valuetext", vv + " percent volume");
      var wantIcon = vv <= 0 ? SVG.mute : SVG.volume;
      if (muteBtn.innerHTML !== wantIcon) muteBtn.innerHTML = wantIcon;
      muteBtn.setAttribute("aria-label", vv <= 0 ? "Unmute" : "Mute");
    }

    function pushVolume(v) {
      v = Math.max(0, Math.min(1, Number(v) || 0));
      window.clearTimeout(volDebounce);
      volDebounce = window.setTimeout(function () {
        spotify.setVolume(v);
      }, 60);
    }

    volBar.addEventListener("pointerdown", function (e) {
      volDragging = true;
      try {
        volBar.setPointerCapture && volBar.setPointerCapture(e.pointerId);
      } catch (err) {}
      var v = volRatioFromEvent(e) * 100;
      paintVol(v);
      pushVolume(v / 100);
      e.preventDefault();
    });

    volBar.addEventListener("pointermove", function (e) {
      if (!volDragging) return;
      var v = volRatioFromEvent(e) * 100;
      paintVol(v);
      pushVolume(v / 100);
    });

    volBar.addEventListener("pointerup", function () {
      volDragging = false;
    });

    volBar.addEventListener("pointercancel", function () {
      volDragging = false;
    });

    volBar.addEventListener("keydown", function (e) {
      var cur = 0;
      try {
        cur = Number(volBar.getAttribute("aria-valuenow")) || 0;
      } catch (err2) {}
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        paintVol(cur + 5);
        pushVolume((cur + 5) / 100);
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        paintVol(cur - 5);
        pushVolume((cur - 5) / 100);
        e.preventDefault();
      } else if (e.key === "Home") {
        paintVol(0);
        pushVolume(0);
        e.preventDefault();
      } else if (e.key === "End") {
        paintVol(100);
        pushVolume(1);
        e.preventDefault();
      }
    });

    // --- linear progress: slim line under the artwork, tap/drag to seek ---
    // Smoothness design: Spotify-DOM reads (~1/sec + snapshots) only rebase
    // an anchor; every animation frame paints the INTERPOLATED position.
    var lastAriaSec = -1;
    var anchorTime = 0;
    var anchorDur = 0;
    var anchorStamp = 0;
    var anchorPlaying = false;
    var lastRebase = 0;

    function nowMs() {
      try {
        return performance.now();
      } catch (e) {
        return Date.now();
      }
    }

    function rebase(time, dur, playing) {
      anchorTime = time || 0;
      anchorDur = dur || 0;
      anchorPlaying = !!playing;
      anchorStamp = nowMs();
    }

    function estimate() {
      var est = anchorTime + (anchorPlaying ? (nowMs() - anchorStamp) / 1000 : 0);
      if (anchorDur && est > anchorDur) est = anchorDur;
      return est < 0 ? 0 : est;
    }

    function renderBar(current, duration) {
      var ratio = duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0;
      if (fill) fill.style.transform = "scaleX(" + ratio + ")";
      // Mini top hairline mirrors the same ratio (and is itself a slider).
      if (miniProgressFill) {
        miniProgressFill.style.transform = "scaleX(" + ratio + ")";
      }
      // ARIA churn feeds MutationObservers (and screen readers); 1Hz is
      // plenty, the visuals already move every frame.
      var sec = Math.round(current);
      if (sec !== lastAriaSec) {
        lastAriaSec = sec;
        bar.setAttribute("aria-valuemax", String(Math.round(duration)));
        bar.setAttribute("aria-valuenow", String(sec));
        bar.setAttribute(
          "aria-valuetext",
          formatTime(current) + " of " + formatTime(duration)
        );
        miniProgress.setAttribute("aria-valuemax", String(Math.round(duration)));
        miniProgress.setAttribute("aria-valuenow", String(sec));
        miniProgress.setAttribute(
          "aria-valuetext",
          formatTime(current) + " of " + formatTime(duration)
        );
      }
    }

    function ratioFromEvent(e) {
      var r = bar.getBoundingClientRect();
      var x = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : r.left);
      return Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width)));
    }

    bar.addEventListener("pointerdown", function (e) {
      seeking = true;
      try {
        bar.setPointerCapture && bar.setPointerCapture(e.pointerId);
      } catch (err) {}
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      seekPreview = ratioFromEvent(e) * dur;
      renderBar(seekPreview, dur);
      if (curEl) curEl.textContent = formatTime(seekPreview);
      e.preventDefault();
    });

    bar.addEventListener("pointermove", function (e) {
      if (!seeking) return;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      seekPreview = ratioFromEvent(e) * dur;
      renderBar(seekPreview, dur);
      if (curEl) curEl.textContent = formatTime(seekPreview);
    });

    function endSeek(e) {
      if (!seeking) return;
      seeking = false;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var target = e && e.clientX !== undefined ? ratioFromEvent(e) * dur : seekPreview;
      if (dur > 0) {
        spotify.seek(target);
        // Optimistic paint; the adapter snapshot will correct us shortly.
        renderBar(target, dur);
        if (curEl) curEl.textContent = formatTime(target);
      }
    }

    bar.addEventListener("pointerup", endSeek);
    bar.addEventListener("pointercancel", function () {
      seeking = false;
    });

    bar.addEventListener("keydown", function (e) {
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var cur = (lastSnap && lastSnap.currentTime) || spotify.getCurrentTime() || 0;
      if (e.key === "ArrowRight") {
        spotify.seek(Math.min(dur, cur + 5));
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        spotify.seek(Math.max(0, cur - 5));
        e.preventDefault();
      } else if (e.key === "Home") {
        spotify.seek(0);
        e.preventDefault();
      } else if (e.key === "End") {
        spotify.seek(dur);
        e.preventDefault();
      }
    });

    // --- mini hairline seek: the top strip is a real slider too ---
    var miniSeeking = false;
    var miniSeekPreview = 0;

    function miniRatioFromEvent(e) {
      var r = miniProgress.getBoundingClientRect();
      var x = e.clientX !== undefined ? e.clientX : r.left;
      return Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width)));
    }

    miniProgress.addEventListener("pointerdown", function (e) {
      miniSeeking = true;
      try {
        miniProgress.setPointerCapture && miniProgress.setPointerCapture(e.pointerId);
      } catch (err) {}
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      miniSeekPreview = miniRatioFromEvent(e) * dur;
      renderBar(miniSeekPreview, dur);
      if (curEl) curEl.textContent = formatTime(miniSeekPreview);
      e.preventDefault();
    });

    miniProgress.addEventListener("pointermove", function (e) {
      if (!miniSeeking) return;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      miniSeekPreview = miniRatioFromEvent(e) * dur;
      renderBar(miniSeekPreview, dur);
      if (curEl) curEl.textContent = formatTime(miniSeekPreview);
    });

    function miniEndSeek(e) {
      if (!miniSeeking) return;
      miniSeeking = false;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var target = e && e.clientX !== undefined ? miniRatioFromEvent(e) * dur : miniSeekPreview;
      if (dur > 0) {
        spotify.seek(target);
        renderBar(target, dur);
        if (curEl) curEl.textContent = formatTime(target);
      }
    }

    miniProgress.addEventListener("pointerup", miniEndSeek);
    miniProgress.addEventListener("pointercancel", function () {
      miniSeeking = false;
    });

    miniProgress.addEventListener("keydown", function (e) {
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var cur = (lastSnap && lastSnap.currentTime) || spotify.getCurrentTime() || 0;
      if (e.key === "ArrowRight") {
        spotify.seek(Math.min(dur, cur + 5));
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        spotify.seek(Math.max(0, cur - 5));
        e.preventDefault();
      } else if (e.key === "Home") {
        spotify.seek(0);
        e.preventDefault();
      } else if (e.key === "End") {
        spotify.seek(dur);
        e.preventDefault();
      }
    });

    // --- art swipe helpers: drag the artwork sideways for prev / next ---
    // The artwork swipe OWNS no pointers itself (deliberately: a second
    // capture here once stole pointerup and glued the art to the cursor).
    // cardEl below is the single gesture owner; it calls these helpers.
    // The art follows the finger live; past the threshold it flies out and
    // the newly arriving cover flies in from the other side. A tap (no
    // real movement) does nothing at all.
    var awaitingArt = null; // { dir, timer } while the new cover travels in

    function blobWidth() {
      try {
        return blob.getBoundingClientRect().width || 200;
      } catch (e) {
        return 200;
      }
    }

    function blobPose(dxPx, opacity) {
      blob.style.transform = "translateX(" + Math.round(dxPx) + "px)";
      blob.style.opacity = String(opacity);
    }

    function blobRest() {
      blob.style.transform = "";
      blob.style.opacity = "";
    }

    function commitSwipe(dir) {
      // dir -1 (swiped left) = next track, +1 (swiped right) = previous.
      // NOTE on Spotify's previous semantics: pressing previous while >~3s
      // into the song RESTARTS it instead of going back. That is not a bug
      // in this UI — but the old code made it feel like one: it parked the
      // art off-screen for up to 3s and swallowed the follow-up swipe, so
      // users had to swipe twice with a long dead gap. The fixes below
      // (fast restart snap-back + non-blocking gestures + 120ms arrival
      // poll) make restart feel instant and the second swipe land.
      var w = blobWidth();
      blobPose(dir * w * 1.25, 0);
      if (awaitingArt && awaitingArt.timer) {
        try {
          window.clearTimeout(awaitingArt.timer);
        } catch (e) {}
      }
      if (dir < 0) spotify.next();
      else spotify.previous();
      var timer = 0;
      var startPos = lastSnap && lastSnap.currentTime ? lastSnap.currentTime : 0;
      var startTrack = lastSnap && lastSnap.track ? lastSnap.track : "";
      var t0 = nowMs();
      awaitingArt = { dir: dir, timer: 0, t0: t0, pos: startPos, track: startTrack };
      watchTrackArrival(); // poll for the new track; observer can lag
      try {
        timer = window.setTimeout(function () {
          // Spotify never delivered a new track (e.g. next at queue end):
          // glide the old art home instead of sitting empty.
          if (awaitingArt && awaitingArt.t0 === t0) {
            awaitingArt = null;
            blobRest();
          }
        }, 2000);
      } catch (e) {}
      awaitingArt.timer = timer;
    }

    function flyIn(dir) {
      var w = blobWidth();
      blob.classList.add("spm-dragging"); // hold the starting pose, no slide
      blobPose(-dir * w * 0.9, 0);
      void blob.offsetWidth; // reflow so the transition below animates
      blob.classList.remove("spm-dragging");
      blobRest(); // CSS transition glides it home
    }

    // Fast track-arrival watch: after prev/next the observer path (React
    // -> DOM mutation -> 150ms debounce -> snapshot) can lag, especially
    // on throttled mobile webviews — leaving the stage empty while Spotify
    // has already moved on. Poll the cheap track title + clock directly
    // (120ms, max ~2s to match the glide-home fallback) and render the
    // moment it flips, which also triggers the fly-in via awaitingArt.
    // The clock check is the previous-restart fast path: a sharp position
    // drop means Spotify restarted the song (not a new track), so snap
    // home at once instead of idling empty.
    function watchTrackArrival() {
      var tries = 0;
      var startTrack = awaitingArt && awaitingArt.track ? awaitingArt.track : "";
      var startPos = awaitingArt && isFinite(awaitingArt.pos) ? awaitingArt.pos : 0;
      var dir = awaitingArt ? awaitingArt.dir : 0;
      try {
        var timer = window.setInterval(function () {
          if (!awaitingArt) {
            window.clearInterval(timer);
            return;
          }
          tries++;
          var fresh = "";
          try {
            fresh = spotify.getCurrentTrack() || "";
          } catch (e) {}
          if (fresh && lastSnap && fresh !== lastSnap.track) {
            window.clearInterval(timer);
            try {
              render(spotify.getSnapshot());
            } catch (e2) {}
            return;
          }
          // Restart fast-path (previous with >~3s elapsed): position falls
          // off a cliff while the title stays identical.
          if (dir > 0 && startPos > 5) {
            var posNow = NaN;
            try {
              posNow = spotify.getCurrentTime();
            } catch (e3) {}
            if (isFinite(posNow) && posNow + 3 < startPos) {
              window.clearInterval(timer);
              try {
                render(spotify.getSnapshot());
              } catch (e4) {}
              // If the snapshot hasn't caught the restart yet, snap home
              // directly so the stage is never stuck empty.
              if (awaitingArt) {
                if (awaitingArt.timer) {
                  try {
                    window.clearTimeout(awaitingArt.timer);
                  } catch (e5) {}
                }
                awaitingArt = null;
                blobRest();
              }
              return;
            }
          }
          if (tries >= 16) window.clearInterval(timer);
        }, 120);
      } catch (e) {}
    }

    // --- cover-tinted glow: sample the artwork's dominant vivid color ---
    // Runs on a SEPARATE, display-independent Image with crossOrigin set,
    // so sampling can never break the visible cover: if the CDN refuses
    // CORS (tainted canvas) or the fetch fails, getImageData throws, we
    // swallow it, and the CSS fallback color stays. One tiny 32px decode
    // per track change — negligible cost. Stale loads (track changed
    // mid-fetch) are discarded via the currentArtwork check.
    var coverSampler = null;
    var coverCanvas = null;
    var samplingFor = "";

    // --- cover-color crossfade: blob hues sweep between tracks ---
    // The sampler below only computes TARGET colors; this loop animates the
    // CSS vars from whatever is currently displayed (mid-flight values
    // included — a new track mid-transition retargets smoothly instead of
    // snapping). eased over 1.4s; instant when reduced-motion is on or rAF
    // is unavailable. Mirrors start at the CSS fallback defaults.
    var coverDisplayed = {
      cover: [148, 120, 255],
      accent: [244, 241, 234],
    };
    var coverAnims = { cover: 0, accent: 0 };

    function transitionCoverVar(name, key, to) {
      var from = (coverDisplayed[key] || to).slice();
      if (coverAnims[key]) {
        try {
          cancelAnimationFrame(coverAnims[key]);
        } catch (e) {}
        coverAnims[key] = 0;
      }
      function snap() {
        coverDisplayed[key] = to.slice();
        try {
          root.style.setProperty(name, to.join(", "));
        } catch (e2) {}
      }
      if (from[0] === to[0] && from[1] === to[1] && from[2] === to[2]) {
        snap();
        return;
      }
      if (prefersReducedMotion()) {
        snap();
        return;
      }
      var dur = 1400;
      var t0 = 0;
      try {
        t0 = performance.now();
      } catch (e3) {
        t0 = Date.now();
      }
      function step(now) {
        var t = Math.max(0, Math.min(1, ((now === undefined ? t0 : now) - t0) / dur));
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var cur = [
          Math.round(from[0] + (to[0] - from[0]) * e),
          Math.round(from[1] + (to[1] - from[1]) * e),
          Math.round(from[2] + (to[2] - from[2]) * e),
        ];
        coverDisplayed[key] = cur;
        try {
          root.style.setProperty(name, cur.join(", "));
        } catch (e4) {}
        if (t < 1) {
          try {
            coverAnims[key] = requestAnimationFrame(step);
          } catch (e5) {
            coverAnims[key] = 0;
            snap();
          }
        } else {
          coverAnims[key] = 0;
        }
      }
      try {
        coverAnims[key] = requestAnimationFrame(step);
      } catch (e6) {
        coverAnims[key] = 0;
        snap();
      }
    }

    function sampleCoverColor(url) {
      if (!url || url === samplingFor) return;
      samplingFor = url;
      try {
        if (!coverSampler) {
          coverSampler = new Image();
          try {
            coverSampler.crossOrigin = "anonymous";
          } catch (e0) {}
        }
        if (!coverCanvas) {
          coverCanvas = document.createElement("canvas");
        }
        var target = url;
        coverSampler.onload = function () {
          try {
            if (target !== currentArtwork) return; // stale: moved on already
            var w = 32;
            var h = 32;
            coverCanvas.width = w;
            coverCanvas.height = h;
            // willReadFrequently: this canvas exists only to be read back
            // (one getImageData per track), so keep it in CPU memory and
            // silence Chrome's multiple-readback performance hint.
            var ctx = coverCanvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(coverSampler, 0, 0, w, h);
            var data = ctx.getImageData(0, 0, w, h).data;
            var r = 0;
            var g = 0;
            var b = 0;
            var n = 0;
            var vr = 0;
            var vg = 0;
            var vb = 0;
            var vn = 0;
            var buckets = {};
            for (var i = 0; i < data.length; i += 4) {
              var pr = data[i];
              var pg = data[i + 1];
              var pb = data[i + 2];
              var pa = data[i + 3];
              if (pa < 128) continue;
              r += pr;
              g += pg;
              b += pb;
              n++;
              var mx = Math.max(pr, pg, pb);
              var mn = Math.min(pr, pg, pb);
              if (mx > 0 && (mx - mn) / mx > 0.25) {
                vr += pr;
                vg += pg;
                vb += pb;
                vn++;
                // Coarse 3-bits/channel bucket for the second-color hunt.
                // Near-blacks never enter: the accent must stay visible in
                // dark mode.
                if (mx >= 35) {
                  var key = (pr >> 5) * 64 + (pg >> 5) * 8 + (pb >> 5);
                  var bk = buckets[key];
                  if (!bk) {
                    bk = buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
                  }
                  bk.r += pr;
                  bk.g += pg;
                  bk.b += pb;
                  bk.n++;
                }
              }
            }
            if (!n) return;
            // Color 1 = the largest visible bucket: a REAL cover hue, never
            // a blend. (A global average of a multicolor cover is a muddy
            // mix of its hues — exactly what we don't want glowing.) Falls
            // back to the vivid-then-overall average only when nothing
            // vivid was sampled at all (monochrome covers), with a floor
            // blending toward cream so the glow is never black-on-black.
            var c1 = null;
            var c1n = 0;
            for (var kk in buckets) {
              if (!Object.prototype.hasOwnProperty.call(buckets, kk)) continue;
              if (buckets[kk].n > c1n) {
                c1n = buckets[kk].n;
                c1 = buckets[kk];
              }
            }
            if (c1 && c1n >= 4) {
              r = Math.round(c1.r / c1n);
              g = Math.round(c1.g / c1n);
              b = Math.round(c1.b / c1n);
            } else {
              // Prefer the vivid bucket when it holds a real share of
              // pixels (plain averages of artwork skew muddy gray);
              // otherwise fall back to the overall average.
              if (vn > n * 0.1) {
                r = vr;
                g = vg;
                b = vb;
                n = vn;
              }
              r = Math.round(r / n);
              g = Math.round(g / n);
              b = Math.round(b / n);
            }
            // Gentle stretch so dark covers still cast visible light, capped
            // so nothing blows out to neon.
            var peak = Math.max(r, g, b);
            if (peak > 0 && peak < 170) {
              var f = Math.min(170 / peak, 1.5);
              r = Math.min(255, Math.round(r * f));
              g = Math.min(255, Math.round(g * f));
              b = Math.min(255, Math.round(b * f));
            }
            if (Math.max(r, g, b) < 50) {
              r = Math.round((r + 244) / 2);
              g = Math.round((g + 241) / 2);
              b = Math.round((b + 234) / 2);
            }
            transitionCoverVar("--spm-halo-cover-rgb", "cover", [r, g, b]);
            // Second color for the accent wisp: the largest bucket far away
            // from color 1 (squared distance > 90^2). Anything else —
            // monochrome cover, nothing vivid, or a runner-up too dark for
            // dark mode — falls back to cream, which always reads.
            var accent = null;
            var best = 0;
            var bestDist = 0;
            var minCount = Math.max(6, vn * 0.05);
            for (var k in buckets) {
              if (!Object.prototype.hasOwnProperty.call(buckets, k)) continue;
              var c = buckets[k];
              if (c.n < minCount) continue;
              var cr = c.r / c.n;
              var cg = c.g / c.n;
              var cb = c.b / c.n;
              var dr = cr - r;
              var dg = cg - g;
              var db = cb - b;
              var dist = dr * dr + dg * dg + db * db;
              if (dist < 8100) continue; // too close to color 1
              if (c.n > best || (c.n === best && dist > bestDist)) {
                best = c.n;
                bestDist = dist;
                accent = [cr, cg, cb];
              }
            }
            var FALLBACK_ACCENT = [244, 241, 234];
            if (accent) {
              var ar = Math.round(accent[0]);
              var ag = Math.round(accent[1]);
              var ab = Math.round(accent[2]);
              var apeak = Math.max(ar, ag, ab);
              if (apeak >= 70) {
                if (apeak < 170) {
                  var af = Math.min(170 / apeak, 1.5);
                  ar = Math.min(255, Math.round(ar * af));
                  ag = Math.min(255, Math.round(ag * af));
                  ab = Math.min(255, Math.round(ab * af));
                }
                transitionCoverVar("--spm-halo-accent-rgb", "accent", [ar, ag, ab]);
              } else {
                transitionCoverVar("--spm-halo-accent-rgb", "accent", FALLBACK_ACCENT);
              }
            } else {
              transitionCoverVar("--spm-halo-accent-rgb", "accent", FALLBACK_ACCENT);
            }
          } catch (e) {
            /* tainted canvas / decode hiccup: keep the fallback color */
          }
        };
        coverSampler.onerror = function () {
          /* keep the fallback color */
        };
        coverSampler.src = target;
      } catch (e) {}
    }

    // --- unified card gestures: ONE owner for art swipe + collapse ---
    // cardEl sees every pointer that starts on the card (the artwork no
    // longer captures to itself — that second capture is what once stole
    // pointerup and glued the art to the cursor). First dominant axis
    // wins, tracked live from 12px so drags feel immediate:
    //   horizontal starting on art -> track swipe (previous / next),
    //   vertical, downward          -> collapse to the mini-player,
    //   anything else               -> ignored (a tap does nothing).
    // So swipe-down works from ANYWHERE, including the cover.
    var gesture = null; // { id, x0, y0, dx, dy, t0, mode, fromBlob }

    function cardHeight() {
      try {
        return cardEl.getBoundingClientRect().height || 400;
      } catch (e) {
        return 400;
      }
    }

    function glideCardHome() {
      // Removing the drag class re-arms the CSS transition; clearing the
      // pose on the next frame lets it glide home instead of jumping.
      cardEl.classList.remove("spm-card-drag");
      try {
        requestAnimationFrame(function () {
          cardEl.style.transform = "";
          cardEl.style.opacity = "";
        });
      } catch (e) {
        cardEl.style.transform = "";
        cardEl.style.opacity = "";
      }
    }

    function abortGesture() {
      if (!gesture) return;
      gesture = null;
      blob.classList.remove("spm-dragging");
      cardEl.classList.remove("spm-card-drag");
      // Never touch the artwork pose while a fly-out is in flight —
      // that pose belongs to commitSwipe until the new cover lands.
      if (!awaitingArt) blobRest();
      glideCardHome();
    }

    cardEl.addEventListener("pointerdown", function (e) {
      if (collapsed || gesture) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = e.target;
      // Controls, links and the seek bar keep their own gestures.
      if (t && t.closest && t.closest("button, input, select, textarea, a, [role='slider'], .spm-bar")) {
        return;
      }
      if (cardEl.scrollTop > 4) return; // scrolled: let it scroll
      gesture = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        dx: 0,
        dy: 0,
        t0: nowMs(),
        mode: null,
        fromBlob: !!(t && t.closest && t.closest(".spm-blob")),
      };
      // Single capture, mouse only (touch is implicitly captured to its
      // target and bubbles up through here either way).
      if (e.pointerType === "mouse") {
        try {
          cardEl.setPointerCapture && cardEl.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    });

    function gestureMove(e) {
      if (!gesture || (e && e.pointerId !== undefined && e.pointerId !== gesture.id)) return;
      if (cardEl.scrollTop > 4) {
        abortGesture();
        return;
      }
      var dx = e.clientX - gesture.x0;
      var dy = e.clientY - gesture.y0;
      if (!gesture.mode) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal: only artwork drags become track swipes — anywhere
          // else the gesture belongs to nobody (a tap still works).
          if (!gesture.fromBlob) {
            gesture = null;
            return;
          }
          // A previous swipe may still be waiting for its track (art flown
          // out, timer pending). Swallowing the new drag here is exactly
          // the old "swipe again, nothing happens" bug — cancel the stale
          // wait and let this drag take over; commitSwipe replaces it.
          if (awaitingArt) {
            if (awaitingArt.timer) {
              try {
                window.clearTimeout(awaitingArt.timer);
              } catch (err2) {}
            }
            awaitingArt = null;
          }
          gesture.mode = "art";
          blob.classList.add("spm-dragging"); // follow finger 1:1, no lag
        } else {
          if (dy < 0) {
            gesture = null; // upward on the full card: not a dismiss
            return;
          }
          gesture.mode = "card";
          cardEl.classList.add("spm-card-drag");
        }
      }
      gesture.dx = dx;
      gesture.dy = dy;
      if (gesture.mode === "art") {
        var w = blobWidth();
        var clamped = Math.max(-w * 0.6, Math.min(w * 0.6, dx));
        blobPose(clamped, Math.max(0.25, 1 - Math.abs(clamped) / (w * 1.2)));
      } else {
        var h = cardHeight();
        var cy = Math.max(0, Math.min(h * 1.2, dy));
        cardEl.style.transform = "translateY(" + Math.round(cy) + "px)";
        cardEl.style.opacity = String(Math.max(0.35, 1 - cy / (h * 1.4 || 1)));
      }
    }

    cardEl.addEventListener("pointermove", gestureMove);
    // Window fallback: moves/ups that miss the card still resolve the same
    // gesture, so a lost capture can never glue anything to the cursor.
    window.addEventListener("pointermove", gestureMove, true);

    function gestureEnd(e) {
      if (!gesture || (e && e.pointerId !== undefined && e.pointerId !== gesture.id)) return;
      var g = gesture;
      gesture = null;
      blob.classList.remove("spm-dragging");
      cardEl.classList.remove("spm-card-drag");
      if (!g.mode) return; // tap: art and card stay exactly as they were
      if (g.mode === "art") {
        var dt = Math.max(1, nowMs() - g.t0);
        var vel = Math.abs(g.dx) / dt; // px per ms
        var th = Math.max(48, blobWidth() * 0.28);
        var adx = Math.abs(g.dx);
        // Touch slop, same as the mini: a quick, short slide on the cover
        // is a sloppy tap — snap home instead of skipping tracks. Deliberate
        // drags (slow or long) and mouse flicks are unaffected.
        if (e && e.pointerType === "touch" && dt < 150 && adx < 110) {
          blobRest();
        } else if (adx > th || (adx > th * 0.45 && vel > 0.5)) {
          commitSwipe(g.dx < 0 ? -1 : 1);
        } else {
          blobRest(); // CSS transition springs it home
        }
        return;
      }
      var cdt = Math.max(1, nowMs() - g.t0);
      var cvel = g.dy / cdt; // px per ms, downward positive
      var ch = cardHeight();
      // Willing commit: modest drags count, flings count more. (A tall
      // threshold felt "stuck": normal drags kept snapping back.)
      if (g.dy > Math.max(56, ch * 0.12) || (g.dy > 32 && cvel > 0.45)) {
        finishDragCollapse();
      } else {
        glideCardHome();
      }
    }

    cardEl.addEventListener("pointerup", gestureEnd);
    window.addEventListener("pointerup", gestureEnd, true);
    cardEl.addEventListener("pointercancel", abortGesture);
    window.addEventListener("pointercancel", abortGesture, true);
    cardEl.addEventListener("lostpointercapture", function (e) {
      // Capture released without an up: never leave a live gesture behind.
      // Real releases already cleared it via the window pointerup above,
      // so this only fires for the orphaned case.
      if (gesture && e && e.pointerId === gesture.id) abortGesture();
    });

    mini.addEventListener("pointerdown", function (e) {
      if (!collapsed || miniDrag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = e.target;
      if (t && t.closest && (t.closest("button") || t.closest(".spm-mini-progress"))) return; // let buttons + hairline work
      miniDrag = {
        id: e.pointerId,
        y0: e.clientY,
        x0: e.clientX,
        dx: 0,
        dy: 0,
        t0: nowMs(),
        locked: null,
      };
      try {
        mini.setPointerCapture && mini.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    mini.addEventListener("pointermove", function (e) {
      if (!miniDrag || e.pointerId !== miniDrag.id) return;
      var dx = e.clientX - miniDrag.x0;
      var dy = e.clientY - miniDrag.y0;
      if (!miniDrag.locked) {
        if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return;
        // First dominant axis wins: up expands, sideways changes tracks.
        miniDrag.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        mini.classList.add("spm-mdrag");
      }
      if (miniDrag.locked === "v") {
        miniDrag.dy = dy;
        // Upward only, resisted — a tactile hint that it lifts away.
        var pull = Math.max(-88, Math.min(0, dy * 0.35));
        mini.style.transform = "translateY(" + Math.round(pull) + "px)";
      } else {
        miniDrag.dx = dx;
        var w = 200;
        try {
          w = mini.getBoundingClientRect().width || 200;
        } catch (err2) {}
        var slide = Math.max(-72, Math.min(72, dx));
        mini.style.transform = "translateX(" + Math.round(slide) + "px)";
        mini.style.opacity = String(Math.max(0.45, 1 - Math.abs(slide) / (w * 0.9)));
      }
    });

    function miniEnd(e) {
      if (!miniDrag || (e && e.pointerId !== miniDrag.id)) return;
      var m = miniDrag;
      miniDrag = null;
      mini.classList.remove("spm-mdrag");
      mini.style.transform = "";
      mini.style.opacity = "";
      // Tap: open INSTANTLY on pointerup instead of waiting for the
      // browser's synthesized click (which touch tap-delay / slop can
      // delay or swallow — the old "sometimes two taps"). The click
      // handler stays as a fallback; it early-returns once expanded.
      if (!m.locked) {
        expandAnimated();
        return;
      }
      var dt = Math.max(1, nowMs() - m.t0);
      if (m.locked === "v") {
        var vel = -m.dy / dt; // upward velocity, px per ms
        if (m.dy < -90 || (m.dy < -45 && vel > 0.45)) {
          miniSuppressClick = true; // a swipe release may still fire click
          expandAnimated();
        }
        // Otherwise the cleared transform glides home via CSS transition.
      } else {
        // Horizontal drags intentionally do nothing (swipe-to-skip was
        // removed: it kept eating taps via accidental commits). Followed
        // the finger live above; snap back here. Quick, short slides are
        // sloppy taps — open at once; longer drags swallow their release
        // click so letting go doesn't unexpectedly open.
        var hadx = Math.abs(m.dx);
        if (e && e.pointerType === "touch" && dt < 150 && hadx < 110) {
          miniSuppressClick = false;
          expandAnimated();
        } else {
          miniSuppressClick = true;
        }
        // Pose was already cleared above; CSS glides it home.
      }
    }

    mini.addEventListener("pointerup", miniEnd);
    mini.addEventListener("pointercancel", function () {
      miniDrag = null;
      mini.classList.remove("spm-mdrag");
      mini.style.transform = "";
      mini.style.opacity = "";
    });

    /* ---------- Custom Devices bottom sheet ----------
     *
     * Presentation layer only: every device fact (names, current device,
     * selection) comes from the adapter, which owns ALL Spotify DOM work.
     * The sheet is a sibling of the card and never touches player state, so
     * closing it leaves the Now Playing screen exactly where it was.
     *
     * The adapter opens Spotify's own picker behind the scenes to read the
     * device list and to click a row for a real transfer; that picker stays
     * hidden for as long as it is needed, so the user only ever sees this
     * sheet.
     */
    var sheetOpen = false;
    var sheetTimer = 0;
    var sheetNoticeTimer = 0;
    var sheetDevices = [];
    var sheetStatus = "loading"; // loading | ready | empty | error
    var sheetPendingKey = "";
    var sheetPendingSince = 0; // >0 once the adapter gave up waiting (still in flight)
    var sheetPendingName = "";
    // If a transfer never shows up as current, stop pretending after this long.
    var SHEET_PENDING_MS = 15000;
    var sheetDrag = null;
    var sheetPull = null;
    var sheetLastLoad = 0;
    var sheetEmptyNote = false;
    var sheetListSig = "";

    // Fingerprint of the rendered list. A background refresh that finds the
    // same devices must not rebuild the DOM: that would drop focus and scroll
    // for no reason.
    function deviceListSig(list) {
      var parts = [];
      for (var i = 0; i < list.length; i++) {
        parts.push(
          [list[i].key, list[i].name, list[i].subtitle, list[i].isActive ? 1 : 0].join("~")
        );
      }
      return parts.join("|");
    }

    function deviceKeyOf(device) {
      if (!device) return "";
      return device.key || device.id || device.name || "";
    }

    function sheetHeight() {
      try {
        return sheetEl.getBoundingClientRect().height || 0;
      } catch (e) {
        return 0;
      }
    }

    function setSheetAnim(on) {
      sheetEl.classList.toggle("spm-dsheet-anim", !!on);
      backdropEl.classList.toggle("spm-dsheet-anim", !!on);
    }

    // offset: px the sheet sits below its resting position. dim: backdrop
    // opacity (undefined = back to the stylesheet value).
    function paintSheet(offset, dim) {
      sheetEl.style.transform = offset ? "translateY(" + Math.round(offset) + "px)" : "";
      backdropEl.style.opacity = dim === undefined ? "" : String(Math.max(0, Math.min(1, dim)));
    }

    function setSheetNotice(text) {
      if (!text) {
        if (!sheetNotice.hidden) sheetNotice.hidden = true;
        sheetNotice.textContent = "";
        return;
      }
      sheetNotice.textContent = text;
      sheetNotice.hidden = false;
      window.clearTimeout(sheetNoticeTimer);
      sheetNoticeTimer = window.setTimeout(function () {
        sheetNotice.hidden = true;
        sheetNotice.textContent = "";
      }, 4000);
    }

    function sheetRow(device) {
      var key = deviceKeyOf(device);
      var pending = !!sheetPendingKey && sheetPendingKey === key;
      var li = el("li", "spm-ditem", null);
      var btn = el("button", "spm-drow", null);
      btn.type = "button";
      var icon = el("span", "spm-dicon", null);
      if (device.icon) {
        try {
          icon.innerHTML = device.icon;
        } catch (e) {}
      }
      if (!icon.firstChild) icon.innerHTML = SVG.deviceRow;
      var text = el("span", "spm-dtext", null);
      var nameEl = el("span", "spm-dname", null);
      nameEl.textContent = device.name || "Unknown device";
      text.appendChild(nameEl);
      // Only real Spotify text is ever shown (a status line when Spotify has
      // one, otherwise nothing — device types are not invented).
      var subText = device.subtitle || device.type || "";
      if (subText) {
        var subEl = el("span", "spm-dsub", null);
        subEl.textContent = subText;
        text.appendChild(subEl);
      }
      var tail = el("span", "spm-dtail", null);
      if (pending) tail.innerHTML = SVG.spinner;
      else if (device.isActive) tail.innerHTML = SVG.check;
      btn.appendChild(icon);
      btn.appendChild(text);
      btn.appendChild(tail);
      btn.classList.toggle("spm-dactive", !!device.isActive);
      btn.classList.toggle("spm-dpending", pending);
      if (device.isActive) btn.setAttribute("aria-current", "true");
      btn.setAttribute(
        "aria-label",
        (device.isActive ? "Currently playing on " : "Connect to ") + (device.name || "device")
      );
      if (pending) {
        btn.setAttribute("aria-busy", "true");
        btn.disabled = true;
      }
      btn.addEventListener("click", function () {
        selectSheetDevice(device);
      });
      li.appendChild(btn);
      return li;
    }

    function sheetStatusBlock() {
      var wrap = el("div", "spm-dstatus", null);
      if (sheetStatus === "ready") {
        // Only ever shown under the current-device row, in Spotify's words.
        var none = el("p", "spm-dmsg", null);
        none.textContent = "No other devices found";
        wrap.appendChild(none);
        return wrap;
      }
      if (sheetStatus === "loading") {
        var spin = el("span", "spm-dspin", SVG.spinner);
        wrap.appendChild(spin);
        var loading = el("p", "spm-dmsg", null);
        loading.textContent = "Loading devices…";
        wrap.appendChild(loading);
        return wrap;
      }
      if (sheetStatus === "error") {
        var err = el("p", "spm-dmsg", null);
        err.textContent = "Couldn't load devices";
        wrap.appendChild(err);
        var retry = el("button", "spm-dghost spm-dretry", null);
        retry.type = "button";
        retry.textContent = "Try again";
        retry.addEventListener("click", function () {
          loadSheetDevices(true);
        });
        wrap.appendChild(retry);
        return wrap;
      }
      var empty = el("p", "spm-dmsg", null);
      empty.textContent = "No available devices";
      wrap.appendChild(empty);
      return wrap;
    }

    function renderSheet() {
      while (sheetList.firstChild) sheetList.removeChild(sheetList.firstChild);
      var showList = sheetStatus === "ready" && sheetDevices.length > 0;
      // The list can be one row (the current device) with nothing else around;
      // that reads as "only my device", so the empty line is shown beneath it.
      var showNote = showList && sheetEmptyNote;
      sheetList.hidden = !showList;
      // The status block is for everything that is NOT a plain list: with no
      // list at all (loading / error / no devices) it must be visible, and with
      // a list it only appears for the "no other devices" line underneath it.
      sheetState.hidden = showList && !showNote;
      if (showList) {
        for (var i = 0; i < sheetDevices.length; i++) {
          sheetList.appendChild(sheetRow(sheetDevices[i]));
        }
        if (!showNote) return;
      }
      while (sheetState.firstChild) sheetState.removeChild(sheetState.firstChild);
      sheetState.appendChild(sheetStatusBlock());
    }

    function applyDeviceList(list) {
      var info = null;
      try {
        info = spotify.getDevicesState ? spotify.getDevicesState() : null;
      } catch (e) {
        info = null;
      }
      var wasPending = sheetPendingKey;
      sheetDevices = list || [];
      // A pending transfer is settled by the list itself: the moment Spotify
      // shows that device as current the spinner and the soft notice go away;
      // if it never arrives, admit it instead of spinning forever.
      if (sheetPendingKey) {
        var pendingActive = false;
        for (var p = 0; p < sheetDevices.length; p++) {
          var pd = sheetDevices[p];
          if (!pd || !pd.isActive) continue;
          // The device we switched to comes back as Spotify's current-device
          // row, whose key is the picker header — not the id we clicked — so
          // the name is the reliable second signal.
          if (
            (sheetPendingKey && deviceKeyOf(pd) === sheetPendingKey) ||
            (sheetPendingName && pd.name === sheetPendingName)
          ) {
            pendingActive = true;
          }
        }
        if (pendingActive) {
          sheetPendingKey = "";
          sheetPendingSince = 0;
          setSheetNotice("");
        } else if (sheetPendingSince && nowMs() - sheetPendingSince > SHEET_PENDING_MS) {
          var stuck = sheetPendingName || "that device";
          sheetPendingKey = "";
          sheetPendingSince = 0;
          setSheetNotice("Couldn't switch to " + stuck + ".");
        }
      }
      var others = 0;
      for (var i = 0; i < sheetDevices.length; i++) {
        if (!sheetDevices[i].isActive) others++;
      }
      var failed = !!(info && info.ok === false);
      var wasStatus = sheetStatus;
      var wasNote = sheetEmptyNote;
      sheetEmptyNote = !failed && !others && sheetDevices.length > 0;
      if (failed && sheetDevices.length) {
        // A stale list still beats an empty sheet, but say so plainly.
        setSheetNotice("Couldn't refresh devices.");
      } else if (sheetNotice.textContent === "Couldn't refresh devices.") {
        setSheetNotice("");
      }
      if (failed && !sheetDevices.length) sheetStatus = "error";
      else sheetStatus = sheetDevices.length ? "ready" : "empty";
      var sig = deviceListSig(sheetDevices);
      var changed = sig !== sheetListSig;
      sheetListSig = sig;
      if (
        changed ||
        wasStatus !== sheetStatus ||
        wasNote !== sheetEmptyNote ||
        wasPending !== sheetPendingKey
      ) {
        renderSheet();
      }
    }

    // Cached list paints instantly; the fresh read follows (opening the hidden
    // native picker once). No polling: this runs on open, on retry, and on a
    // throttled device-relevant snapshot beat while the sheet is visible.
    function loadSheetDevices(force) {
      if (sheetLoadTimer) {
        window.clearTimeout(sheetLoadTimer);
        sheetLoadTimer = 0;
      }
      sheetLastLoad = nowMs();
      var cached = [];
      try {
        cached = spotify.getCachedDevices ? spotify.getCachedDevices() : [];
      } catch (e) {
        cached = [];
      }
      // The cached paint is change-aware: an unchanged background refresh must
      // not rip rows out from under the user's finger (focus/scroll stay put).
      if (cached && cached.length) {
        applyDeviceList(cached);
      } else if (sheetStatus !== "loading") {
        sheetDevices = [];
        sheetStatus = "loading";
        sheetListSig = deviceListSig(sheetDevices);
        renderSheet();
      }
      var promise = null;
      try {
        promise = force && spotify.refreshDevices ? spotify.refreshDevices() : spotify.getDevices();
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        if (!cached.length) {
          sheetStatus = "error";
          renderSheet();
        }
        return;
      }
      promise
        .then(function (list) {
          if (!sheetOpen) return;
          applyDeviceList(list);
        })
        .catch(function () {
          if (!sheetOpen) return;
          if (!sheetDevices.length) {
            sheetStatus = "error";
            renderSheet();
          }
        });
    }

    function selectSheetDevice(device) {
      if (!device || sheetPendingKey) return;
      sheetPendingKey = deviceKeyOf(device);
      sheetPendingSince = 0; // 0 = the adapter is still working on it
      sheetPendingName = device.name || "that device";
      renderSheet();
      var promise = null;
      try {
        promise = spotify.selectDevice(device);
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        sheetPendingKey = "";
        renderSheet();
        setSheetNotice("Couldn't switch devices right now.");
        return;
      }
      promise
        .then(function (res) {
          if (!sheetOpen) {
            sheetPendingKey = "";
            sheetPendingSince = 0;
            return;
          }
          var hadPending = !!sheetPendingKey;
          var list = res && res.devices && res.devices.length ? res.devices : null;
          if (res && res.ok) {
            sheetPendingKey = "";
            sheetPendingSince = 0;
            setSheetNotice("");
          } else if (res && res.reason === "unconfirmed") {
            // Spotify is still handing playback over (a sleeping speaker can
            // take seconds). Keep the row pending and say so plainly — the
            // list itself settles it, so a slow-but-successful switch is never
            // reported as a failure.
            sheetPendingSince = nowMs();
            setSheetNotice("Still connecting to " + (device.name || "that device") + "…");
          } else {
            sheetPendingKey = "";
            sheetPendingSince = 0;
            setSheetNotice("Couldn't switch to " + (device.name || "that device") + ".");
          }
          if (list) applyDeviceList(list);
          else renderSheet();
          // A definitive rejection ends the pending state right here (the list
          // reconciliation only watches for a device *becoming* current), so
          // repaint the row out of its spinner explicitly.
          if (hadPending && !sheetPendingKey) renderSheet();
        })
        .catch(function () {
          sheetPendingKey = "";
          sheetPendingSince = 0;
          if (!sheetOpen) return;
          renderSheet();
          setSheetNotice("Couldn't switch to " + (device.name || "that device") + ".");
        });
    }

    function beginSheet() {
      if (sheetOpen) return;
      try {
        if (typeof closePSheet === "function") closePSheet();
      } catch (e) {}
      sheetOpen = true;
      root.classList.add("spm-dsheet-open");
      sheetEl.hidden = false;
      backdropEl.hidden = false;
      try {
        cardEl.setAttribute("aria-hidden", "true");
        mini.setAttribute("aria-hidden", "true");
      } catch (e) {}
      sheetDevices = [];
      sheetStatus = "loading";
      sheetPendingKey = "";
      sheetPendingSince = 0;
      sheetPendingName = "";
      sheetEmptyNote = false;
      sheetListSig = "";
      setSheetNotice("");
      renderSheet();
      // Read AFTER the slide lands: opening Spotify's own panel to read it is
      // main-thread work, and doing it mid-animation made the open stutter. The
      // cached list painted above is already on screen in the meantime.
      // Claim the load slot too, or the first snapshot render sees a stale
      // `sheetLastLoad` and fires the read mid-slide anyway.
      sheetLastLoad = nowMs();
      if (sheetLoadTimer) window.clearTimeout(sheetLoadTimer);
      sheetLoadTimer = window.setTimeout(function () {
        sheetLoadTimer = 0;
        if (sheetOpen) loadSheetDevices(false);
      }, 260);
      // The card may be mid-gesture when the sheet opens: drop it so the two
      // can never fight over the same pointer.
      try {
        abortGesture();
      } catch (e) {}
    }

    function finishSheetOpen() {
      try {
        sheetClose.focus({ preventScroll: true });
      } catch (e) {}
    }

    function glideSheetHome() {
      if (prefersReducedMotion()) {
        setSheetAnim(false);
        paintSheet(0);
        return;
      }
      setSheetAnim(true);
      var raf = window.requestAnimationFrame || function (fn) {
        return window.setTimeout(fn, 16);
      };
      raf(function () {
        paintSheet(0);
      });
    }

    function openSheet() {
      if (sheetOpen) return;
      beginSheet();
      if (prefersReducedMotion()) {
        setSheetAnim(false);
        paintSheet(0);
        finishSheetOpen();
        return;
      }
      setSheetAnim(false);
      paintSheet(sheetHeight() || 320, 0);
      void sheetEl.offsetHeight; // land the start pose before animating
      glideSheetHome();
      window.clearTimeout(sheetTimer);
      sheetTimer = window.setTimeout(finishSheetOpen, 300);
    }

    function hideSheetNow() {
      sheetEl.hidden = true;
      backdropEl.hidden = true;
      setSheetAnim(false);
      paintSheet(0);
      try {
        devicesBtn.focus({ preventScroll: true });
      } catch (e) {}
      // The environment was frozen while the sheet was up (see
      // applyEnvironment) — re-read it now that the glass is ours again, from
      // a fresh sample so a stale one can't masquerade as "agreed".
      envSample = null;
      scheduleEnvironment();
    }

    function closeSheet() {
      if (!sheetOpen) return;
      sheetOpen = false;
      sheetDrag = null;
      sheetPull = null;
      root.classList.remove("spm-dsheet-open");
      try {
        cardEl.removeAttribute("aria-hidden");
        mini.removeAttribute("aria-hidden");
      } catch (e) {}
      // If Spotify's picker is somehow still up (e.g. a read was interrupted),
      // take it down so a native popup never lingers behind our UI.
      try {
        if (spotify.isDevicePickerOpen && spotify.isDevicePickerOpen() && spotify.closeDevices) {
          spotify.closeDevices();
        }
      } catch (e) {}
      if (prefersReducedMotion()) {
        hideSheetNow();
        return;
      }
      setSheetAnim(true);
      paintSheet(sheetHeight() || 320, 0);
      window.clearTimeout(sheetTimer);
      sheetTimer = window.setTimeout(hideSheetNow, 280);
    }

    // --- drag: the sheet follows the finger, then commits or snaps back ---
    function sheetDragStart(e) {
      if (!sheetOpen || sheetDrag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      sheetDrag = {
        id: e.pointerId,
        y0: e.clientY,
        dy: 0,
        t0: nowMs(),
        lastY: e.clientY,
        lastT: nowMs(),
        vel: 0,
      };
      setSheetAnim(false); // direct manipulation: no transition while dragging
      try {
        sheetEl.setPointerCapture && sheetEl.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.cancelable) e.preventDefault();
    }

    function sheetDragMove(e) {
      if (!sheetDrag || e.pointerId !== sheetDrag.id) return;
      var dy = e.clientY - sheetDrag.y0;
      var t = nowMs();
      // Live (per-move) velocity, so a drag that stops before release is not
      // mistaken for a flick.
      sheetDrag.vel = (e.clientY - sheetDrag.lastY) / Math.max(1, t - sheetDrag.lastT);
      sheetDrag.dy = dy;
      sheetDrag.lastY = e.clientY;
      sheetDrag.lastT = t;
      var h = Math.max(160, sheetHeight());
      // Downward tracks the finger 1:1; upward gets a short rubber band (the
      // sheet is already fully open).
      var offset = dy > 0 ? Math.min(dy, h) : Math.max(dy * 0.22, -36);
      paintSheet(offset, Math.max(0.15, 1 - Math.max(0, offset) / h));
      if (e.cancelable) e.preventDefault();
    }

    function sheetDragEnd(e) {
      if (!sheetDrag) return;
      if (e && e.pointerId !== undefined && e.pointerId !== sheetDrag.id) return;
      var d = sheetDrag;
      sheetDrag = null;
      var h = Math.max(160, sheetHeight());
      // Only a flick that was still moving when released counts as velocity.
      var stalled = nowMs() - d.lastT > 140;
      var vel = stalled ? 0 : d.vel; // px per ms, downward positive
      if (d.dy > Math.max(64, h * 0.22) || (d.dy > 36 && vel > 0.6)) {
        closeSheet();
        return;
      }
      glideSheetHome();
    }

    // --- swipe up from the bottom edge of the player to open the sheet ---
    function pullStart(e) {
      if (sheetOpen || sheetPull || collapsed) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = e.target;
      if (
        t &&
        t.closest &&
        t.closest("button, a, input, select, textarea, [role='slider'], .spm-bar, .spm-vol-bar, .spm-blob")
      ) {
        return;
      }
      var vh = window.innerHeight || 0;
      if (vh && e.clientY < vh - 64) return; // only from the bottom edge strip
      sheetPull = {
        id: e.pointerId,
        y0: e.clientY,
        dy: 0,
        t0: nowMs(),
        armed: false,
      };
    }

    function pullMove(e) {
      if (!sheetPull || e.pointerId !== sheetPull.id) return;
      var dy = e.clientY - sheetPull.y0;
      sheetPull.dy = dy;
      if (!sheetPull.armed) {
        if (dy > 14) {
          sheetPull = null; // downward: not a pull, let the card have it
          return;
        }
        if (dy > -16) return;
        sheetPull.armed = true;
        beginSheet();
        setSheetAnim(false);
      }
      var h = Math.max(180, sheetHeight());
      var offset = Math.max(0, Math.min(h, h + dy));
      paintSheet(offset, 1 - offset / h);
      if (e.cancelable) e.preventDefault();
    }

    function pullEnd(e) {
      if (!sheetPull) return;
      if (e && e.pointerId !== undefined && e.pointerId !== sheetPull.id) return;
      var p = sheetPull;
      sheetPull = null;
      if (!p.armed) return;
      var dt = Math.max(1, nowMs() - p.t0);
      var up = -p.dy;
      var vel = up / dt;
      if (up > 64 || (up > 28 && vel > 0.45)) {
        glideSheetHome();
        window.clearTimeout(sheetTimer);
        sheetTimer = window.setTimeout(finishSheetOpen, 300);
      } else {
        closeSheet();
      }
    }

    // Open on the press-release, not on the browser's synthesised click: on
    // touch a tap only reaches `click` when nothing ate it first (touch-action,
    // scroll slop, a cancelled pointer), which is why tapping Devices felt
    // random while holding it worked. The click listener stays for
    // keyboard/assistive input; `openSheet()` is idempotent, so a tap that
    // delivers both never double-toggles.
    devicesBtn.addEventListener("pointerup", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      openSheet();
    });
    devicesBtn.addEventListener("click", function () {
      openSheet();
    });
    sheetClose.addEventListener("click", function () {
      closeSheet();
    });
    backdropEl.addEventListener("click", function () {
      closeSheet();
    });
    grabEl.addEventListener("pointerdown", sheetDragStart);
    sheetHead.addEventListener("pointerdown", sheetDragStart);
    cardEl.addEventListener("pointerdown", pullStart);
    window.addEventListener("pointermove", pullMove, true);
    window.addEventListener("pointerup", pullEnd, true);
    window.addEventListener("pointercancel", function (e) {
      if (sheetPull && e && e.pointerId === sheetPull.id) sheetPull = null;
    }, true);
    window.addEventListener("pointermove", sheetDragMove, true);
    window.addEventListener("pointerup", sheetDragEnd, true);
    window.addEventListener("pointercancel", function () {
      if (sheetDrag) glideSheetHome();
      sheetDrag = null;
    }, true);
    document.addEventListener("keydown", function (e) {
      // Adapter-synthesized menu dismissals (marked) are not the user.
      if (e && e.__spmSynthetic) return;
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (psheetOpen) {
        e.preventDefault();
        closePSheet();
        return;
      }
      if (!sheetOpen) return;
      e.preventDefault();
      closeSheet();
    });

    /* ---------- Custom Save / Add-to-Playlist bottom sheet ----------
     *
     * Presentation layer only: every playlist fact (names, artwork,
     * membership) comes from the adapter, which owns ALL Spotify DOM work
     * (curation sheet first, tippy menus + Your Library as fallback). The
     * sheet never queries Spotify's DOM.
     *
     * Spotify stays the source of truth, and the sheet mimics Spotify's own
     * draft semantics exactly: row taps only STAGE checks locally; Done
     * diffs the draft against the server state loaded at open and applies
     * every change through Spotify's real rows in one commit; Cancel (or
     * backdrop / swipe / Escape) discards the draft untouched.
     *
     * Opens from the hearts (saved tracks only — unsaved hearts Like
     * instead, mirroring Spotify's button order).
     *
     * Refresh is event-driven (open, track change, like change, user action)
     * — deliberately NO timer: opening Spotify's UI steals focus, so
     * background polling would fight the user.
     */
    var psheetOpen = false;
    var psheetTimer = 0;
    var psheetNoticeTimer = 0;
    var psheetLoadTimer = 0;
    var psheetList = [];
    var psheetStatus = "loading"; // loading | ready | empty | error
    var psheetTrackKey = "";
    var psheetSearch = "";
    var psheetListSig = "";
    var psheetDrag = null;
    var psheetLastLoad = 0;
    // Draft staging (mirrors Spotify's Done/Cancel): initial = server truth
    // at open, draft = staged checks by playlist key, dirty = user staged
    // anything, saving = commit in flight.
    var psheetInitial = [];
    var psheetDraft = {};
    var psheetDirty = false;
    var psheetSaving = false;

    function ptrackKeyOf(snap) {
      if (!snap) return "";
      return (snap.track || "") + " | " + (snap.artist || "");
    }

    function pkeyOf(p) {
      if (!p) return "";
      if (p.id) return "id:" + p.id;
      return "name:" + String(p.name || "").toLowerCase();
    }

    function plistSig(list) {
      var parts = [];
      for (var i = 0; i < list.length; i++) {
        parts.push(
          [pkeyOf(list[i]), list[i].name, list[i].containsTrack ? 1 : 0].join("~")
        );
      }
      return parts.join("|");
    }

    function psheetHeight() {
      try {
        return psheetEl.getBoundingClientRect().height || 0;
      } catch (e) {
        return 0;
      }
    }

    function setPSheetAnim(on) {
      psheetEl.classList.toggle("spm-psheet-anim", !!on);
      pbackdropEl.classList.toggle("spm-psheet-anim", !!on);
    }

    function paintPSheet(offset, dim) {
      psheetEl.style.transform = offset ? "translateY(" + Math.round(offset) + "px)" : "";
      pbackdropEl.style.opacity = dim === undefined ? "" : String(Math.max(0, Math.min(1, dim)));
    }

    function setPSheetNotice(text) {
      if (!text) {
        if (!psheetNotice.hidden) psheetNotice.hidden = true;
        psheetNotice.textContent = "";
        return;
      }
      psheetNotice.textContent = text;
      psheetNotice.hidden = false;
      window.clearTimeout(psheetNoticeTimer);
      psheetNoticeTimer = window.setTimeout(function () {
        psheetNotice.hidden = true;
        psheetNotice.textContent = "";
      }, 4000);
    }

    function psheetFiltered() {
      var s = (psheetSearch || "").toLowerCase().trim();
      if (!s) return psheetList;
      var out = [];
      for (var i = 0; i < psheetList.length; i++) {
        if (String(psheetList[i].name || "").toLowerCase().indexOf(s) !== -1) out.push(psheetList[i]);
      }
      return out;
    }

    // Draft helpers: staged checks by playlist key. Absent key = server
    // value (nothing staged for that row yet).
    function pdraftOf(p) {
      var key = pkeyOf(p);
      if (Object.prototype.hasOwnProperty.call(psheetDraft, key)) {
        return !!psheetDraft[key];
      }
      return !!p.containsTrack;
    }

    function paintPsheetFoot() {
      try {
        psheetDoneBtn.disabled = !!psheetSaving;
        psheetCancelBtn.disabled = !!psheetSaving;
        psheetDoneBtn.classList.toggle("spm-psaving", !!psheetSaving);
        psheetDoneBtn.innerHTML = psheetSaving ? SVG.spinner : "Done";
      } catch (e) {}
    }

    function psheetRow(p) {
      var key = pkeyOf(p);
      var staged = pdraftOf(p);
      var li = el("li", "spm-pitem", null);
      if (p.isLikedSongs) li.classList.add("spm-liked-row");
      var btn = el("button", "spm-prow", null);
      btn.type = "button";
      var icon = el("span", "spm-picon", null);
      var artUrl = p.artwork || "";
      if (p.isLikedSongs) {
        icon.innerHTML = SVG.heartFill;
        icon.classList.add("spm-liked-icon");
      } else if (artUrl) {
        var img = document.createElement("img");
        img.className = "spm-part";
        img.alt = "";
        img.draggable = false;
        img.src = artUrl;
        img.addEventListener("error", function () {
          try {
            icon.innerHTML = SVG.playlistRow;
          } catch (e) {}
        });
        icon.appendChild(img);
      } else {
        icon.innerHTML = SVG.playlistRow;
      }
      var text = el("span", "spm-ptext", null);
      var nameEl = el("span", "spm-pname", null);
      nameEl.textContent = p.name || "Unknown playlist";
      text.appendChild(nameEl);
      var subEl = el("span", "spm-psub", null);
      subEl.textContent = p.isLikedSongs ? "Liked Songs" : (p.subtitle || "Playlist");
      text.appendChild(subEl);
      var tail = el("span", "spm-ptail", null);
      if (staged) tail.innerHTML = SVG.check;
      btn.appendChild(icon);
      btn.appendChild(text);
      btn.appendChild(tail);
      btn.classList.toggle("spm-pactive", !!staged);
      if (staged) btn.setAttribute("aria-pressed", "true");
      else btn.setAttribute("aria-pressed", "false");
      btn.setAttribute(
        "aria-label",
        (p.isLikedSongs
          ? (staged ? "Remove from Liked Songs: " : "Add to Liked Songs: ")
          : (staged ? "Remove from " : "Add to ")) + (p.name || "playlist")
      );
      if (psheetSaving) btn.disabled = true;
      btn.addEventListener("click", function () {
        if (psheetSaving) return;
        psheetDraft[key] = !staged;
        psheetDirty = true;
        renderPSheet();
      });
      li.appendChild(btn);
      return li;
    }

    function psheetStatusBlock() {
      var wrap = el("div", "spm-pstatus", null);
      if (psheetStatus === "loading") {
        var spin = el("span", "spm-pspin", SVG.spinner);
        wrap.appendChild(spin);
        var loading = el("p", "spm-pmsg", null);
        loading.textContent = "Loading playlists...";
        wrap.appendChild(loading);
        return wrap;
      }
      if (psheetStatus === "error") {
        var err = el("p", "spm-pmsg", null);
        err.textContent = "Couldn't load playlists";
        wrap.appendChild(err);
        var retry = el("button", "spm-pretry", null);
        retry.type = "button";
        retry.textContent = "Try again";
        retry.addEventListener("click", function () {
          loadPSheetPlaylists(true);
        });
        wrap.appendChild(retry);
        return wrap;
      }
      var msg = el("p", "spm-pmsg", null);
      var s = (psheetSearch || "").trim();
      if (psheetStatus === "empty") {
        msg.textContent = "No playlists found.";
      } else if (s) {
        msg.textContent = 'No playlists match "' + s + '".';
      } else {
        msg.textContent = "No playlists found.";
      }
      wrap.appendChild(msg);
      return wrap;
    }

    function renderPSheet() {
      while (psheetListEl.firstChild) psheetListEl.removeChild(psheetListEl.firstChild);
      var rows = psheetFiltered();
      var showList = psheetStatus === "ready" && rows.length > 0;
      psheetListEl.hidden = !showList;
      // Liked-only list reads as "only Liked": show Spotify's empty line
      // beneath it (same pattern as Devices' "No other devices found").
      var s = (psheetSearch || "").trim();
      var likedOnly = showList && !s && rows.length === 1 && rows[0].isLikedSongs;
      psheetState.hidden = showList && !likedOnly ? true : false;
      if (showList) {
        for (var i = 0; i < rows.length; i++) {
          psheetListEl.appendChild(psheetRow(rows[i]));
        }
        if (!likedOnly) return;
      }
      while (psheetState.firstChild) psheetState.removeChild(psheetState.firstChild);
      if (likedOnly) {
        var wrap = el("div", "spm-pstatus", null);
        var none = el("p", "spm-pmsg", null);
        none.textContent = "No other playlists found";
        wrap.appendChild(none);
        psheetState.appendChild(wrap);
        return;
      }
      psheetState.appendChild(psheetStatusBlock());
    }

    function applyPsheetList(list, statusHint) {
      psheetList = list || [];
      if (statusHint) {
        psheetStatus = statusHint;
      } else if (!psheetList.length) {
        psheetStatus = "empty";
      } else {
        psheetStatus = "ready";
      }
      // Fresh server truth resets the draft (open, retry, track change).
      psheetInitial = psheetList;
      psheetDraft = {};
      psheetDirty = false;
      psheetSaving = false;
      paintPsheetFoot();
      var sig = plistSig(psheetFiltered()) + "|" + psheetStatus + "|" + pdraftSig();
      if (sig !== psheetListSig) {
        psheetListSig = sig;
        renderPSheet();
      }
    }

    function pdraftSig() {
      var keys = [];
      for (var k in psheetDraft) {
        if (Object.prototype.hasOwnProperty.call(psheetDraft, k)) {
          keys.push(k + "=" + (psheetDraft[k] ? 1 : 0));
        }
      }
      keys.sort();
      return keys.join(",");
    }

    // Draft changes vs the server truth loaded at open.
    function pdraftChanges() {
      var out = [];
      for (var i = 0; i < psheetList.length; i++) {
        var p = psheetList[i];
        var key = pkeyOf(p);
        if (!Object.prototype.hasOwnProperty.call(psheetDraft, key)) continue;
        var want = !!psheetDraft[key];
        if (want === !!p.containsTrack) continue;
        out.push({
          uri: p.uri || "",
          id: p.id || "",
          name: p.name || "",
          isLikedSongs: !!p.isLikedSongs,
          want: want,
        });
      }
      return out;
    }

    // Cached paint instantly, then ONE fresh read (hidden menus, deferred
    // until the slide lands so the open never stutters — same as Devices).
    function loadPSheetPlaylists(force) {
      if (psheetLoadTimer) {
        window.clearTimeout(psheetLoadTimer);
        psheetLoadTimer = 0;
      }
      psheetLastLoad = nowMs();
      var cached = [];
      try {
        cached = spotify.getCachedPlaylists ? spotify.getCachedPlaylists() : [];
      } catch (e) {
        cached = [];
      }
      if (cached && cached.length && !force) {
        applyPsheetList(cached);
      } else if (psheetStatus !== "loading" || force) {
        if (!cached.length) {
          psheetStatus = "loading";
          renderPSheet();
        }
      }
      var promise = null;
      try {
        promise = force && spotify.refreshPlaylists ? spotify.refreshPlaylists() : spotify.getPlaylists();
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        if (!cached.length) {
          psheetStatus = "error";
          renderPSheet();
        }
        return;
      }
      promise
        .then(function (list) {
          if (!psheetOpen) return;
          if (list && list.length) {
            applyPsheetList(list);
          } else if (!psheetList.length) {
            var st = null;
            try {
              st = spotify.getPlaylistsState ? spotify.getPlaylistsState() : null;
            } catch (e) {}
            if (st && st.ok === false) {
              psheetStatus = "error";
              renderPSheet();
            } else {
              applyPsheetList([], "empty");
            }
          }
        })
        .catch(function () {
          if (!psheetOpen) return;
          if (!psheetList.length) {
            psheetStatus = "error";
            renderPSheet();
          } else {
            setPSheetNotice("Couldn't refresh playlists.");
          }
        });
    }

    // Done: diff the draft against server truth and commit every change
    // through Spotify's real rows in one batch (mirrors their Done). Cancel
    // just closes — the draft evaporates.
    function savePsheetDraft() {
      if (!psheetOpen || psheetSaving) return;
      var changes = pdraftChanges();
      if (!changes.length) {
        closePSheet();
        return;
      }
      if (!spotify.savePlaylistDraft) {
        setPSheetNotice("Couldn't update playlists right now.");
        return;
      }
      psheetSaving = true;
      paintPsheetFoot();
      renderPSheet();
      var promise = null;
      try {
        promise = spotify.savePlaylistDraft(changes);
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        psheetSaving = false;
        paintPsheetFoot();
        renderPSheet();
        setPSheetNotice("Couldn't update playlists. Try again.");
        return;
      }
      promise
        .then(function (res) {
          if (!psheetOpen) {
            psheetSaving = false;
            return;
          }
          if (res && res.ok) {
            psheetSaving = false;
            if (res.list) applyPsheetList(res.list);
            closePSheet();
            return;
          }
          // Partial/total failure: stay open on the true state so the user
          // can retry; the heart follows via snapshot either way.
          psheetSaving = false;
          var names = res && res.failed && res.failed.length ? res.failed.join(", ") : "";
          setPSheetNotice(
            names ? "Couldn't update " + names + "." : "Couldn't update playlists. Try again."
          );
          loadPSheetPlaylists(true);
        })
        .catch(function () {
          if (!psheetOpen) {
            psheetSaving = false;
            return;
          }
          psheetSaving = false;
          paintPsheetFoot();
          renderPSheet();
          setPSheetNotice("Couldn't update playlists. Try again.");
        });
    }

    function syncPsheetWithSnap(snap) {
      if (!psheetOpen || !snap) return;
      var key = ptrackKeyOf(snap);
      // Track changed under the open sheet: never show Track A's membership
      // for Track B — reload fresh for the new track (draft is discarded,
      // keeps the search text).
      if (key !== psheetTrackKey) {
        psheetTrackKey = key;
        psheetStatus = "loading";
        renderPSheet();
        loadPSheetPlaylists(true);
        return;
      }
      // Like flipped externally (heart or Spotify itself): mirror it in the
      // server row; the draft follows only while pristine, so staged checks
      // are never clobbered mid-edit.
      var changed = false;
      for (var i = 0; i < psheetList.length; i++) {
        if (psheetList[i].isLikedSongs && !!psheetList[i].containsTrack !== !!snap.liked) {
          psheetList[i].containsTrack = !!snap.liked;
          if (!psheetDirty) {
            try {
              delete psheetDraft[pkeyOf(psheetList[i])];
            } catch (e) {}
          }
          changed = true;
        }
      }
      if (changed) {
        psheetListSig = "";
        renderPSheet();
      }
    }

    function beginPSheet() {
      if (psheetOpen) return;
      // Only one sheet at a time: Devices yields to Save and vice versa.
      try {
        if (typeof closeSheet === "function") closeSheet();
      } catch (e) {}
      psheetOpen = true;
      root.classList.add("spm-psheet-open");
      psheetEl.hidden = false;
      pbackdropEl.hidden = false;
      try {
        cardEl.setAttribute("aria-hidden", "true");
        mini.setAttribute("aria-hidden", "true");
      } catch (e) {}
      psheetList = [];
      psheetStatus = "loading";
      psheetListSig = "";
      psheetInitial = [];
      psheetDraft = {};
      psheetDirty = false;
      psheetSaving = false;
      paintPsheetFoot();
      psheetSearch = "";
      try {
        if (psheetSearchInput) psheetSearchInput.value = "";
      } catch (e) {}
      try {
        psheetTrackKey = lastSnap ? ptrackKeyOf(lastSnap) : "";
      } catch (e) {
        psheetTrackKey = "";
      }
      setPSheetNotice("");
      renderPSheet();
      psheetLastLoad = nowMs();
      if (psheetLoadTimer) window.clearTimeout(psheetLoadTimer);
      psheetLoadTimer = window.setTimeout(function () {
        psheetLoadTimer = 0;
        if (psheetOpen) loadPSheetPlaylists(false);
      }, 260);
      try {
        abortGesture();
      } catch (e) {}
    }

    function finishPSheetOpen() {
      try {
        psheetClose.focus({ preventScroll: true });
      } catch (e) {}
    }

    function glidePSheetHome() {
      if (prefersReducedMotion()) {
        setPSheetAnim(false);
        paintPSheet(0);
        return;
      }
      setPSheetAnim(true);
      var raf = window.requestAnimationFrame || function (fn) {
        return window.setTimeout(fn, 16);
      };
      raf(function () {
        paintPSheet(0);
      });
    }

    function openPSheet() {
      if (psheetOpen) return;
      beginPSheet();
      if (prefersReducedMotion()) {
        setPSheetAnim(false);
        paintPSheet(0);
        finishPSheetOpen();
        return;
      }
      setPSheetAnim(false);
      paintPSheet(psheetHeight() || 320, 0);
      void psheetEl.offsetHeight;
      glidePSheetHome();
      window.clearTimeout(psheetTimer);
      psheetTimer = window.setTimeout(finishPSheetOpen, 300);
    }

    function hidePSheetNow() {
      psheetEl.hidden = true;
      pbackdropEl.hidden = true;
      setPSheetAnim(false);
      paintPSheet(0);
      try {
        likeBtn.focus({ preventScroll: true });
      } catch (e) {}
      envSample = null;
      scheduleEnvironment();
    }

    function closePSheet() {
      if (!psheetOpen) return;
      psheetOpen = false;
      psheetDrag = null;
      root.classList.remove("spm-psheet-open");
      try {
        cardEl.removeAttribute("aria-hidden");
        mini.removeAttribute("aria-hidden");
      } catch (e) {}
      if (prefersReducedMotion()) {
        hidePSheetNow();
        return;
      }
      setPSheetAnim(true);
      paintPSheet(psheetHeight() || 320, 0);
      window.clearTimeout(psheetTimer);
      psheetTimer = window.setTimeout(hidePSheetNow, 280);
    }

    function psheetDragStart(e) {
      if (!psheetOpen || psheetDrag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      psheetDrag = {
        id: e.pointerId,
        y0: e.clientY,
        dy: 0,
        t0: nowMs(),
        lastY: e.clientY,
        lastT: nowMs(),
        vel: 0,
      };
      setPSheetAnim(false);
      try {
        psheetEl.setPointerCapture && psheetEl.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.cancelable) e.preventDefault();
    }

    function psheetDragMove(e) {
      if (!psheetDrag || e.pointerId !== psheetDrag.id) return;
      var dy = e.clientY - psheetDrag.y0;
      var t = nowMs();
      psheetDrag.vel = (e.clientY - psheetDrag.lastY) / Math.max(1, t - psheetDrag.lastT);
      psheetDrag.dy = dy;
      psheetDrag.lastY = e.clientY;
      psheetDrag.lastT = t;
      var h = Math.max(160, psheetHeight());
      var offset = dy > 0 ? Math.min(dy, h) : Math.max(dy * 0.22, -36);
      paintPSheet(offset, Math.max(0.15, 1 - Math.max(0, offset) / h));
      if (e.cancelable) e.preventDefault();
    }

    function psheetDragEnd(e) {
      if (!psheetDrag) return;
      if (e && e.pointerId !== undefined && e.pointerId !== psheetDrag.id) return;
      var d = psheetDrag;
      psheetDrag = null;
      var h = Math.max(160, psheetHeight());
      var stalled = nowMs() - d.lastT > 140;
      var vel = stalled ? 0 : d.vel;
      if (d.dy > Math.max(64, h * 0.22) || (d.dy > 36 && vel > 0.6)) {
        closePSheet();
        return;
      }
      glidePSheetHome();
    }

    // The sheet opens from the hearts (see heartTap), never from a
    // dedicated button: unsaved hearts Like, saved hearts open the sheet.
    psheetClose.addEventListener("click", function () {
      closePSheet();
    });
    // Spotify parity: Cancel discards the draft, Done commits it.
    if (psheetCancelBtn) {
      psheetCancelBtn.addEventListener("click", function () {
        if (psheetSaving) return;
        closePSheet();
      });
    }
    if (psheetDoneBtn) {
      psheetDoneBtn.addEventListener("click", function () {
        savePsheetDraft();
      });
    }
    pbackdropEl.addEventListener("click", function () {
      closePSheet();
    });
    pgrabEl.addEventListener("pointerdown", psheetDragStart);
    psheetHead.addEventListener("pointerdown", psheetDragStart);
    window.addEventListener("pointermove", psheetDragMove, true);
    window.addEventListener("pointerup", psheetDragEnd, true);
    window.addEventListener("pointercancel", function () {
      if (psheetDrag) glidePSheetHome();
      psheetDrag = null;
    }, true);
    if (psheetSearchInput) {
      psheetSearchInput.addEventListener("input", function () {
        psheetSearch = psheetSearchInput.value || "";
        renderPSheet();
      });
    }

    // --- snapshot rendering (no full DOM rebuilds) ---
    function render(snap) {
      var prevSnap = lastSnap;
      lastSnap = snap;
      var hasTrack = !!(snap.track || snap.artist);
      if (hasTrack) hasEverLoaded = true;
      // Skeleton until the first real track: shimmer placeholders instead
      // of "Nothing playing" dummy text. After a track has loaded once,
      // fall back to the real empty-state messages.
      var isLoading = !hasTrack && !hasEverLoaded;
      root.classList.toggle("spm-loading", isLoading);
      try {
        if (isLoading) root.setAttribute("aria-busy", "true");
        else root.removeAttribute("aria-busy");
      } catch (e) {}

      if (isLoading) {
        if (titleEl.textContent !== "") {
          titleEl.textContent = "";
          titleEl.title = "";
        }
        if (artistBtn.textContent !== "") {
          artistBtn.textContent = "";
          artistBtn.title = "";
        }
        artistBtn.disabled = true;
        artistBtn.setAttribute("aria-label", "Loading");
        if (miniTitle.textContent !== "") {
          miniTitle.textContent = "";
          miniTitle.title = "";
        }
        if (miniArtist.textContent !== "") miniArtist.textContent = "";
      } else {
        if (snap.track && titleEl.textContent !== snap.track) {
          titleEl.textContent = snap.track;
          titleEl.title = snap.track;
        } else if (!snap.track && titleEl.textContent !== "Nothing playing") {
          titleEl.textContent = "Nothing playing";
          titleEl.title = "";
        }
        var artistText = snap.artist || (snap.playerReady ? "Unknown artist" : "Open Spotify and press play");
        if (artistBtn.textContent !== artistText) artistBtn.textContent = artistText;
        if (artistBtn.title !== artistText) artistBtn.title = artistText;
        // Only a real artist name navigates; placeholders stay inert.
        artistBtn.disabled = !snap.artist;
        artistBtn.setAttribute(
          "aria-label",
          snap.artist ? "Open " + snap.artist + " in Spotify" : "Artist"
        );
      }

      // Playing-from context (playlist / mix name). Hidden when unknown —
      // never placeholder text. The button opens it via the adapter.
      var contextText = snap.context || "";
      if (contextLink.textContent !== contextText) contextLink.textContent = contextText;
      contextLink.setAttribute(
        "aria-label",
        contextText ? "Open " + contextText + " in Spotify" : "Now playing context"
      );
      if (contextText) {
        if (contextEl.hasAttribute("hidden")) contextEl.removeAttribute("hidden");
      } else if (!contextEl.hasAttribute("hidden")) {
        contextEl.setAttribute("hidden", "");
      }

      // Mini mirrors (same component, compact state).
      if (miniTitle.textContent !== titleEl.textContent) {
        miniTitle.textContent = titleEl.textContent;
      }
      if (miniTitle.title !== titleEl.title) miniTitle.title = titleEl.title;
      if (!isLoading) {
        var miniArtistText = snap.artist || (snap.playerReady ? "Unknown artist" : "Open Spotify");
        if (miniArtist.textContent !== miniArtistText) miniArtist.textContent = miniArtistText;
      }

      if (snap.artwork && snap.artwork !== currentArtwork) {
        // A swipe is waiting for the new cover: fly it in from the side it
        // was swiped toward. Same-cover consecutive tracks (identical URL)
        // still count as an arrival via the track change itself.
        var swipeDir = 0;
        if (awaitingArt) {
          var trackWas = prevSnap && prevSnap.track ? prevSnap.track : "";
          var trackNow = snap.track || "";
          var urlIsNew = snap.artwork !== currentArtwork;
          var trackIsNew =
            trackWas !== "" && trackNow !== "" && trackNow !== trackWas;
          if (urlIsNew || trackIsNew) {
            swipeDir = awaitingArt.dir;
            if (awaitingArt.timer) {
              try {
                window.clearTimeout(awaitingArt.timer);
              } catch (e) {}
            }
            awaitingArt = null;
          }
        }
        currentArtwork = snap.artwork;
        art.src = snap.artwork;
        art.classList.remove("spm-loaded");
        sampleCoverColor(snap.artwork);
        miniArt.src = snap.artwork;
        miniArt.style.display = "block";
        if (swipeDir) flyIn(swipeDir);
      } else if (!snap.artwork && currentArtwork) {
        currentArtwork = "";
        art.removeAttribute("src");
        art.classList.remove("spm-loaded");
        miniArt.removeAttribute("src");
        miniArt.style.display = "none";
      } else if (awaitingArt && snap.track && prevSnap && prevSnap.track && snap.track !== prevSnap.track) {
        // Same cover, new track (identical artwork URL): nothing to swap,
        // so just glide the art home instead of waiting out the timer.
        var homeDir = awaitingArt.dir;
        if (awaitingArt.timer) {
          try {
            window.clearTimeout(awaitingArt.timer);
          } catch (e2) {}
        }
        awaitingArt = null;
        flyIn(homeDir);
      }
      if (awaitingArt && snap.track && snap.track === awaitingArt.track) {
        // No track change (yet): previous restarted the current song, or
        // the action did nothing (e.g. next at queue end). Don't sit on
        // an empty stage — glide home as soon as we can tell (restart
        // drops the clock by >3s; a dead-end action resolves on a short
        // 800ms beat instead of the old 1.5s stare).
        var el2 = nowMs() - (awaitingArt.t0 || 0);
        var posNow = snap.currentTime || 0;
        var startPos = awaitingArt.pos || 0;
        var restarted =
          awaitingArt.dir > 0 && startPos > 3 && posNow + 3 < startPos;
        if (restarted || el2 > 800) {
          if (awaitingArt.timer) {
            try {
              window.clearTimeout(awaitingArt.timer);
            } catch (e3) {}
          }
          awaitingArt = null;
          blobRest();
        }
      }
      var artVisible = !!snap.artwork;
      art.style.display = artVisible ? "block" : "none";
      artFallback.style.display = artVisible ? "none" : "flex";
      miniArt.style.display = artVisible ? "block" : "none";
      miniFallback.style.display = artVisible ? "none" : "flex";

      // Halo gate, set synchronously every render from URL presence (never
      // from the img load event — a missed event must not be able to hide
      // the halo forever). No artwork URL (app loading, nothing playing)
      // means no halo, which is also what kills the load-time flash.
      root.classList.toggle("spm-has-art", artVisible);

      // Self-heal a missed img load event: if the element already holds
      // decoded pixels but the class never applied, apply it so neither
      // the cover nor anything depending on it gets stuck hidden.
      try {
        if (artVisible && !art.classList.contains("spm-loaded") && art.complete && art.naturalWidth > 0) {
          art.classList.add("spm-loaded");
        }
      } catch (e) {}

      // Play / pause icon (only touch DOM when it flips).
      var wantPlaying = !!snap.isPlaying;
      var showingPause = playBtn.getAttribute("data-state") === "pause";
      if (wantPlaying !== showingPause) {
        playBtn.innerHTML = wantPlaying ? SVG.pause : SVG.play;
        playBtn.setAttribute("data-state", wantPlaying ? "pause" : "play");
        playBtn.setAttribute("aria-label", wantPlaying ? "Pause" : "Play");
        miniPlay.innerHTML = wantPlaying ? SVG.pause : SVG.play;
      }
      miniPlay.setAttribute("data-state", wantPlaying ? "pause" : "play");
      miniPlay.setAttribute("aria-label", wantPlaying ? "Pause" : "Play");
      root.classList.toggle("spm-playing", wantPlaying);

      // Modes.
      shuffleBtn.classList.toggle("spm-active", !!snap.shuffle);
      shuffleBtn.setAttribute("aria-pressed", snap.shuffle ? "true" : "false");
      shuffleBtn.setAttribute(
        "aria-label",
        snap.shuffle ? "Disable shuffle" : "Enable shuffle"
      );
      var rep = snap.repeat || "off";
      repeatBtn.classList.toggle("spm-active", rep !== "off");
      repeatBtn.classList.toggle("spm-repeat-one", rep === "track");
      repeatBtn.setAttribute("aria-pressed", rep !== "off" ? "true" : "false");
      repeatBtn.setAttribute(
        "aria-label",
        rep === "track" ? "Disable repeat" : rep === "context" ? "Enable repeat one" : "Enable repeat"
      );

      // Like. innerHTML is compared via a data flag, not the markup
      // itself: the browser re-serializes SVG on read (e.g. <path/> ->
      // <path></path>), so a string compare would rewrite every render.
      var wantLiked = !!snap.liked;
      var shownLiked = likeBtn.getAttribute("data-liked") === "1";
      likeBtn.classList.toggle("spm-liked", wantLiked);
      likeBtn.setAttribute("aria-pressed", wantLiked ? "true" : "false");
      likeBtn.setAttribute(
        "aria-label",
        wantLiked ? "Remove from Liked Songs" : "Add to Liked Songs"
      );
      if (wantLiked !== shownLiked) {
        likeBtn.innerHTML = wantLiked ? SVG.heartFill : SVG.heart;
        likeBtn.setAttribute("data-liked", wantLiked ? "1" : "0");
      }
      // Mini like mirrors with its own churn guard.
      var miniShownLiked = miniLike.getAttribute("data-liked") === "1";
      miniLike.classList.toggle("spm-liked", wantLiked);
      miniLike.setAttribute("aria-pressed", wantLiked ? "true" : "false");
      miniLike.setAttribute(
        "aria-label",
        wantLiked ? "Remove from Liked Songs" : "Add to Liked Songs"
      );
      if (wantLiked !== miniShownLiked) {
        miniLike.innerHTML = wantLiked ? SVG.heartFill : SVG.heart;
        miniLike.setAttribute("data-liked", wantLiked ? "1" : "0");
      }

      // Duration + volume (skip while dragging the volume bar).
      if (!volDragging) {
        paintVol(Math.round((snap.volume !== undefined ? snap.volume : 1) * 100));
      }

      var durText = formatTime(snap.duration || 0);
      if (durEl.textContent !== durText) durEl.textContent = durText;

      if (!snap.playerReady) {
        setStatus("Waiting for the Spotify player…");
      } else if (!hasTrack) {
        setStatus(snap.isPlaying ? "Playing" : "Paused — pick something to play.");
      } else {
        setStatus("");
      }

      // Devices: while the sheet is visible, re-read Spotify's list at most
      // once every 5s — devices come and go with no playback change at all, so
      // this cannot hinge on a track signal. The read is the adapter's cached,
      // single-flight one (it opens/hides Spotify's own picker once), it only
      // runs while the sheet is open, and a refresh that finds the same devices
      // repaints nothing. It is skipped while the adapter is mid-transfer (the
      // list will change on its own) but hurried along once a transfer is
      // waiting to be confirmed, so a late success lands in ~1.5s.
      var transferInFlight = sheetPendingKey && !sheetPendingSince;
      if (
        sheetOpen &&
        !transferInFlight &&
        !sheetDrag &&
        nowMs() - sheetLastLoad > (sheetPendingSince ? 1500 : 5000)
      ) {
        loadSheetDevices(false);
      }

      // Save sheet follows track + Like via the same snapshot (event-driven,
      // no timer — see the sheet header comment for why polling is wrong here).
      try {
        syncPsheetWithSnap(snap);
      } catch (e) {}

      // Re-anchor the smooth clock. Spotify reports whole seconds, so a
      // hard snap on every snapshot would yank the gliding estimate back
      // to an integer (the visible "jump"). Instead: hard rebase only on
      // track / play-state changes or large drift (seeks, jumps); otherwise
      // leash the anchor halfway toward truth — converges in a beat or two
      // with no visible step.
      var playingNow = !!(snap.isPlaying && snap.playerReady);
      var snapT = snap.currentTime || 0;
      anchorDur = snap.duration || 0;
      var trackChanged = !!(
        hasTrack &&
        prevSnap &&
        prevSnap.track &&
        snap.track !== prevSnap.track
      );
      if (!hasTrack || trackChanged || playingNow !== anchorPlaying) {
        rebase(snapT, anchorDur, playingNow);
      } else {
        var drift = snapT - estimate();
        if (Math.abs(drift) > 1.5) {
          rebase(snapT, anchorDur, playingNow);
        } else {
          anchorTime += drift * 0.5;
        }
      }
      // (Re)start the smooth progress ticker.
      if (snap.isPlaying && !rafId && snap.playerReady) startTicker();
      if ((!snap.isPlaying || !snap.playerReady) && !seeking && !miniSeeking) {
        renderBar(snap.currentTime || 0, snap.duration || 0);
        if (curEl) curEl.textContent = formatTime(snap.currentTime || 0);
      }
    }

    art.addEventListener("load", function () {
      art.classList.add("spm-loaded");
    });

    art.addEventListener("error", function () {
      art.classList.remove("spm-loaded");
    });

    // Smooth progress loop: paints the interpolated estimate EVERY frame
    // (style writes only), rebasing against Spotify ~1/sec to kill drift.
    // Track changes are picked up on the rebase beat. A 500ms interval backs
    // up rAF: throttled webviews and background tabs stall animation frames,
    // which used to leave the clock jumping in multi-second steps — the
    // interval keeps it truthful to the second when frames go quiet.
    var lastPaint = 0;
    var tickInterval = 0;

    function paintOnce() {
      if (!lastSnap || !anchorPlaying || seeking || miniSeeking) return false;
      var est = estimate();
      renderBar(est, anchorDur);
      var t = formatTime(est);
      if (curEl.textContent !== t) curEl.textContent = t;
      lastPaint = nowMs();
      return true;
    }

    function rebaseFromSpotify() {
      var cur = estimate();
      var dur = anchorDur;
      try {
        cur = spotify.getCurrentTime() || 0;
        var d2 = spotify.getDuration() || 0;
        if (d2) dur = d2;
      } catch (e) {}
      if (dur && cur > dur) cur = dur;
      // Same leash as snapshots: Spotify's integer seconds must not
      // yank the fractional estimate.
      anchorDur = dur;
      var drift = cur - estimate();
      if (Math.abs(drift) > 1.5) {
        rebase(cur, dur, true);
      } else {
        anchorTime += drift * 0.5;
      }
    }

    function startTicker() {
      if (rafId) return;
      ensureTickInterval();
      function frame(ts) {
        if (seeking || miniSeeking) {
          // Finger down: the drag handlers paint; keep looping for release.
          rafId = requestAnimationFrame(frame);
          return;
        }
        if (!lastSnap || !anchorPlaying) {
          rafId = 0;
          return;
        }
        paintOnce();
        if (ts - lastRebase > 1000) {
          lastRebase = ts;
          rebaseFromSpotify();
          var freshTrack = "";
          try {
            freshTrack = spotify.getCurrentTrack() || "";
          } catch (e) {}
          if (freshTrack && lastSnap && freshTrack !== lastSnap.track) {
            try {
              render(spotify.getSnapshot());
            } catch (e) {}
          }
          if (!lastSnap || !lastSnap.isPlaying) {
            rafId = 0;
            return;
          }
        }
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    function ensureTickInterval() {
      if (tickInterval) return;
      try {
        tickInterval = window.setInterval(function () {
          // Fires at most after ~700ms of frame silence, so a healthy loop
          // is never double-painted.
          if (lastSnap && anchorPlaying && !seeking && !miniSeeking && nowMs() - lastPaint > 700) {
            if (paintOnce()) {
              try {
                rebaseFromSpotify();
              } catch (e) {}
            }
          }
        }, 500);
      } catch (e) {
        tickInterval = 0;
      }
    }

    function stopTicker() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    var unsubscribe = null;
    function mount(parent) {
      (parent || document.body).appendChild(root);
      applyEnvironment();
      applyStoredState();
      watchEnvironment();
      try {
        console.info(
          "[spm] environment:",
          envInfo
            ? "zoom=" +
              envInfo.zoom +
              " sheet=" +
              envInfo.sheet +
              " (" +
              envInfo.reason +
              ")"
            : "unknown",
          envInfo || ""
        );
      } catch (e) {}
      try {
        unsubscribe = spotify.subscribe(function (snap) {
          render(snap);
        });
        render(spotify.getSnapshot());
      } catch (e) {
        setStatus("Could not read the Spotify player yet.");
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = 0;
        } else if (lastSnap && lastSnap.isPlaying) {
          // Re-anchor immediately: the estimate went stale while hidden
          // (Spotify kept playing), so don't paint it for a beat.
          try {
            rebase(spotify.getCurrentTime() || 0, spotify.getDuration() || 0, true);
            renderBar(estimate(), anchorDur);
          } catch (e) {}
          startTicker();
        }
      });
    }

    function unmount() {
      stopTicker();
      if (tickInterval) {
        try {
          window.clearInterval(tickInterval);
        } catch (e) {}
        tickInterval = 0;
      }
      if (unsubscribe) unsubscribe();
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    return { root: root, mount: mount, unmount: unmount, render: render };
  }

  window.SpotMobile = window.SpotMobile || {};
  window.SpotMobile.createMobilePlayer = createMobilePlayer;
  window.SpotMobile.formatTime = formatTime;
})();
