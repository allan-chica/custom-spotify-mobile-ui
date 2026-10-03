// Probe: the playing-from context label is the playlist/album header, not
// the song's own album.
// The Now Playing view sidebar carries the playing-from header as its FIRST
// link, bound to the track (?uid=…&uri=spotify:track:…); the player-bar aside
// comes first in DOM order and leads with the track's own album link. A
// naive first-match read reports the album — the adapter must prefer the
// track-bound header link instead, and hand openContext() the same target.
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  let fails = 0;
  const ok = (c, m) => { if (!c) fails++; out.push((c ? "PASS  " : "FAIL  ") + m); };

  const $ = (s) => document.querySelector("#spm-root " + s);

  async function waitFor(fn, ms, label) {
    const t0 = Date.now();
    for (;;) {
      try { if (fn()) return true; } catch (e) {}
      if (Date.now() - t0 > (ms || 8000)) { out.push("TIMEOUT waiting for " + label); return false; }
      await sleep(100);
    }
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-coverlyr-toggle"),
    12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";
  const sp = window.SpotMobile.spotify;

  // --- the label is the playlist header, with its href ---
  const ctx = sp.getPlaybackContext();
  ok(!!ctx && ctx.text === "Harness Playlist",
    "context label is the playing-from playlist (got \"" + (ctx && ctx.text) + "\")");
  ok(!!ctx && ctx.href === "/playlist/pl-ctx",
    "context href is the playlist, params stripped (got \"" + (ctx && ctx.href) + "\")");
  ok(!!ctx && ctx.text !== "Wrong Album" && (ctx.href || "").indexOf("/album/") !== 0,
    "player-bar album link never wins despite DOM order");

  // --- the same target flows into the snapshot the card renders ---
  const snap = sp.getSnapshot();
  ok(!!snap && snap.context === "Harness Playlist",
    "snapshot context matches the header");

  // --- a track switch re-reads (no stale-element crash, no stuck cache) ---
  window.harness.setTrack("other-track", "Other Track");
  await sleep(600);
  const ctx2 = sp.getPlaybackContext();
  ok(!!ctx2 && ctx2.text === "Harness Playlist" && ctx2.href === "/playlist/pl-ctx",
    "context re-resolves after a track switch");

  // --- sidebar gone: never show the song title as the context ---
  // With no view aside, the widget's song-titled album link is all that is
  // left — it must not leak through as the label.
  document.getElementById("fake-npv").remove();
  document.getElementById("fake-player-aside").remove();
  window.harness.setTrack("ghost-track", "Ghost Track");
  await sleep(600);
  const ctx3 = sp.getPlaybackContext();
  ok(!!ctx3 && ctx3.text === "" && (ctx3.text || "") !== "Ghost Track",
    "no view, no mediaSession album: honest empty, never the song title (got \"" +
    (ctx3 && ctx3.text) + "\")");

  // --- widget album fallback: album name (not song title) + album link ---
  // The widget's song-titled link still carries the current track's album
  // URL; mediaSession names that album. Each half comes from its own source.
  window.harness.setTrack("ghost-two", "Ghost Two");
  const trackLink = document.getElementById("np-track-link");
  if (trackLink) trackLink.setAttribute("href", "/album/album-song");
  try {
    const md = new MediaMetadata({
      title: "Ghost Two", artist: "Ghost Artist", album: "Harness Album Disc",
    });
    try {
      navigator.mediaSession.metadata = md;
    } catch (e1) {}
    if (!navigator.mediaSession.metadata ||
        navigator.mediaSession.metadata.album !== "Harness Album Disc") {
      Object.defineProperty(navigator.mediaSession, "metadata",
        { value: md, configurable: true });
    }
  } catch (e) {}
  await sleep(600);
  const ctx4 = sp.getPlaybackContext();
  ok(!!ctx4 && ctx4.text === "Harness Album Disc",
    "fallback labels the album, not the song (got \"" + (ctx4 && ctx4.text) + "\")");
  ok(!!ctx4 && ctx4.href === "/album/album-song",
    "fallback links the album (got \"" + (ctx4 && ctx4.href) + "\")");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
