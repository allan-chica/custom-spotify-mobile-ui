// Probe: the FALLBACK path (library scrape + tippy submenu), which is what
// produces the wrong playlist list when the curation sheet cannot be read.
// Forces it by hiding the curation button (harness mode "nocuration") and
// asserts the merged list has no duplicates and no rows without an id.
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  let fails = 0;
  const ok = (c, m) => { if (!c) fails++; out.push((c ? "PASS  " : "FAIL  ") + m); };
  const norm = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase();

  async function waitFor(fn, ms, label) {
    const t0 = Date.now();
    for (;;) {
      try { if (fn()) return true; } catch (e) {}
      if (Date.now() - t0 > (ms || 8000)) { out.push("TIMEOUT waiting for " + label); return false; }
      await sleep(120);
    }
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile &&
    document.querySelector("#spm-root .spm-like"), 12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";

  const h = window.harness;
  const sp = window.SpotMobile.spotify;

  // ---- 1. curation path: names must be clean (no " • Playlist" suffix) ----
  h.setPlaylistMode("check");
  h.setTrack("harness", "Real Track");
  h.setLiked("harness", true);
  let list = await sp.getPlaylists({ fresh: true });
  out.push("--- curation source ---");
  (list || []).forEach((p) => out.push("  " + (p.containsTrack ? "[x] " : "[ ] ") +
    JSON.stringify(p.id) + "  " + JSON.stringify(p.name) + "  sub=" + JSON.stringify(p.subtitle)));
  ok(sp.getPlaylistsState().viaCuration === true, "curation source used");
  ok(!!list && list.length === 5, "5 rows from the sheet");
  ok((list || []).every((p) => !/•/.test(p.name || "")),
     "no playlist name carries a bullet suffix");

  // ---- 2. fallback path: library scrape + submenu merge ----
  h.setPlaylistMode("nocuration");   // curation button is display:none
  h.setLiked("harness", true);
  list = await sp.getPlaylists({ fresh: true });
  const st = sp.getPlaylistsState();
  out.push("--- fallback source (nocuration) ---");
  (list || []).forEach((p) => out.push("  " + (p.containsTrack ? "[x] " : "[ ] ") +
    JSON.stringify(p.id) + "  " + JSON.stringify(p.name) + "  sub=" + JSON.stringify(p.subtitle)));
  out.push("  viaCuration=" + st.viaCuration + " ok=" + st.ok + " reason=" + JSON.stringify(st.reason));

  ok(st.viaCuration === false, "fallback really engaged (viaCuration=false)");
  ok(!!list && list.length >= 2, "fallback returned a list");

  const names = {};
  (list || []).forEach((p) => { names[norm(p.name)] = (names[norm(p.name)] || 0) + 1; });
  const dupes = Object.keys(names).filter((n) => names[n] > 1);
  out.push("  duplicate names: " + JSON.stringify(dupes));
  ok(!dupes.length, "no duplicated playlist rows after the library+submenu merge");

  const idless = (list || []).filter((p) => !p.id && !p.isLikedSongs);
  out.push("  rows without an id: " + JSON.stringify(idless.map((p) => p.name)));
  ok(!idless.length, "every fallback row carries a usable id (toggleable)");

  const needId = (list || []).filter((p) => !p.isLikedSongs);
  ok(needId.every((p) => p.href === "/playlist/" + p.id),
     "every fallback href matches its id");
  ok(needId.every((p) => /^spotify:playlist:/.test(p.uri || "")),
     "every fallback row carries an exact spotify: uri");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()