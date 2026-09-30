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

  // Organic blob loop the progress ring follows (viewBox 240x240, starts at
  // top, winds clockwise so angle-seek math matches the stroke direction).
  // Generated (not hand-drawn): radius modulated by even-frequency cosines
  // only, so the loop is symmetric about both axes and its bbox center is
  // exactly (120,120) — the artwork blob and the ring share that center.
  var RING_PATH =
    "M120,26.4C125.4,26.4 130.9,27 136.2,28.1C141.5,29.2 146.7,30.9 151.7,32.9" +
    "C156.7,34.8 161.5,37.3 166.2,40C170.9,42.6 175.3,45.6 179.7,48.8" +
    "C184.1,52 188.4,55.4 192.5,59.2C196.5,63 200.6,67 204.2,71.4" +
    "C207.8,75.8 211.3,80.6 214.1,85.8C216.8,90.9 219.3,96.5 220.8,102.2" +
    "C222.3,107.9 223.2,114.1 223.2,120C223.2,125.9 222.3,132.1 220.8,137.8" +
    "C219.3,143.5 216.8,149.1 214.1,154.2C211.3,159.4 207.8,164.2 204.2,168.6" +
    "C200.6,173 196.5,177 192.5,180.8C188.4,184.6 184.1,188 179.7,191.2" +
    "C175.3,194.4 170.9,197.4 166.2,200C161.5,202.7 156.7,205.2 151.7,207.1" +
    "C146.7,209.1 141.5,210.8 136.2,211.9C130.9,213 125.4,213.6 120,213.6" +
    "C114.6,213.6 109.1,213 103.8,211.9C98.5,210.8 93.3,209.1 88.3,207.1" +
    "C83.3,205.2 78.5,202.7 73.8,200C69.1,197.4 64.7,194.4 60.3,191.2" +
    "C55.9,188 51.6,184.6 47.5,180.8C43.5,177 39.4,173 35.8,168.6" +
    "C32.2,164.2 28.7,159.4 25.9,154.2C23.2,149.1 20.7,143.5 19.2,137.8" +
    "C17.7,132.1 16.8,125.9 16.8,120C16.8,114.1 17.7,107.9 19.2,102.2" +
    "C20.7,96.5 23.2,90.9 25.9,85.8C28.7,80.6 32.2,75.8 35.8,71.4" +
    "C39.4,67 43.5,63 47.5,59.2C51.6,55.4 55.9,52 60.3,48.8" +
    "C64.7,45.6 69.1,42.6 73.8,40C78.5,37.3 83.3,34.8 88.3,32.9" +
    "C93.3,30.9 98.5,29.2 103.8,28.1C109.1,27 114.6,26.4 120,26.4Z";

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
      '<circle class="spm-ring-dot" r="5" cx="120" cy="26.4"/>' +
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
    // Smoothness design: Spotify-DOM reads (~1/sec + snapshots) only rebase
    // an anchor; every animation frame paints the INTERPOLATED position, so
    // the dot glides at 60fps instead of jumping at snapshot cadence. The
    // hot loop does style writes only — no DOM reads, no layout.
    var anchorTime = 0;
    var anchorDur = 0;
    var anchorStamp = 0;
    var anchorPlaying = false;
    var lastRebase = 0;
    var lastAriaSec = -1;
    var ringLUT = null;

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

    function measureRing() {
      try {
        if (ringFill && ringFill.getTotalLength) {
          ringLen = ringFill.getTotalLength();
          ringFill.style.strokeDasharray = String(ringLen);
          // Lookup table: 121 samples around the loop; dotAt() lerps
          // between neighbours instead of calling getPointAtLength per
          // frame (cheaper, and immune to per-call rounding jitter).
          ringLUT = [];
          for (var i = 0; i <= 120; i++) {
            var pt = ringFill.getPointAtLength((ringLen * i) / 120);
            ringLUT.push([pt.x, pt.y]);
          }
        }
      } catch (e) {
        ringLen = 0;
        ringLUT = null;
      }
    }

    function dotAt(ratio) {
      if (!ringDot) return;
      var r = Math.max(0, Math.min(1, ratio));
      try {
        if (ringLUT && ringLUT.length === 121) {
          var pos = r * 120;
          var i0 = Math.floor(pos);
          var i1 = Math.min(120, i0 + 1);
          var f = pos - i0;
          var ax = ringLUT[i0][0];
          var ay = ringLUT[i0][1];
          ringDot.setAttribute("cx", (ax + (ringLUT[i1][0] - ax) * f).toFixed(1));
          ringDot.setAttribute("cy", (ay + (ringLUT[i1][1] - ay) * f).toFixed(1));
        } else if (ringLen && ringFill.getPointAtLength) {
          var pt = ringFill.getPointAtLength(r * ringLen);
          ringDot.setAttribute("cx", pt.x.toFixed(1));
          ringDot.setAttribute("cy", pt.y.toFixed(1));
        }
      } catch (e) {}
    }

    function renderBar(current, duration) {
      var ratio = duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0;
      if (ringLen && ringFill) {
        ringFill.style.strokeDashoffset = String(ringLen * (1 - ratio));
      }
      dotAt(ratio);
      // ARIA churn feeds MutationObservers (and screen readers); 1Hz is
      // plenty, the visuals already move every frame.
      var sec = Math.round(current);
      if (sec !== lastAriaSec) {
        lastAriaSec = sec;
        ringHit.setAttribute("aria-valuemax", String(Math.round(duration)));
        ringHit.setAttribute("aria-valuenow", String(sec));
        ringHit.setAttribute(
          "aria-valuetext",
          formatTime(current) + " of " + formatTime(duration)
        );
      }
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

      // (Re)start the smooth progress ticker.
      rebase(
        snap.currentTime || 0,
        snap.duration || 0,
        !!(snap.isPlaying && snap.playerReady)
      );
      if (snap.isPlaying && !rafId && snap.playerReady) startTicker();
      if ((!snap.isPlaying || !snap.playerReady) && !seeking) {
        renderBar(snap.currentTime || 0, snap.duration || 0);
        if (curEl) curEl.textContent = formatTime(snap.currentTime || 0);
      }
    }

    art.addEventListener("load", function () {
      art.classList.add("spm-loaded");
    });

    // Smooth progress loop: paints the interpolated estimate EVERY frame
    // (style writes only), rebasing against Spotify ~1/sec to kill drift.
    // Track changes are picked up on the rebase beat.
    function startTicker() {
      if (rafId) return;
      function frame(ts) {
        if (seeking) {
          // Finger down: the drag handlers paint; keep looping for release.
          rafId = requestAnimationFrame(frame);
          return;
        }
        if (!lastSnap || !anchorPlaying) {
          rafId = 0;
          return;
        }
        var est = estimate();
        renderBar(est, anchorDur);
        var t = formatTime(est);
        if (curEl.textContent !== t) curEl.textContent = t;
        if (ts - lastRebase > 1000) {
          lastRebase = ts;
          var cur = est;
          var dur = anchorDur;
          try {
            cur = spotify.getCurrentTime() || 0;
            var d2 = spotify.getDuration() || 0;
            if (d2) dur = d2;
          } catch (e) {}
          if (dur && cur > dur) cur = dur;
          rebase(cur, dur, true);
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
      if (unsubscribe) unsubscribe();
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    return { root: root, mount: mount, unmount: unmount, render: render };
  }

  window.SpotMobile = window.SpotMobile || {};
  window.SpotMobile.createMobilePlayer = createMobilePlayer;
  window.SpotMobile.formatTime = formatTime;
})();
