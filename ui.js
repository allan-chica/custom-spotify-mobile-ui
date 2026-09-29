/* Spotify Mobile Prototype — ui.js
 *
 * Custom mobile-style player UI (dark adaptation of the "Current Track"
 * concept: header with circular buttons, times above a blob-masked artwork
 * ringed by a seekable progress loop, centered titles, minimal controls,
 * lyrics row). This file must ONLY talk to Spotify through
 * window.SpotMobile.spotify (the adapter). No direct document.querySelector
 * calls into Spotify's DOM are allowed here — only queries scoped to our
 * own container (root.querySelector).
 */

(function () {
  "use strict";

  var SVG = {
    play: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M7 6l8 6-8 6z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M17 6l-8 6 8 6z"/></svg>',
    shuffle:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>',
    repeat:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    heartFill:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    volume:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>',
    mute:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    queue:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
    devices:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 19h6"/><path d="M18 9h3a1 1 0 011 1v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-9a1 1 0 011-1h4z"/></svg>',
    chevLeft:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 5 8 12 15 19"/></svg>',
    expand:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  };

  // Organic blob loop the progress ring follows (viewBox 240x240, starts at
  // top, winds clockwise so angle-seek math matches the stroke direction).
  var RING_PATH =
    "M120,24 C150,24 168,32 182,52 C196,72 200,86 197,106 " +
    "C194,130 203,144 192,164 C181,184 157,197 133,199 " +
    "C109,201 83,207 63,192 C43,177 29,157 30,131 " +
    "C31,105 19,91 27,69 C35,47 53,39 73,31 C89,25 103,24 120,24 Z";

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
      '<div class="spm-times"><span class="spm-cur">0:00</span><span class="spm-sep">|</span><span class="spm-dur">0:00</span></div>' +
      '<div class="spm-stage">' +
      '<svg class="spm-ring" viewBox="0 0 240 240" aria-hidden="true">' +
      '<path class="spm-ring-track" d="' + RING_PATH + '"/>' +
      '<path class="spm-ring-fill" d="' + RING_PATH + '"/>' +
      '<circle class="spm-ring-dot" r="5" cx="120" cy="24"/>' +
      "</svg>" +
      '<div class="spm-ring-hit" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>' +
      '<div class="spm-blob">' +
      '<img class="spm-art" alt="Album artwork" />' +
      '<div class="spm-art-fallback" aria-hidden="true">' + SVG.note + "</div>" +
      "</div>" +
      "</div>" +
      '<div class="spm-titles"><h2 class="spm-title">Nothing playing</h2>' +
      '<p class="spm-artist">Open Spotify and press play</p></div>' +
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
      '<input class="spm-vol-slider" type="range" min="0" max="100" value="100" aria-label="Volume" />' +
      "</div>" +
      "</div>" +
      '<p class="spm-status" role="status"></p>' +
      "</div>" +
      '<button class="spm-fab" type="button" aria-label="Open mobile player">' +
      '<img class="spm-fab-art" alt="" />' +
      '<span class="spm-fab-play">' + SVG.play + "</span>" +
      "</button>";

    // All queries below are scoped to our own container — never Spotify's DOM.
    var q = function (sel) {
      return root.querySelector(sel);
    };
    var fab = q(".spm-fab");
    var art = q(".spm-art");
    var artFallback = q(".spm-art-fallback");
    var titleEl = q(".spm-title");
    var artistEl = q(".spm-artist");
    var likeBtn = q(".spm-like");
    var playBtn = q(".spm-play");
    var prevBtn = q(".spm-prev");
    var nextBtn = q(".spm-next");
    var shuffleBtn = q(".spm-shuffle");
    var repeatBtn = q(".spm-repeat");
    var ringSvg = q(".spm-ring");
    var ringFill = q(".spm-ring-fill");
    var ringDot = q(".spm-ring-dot");
    var ringHit = q(".spm-ring-hit");
    var curEl = q(".spm-cur");
    var durEl = q(".spm-dur");
    var statusEl = q(".spm-status");
    var muteBtn = q(".spm-mute");
    var volSlider = q(".spm-vol-slider");
    var collapseBtn = q(".spm-collapse");
    var lyricsBtn = q(".spm-lyrics-open");
    var queueBtn = q(".spm-queue");
    var devicesBtn = q(".spm-devices");
    var fabArt = q(".spm-fab-art");
    var fabPlay = q(".spm-fab-play");

    var collapsed = false;
    var seeking = false;
    var seekPreview = 0;
    var lastSnap = null;
    var rafId = 0;
    var rafLastTick = 0;
    var currentArtwork = "";
    var envInfo = null;
    var ringLen = 0;

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
      envInfo = info;
      try {
        root.style.setProperty("--spm-zoom", String(info.zoom));
        root.style.setProperty("--spm-vw", Math.round(info.sheetWidth) + "px");
        root.style.setProperty("--spm-vh", Math.round(info.sheetHeight) + "px");
      } catch (e) {}
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

    try {
      if (localStorage.getItem("spm-collapsed") === "1") setCollapsed(true);
    } catch (e) {}

    function pressFeedback(btn) {
      btn.classList.remove("spm-press");
      // Force reflow so rapid taps retrigger the animation.
      void btn.offsetWidth;
      btn.classList.add("spm-press");
      setTimeout(function () {
        btn.classList.remove("spm-press");
      }, 180);
    }

    // --- transport wiring (adapter only) ---
    playBtn.addEventListener("click", function () {
      pressFeedback(playBtn);
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
      setCollapsed(true);
    });
    fab.addEventListener("click", function () {
      setCollapsed(false);
    });

    // Volume slider -> adapter (no Spotify DOM access here).
    var volDebounce = 0;
    volSlider.addEventListener("input", function () {
      var v = Number(volSlider.value) / 100;
      window.clearTimeout(volDebounce);
      volDebounce = window.setTimeout(function () {
        spotify.setVolume(v);
      }, 60);
      muteBtn.innerHTML = v <= 0.01 ? SVG.mute : SVG.volume;
    });

    // --- ring progress: measure once, paint cheaply, seek by angle ---
    function measureRing() {
      try {
        if (ringFill && ringFill.getTotalLength) {
          ringLen = ringFill.getTotalLength();
          ringFill.style.strokeDasharray = String(ringLen);
        }
      } catch (e) {
        ringLen = 0;
      }
    }

    function dotAt(ratio) {
      if (!ringLen || !ringDot) return;
      try {
        var pt = ringFill.getPointAtLength(Math.max(0, Math.min(1, ratio)) * ringLen);
        ringDot.setAttribute("cx", pt.x.toFixed(1));
        ringDot.setAttribute("cy", pt.y.toFixed(1));
      } catch (e) {}
    }

    function renderBar(current, duration) {
      var ratio = duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0;
      if (ringLen && ringFill) {
        ringFill.style.strokeDashoffset = String(ringLen * (1 - ratio));
      }
      dotAt(ratio);
      ringHit.setAttribute("aria-valuemax", String(Math.round(duration)));
      ringHit.setAttribute("aria-valuenow", String(Math.round(current)));
      ringHit.setAttribute(
        "aria-valuetext",
        formatTime(current) + " of " + formatTime(duration)
      );
    }

    // 0 at top, clockwise — matches the ring path's winding.
    function ratioFromEvent(e) {
      var r = ringSvg.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var px = e.clientX !== undefined ? e.clientX : cx;
      var py = e.clientY !== undefined ? e.clientY : cy;
      var a = Math.atan2(px - cx, -(py - cy)); // -PI..PI, 0 = top
      return ((a / (2 * Math.PI)) + 1) % 1;
    }

    ringHit.addEventListener("pointerdown", function (e) {
      seeking = true;
      try {
        ringHit.setPointerCapture && ringHit.setPointerCapture(e.pointerId);
      } catch (err) {}
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      seekPreview = ratioFromEvent(e) * dur;
      renderBar(seekPreview, dur);
      if (curEl) curEl.textContent = formatTime(seekPreview);
      e.preventDefault();
    });
    ringHit.addEventListener("pointermove", function (e) {
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
    ringHit.addEventListener("pointerup", endSeek);
    ringHit.addEventListener("pointercancel", function () {
      seeking = false;
    });
    ringHit.addEventListener("keydown", function (e) {
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

    // --- snapshot rendering (no full DOM rebuilds) ---
    function render(snap) {
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
      if (artistEl.textContent !== artistText) artistEl.textContent = artistText;

      if (snap.artwork && snap.artwork !== currentArtwork) {
        currentArtwork = snap.artwork;
        art.src = snap.artwork;
        art.classList.remove("spm-loaded");
        fabArt.src = snap.artwork;
        fabArt.style.display = "block";
      } else if (!snap.artwork && currentArtwork) {
        currentArtwork = "";
        art.removeAttribute("src");
        fabArt.removeAttribute("src");
        fabArt.style.display = "none";
      }
      var artVisible = !!snap.artwork;
      art.style.display = artVisible ? "block" : "none";
      artFallback.style.display = artVisible ? "none" : "flex";

      // Play / pause icon (only touch DOM when it flips).
      var wantPlaying = !!snap.isPlaying;
      var showingPause = playBtn.getAttribute("data-state") === "pause";
      if (wantPlaying !== showingPause) {
        playBtn.innerHTML = wantPlaying ? SVG.pause : SVG.play;
        playBtn.setAttribute("data-state", wantPlaying ? "pause" : "play");
        playBtn.setAttribute("aria-label", wantPlaying ? "Pause" : "Play");
        fabPlay.innerHTML = wantPlaying ? SVG.pause : SVG.play;
      }
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

      // Like.
      likeBtn.classList.toggle("spm-liked", !!snap.liked);
      likeBtn.setAttribute("aria-pressed", snap.liked ? "true" : "false");
      likeBtn.setAttribute(
        "aria-label",
        snap.liked ? "Remove from Liked Songs" : "Add to Liked Songs"
      );
      if ((snap.liked && likeBtn.innerHTML !== SVG.heartFill) || (!snap.liked && likeBtn.innerHTML !== SVG.heart)) {
        likeBtn.innerHTML = snap.liked ? SVG.heartFill : SVG.heart;
      }

      // Duration + volume (skip while dragging either control).
      if (document.activeElement !== volSlider) {
        var vv = Math.round((snap.volume !== undefined ? snap.volume : 1) * 100);
        if (String(volSlider.value) !== String(vv)) volSlider.value = String(vv);
        var muted = snap.muted || vv <= 0;
        var wantIcon = muted ? SVG.mute : SVG.volume;
        if (muteBtn.innerHTML !== wantIcon) muteBtn.innerHTML = wantIcon;
        muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
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

      // (Re)start the lightweight progress ticker.
      if (snap.isPlaying && !rafId && snap.playerReady) startTicker();
      if ((!snap.isPlaying || !snap.playerReady) && !seeking) {
        renderBar(snap.currentTime || 0, snap.duration || 0);
        if (curEl) curEl.textContent = formatTime(snap.currentTime || 0);
      }
    }

    art.addEventListener("load", function () {
      art.classList.add("spm-loaded");
    });

    // Lightweight progress loop: rAF-throttled to ~4fps, reads via adapter
    // getters (cheap scoped queries) and only touches text/DOM on change.
    function startTicker() {
      if (rafId) return;
      rafLastTick = 0;
      function frame(ts) {
        if (!lastSnap || !lastSnap.isPlaying || seeking) {
          // Keep the loop alive briefly while seeking so release paints fast.
          if (seeking && lastSnap && lastSnap.isPlaying) {
            rafId = requestAnimationFrame(frame);
            return;
          }
          rafId = 0;
          return;
        }
        if (ts - rafLastTick > 250) {
          rafLastTick = ts;
          var cur = 0;
          var dur = lastSnap.duration || 0;
          try {
            cur = spotify.getCurrentTime() || 0;
            var d2 = spotify.getDuration() || 0;
            if (d2) dur = d2;
          } catch (e) {}
          // Track ended / Spotify jumped: let the snapshot correct metadata.
          if (dur && cur > dur) cur = dur;
          renderBar(cur, dur);
          var t = formatTime(cur);
          if (curEl.textContent !== t) curEl.textContent = t;
          // Detect track change promptly even between MutationObserver beats.
          var freshTrack = "";
          try {
            freshTrack = spotify.getCurrentTrack() || "";
          } catch (e) {}
          if (freshTrack && lastSnap && freshTrack !== lastSnap.track) {
            try {
              render(spotify.getSnapshot());
            } catch (e) {}
          }
        }
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    function stopTicker() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    var unsubscribe = null;
    function mount(parent) {
      (parent || document.body).appendChild(root);
      measureRing();
      applyEnvironment();
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
          startTicker();
        }
      });
    }

    function unmount() {
      stopTicker();
      if (unsubscribe) unsubscribe();
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    return { root: root, mount: mount, unmount: unmount, render: render };
  }

  window.SpotMobile = window.SpotMobile || {};
  window.SpotMobile.createMobilePlayer = createMobilePlayer;
  window.SpotMobile.formatTime = formatTime;
})();
