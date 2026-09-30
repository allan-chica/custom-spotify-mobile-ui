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
      '<div class="spm-stage">' +
      '<div class="spm-blob">' +
      '<img class="spm-art" alt="Album artwork" draggable="false" />' +
      '<div class="spm-art-fallback" aria-hidden="true">' + SVG.note + "</div>" +
      "</div>" +
      "</div>" +
      '<div class="spm-titles"><h2 class="spm-title">Nothing playing</h2>' +
      '<p class="spm-artist">Open Spotify and press play</p></div>' +
      '<div class="spm-progress">' +
      '<div class="spm-bar" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
      '<div class="spm-track"><div class="spm-fill"></div></div>' +
      '<div class="spm-knob"></div>' +
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
      '<input class="spm-vol-slider" type="range" min="0" max="100" value="100" aria-label="Volume" />' +
      "</div>" +
      "</div>" +
      '<p class="spm-status" role="status"></p>' +
      "</div>" +
      '<button class="spm-fab" type="button" aria-label="Open mobile player">' +
      '<img class="spm-fab-art" alt="" draggable="false" />' +
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
    var bar = q(".spm-bar");
    var fill = q(".spm-fill");
    var knob = q(".spm-knob");
    var blob = q(".spm-blob");

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
      if (knob) knob.style.left = ratio * 100 + "%";
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

    // --- art swipe: drag the artwork sideways for previous / next track ---
    // Lives on the artwork, so it never fights the progress-bar seek area.
    // The art follows the finger live; past the threshold it flies out and
    // the newly arriving cover flies in from the other side. A tap (no
    // real movement) does nothing at all.
    var swipe = null; // { id, x0, y0, dx, t0, active }
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

    blob.addEventListener("pointerdown", function (e) {
      if (awaitingArt) return; // a fly animation is already in flight
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try {
        e.preventDefault(); // no native image-drag, no text selection
      } catch (err2) {}
      swipe = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        dx: 0,
        t0: nowMs(),
        active: false,
      };
      try {
        blob.setPointerCapture && blob.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    blob.addEventListener("pointermove", function (e) {
      if (!swipe || e.pointerId !== swipe.id) return;
      var dx = e.clientX - swipe.x0;
      var dy = e.clientY - swipe.y0;
      if (!swipe.active) {
        if (Math.abs(dx) < 12) return;
        // Mostly vertical: not our gesture, let the page scroll.
        if (Math.abs(dx) < Math.abs(dy) * 1.2) {
          swipe = null;
          return;
        }
        swipe.active = true;
        blob.classList.add("spm-dragging"); // follow finger 1:1, no lag
      }
      swipe.dx = dx;
      var w = blobWidth();
      var clamped = Math.max(-w * 0.6, Math.min(w * 0.6, dx));
      blobPose(clamped, Math.max(0.25, 1 - Math.abs(clamped) / (w * 1.2)));
    });

    function swipeEnd(e) {
      if (!swipe || (e && e.pointerId !== swipe.id)) return;
      var s = swipe;
      swipe = null;
      blob.classList.remove("spm-dragging");
      if (!s.active) return; // plain tap: art stays exactly as it was
      var dt = Math.max(1, nowMs() - s.t0);
      var vel = Math.abs(s.dx) / dt; // px per ms
      var th = Math.max(48, blobWidth() * 0.28);
      if (Math.abs(s.dx) > th || (Math.abs(s.dx) > th * 0.45 && vel > 0.5)) {
        commitSwipe(s.dx < 0 ? -1 : 1);
      } else {
        blobRest(); // CSS transition springs it home
      }
    }

    blob.addEventListener("pointerup", swipeEnd);
    blob.addEventListener("pointercancel", function () {
      swipe = null;
      blob.classList.remove("spm-dragging");
      blobRest();
    });

    function commitSwipe(dir) {
      // dir -1 (swiped left) = next track, +1 (swiped right) = previous.
      var w = blobWidth();
      blobPose(dir * w * 1.25, 0);
      if (dir < 0) spotify.next();
      else spotify.previous();
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
      if (artistEl.textContent !== artistText) artistEl.textContent = artistText;

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
        fabArt.src = snap.artwork;
        fabArt.style.display = "block";
        if (swipeDir) flyIn(swipeDir);
      } else if (!snap.artwork && currentArtwork) {
        currentArtwork = "";
        art.removeAttribute("src");
        fabArt.removeAttribute("src");
        fabArt.style.display = "none";
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
          // Same leash as snapshots: Spotify's integer seconds must not
          // yank the fractional estimate.
          anchorDur = dur;
          var rdrift = cur - estimate();
          if (Math.abs(rdrift) > 1.5) {
            rebase(cur, dur, true);
          } else {
            anchorTime += rdrift * 0.5;
          }
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
