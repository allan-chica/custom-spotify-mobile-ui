// Probe: our own Add-to-playlist sheet, end to end.
//   - taps our heart, asserts the sheet lists EVERY playlist
//   - stages a row and presses Done, verified against the harness's server-side
//     membership, and checks no native menu leaked behind the sheet
//   - a snapshot arriving mid-edit (artist text loading after the title, a
//     trackless glitch) must NOT blank the sheet or discard the staged draft —
//     that is what made staging look random on a phone.
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

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-like"),
    12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";

  const h = window.harness;
  const sp = window.SpotMobile.spotify;

  // Deterministic fixture. The harness ids are hyphenated on purpose: they
  // catch an id-truncating regex, which real base62 ids would hide.
  h.setPlaylistMode("check");
  h.setTrack("harness", "Real Track");
  h.setLiked("harness", true);
  h.setMembership("harness", "pl-fav", true);
  h.setMembership("harness", "pl-gym", false);

  const list = await sp.getPlaylists({ fresh: true });
  out.push("--- adapter read: " + (list ? list.length : 0) + " rows ---");
  (list || []).forEach((p) => {
    out.push("  " + (p.containsTrack ? "[x] " : "[ ] ") + JSON.stringify(p.id) + "  " + p.name +
      "  href=" + p.href);
  });
  ok(!!list && list.length === 5, "adapter returns Liked + all 4 playlists (expected 5)");
  ok(!!list && list[0] && list[0].isLikedSongs, "Liked first");
  const p1 = (list || []).filter((p) => p.id === "pl-fav")[0];
  ok(!!p1, "playlist id pl-fav parsed whole (not truncated to 'pl')");
  ok(!!p1 && p1.uri === "spotify:playlist:pl-fav", "exact uri preserved");
  ok(!!p1 && p1.href === "/playlist/pl-fav", "href matches the id");
  ok(!!p1 && p1.containsTrack === true, "pl-fav membership read from the row's aria-checked");
  ok(!!p1 && p1.name === "Favorites", "pl-fav name parsed from the inner listRow");
  const p3 = (list || []).filter((p) => p.id === "pl-gym")[0];
  ok(!!p3 && p3.containsTrack === false, "unchecked playlist reports containsTrack=false");
  ok((list || []).every((p) => !!(p.id || p.isLikedSongs)), "every row has a usable id");

  // --- our own UI: tap the heart on a SAVED track -> our sheet opens ---
  const heart = $(".spm-like");
  heart.click();
  const opened = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-psheet");
    return s && !s.hasAttribute("hidden") && s.getAttribute("aria-hidden") !== "true";
  }, 8000, "our Add-to-playlist sheet");
  ok(opened, "our own sheet opens from the heart");

  const rowsIn = await waitFor(() =>
    document.querySelectorAll("#spm-root .spm-plist .spm-pitem").length > 0, 8000, "sheet rows");
  const shown = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-plist .spm-pitem"),
    (el) => (el.textContent || "").replace(/\s+/g, " ").trim()
  );
  out.push("--- our sheet shows ---");
  shown.forEach((s) => out.push("  " + s));
  ok(rowsIn, "sheet rendered playlist rows");
  ok(shown.length === (list ? list.length : 0),
    "sheet row count matches the adapter list (" + shown.length + " vs " + (list ? list.length : 0) + ")");
  ok(shown.some((s) => /Liked/.test(s)), "sheet shows Liked Songs");
  ok(shown.some((s) => /Favorites/.test(s)),
    "sheet shows Favorites (the sheet's list, not the library's wrong list)");
  ok(shown.some((s) => /Chill/.test(s)) && shown.some((s) => /Gym/.test(s)) &&
    shown.some((s) => /Road Trip/.test(s)),
    "sheet shows ALL playlists, including ones off-screen in the sheet");

  // --- stage pl-gym ON + Done, through our sheet's real controls ---
  const gymRow = () => Array.prototype.filter.call(
    document.querySelectorAll("#spm-root .spm-plist .spm-pitem"),
    (el) => /Gym/.test(el.textContent || "")
  )[0];

  const item = gymRow();
  if (!item) {
    ok(false, "could not find the Gym row to stage");
  } else {
    const rowBtn = item.querySelector(".spm-prow");
    ok(!!rowBtn, "found the tappable row button for Gym");
    ok(rowBtn && rowBtn.getAttribute("aria-pressed") === "false", "Gym starts unchecked");

    rowBtn.click();
    // Sample while snapshots stream in: a mid-edit reload would blank the
    // list or silently revert the staged check.
    const seq = [];
    for (let i = 0; i < 20; i++) {
      const b = gymRow() && gymRow().querySelector(".spm-prow");
      const n = document.querySelectorAll("#spm-root .spm-plist .spm-pitem").length;
      seq.push("n" + n + (b ? (b.getAttribute("aria-pressed") === "true" ? "G1" : "G0") : "G-"));
      await sleep(30);
    }
    out.push("   while staged: " + seq.join(" "));
    ok(!seq.some((s) => s.indexOf("n0") === 0), "list never blanks mid-edit");
    ok(!seq.some((s) => s.indexOf("G0") !== -1 || s.indexOf("G-") !== -1),
      "staged check survives every snapshot that arrives");

    const settled = gymRow() && gymRow().querySelector(".spm-prow");
    ok(settled && settled.getAttribute("aria-pressed") === "true",
      "tapping the row stages it on (aria-pressed flips)");
    ok(settled && settled.getAttribute("aria-label") === "Remove from Gym",
      "staged row relabels to 'Remove from Gym'");

    const done = $(".spm-pdone");
    ok(done && !done.disabled, "Done clickable after staging");
    if (done) {
      done.click();
      const closed = await waitFor(() => {
        const s = document.querySelector("#spm-root .spm-psheet");
        return s && s.hasAttribute("hidden");
      }, 8000, "sheet close after Done");
      ok(closed, "sheet closes after Done");
      await sleep(400);
      const mem = h.getMembership("harness");
      out.push("--- membership after Done: " + JSON.stringify(mem) + " ---");
      ok(!!mem["pl-gym"], "pl-gym was really added (verified against fake server truth)");
    }
  }

  const v = h.violations();
  out.push("--- violations: " + JSON.stringify(v) + " ---");
  ok(!v || !v.length, "no Spotify menu leaked behind our sheet");

  // --- direct adapter bulk path (bypasses our UI) ---
  const direct = await sp.savePlaylistDraft([
    { uri: "spotify:playlist:pl-road", id: "pl-road", name: "Road Trip", want: true },
  ]);
  out.push("--- direct savePlaylistDraft ok=" + (direct && direct.ok) +
    " failed=" + JSON.stringify(direct && direct.failed) + " ---");
  ok(!!direct && direct.ok === true, "adapter bulk draft still commits");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()