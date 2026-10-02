// Probe: track switch with a lazy lyrics section.
// Spotify doesn't always touch its lyrics DOM on a track change: the
// section can strand the old song's rows with no flips flowing. The UI must
// not blank or crash (honest stale paint), and the adapter must notice the
// new key, re-baseline, and warm the section so the new song's lines arrive
// and track — all with zero manual opens.
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
      await sleep(250);
    }
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-lyrics-open"),
    12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";

  const h = window.harness;
  const sp = window.SpotMobile.spotify;

  const OLD = ["old one", "old two", "", "old three", "old four", "old five", "old six", "old seven"];
  const NEW = ["new one", "new two", "", "new three", "new four", "new five", "new six", "new seven"];
  h.setLyrics(OLD, 1);
  document.getElementById("np-toggle").click(); // playing
  await sleep(300);
  h.advanceLyrics(); // active -> 3, flowing
  await sleep(500);

  // Register the new song's set, then switch WITHOUT touching lyrics DOM.
  h.setTrackLyrics("track2", NEW, 1);
  h.setTrack("track2", "New Track");
  await sleep(1500);

  // --- honest stale paint: new key adopted, old rows shown, nothing blank ---
  const stSwitch = sp.getLyricsState();
  ok(!!stSwitch && (stSwitch.trackKey || "").indexOf("New Track") !== -1,
    "adapter follows the player to the new key (" + (stSwitch && stSwitch.trackKey) + ")");
  const shownStale = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-lyrics-line"),
    (e) => (e.textContent || "").trim()
  );
  ok(shownStale.length > 0, "preview keeps showing rows (no blank/crash on switch)");

  // --- warmup notices the cold new key and primes it on its own ---
  const warmed = await waitFor(() => {
    try {
      return (sp.inspectLyrics().log || []).some((e) => e.ev === "warm-start");
    } catch (e) { return false; }
  }, 45000, "warmup for the new track");
  ok(warmed, "warmup fires for the lyrics-less new track");
  ok(h.lyricsFullscreenOpen(), "warmup opened Spotify's view to prime it");

  // --- new song's lines arrive and track, untouched by hand ---
  h.advanceLyrics(); // dialog rows move (shared advance repaints visible hosts)
  const followed = await waitFor(() => {
    const rows = Array.prototype.map.call(
      document.querySelectorAll("#spm-root .spm-lyrics-line"),
      (e) => (e.textContent || "").trim()
    );
    return rows.some((t) => t === "new three" || t === "new four" || t === "new five") ? true : null;
  }, 8000, "new-track lines track");
  ok(followed, "preview tracks the NEW song after self-priming");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
