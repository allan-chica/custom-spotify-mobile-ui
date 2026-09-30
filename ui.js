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
    devices:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 19h6"/><path d="M18 9h3a1 1 0 011 1v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-9a1 1 0 011-1h4z"/></svg>',
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
      "</div>";

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

    var collapsed = false;
    var seeking = false;
    var seekPreview = 0;
    var lastSnap = null;
    var rafId = 0;
    var currentArtwork = "";
    var envInfo = null;
    var transitionTimer = 0;
    var miniDrag = null;
    var miniSuppressClick = false;

    /* Responsive environment: on phones Spotify renders its desktop layout
     * in a wide layout viewport that is scaled down to fit the glass, which
     * would shrink our player too. We compensate with a MEASURED factor
     * (adapter.getViewportInfo(), never a hardcoded phone size): CSS `zoom`
     * on our root re-magnifies our own box back to true physical size, and
     * the tall sheet layout is driven by the VISIBLE width rather than the
     * layout-viewport media query (which never matches a desktop layout).
     * On desktop the factor is exactly 1 and the vars equal the viewport,
     * so desktop rendering is bit-identical to before. */
    function applyEnvironment() {
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
        try {
          root.style.setProperty("--spm-zoom", String(zoom));
          root.style.setProperty("--spm-vw", vw + "px");
          root.style.setProperty("--spm-vh", vh + "px");
        } catch (e) {}
      }
      root.classList.toggle("spm-sheet", !!info.sheet);
    }

    function watchEnvironment() {
      try {
        window.addEventListener("resize", applyEnvironment, { passive: true });
        window.addEventListener("orientationchange", applyEnvironment, { passive: true });
        if (window.visualViewport && window.visualViewport.addEventListener) {
          window.visualViewport.addEventListener("resize", applyEnvironment, { passive: true });
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
    likeBtn.addEventListener("click", function () {
      pressFeedback(likeBtn);
      spotify.toggleLike();
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
    devicesBtn.addEventListener("click", function () {
      if (spotify.openDevices() === false) setStatus("Device picker is not available right now.");
    });
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
      pressFeedback(miniLike);
      spotify.toggleLike();
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
      var w = blobWidth();
      blobPose(dir * w * 1.25, 0);
      if (dir < 0) spotify.next();
      else spotify.previous();
      watchTrackArrival(); // poll for the new track; observer can lag
      if (awaitingArt && awaitingArt.timer) {
        try {
          window.clearTimeout(awaitingArt.timer);
        } catch (e) {}
      }
      var timer = 0;
      try {
        timer = window.setTimeout(function () {
          // Spotify never delivered a new track: glide the old art home.
          awaitingArt = null;
          blobRest();
        }, 3000);
      } catch (e) {}
      awaitingArt = { dir: dir, timer: timer };
      awaitingArt.t0 = nowMs();
      awaitingArt.pos = lastSnap && lastSnap.currentTime ? lastSnap.currentTime : 0;
      awaitingArt.track = lastSnap && lastSnap.track ? lastSnap.track : "";
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
    // has already moved on. Poll the cheap track title directly (250ms,
    // max 3s to match the glide-home fallback) and render the moment it
    // flips, which also triggers the fly-in via awaitingArt.
    function watchTrackArrival() {
      var tries = 0;
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
          if (tries >= 12) window.clearInterval(timer);
        }, 250);
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
          if (!gesture.fromBlob || awaitingArt) {
            gesture = null;
            return;
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

    // --- snapshot rendering (no full DOM rebuilds) ---
    function render(snap) {
      var prevSnap = lastSnap;
      lastSnap = snap;
      var hasTrack = !!(snap.track || snap.artist);

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
      var miniArtistText = snap.artist || (snap.playerReady ? "Unknown artist" : "Open Spotify");
      if (miniArtist.textContent !== miniArtistText) miniArtist.textContent = miniArtistText;

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
        // an empty stage for 3s — glide home as soon as we can tell.
        var el2 = nowMs() - (awaitingArt.t0 || 0);
        var posNow = snap.currentTime || 0;
        var restarted =
          awaitingArt.dir > 0 && posNow < (awaitingArt.pos || 0) - 5;
        if (restarted || el2 > 1500) {
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
