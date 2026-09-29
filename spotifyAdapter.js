/* Spotify Mobile Prototype — spotifyAdapter.js
 *
 * Centralized abstraction over the REAL Spotify Web Player DOM.
 * The rest of the extension must NOT query Spotify's DOM directly.
 * Only this file knows about data-testid / aria-label / structure.
 *
 * Design rules:
 *  - Prefer semantic anchors: data-testid, aria-label, role, DOM hierarchy.
 *  - Never rely on obfuscated CSS class names.
 *  - The persistent player is found by hierarchy (footer / now-playing-bar),
 *    NOT by a global [aria-label="Play"] query (many unrelated Play buttons exist).
 *  - Every lookup re-resolves from the live DOM (React replaces nodes often).
 *  - MutationObserver (debounced) notifies subscribers; only a very light
 *    fallback interval is used, and it backs off when the player is found.
 */

(function () {
  "use strict";

  var TESTIDS = {
    playerBar: "now-playing-bar",
    widget: "now-playing-widget",
    controls: "player-controls",
    playpause: "control-button-playpause",
    prev: "control-button-skip-back",
    next: "control-button-skip-forward",
    shuffle: "control-button-shuffle",
    repeat: "control-button-repeat",
    npv: "control-button-npv",
    npvPanel: "NPV_Panel_OpenDiv",
    coverArt: "cover-art-image",
    progressBar: "playback-progressbar",
    progressPosition: "playback-position",
    progressDuration: "playback-duration",
    volumeBar: "volume-bar",
    contextLink: "context-item-link",
  };

  // Substrings (lowercase) matching aria-labels across a few common locales.
  // English is primary; others are best-effort fallbacks.
  var LABELS = {
    prev: ["previous", "prev", "anterior", "précédent", "precedent", "zurück", "indietro", "vorige"],
    next: ["next", "siguiente", "suivant", "weiter", "successivo", "volgende", "próxima", "prossimo"],
    shuffle: ["shuffle", "aleatorio", "aléatoire", "zufällig", "zufallig", "casuale", "aleatoria"],
    repeat: ["repeat", "repetir", "répéter", "repeter", "wiederholen", "ripeti", "herhalen"],
    likeAdd: ["add to liked", "add to your liked", "save to your liked", "like", "me gusta", "enregistrer"],
    likeRemove: ["remove from liked", "remove from your liked", "unlike", "unlike this"],
    lyrics: ["lyrics", "letra", "paroles", "songtext", "testo"],
    queue: ["queue", "cola", "file d'attente", "warteschlange", "coda"],
    device: ["connect to a device", "devices", "dispositivos", "appareils", "geräte", "gerate"],
    mute: ["mute", "silenciar", "muet", "stumm", "silenzia"],
    unmute: ["unmute", "activar sonido", "rétablir le son", "ton einschalten"],
    volume: ["volume", "volumen"],
    seek: ["seek", "progress", "progreso", "position"],
  };

  var subscribers = new Set();
  var lastSnapshotKey = "";
  var observer = null;
  var observerStarted = false;
  var fallbackTimer = null;
  var cachedPlayerRoot = null;

  function norm(s) {
    return (s || "").toLowerCase().trim();
  }

  function includesAny(haystack, needles) {
    var h = norm(haystack);
    if (!h) return false;
    for (var i = 0; i < needles.length; i++) {
      if (h.indexOf(needles[i]) !== -1) return true;
    }
    return false;
  }

  function byTestId(id, scope) {
    try {
      var root = scope || document;
      return root.querySelector('[data-testid="' + id + '"]');
    } catch (e) {
      return null;
    }
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    // getClientRects is 0 for display:none
    if (!el.getClientRects || el.getClientRects().length === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /* ---------- Player root discovery ---------- */

  function rootFromPlayPauseAncestor() {
    var btn = null;
    try {
      btn = document.querySelector('button[data-testid="' + TESTIDS.playpause + '"]');
    } catch (e) {
      btn = null;
    }
    if (!btn) return null;
    // Walk up: prefer footer, else an element that also contains skip buttons.
    var el = btn;
    for (var depth = 0; depth < 8 && el && el !== document.body; depth++) {
      el = el.parentElement;
      if (!el) break;
      if (el.tagName === "FOOTER") return el;
      if (el.querySelector) {
        var hasNext =
          el.querySelector('button[data-testid="' + TESTIDS.next + '"]') ||
          el.querySelector('button[aria-label*="Next"]');
        var hasPrev =
          el.querySelector('button[data-testid="' + TESTIDS.prev + '"]') ||
          el.querySelector('button[aria-label*="Previous"]');
        if (hasNext && hasPrev) return el;
      }
    }
    return btn.closest ? btn.closest("footer") || btn.parentElement : null;
  }

  // Bottom-position heuristic: among all Play/Pause toggle buttons, the
  // persistent player one lives near the viewport bottom AND near Next/Prev.
  function rootByPositionHeuristic() {
    var candidates = [];
    try {
      candidates = Array.prototype.slice.call(document.querySelectorAll("button"));
    } catch (e) {
      return null;
    }
    var vh = window.innerHeight || 800;
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < candidates.length; i++) {
      var b = candidates[i];
      var label = norm(b.getAttribute("aria-label"));
      var isToggle =
        label === "play" ||
        label === "pause" ||
        /paus/.test(label) ||
        label.indexOf("play") !== -1 ||
        label.indexOf("reproduc") !== -1 ||
        label.indexOf("lecture") !== -1;
      if (!isToggle) continue;
      if (!isVisible(b)) continue;
      var r = b.getBoundingClientRect();
      // Must be in lower half of viewport.
      if (r.top < vh * 0.55) continue;
      // Score: lower on screen + near other transport buttons.
      var scope = b.parentElement && b.parentElement.parentElement
        ? b.parentElement.parentElement
        : b.parentElement;
      var siblingText = scope ? (scope.textContent || "") : "";
      var hasTransportHint =
        scope &&
        scope.querySelector &&
        (scope.querySelector('button[aria-label]') !== null);
      var score = r.top;
      if (hasTransportHint) score += 5000;
      if (/0:\d\d/.test(siblingText)) score += 2000; // time display nearby
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (!best) return null;
    var node = best;
    for (var d = 0; d < 6 && node && node !== document.body; d++) {
      node = node.parentElement;
      if (!node) break;
      if (node.tagName === "FOOTER") return node;
    }
    return best.closest ? best.closest("footer") || best.parentElement : null;
  }

  function findPlayer() {
    // 1. Stable semantic anchor (best).
    var bar = byTestId(TESTIDS.playerBar);
    if (bar && isVisible(bar)) {
      cachedPlayerRoot = bar;
      return bar;
    }
    // data-testid may exist but hidden during login/ads — still usable as scope.
    if (bar) {
      cachedPlayerRoot = bar;
      return bar;
    }
    // 2. Footer element (Spotify renders the player as <footer>).
    var footers = [];
    try {
      footers = document.querySelectorAll("footer");
    } catch (e) {
      footers = [];
    }
    for (var i = 0; i < footers.length; i++) {
      // Prefer a footer that contains the play/pause control.
      var f = footers[i];
      if (f.querySelector && f.querySelector('button[data-testid="' + TESTIDS.playpause + '"]')) {
        cachedPlayerRoot = f;
        return f;
      }
    }
    if (footers.length === 1) {
      cachedPlayerRoot = footers[0];
      return footers[0];
    }
    // 3. Ancestor of the known play/pause button.
    var viaBtn = rootFromPlayPauseAncestor();
    if (viaBtn) {
      cachedPlayerRoot = viaBtn;
      return viaBtn;
    }
    // 4. Position heuristic (last resort).
    var viaPos = rootByPositionHeuristic();
    if (viaPos) {
      cachedPlayerRoot = viaPos;
      return viaPos;
    }
    return cachedPlayerRoot && document.contains(cachedPlayerRoot) ? cachedPlayerRoot : null;
  }

  function scopedQuery(selector) {
    var root = findPlayer();
    var el = null;
    if (root && root.querySelector) {
      try {
        el = root.querySelector(selector);
      } catch (e) {
        el = null;
      }
      if (el) return el;
    }
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function scopedAll(selector) {
    var out = [];
    var root = findPlayer();
    if (root && root.querySelectorAll) {
      try {
        out = Array.prototype.slice.call(root.querySelectorAll(selector));
      } catch (e) {
        out = [];
      }
      if (out.length) return out;
    }
    try {
      return Array.prototype.slice.call(document.querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  }

  /* ---------- Button discovery (scoped to player) ---------- */

  function findToggleButton() {
    // Canonical: single button whose aria-label flips Play <-> Pause.
    var btn = scopedQuery('button[data-testid="' + TESTIDS.playpause + '"]');
    if (btn) return btn;
    var buttons = scopedAll("button");
    // Prefer buttons inside the player-controls region.
    var controls = byTestId(TESTIDS.controls, findPlayer());
    var ordered = [];
    if (controls) {
      try {
        ordered = Array.prototype.slice.call(controls.querySelectorAll("button"));
      } catch (e) {
        ordered = [];
      }
    }
    var pool = ordered.length ? ordered : buttons;
    // First pass: exact Play/Pause labels in player scope.
    for (var i = 0; i < pool.length; i++) {
      var label = norm(pool[i].getAttribute("aria-label"));
      if (label === "play" || label === "pause") return pool[i];
    }
    // Second pass: localized toggle labels near bottom.
    var vh = window.innerHeight || 800;
    for (var j = 0; j < pool.length; j++) {
      var b = pool[j];
      var l = norm(b.getAttribute("aria-label"));
      if (!l) continue;
      var looksToggle =
        /paus/.test(l) ||
        l.indexOf("play") !== -1 ||
        l.indexOf("reproduc") !== -1 ||
        l.indexOf("lecture") !== -1 ||
        l.indexOf("wiedergabe") !== -1;
      if (!looksToggle) continue;
      if (!isVisible(b)) continue;
      var r = b.getBoundingClientRect();
      if (r.top > vh * 0.4) return b;
    }
    return null;
  }

  function findPlayerButton(kind) {
    var testidMap = {
      previous: TESTIDS.prev,
      next: TESTIDS.next,
      shuffle: TESTIDS.shuffle,
      repeat: TESTIDS.repeat,
    };
    if (kind === "play") return findToggleButton();
    var tid = testidMap[kind];
    if (tid) {
      var direct = scopedQuery('button[data-testid="' + tid + '"]');
      if (direct) return direct;
    }
    var keywords = LABELS[kind] || [];
    var buttons = scopedAll("button");
    // Scoped exact-ish match first.
    for (var i = 0; i < buttons.length; i++) {
      var label = buttons[i].getAttribute("aria-label") || "";
      if (includesAny(label, keywords)) return buttons[i];
    }
    // Structural fallback for prev/next: neighbours of the toggle button.
    if (kind === "previous" || kind === "next") {
      var toggle = findToggleButton();
      if (toggle && toggle.parentElement) {
        var siblings = Array.prototype.slice.call(
          toggle.parentElement.querySelectorAll("button")
        );
        var idx = siblings.indexOf(toggle);
        if (idx !== -1) {
          if (kind === "previous" && siblings[idx - 1]) return siblings[idx - 1];
          if (kind === "next" && siblings[idx + 1]) return siblings[idx + 1];
        }
      }
    }
    return null;
  }

  function findLikeButton() {
    var widget = findWidget();
    var scope = widget || findPlayer();
    function search(root) {
      if (!root || !root.querySelectorAll) return null;
      var btns = root.querySelectorAll("button");
      for (var i = 0; i < btns.length; i++) {
        var label = norm(btns[i].getAttribute("aria-label"));
        if (!label) continue;
        if (
          includesAny(label, LABELS.likeAdd) ||
          includesAny(label, LABELS.likeRemove)
        ) {
          return btns[i];
        }
      }
      return null;
    }
    return search(scope) || search(document);
  }

  function findSideButton(kind) {
    // Lyrics / Queue / Device live on the right side of the player bar.
    var root = findPlayer();
    var keywords = LABELS[kind] || [];
    var btns = scopedAll("button");
    for (var i = 0; i < btns.length; i++) {
      var label = btns[i].getAttribute("aria-label") || "";
      var title = btns[i].getAttribute("title") || "";
      if (includesAny(label, keywords) || includesAny(title, keywords)) {
        // Avoid matching track-list buttons: side buttons live inside player root.
        if (!root || root.contains(btns[i])) return btns[i];
      }
    }
    // data-testid fallbacks observed in the wild.
    var tidGuesses =
      kind === "queue"
        ? ["control-button-queue", "queue-button"]
        : kind === "lyrics"
          ? ["control-button-lyrics", "lyrics-button"]
          : ["control-button-connect", "connect-button", "control-button-npv"];
    for (var t = 0; t < tidGuesses.length; t++) {
      var el = scopedQuery('button[data-testid="' + tidGuesses[t] + '"]');
      if (el) return el;
    }
    if (kind === "device" && root) {
      var npv = root.querySelector('button[data-testid="' + TESTIDS.npv + '"]');
      if (npv) return npv;
    }
    return null;
  }

  function findWidget() {
    return (
      byTestId(TESTIDS.widget) ||
      (function () {
        var root = findPlayer();
        if (root && root.querySelector) {
          var img = root.querySelector('img[data-testid="' + TESTIDS.coverArt + '"]');
          if (img && img.closest) {
            // Widget is the left cluster containing artwork + title.
            var c = img;
            for (var d = 0; d < 5 && c && c !== root; d++) {
              c = c.parentElement;
              if (c && c.querySelector && c.querySelector("a")) return c;
            }
          }
        }
        return null;
      })()
    );
  }

  /* ---------- Track / artwork ---------- */

  function findTrackElement() {
    var widget = findWidget() || findPlayer();
    if (!widget || !widget.querySelector) return null;
    return (
      widget.querySelector('[data-testid="' + TESTIDS.contextLink + '"]') ||
      widget.querySelector('a[href*="/track/"]') ||
      widget.querySelector("a")
    );
  }

  function findArtistElement() {
    var widget = findWidget() || findPlayer();
    if (!widget || !widget.querySelectorAll) return null;
    // Spotify renders artists as links to /artist/ plus a subtitle container.
    var artistLink = widget.querySelector('a[href*="/artist/"]');
    if (artistLink && artistLink.parentElement) {
      // Parent usually holds the full "Artist1, Artist2" text.
      return artistLink.parentElement;
    }
    var all = widget.querySelectorAll("a");
    if (all.length > 1) return all[1];
    var spans = widget.querySelectorAll("span");
    // Heuristic: subtitle span (short, below title).
    for (var i = 0; i < spans.length; i++) {
      var t = (spans[i].textContent || "").trim();
      if (t && t.length < 120 && spans[i].childElementCount === 0) {
        var titleEl = findTrackElement();
        if (titleEl && spans[i] !== titleEl && t !== (titleEl.textContent || "").trim()) {
          // Likely the artist line (second distinct short text).
          return spans[i];
        }
      }
    }
    return artistLink || null;
  }

  /* ---------- Artwork: multi-source, best-quality ----------
   *
   * Spotify exposes the current track's artwork in several places at
   * different resolutions:
   *  1. navigator.mediaSession.metadata.artwork — sized entries
   *     (usually 64 / 300 / 640). Authoritative for the current track,
   *     no DOM scraping needed. This is what feeds OS/Chrome media hubs.
   *  2. The persistent player bar widget (img[data-testid="cover-art-image"],
   *     typically rendered ~64px, often a low-res file).
   *  3. The "Now Playing View" cover (img[data-testid="cover-art-image"]
   *     inside NPV_Panel_OpenDiv) — rendered much larger.
   *  4. Any other i.scdn.co/image/ <img> in the document (entity headers,
   *     cards…). These are NOT trusted unless their URL matches an image
   *     already confirmed as the current track's (same file = same pixels).
   *
   * Rules: never rewrite/fabricate image URLs (i.scdn.co URLs carry no size
   * parameter, so guessing variants would be upscaling by another name).
   * Only rank URLs Spotify actually provided. Prefer srcset's largest entry.
   *
   * STABILITY (learned the hard way): the NPV panel also contains big
   * ARTIST photos ("About the artist"). Those must never become candidates,
   * so the panel contributes ONLY cover-art-testid images — never a generic
   * <img> fallback. Selection pins the FIRST cover per track: during the
   * first seconds (page still loading, mediaSession/NPV arriving late) a
   * better source may still win; afterwards the pin freezes so a late,
   * larger artist variant can never steal the slot mid-track.
   */

  var FULL_SWEEP_TTL_MS = 15000;
  var ART_UPGRADE_WINDOW_MS = 10000;
  var lastArtKey = "";
  var lastFullSweepAt = 0;
  var lastQuickSig = "";
  var artPin = { key: "", url: "", pinnedAt: 0 };

  function parseSizesWidth(s) {
    var m = String(s || "").match(/(\d+)\s*[x\u00d7]\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // "url640 640w, url320 320w" -> { url, width } of the largest entry.
  function parseSrcsetBest(srcset) {
    var best = { url: "", width: 0 };
    if (!srcset) return best;
    var parts = String(srcset).split(",");
    for (var i = 0; i < parts.length; i++) {
      var tokens = parts[i].trim().split(/\s+/);
      if (!tokens[0]) continue;
      var url = tokens[0];
      var w = 0;
      for (var t = 1; t < tokens.length; t++) {
        var wm = tokens[t].match(/^(\d+)w$/);
        if (wm) w = Math.max(w, parseInt(wm[1], 10));
      }
      if (w > best.width) best = { url: url, width: w };
      else if (!best.url) best = { url: url, width: w };
    }
    return best;
  }

  function ancestorSummary(el, depth) {
    var chain = [];
    var node = el;
    for (var d = 0; d < (depth || 4) && node && node.tagName; d++) {
      var desc = node.tagName.toLowerCase();
      try {
        var tid = node.getAttribute && node.getAttribute("data-testid");
        var aria = node.getAttribute && node.getAttribute("aria-label");
        if (tid) desc += '[data-testid="' + tid + '"]';
        else if (aria) desc += '[aria-label="' + String(aria).slice(0, 40) + '"]';
      } catch (e) {}
      chain.push(desc);
      node = node.parentElement;
    }
    return chain.join(" < ");
  }

  function mediaSessionCandidates() {
    var out = [];
    try {
      var nav = window.navigator || navigator;
      if (!nav || !nav.mediaSession || !nav.mediaSession.metadata) return out;
      var art = nav.mediaSession.metadata.artwork || [];
      for (var i = 0; i < art.length; i++) {
        if (!art[i] || !art[i].src) continue;
        out.push({
          source: "mediaSession:" + (art[i].sizes || "?"),
          src: art[i].src,
          sizesW: parseSizesWidth(art[i].sizes),
          naturalWidth: 0,
          confirmed: true,
        });
      }
    } catch (e) {}
    return out;
  }

  function imgRecord(img, source, withRect) {
    var src = "";
    var srcset = "";
    var alt = "";
    try {
      src = img.currentSrc || img.src || "";
      srcset = img.getAttribute ? img.getAttribute("srcset") || "" : "";
      alt = img.getAttribute ? img.getAttribute("alt") || "" : "";
    } catch (e) {}
    var best = parseSrcsetBest(srcset);
    var rec = {
      source: source,
      src: best.url || src,
      rawSrc: src,
      srcset: srcset,
      srcsetBest: best.width,
      naturalWidth: 0,
      naturalHeight: 0,
      renderedWidth: 0,
      renderedHeight: 0,
      alt: alt,
      ancestors: "",
      confirmed: source !== "elsewhere",
    };
    try {
      rec.naturalWidth = img.naturalWidth || 0;
      rec.naturalHeight = img.naturalHeight || 0;
    } catch (e) {}
    if (withRect) {
      try {
        var r = img.getBoundingClientRect();
        rec.renderedWidth = Math.round(r.width);
        rec.renderedHeight = Math.round(r.height);
        rec.ancestors = ancestorSummary(img, 5);
      } catch (e) {}
    }
    return rec;
  }

  function queryAllCapped(root, selector, cap) {
    try {
      if (!root || !root.querySelectorAll) return [];
      return Array.prototype.slice.call(root.querySelectorAll(selector), 0, cap || 60);
    } catch (e) {
      return [];
    }
  }

  // Cover-art images under a root. The player bar is track-specific (no
  // artist photos live there), so a generic <img> fallback is safe for it.
  // The NPV panel is NOT: it embeds artist photography, so it contributes
  // strictly cover-art-testid images or nothing at all.
  function coverImgs(root, cap, allowFallback) {
    var byTestid = queryAllCapped(
      root,
      'img[data-testid="' + TESTIDS.coverArt + '"]',
      cap
    );
    if (byTestid.length || !allowFallback) return byTestid;
    return queryAllCapped(root, "img", cap);
  }

  // Quick sweep: cheap scoped lookups, safe to run on every snapshot.
  function quickArtworkRecords() {
    var recs = mediaSessionCandidates();
    var root = findPlayer();
    if (root) {
      var imgs = coverImgs(root, 10, true);
      for (var i = 0; i < imgs.length; i++) {
        recs.push(imgRecord(imgs[i], "now-playing-bar", false));
      }
    }
    var panel = findNowPlayingPanel();
    if (panel && panel !== root) {
      var pimgs = coverImgs(panel, 10, false);
      for (var j = 0; j < pimgs.length; j++) {
        recs.push(imgRecord(pimgs[j], "now-playing-view", false));
      }
    }
    return recs;
  }

  function findNowPlayingPanel() {
    var panel = null;
    try {
      panel = document.querySelector('[data-testid="' + TESTIDS.npvPanel + '"]');
    } catch (e) {
      panel = null;
    }
    if (panel) return panel;
    // Fallback: aside/section labelled "Now playing" (desktop sidebar).
    try {
      var labelled = document.querySelectorAll(
        'aside[aria-label], section[aria-label], div[aria-label]'
      );
      for (var i = 0; i < labelled.length; i++) {
        var label = norm(labelled[i].getAttribute("aria-label"));
        if (label.indexOf("now playing") !== -1) {
          if (labelled[i].querySelector && labelled[i].querySelector("img")) {
            return labelled[i];
          }
        }
      }
    } catch (e) {}
    return null;
  }

  // Full sweep: quick sweep + document-wide i.scdn.co images. Only trusted
  // when the URL matches an already-confirmed current-track image.
  function fullArtworkRecords() {
    var recs = quickArtworkRecords();
    var confirmedUrls = {};
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].src) confirmedUrls[recs[i].src] = true;
      if (recs[i].rawSrc) confirmedUrls[recs[i].rawSrc] = true;
    }
    var all = [];
    try {
      all = queryAllCapped(document, 'img[src*="i.scdn.co/image/"]', 60);
    } catch (e) {
      all = [];
    }
    for (var j = 0; j < all.length; j++) {
      var rec = imgRecord(all[j], "elsewhere", false);
      var url = rec.src || rec.rawSrc;
      if (!url || confirmedUrls[url]) continue; // already covered above
      rec.confirmed = false;
      recs.push(rec);
    }
    return recs;
  }

  function artworkRank(rec) {
    // Real decoded pixels first, srcset/sizes claims second.
    if (rec.naturalWidth > 0) return rec.naturalWidth;
    if (rec.srcsetBest > 0) return Math.round(rec.srcsetBest * 0.9);
    if (rec.sizesW > 0) return Math.round(rec.sizesW * 0.9);
    return 0;
  }

  function sourcePriority(rec) {
    // mediaSession is authoritative track art with a DOM-churn-proof URL.
    if (rec.source.indexOf("mediaSession") === 0) return 4;
    if (rec.source.indexOf("now-playing") === 0) return 3;
    if (!rec.confirmed) return 0;
    return 1;
  }

  function rankArtwork(recs) {
    var scored = [];
    for (var i = 0; i < recs.length; i++) {
      var url = recs[i].src || recs[i].rawSrc;
      if (!url) continue;
      if (!recs[i].confirmed) continue; // diagnostics may show them; never select
      scored.push({ rec: recs[i], url: url, rank: artworkRank(recs[i]), pri: sourcePriority(recs[i]) });
    }
    scored.sort(function (a, b) {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return b.pri - a.pri;
    });
    return scored;
  }

  function currentTrackKey() {
    var t = "";
    var a = "";
    try {
      var tel = findTrackElement();
      var ael = findArtistElement();
      t = tel ? (tel.textContent || "").trim() : "";
      a = ael ? (ael.textContent || "").trim() : "";
    } catch (e) {}
    return t + " | " + a;
  }

  function selectBestArtwork() {
    var key = currentTrackKey();
    var hasTrack = key !== " | ";
    var now = Date.now();
    var quick = quickArtworkRecords();
    var sig = "";
    for (var i = 0; i < quick.length; i++) {
      sig += (quick[i].src || quick[i].rawSrc || "") + "#" + (quick[i].naturalWidth || 0) + ";";
    }
    var needFull =
      key !== lastArtKey ||
      sig !== lastQuickSig ||
      now - lastFullSweepAt > FULL_SWEEP_TTL_MS;
    var recs = quick;
    if (needFull) {
      recs = fullArtworkRecords();
      lastFullSweepAt = now;
      if (hasTrack) lastArtKey = key;
    }
    lastQuickSig = sig;
    var ranked = rankArtwork(recs);
    if (!ranked.length) {
      // Transient DOM gap: keep showing the pin rather than blanking.
      return { url: artPin.url || "", recs: recs };
    }
    // Empty/transient key (React mid-swap): never (re)pin, keep the pin.
    if (!hasTrack) {
      return { url: artPin.url || ranked[0].url, recs: recs };
    }
    // First sighting of this track: pin the best available right away.
    if (artPin.key !== key) {
      artPin = { key: key, url: ranked[0].url, pinnedAt: now };
      return { url: ranked[0].url, recs: recs };
    }
    // Same track, page still loading (mediaSession/NPV arrive late):
    // a better source may still win. Afterwards the pin freezes, so a
    // late larger artist variant can never steal the slot mid-track.
    if (now - artPin.pinnedAt < ART_UPGRADE_WINDOW_MS) {
      artPin.url = ranked[0].url;
      return { url: ranked[0].url, recs: recs };
    }
    for (var j = 0; j < ranked.length; j++) {
      if (ranked[j].url === artPin.url) {
        return { url: artPin.url, recs: recs };
      }
    }
    // Pinned URL vanished entirely (rare): re-pin the fresh best.
    artPin.url = ranked[0].url;
    return { url: ranked[0].url, recs: recs };
  }

  /**
   * Diagnostic: all discovered artwork sources for the current track,
   * sorted best-first, with resolutions. Unconfirmed lookalikes from
   * elsewhere in the page are included with confirmed:false (never
   * auto-selected) to aid debugging.
   */
  function getArtworkCandidates() {
    var recs = fullArtworkRecords();
    // Attach rendered dims + ancestor info for the shortlist only, so this
    // stays cheap even on huge pages. Re-resolve live elements by URL.
    var ranked = rankArtwork(recs);
    var out = [];
    var seen = {};
    function push(rec, confirmed) {
      var url = rec.src || rec.rawSrc;
      if (!url || seen[url]) return;
      seen[url] = true;
      out.push({
        source: rec.source,
        url: url,
        srcset: rec.srcset || "",
        naturalWidth: rec.naturalWidth || 0,
        naturalHeight: rec.naturalHeight || 0,
        renderedWidth: rec.renderedWidth || 0,
        renderedHeight: rec.renderedHeight || 0,
        alt: rec.alt || "",
        ancestors: rec.ancestors || "",
        rank: artworkRank(rec),
        confirmed: !!confirmed,
      });
    }
    // Confirmed first (ranked), then unconfirmed lookalikes for context.
    for (var i = 0; i < ranked.length; i++) push(ranked[i].rec, true);
    for (var j = 0; j < recs.length; j++) {
      if (!recs[j].confirmed) push(recs[j], false);
    }
    // Fill rendered dims for the top confirmed candidates via live lookup.
    try {
      var live = queryAllCapped(document, 'img[src*="i.scdn.co/image/"]', 60);
      var byUrl = {};
      for (var k = 0; k < live.length; k++) {
        var u = "";
        try {
          u = live[k].currentSrc || live[k].src || "";
        } catch (e) {}
        if (u && !byUrl[u]) byUrl[u] = live[k];
      }
      for (var m = 0; m < out.length && m < 12; m++) {
        var el = byUrl[out[m].url];
        if (!el) continue;
        try {
          var r = el.getBoundingClientRect();
          out[m].renderedWidth = Math.round(r.width);
          out[m].renderedHeight = Math.round(r.height);
          out[m].ancestors = ancestorSummary(el, 5);
          if (!out[m].naturalWidth) {
            out[m].naturalWidth = el.naturalWidth || 0;
            out[m].naturalHeight = el.naturalHeight || 0;
            out[m].rank = artworkRank(out[m]);
          }
        } catch (e) {}
      }
      out.sort(function (a, b) {
        if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
        return b.rank - a.rank;
      });
    } catch (e) {}
    return out;
  }

  function findArtworkElement() {
    // Legacy single-element lookup (kept for compatibility). New code
    // should use getArtwork()/getArtworkCandidates() instead.
    var root = findPlayer();
    var img =
      (root && root.querySelector
        ? root.querySelector('img[data-testid="' + TESTIDS.coverArt + '"]')
        : null) ||
      scopedQuery('img[data-testid="' + TESTIDS.coverArt + '"]');
    if (img) return img;
    var widget = findWidget();
    if (widget && widget.querySelector) {
      var anyImg = widget.querySelector("img");
      if (anyImg) return anyImg;
    }
    return null;
  }

  /* ---------- Sliders (progress / volume) ---------- */

  function findProgressSlider() {
    var root = findPlayer();
    var bar =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.progressBar + '"]')
        : null) || byTestId(TESTIDS.progressBar);
    if (bar) {
      var input = bar.querySelector ? bar.querySelector('input[type="range"]') : null;
      if (input) return input;
      var slider = bar.querySelector ? bar.querySelector('[role="slider"]') : null;
      if (slider) return slider;
    }
    // Fallback: slider near time displays inside player.
    if (root && root.querySelectorAll) {
      var ranges = root.querySelectorAll('input[type="range"]');
      for (var i = 0; i < ranges.length; i++) {
        var aria = norm(ranges[i].getAttribute("aria-label"));
        if (!includesAny(aria, LABELS.volume)) return ranges[i];
      }
      if (ranges.length) return ranges[0];
      var roles = root.querySelectorAll('[role="slider"]');
      for (var j = 0; j < roles.length; j++) {
        var ra = norm(roles[j].getAttribute("aria-label"));
        if (!includesAny(ra, LABELS.volume)) return roles[j];
      }
    }
    return null;
  }

  function findVolumeSlider() {
    var root = findPlayer();
    var bar =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.volumeBar + '"]')
        : null) || byTestId(TESTIDS.volumeBar);
    if (bar && bar.querySelector) {
      var input = bar.querySelector('input[type="range"]') || bar.querySelector('[role="slider"]');
      if (input) return input;
    }
    if (root && root.querySelectorAll) {
      var ranges = root.querySelectorAll('input[type="range"]');
      for (var i = 0; i < ranges.length; i++) {
        var aria = norm(ranges[i].getAttribute("aria-label"));
        if (includesAny(aria, LABELS.volume) || includesAny(aria, LABELS.mute)) return ranges[i];
      }
      // Convention: volume is the LAST range slider in the player bar.
      if (ranges.length > 1) return ranges[ranges.length - 1];
    }
    return null;
  }

  function findMuteButton() {
    var root = findPlayer();
    var btns = scopedAll("button");
    for (var i = 0; i < btns.length; i++) {
      var label = norm(btns[i].getAttribute("aria-label"));
      if (includesAny(label, LABELS.mute) || includesAny(label, LABELS.unmute)) {
        // Must be near the volume slider to avoid false positives.
        if (!root || root.contains(btns[i])) return btns[i];
      }
    }
    return null;
  }

  function sliderNumbers(el) {
    if (!el) return null;
    var now = el.getAttribute("aria-valuenow");
    var max = el.getAttribute("aria-valuemax");
    var text = el.getAttribute("aria-valuetext");
    if (now !== null || max !== null) {
      return { now: parseFloat(now), max: parseFloat(max), text: text };
    }
    if (el.tagName === "INPUT") {
      return {
        now: parseFloat(el.value),
        max: parseFloat(el.max || el.getAttribute("max")),
        text: null,
      };
    }
    return null;
  }

  function parseTimeString(s) {
    if (!s) return NaN;
    var m = String(s).match(/(\d+):(\d{2})(?::(\d{2}))?/);
    if (!m) return NaN;
    if (m[3] !== undefined) {
      return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
    }
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function findTimeTexts() {
    var root = findPlayer();
    var posEl =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.progressPosition + '"]')
        : null) || byTestId(TESTIDS.progressPosition);
    var durEl =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.progressDuration + '"]')
        : null) || byTestId(TESTIDS.progressDuration);
    if (posEl || durEl) return { posEl: posEl, durEl: durEl };
    // Fallback: collect time-like texts inside the player.
    if (root && root.querySelectorAll) {
      var all = root.querySelectorAll("span, div");
      var times = [];
      for (var i = 0; i < all.length; i++) {
        var t = (all[i].textContent || "").trim();
        if (/^-?\d+:\d{2}$/.test(t) && (all[i].childElementCount === 0)) {
          times.push(all[i]);
        }
      }
      if (times.length >= 2) return { posEl: times[0], durEl: times[times.length - 1] };
      if (times.length === 1) return { posEl: times[0], durEl: null };
    }
    return { posEl: null, durEl: null };
  }

  /* ---------- Read state ---------- */

  function getDuration() {
    var slider = findProgressSlider();
    var nums = sliderNumbers(slider);
    if (nums && isFinite(nums.max) && nums.max > 0) {
      // Spotify progress uses milliseconds.
      if (nums.max > 1000) return Math.round(nums.max / 1000);
      return Math.round(nums.max);
    }
    var texts = findTimeTexts();
    if (texts.durEl) {
      var d = parseTimeString(texts.durEl.textContent);
      if (isFinite(d)) return d;
    }
    // Slider text fallback: "0:42 of 3:21".
    if (nums && nums.text) {
      var parts = String(nums.text).match(/(\d+:\d{2}).*?(\d+:\d{2})/);
      if (parts) {
        var dd = parseTimeString(parts[2]);
        if (isFinite(dd)) return dd;
      }
    }
    return 0;
  }

  function getCurrentTime() {
    var slider = findProgressSlider();
    var nums = sliderNumbers(slider);
    var dur = getDuration();
    if (nums && isFinite(nums.now)) {
      if (nums.max > 1000) return Math.min(Math.round(nums.now / 1000), dur || 1e9);
      // Volume-like 0..1 sliders are never returned here, but guard anyway.
      if (nums.max <= 2 && dur > 10) return Math.round(nums.now * dur);
      return Math.round(nums.now);
    }
    var texts = findTimeTexts();
    if (texts.posEl) {
      var t = parseTimeString(texts.posEl.textContent);
      if (isFinite(t)) return t;
    }
    return 0;
  }

  function isPlaying() {
    var btn = findToggleButton();
    if (!btn) return false;
    var label = norm(btn.getAttribute("aria-label"));
    if (/paus/.test(label)) return true; // Pause/Pausa/Pausar/... => currently playing
    if (
      label === "play" ||
      label.indexOf("play") !== -1 ||
      label.indexOf("reproduc") !== -1 ||
      label.indexOf("reproduz") !== -1 ||
      label.indexOf("lecture") !== -1 ||
      label.indexOf("abspielen") !== -1 ||
      label.indexOf("wiedergabe") !== -1
    ) {
      return false;
    }
    // Unknown locale: fall back to document.title convention
    // ("Artist • Title" usually means something is loaded, not playing) — so
    // default to false rather than inventing state.
    return false;
  }

  function isShuffleEnabled() {
    var btn = findPlayerButton("shuffle");
    if (!btn) return false;
    var checked = btn.getAttribute("aria-checked");
    if (checked !== null) return checked === "true";
    var active = btn.getAttribute("data-active");
    if (active !== null) return active === "true";
    var label = norm(btn.getAttribute("aria-label"));
    // When shuffle is ON, Spotify offers to disable it.
    if (label.indexOf("disable") !== -1 || label.indexOf("desactivar") !== -1 ||
        label.indexOf("désactiver") !== -1 || label.indexOf("deaktivieren") !== -1) {
      return true;
    }
    return false;
  }

  function getRepeatMode() {
    var btn = findPlayerButton("repeat");
    if (!btn) return "off";
    var checked = btn.getAttribute("aria-checked");
    // Some builds: aria-checked false=off, true=context, mixed=track.
    if (checked === "mixed") return "track";
    if (checked === "true") return "context";
    var label = norm(btn.getAttribute("aria-label"));
    if (label.indexOf("disable") !== -1 || label.indexOf("desactivar") !== -1 ||
        label.indexOf("désactiver") !== -1 || label.indexOf("deaktivieren") !== -1) {
      return "track";
    }
    if (label.indexOf("one") !== -1 || label.indexOf("uno") !== -1 || label.indexOf("un seul") !== -1) {
      return "context"; // offers "repeat one" => currently repeating context
    }
    if (checked !== null) return checked === "true" ? "context" : "off";
    return "off";
  }

  function isLiked() {
    var btn = findLikeButton();
    if (!btn) return false;
    var checked = btn.getAttribute("aria-checked");
    if (checked !== null) return checked === "true";
    var label = norm(btn.getAttribute("aria-label"));
    return includesAny(label, LABELS.likeRemove);
  }

  function getVolume() {
    var slider = findVolumeSlider();
    var nums = sliderNumbers(slider);
    if (nums && isFinite(nums.now) && isFinite(nums.max) && nums.max > 0) {
      var v = nums.now / nums.max;
      if (nums.max <= 1.01 && nums.now <= 1.01) v = nums.now; // 0..1 slider
      return Math.max(0, Math.min(1, v));
    }
    return 1;
  }

  function getSnapshot() {
    var trackEl = findTrackElement();
    var artistEl = findArtistElement();
    var track = trackEl ? (trackEl.textContent || "").trim() : "";
    var artist = artistEl ? (artistEl.textContent || "").trim() : "";
    var artwork = "";
    try {
      artwork = selectBestArtwork().url || "";
    } catch (e) {
      var artEl = findArtworkElement();
      artwork = artEl ? artEl.currentSrc || artEl.src || "" : "";
    }
    var duration = getDuration();
    var currentTime = getCurrentTime();
    if (duration && currentTime > duration) currentTime = duration;
    return {
      playerReady: !!findPlayer() && !!findToggleButton(),
      track: track,
      artist: artist,
      artwork: artwork,
      currentTime: currentTime,
      duration: duration,
      isPlaying: isPlaying(),
      shuffle: isShuffleEnabled(),
      repeat: getRepeatMode(),
      liked: isLiked(),
      volume: getVolume(),
      muted: getVolume() <= 0.001,
    };
  }

  /* ---------- Write actions ---------- */

  function click(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  function setNativeRangeValue(input, value) {
    if (!input) return false;
    try {
      var proto = window.HTMLInputElement && window.HTMLInputElement.prototype;
      var desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
      if (input.tagName === "INPUT" && desc && desc.set) {
        desc.set.call(input, String(value));
      } else {
        input.value = String(value);
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      try {
        input.value = String(value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function seekBySlider(seconds, slider) {
    if (!slider || !isFinite(seconds)) return false;
    var nums = sliderNumbers(slider);
    var max = nums && isFinite(nums.max) ? nums.max : NaN;
    var target;
    if (isFinite(max) && max > 1000) {
      target = Math.round(seconds * 1000); // ms scale
      target = Math.max(0, Math.min(max, target));
    } else if (isFinite(max) && max > 2) {
      target = Math.max(0, Math.min(max, Math.round(seconds)));
    } else {
      return false;
    }
    if (slider.tagName === "INPUT") {
      return setNativeRangeValue(slider, target);
    }
    // role="slider" fallback: keyboard interaction.
    try {
      slider.focus();
    } catch (e) {}
    var dur = getDuration() || 1;
    var cur = getCurrentTime();
    var ratio = Math.max(0, Math.min(1, seconds / dur));
    // Arrow keys move in small steps — only useful for small jumps.
    var diff = ratio - (dur ? cur / dur : 0);
    var presses = Math.min(40, Math.round(Math.abs(diff) * 40));
    var key = diff >= 0 ? "ArrowRight" : "ArrowLeft";
    for (var i = 0; i < presses; i++) {
      slider.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
      slider.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true }));
    }
    return presses > 0;
  }

  /* ---------- Environment / viewport diagnostics ----------
   *
   * Why this exists: on phones (e.g. Quetta Android) Spotify serves its
   * DESKTOP layout inside a wide layout viewport that the browser then
   * scales down to fit the glass. Our player must know the real numbers:
   *
   *  window.innerWidth / innerHeight ..... layout viewport (CSS px, wide!)
   *  documentElement.clientWidth/Height ... same, minus scrollbars
   *  visualViewport.width/height/scale ... what's actually visible
   *  screen.width/height ................. the physical glass (CSS px)
   *  devicePixelRatio .................... physical px per CSS px
   *
   * Typical desktop: layout ~= visual ~= window, zoom = 1 (no-op).
   * Typical phone w/ desktop site: layout ~980-1280, visual/screen ~360-430,
   *   so zoom = layout/visible ~ 2.5-3.5 compensates exactly, with no
   *   hardcoded phone resolution anywhere.
   */

  function getViewportInfo() {
    var docEl = document.documentElement;
    var innerW = window.innerWidth || 0;
    var innerH = window.innerHeight || 0;
    var clientW = (docEl && docEl.clientWidth) || 0;
    var clientH = (docEl && docEl.clientHeight) || 0;
    var vv = null;
    try {
      vv = window.visualViewport || null;
    } catch (e) {
      vv = null;
    }
    var visualW = (vv && vv.width) || innerW;
    var visualH = (vv && vv.height) || innerH;
    var visualScale = (vv && vv.scale) || 1;
    var dpr = window.devicePixelRatio || 1;
    var screenW = 0;
    var screenH = 0;
    try {
      if (window.screen) {
        screenW = window.screen.width || 0;
        screenH = window.screen.height || 0;
      }
    } catch (e) {}
    var layoutW = clientW || innerW;
    var layoutH = clientH || innerH;
    // Two independent estimators of "layout px per visible px":
    //  est1 catches pinch-zoom / overview-scale (visual shrinks vs layout),
    //  est2 catches desktop-site-fit (layout wider than the glass itself).
    var est1 = visualW > 0 ? layoutW / visualW : 1;
    var est2 = screenW > 0 ? layoutW / screenW : 1;
    var raw = Math.max(1, est1, est2);
    var zoomActive = raw > 1.12;
    // Upper clamp is overflow protection, not a device preset: anything
    // above 4x would push a 380px card past any real layout viewport.
    var zoom = zoomActive ? Math.min(4, raw) : 1;
    var sheetW = visualW || innerW || screenW || layoutW;
    var sheetH = visualH || innerH || screenH || layoutH;
    // Sheet mode follows the GLASS when we are compensating (the visual
    // viewport may report the wide layout width in overview mode), else
    // the visible width (covers desktop narrow windows + pinch-zoom).
    var sheetBasis = zoomActive && screenW > 0 ? Math.min(sheetW, screenW) : sheetW;
    var reason = "none (layout ~= visible)";
    if (zoomActive) {
      reason =
        (est1 >= est2
          ? "visualViewport narrower than layout (pinch/overview scale)"
          : "layout viewport wider than screen glass (desktop-site fit)") +
        (raw > 4 ? " [zoom clamped 4x]" : "");
    }
    function round2(n) {
      return Math.round(n * 100) / 100;
    }
    return {
      innerWidth: innerW,
      innerHeight: innerH,
      clientWidth: clientW,
      clientHeight: clientH,
      visualWidth: Math.round(visualW),
      visualHeight: Math.round(visualH),
      visualScale: round2(visualScale),
      devicePixelRatio: round2(dpr),
      screenWidth: screenW,
      screenHeight: screenH,
      layoutWidth: layoutW,
      layoutHeight: layoutH,
      estimatorVisual: round2(est1),
      estimatorScreen: round2(est2),
      zoom: round2(zoom),
      zoomActive: zoomActive,
      sheet: sheetBasis > 0 && sheetBasis < 640,
      sheetWidth: Math.round(sheetW),
      sheetHeight: Math.round(sheetH),
      reason: reason,
    };
  }

  /* ---------- Change notification ---------- */

  function snapshotKey(s) {
    return [s.track, s.artist, s.artwork, s.isPlaying, s.shuffle, s.repeat, s.liked, s.duration, s.playerReady].join("|");
  }

  function emit(manual) {
    var snap;
    try {
      snap = getSnapshot();
    } catch (e) {
      return;
    }
    var key = snapshotKey(snap);
    // Time/volume change every second — notify on a 1s cadence too so the
    // progress bar stays fresh even without DOM mutations.
    if (key !== lastSnapshotKey || manual === true) {
      lastSnapshotKey = key;
      subscribers.forEach(function (cb) {
        try {
          cb(snap);
        } catch (e) {}
      });
    } else {
      subscribers.forEach(function (cb) {
        try {
          cb(snap, true);
        } catch (e) {}
      });
    }
  }

  var emitDebounced = (function () {
    var t = null;
    return function () {
      if (t) return;
      t = setTimeout(function () {
        t = null;
        emit(false);
      }, 150);
    };
  })();

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    try {
      observer = new MutationObserver(function (mutations) {
        var relevant = false;
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === "attributes") {
            if (
              m.attributeName === "aria-label" ||
              m.attributeName === "aria-checked" ||
              m.attributeName === "aria-valuenow" ||
              m.attributeName === "aria-valuetext" ||
              m.attributeName === "src" ||
              m.attributeName === "data-active" ||
              m.attributeName === "disabled"
            ) {
              relevant = true;
              break;
            }
          } else if (m.type === "childList") {
            relevant = true;
            break;
          }
        }
        if (relevant) emitDebounced();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "aria-label",
          "aria-checked",
          "aria-valuenow",
          "aria-valuetext",
          "src",
          "data-active",
          "disabled",
        ],
      });
    } catch (e) {
      observer = null;
    }
    // Light fallback: re-check at most every 2s, only does work when the
    // player is missing or tracks change. Backs off to 5s once stable.
    var stableTicks = 0;
    function tick() {
      try {
        var root = findPlayer();
        if (!root) {
          stableTicks = 0;
          emitDebounced();
          fallbackTimer = setTimeout(tick, 2000);
          return;
        }
        stableTicks++;
        emit(false);
        fallbackTimer = setTimeout(tick, stableTicks > 10 ? 5000 : 2000);
      } catch (e) {
        fallbackTimer = setTimeout(tick, 2000);
      }
    }
    fallbackTimer = setTimeout(tick, 1500);
  }

  /* ---------- Public API ---------- */

  var spotify = {
    // Lifecycle
    findPlayer: findPlayer,
    isReady: function () {
      return !!findPlayer() && !!findToggleButton();
    },
    waitForPlayer: function (timeoutMs) {
      var timeout = timeoutMs || 30000;
      return new Promise(function (resolve) {
        if (spotify.isReady()) {
          resolve(true);
          return;
        }
        var done = false;
        var to = setTimeout(function () {
          if (!done) {
            done = true;
            if (obs) obs.disconnect();
            resolve(spotify.isReady());
          }
        }, timeout);
        var obs = null;
        try {
          obs = new MutationObserver(function () {
            if (spotify.isReady() && !done) {
              done = true;
              clearTimeout(to);
              obs.disconnect();
              resolve(true);
            }
          });
          obs.observe(document.documentElement, { childList: true, subtree: true });
        } catch (e) {
          clearTimeout(to);
          resolve(spotify.isReady());
        }
      });
    },
    subscribe: function (cb) {
      subscribers.add(cb);
      try {
        cb(getSnapshot(), false);
      } catch (e) {}
      return function () {
        subscribers.delete(cb);
      };
    },

    // Transport
    play: function () {
      if (isPlaying()) return true;
      return click(findToggleButton());
    },
    pause: function () {
      if (!isPlaying()) return true;
      return click(findToggleButton());
    },
    togglePlay: function () {
      return click(findToggleButton());
    },
    next: function () {
      return click(findPlayerButton("next"));
    },
    previous: function () {
      return click(findPlayerButton("previous"));
    },

    // Modes
    toggleShuffle: function () {
      return click(findPlayerButton("shuffle"));
    },
    toggleRepeat: function () {
      return click(findPlayerButton("repeat"));
    },
    toggleLike: function () {
      return click(findLikeButton());
    },

    // Side panel shortcuts. Return false when Spotify has no such control
    // (e.g. logged out) so the UI can hide/disable the button.
    openLyrics: function () {
      return click(findSideButton("lyrics"));
    },
    openQueue: function () {
      return click(findSideButton("queue"));
    },
    openDevices: function () {
      return click(findSideButton("device"));
    },

    // Volume
    setVolume: function (value01) {
      var v = Math.max(0, Math.min(1, Number(value01)));
      if (!isFinite(v)) return false;
      var slider = findVolumeSlider();
      if (!slider) return false;
      if (slider.tagName === "INPUT") {
        var nums = sliderNumbers(slider);
        var max = nums && isFinite(nums.max) ? nums.max : 1;
        var target;
        if (max > 1.01) target = Math.round(v * max);
        else if (max > 0) target = v * max;
        else target = v;
        return setNativeRangeValue(slider, target);
      }
      return false;
    },
    toggleMute: function () {
      var muteBtn = findMuteButton();
      if (muteBtn) return click(muteBtn);
      // Fallback: stash + zero the volume slider.
      var slider = findVolumeSlider();
      if (!slider) return false;
      var nums = sliderNumbers(slider);
      if (nums && nums.now > 0) {
        try {
          slider.dataset.spmPrev = String(nums.now);
        } catch (e) {}
        return setNativeRangeValue(slider, 0);
      }
      var prev = slider.dataset ? parseFloat(slider.dataset.spmPrev) : NaN;
      var max = nums && isFinite(nums.max) ? nums.max : 1;
      return setNativeRangeValue(slider, isFinite(prev) && prev > 0 ? prev : max);
    },

    // Seeking
    seek: function (seconds) {
      var s = Number(seconds);
      if (!isFinite(s) || s < 0) return false;
      var slider = findProgressSlider();
      if (slider) {
        if (seekBySlider(s, slider)) return true;
      }
      // Last resort: click at ratio on the progress bar container.
      var bar = byTestId(TESTIDS.progressBar) || (slider && slider.parentElement);
      if (bar) {
        var dur = getDuration();
        if (!dur) return false;
        var r = bar.getBoundingClientRect();
        if (r.width <= 0) return false;
        var x = r.left + (s / dur) * r.width;
        var y = r.top + r.height / 2;
        function fire(type) {
          bar.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              clientX: x,
              clientY: y,
              pointerId: 1,
            })
          );
          bar.dispatchEvent(
            new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
          );
        }
        try {
          fire("pointerdown");
          fire("mousedown");
          fire("pointerup");
          fire("mouseup");
          fire("click");
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    },

    // Getters (used by the UI + progress loop)
    getCurrentTrack: function () {
      var el = findTrackElement();
      return el ? (el.textContent || "").trim() : "";
    },
    getCurrentArtist: function () {
      var el = findArtistElement();
      return el ? (el.textContent || "").trim() : "";
    },
    getArtwork: function () {
      try {
        return selectBestArtwork().url || "";
      } catch (e) {
        var el = findArtworkElement();
        return el ? el.currentSrc || el.src || "" : "";
      }
    },
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    isPlaying: isPlaying,
    isShuffleEnabled: isShuffleEnabled,
    getRepeatMode: getRepeatMode,
    isLiked: isLiked,
    getVolume: getVolume,
    isMuted: function () {
      return getVolume() <= 0.001;
    },
    getSnapshot: getSnapshot,
    getArtworkCandidates: getArtworkCandidates,
    getViewportInfo: getViewportInfo,

    // Internal discovery helpers (kept public for diagnostics/tests only).
    _findPlayerButton: findPlayerButton,
    _findProgressSlider: findProgressSlider,
    _findVolumeSlider: findVolumeSlider,
  };

  // Auto-start observation as soon as the DOM is usable.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  window.SpotMobile = window.SpotMobile || {};
  window.SpotMobile.spotify = spotify;
})();
