// Probe: end-to-end through OUR UI. Taps the extension's own heart, waits for
// the Add-to-playlist sheet to list rows, then exercises a real add through it.
// Run via: node tests/cdp-probe.js <harness-url> tests/probe-sheet.js
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  let fails = 0;
  const ok = (c, m) => { if (!c) fails++; out.push((c ? "PASS  " : "FAIL  ") + m); };

  function waitFor(fn, ms, label) {
    return (async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < (ms || 8000)) {
        try { if (fn()) return true; } catch (e) {}
        await sleep(120);
      }
      out.push("TIMEOUT waiting for " + label);
      return false;
    })();
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile &&
    document.querySelector("#spm-root .spm-like"), 12000, "extension mount");
  if (!booted) return out.join("\n") + "\n\nHARNESS NEVER BOOTED";

  const h = window.harness;
  const sp = window.SpotMobile.spotify;

  // Deterministic fixture (harness ids are hyphenated on purpose: they catch
  // an id-truncating regex, which real base62 ids would hide).
  h.setPlaylistMode("check");
  h.setTrack("harness", "Real Track");
  h.setLiked("harness", true);
  h.setMembership("harness", "pl-fav", true);
  h.setMembership("harness", "pl-gym", false);

  const list = await sp.getPlaylists({ fresh: true });
  out.push("--- adapter read: " + (list ? list.length : 0) + " rows ---");
  (list || []).forEach(function (p) {
    out.push("  " + (p.containsTrack ? "[x] " : "[ ] ") + JSON.stringify(p.id) + "  " + p.name +
             "  href=" + p.href);
  });
  ok(!!list && list.length === 5, "adapter returns Liked + all 4 playlists (expected 5)");
  ok(!!list && list[0] && list[0].isLikedSongs, "Liked first");
  const p1 = (list || []).filter(function (p) { return p.id === "pl-fav"; })[0];
  ok(!!p1, "playlist id pl-fav parsed whole (not truncated to 'pl')");
  ok(!!p1 && p1.uri === "spotify:playlist:pl-fav", "exact uri preserved");
  ok(!!p1 && p1.href === "/playlist/pl-fav", "href matches the id");
  ok(!!p1 && p1.containsTrack === true, "pl-fav membership read from the row's aria-checked");
  ok(!!p1 && p1.name === "Favorites", "pl-fav name parsed from the inner listRow");
  const p3 = (list || []).filter(function (p) { return p.id === "pl-gym"; })[0];
  ok(!!p3 && p3.containsTrack === false, "unchecked playlist reports containsTrack=false");
  ok((list || []).every(function (p) { return !!(p.id || p.isLikedSongs); }),
     "every row has a usable id");

  // --- our own UI: tap the heart on a SAVED track -> our sheet opens ---
  const heart = document.querySelector("#spm-root .spm-like");
  heart.click();
  const opened = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-psheet");
    return s && !s.hasAttribute("hidden") && s.getAttribute("aria-hidden") !== "true";
  }, 8000, "our Add-to-playlist sheet");
  ok(opened, "our own sheet opens from the heart");

  const rowsIn = await waitFor(() => document.querySelectorAll("#spm-root .spm-plist .spm-pitem").length > 0,
    8000, "sheet rows");
  const shown = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-plist .spm-pitem"),
    function (el) { return (el.textContent || "").replace(/\s+/g, " ").trim(); }
  );
  out.push("--- our sheet shows ---");
  shown.forEach(function (s) { out.push("  " + s); });
  ok(rowsIn, "sheet rendered playlist rows");
  ok(shown.length === (list ? list.length : 0),
     "sheet row count matches the adapter list (" + shown.length + " vs " + (list ? list.length : 0) + ")");
  ok(shown.some(function (s) { return /Liked/.test(s); }), "sheet shows Liked Songs");
  ok(shown.some(function (s) { return /Favorites/.test(s); }),
     "sheet shows Favorites (the sheet's list, not the library's wrong list)");
  ok(shown.some(function (s) { return /Chill/.test(s); }) &&
     shown.some(function (s) { return /Gym/.test(s); }) &&
     shown.some(function (s) { return /Road Trip/.test(s); }),
     "sheet shows ALL playlists, including ones off-screen in the sheet");

  // --- stage pl-gym ON + Done, through our sheet's real controls ---
  const gymRow = function () {
    return Array.prototype.filter.call(
      document.querySelectorAll("#spm-root .spm-plist .spm-pitem"),
      function (el) { return /Gym/.test(el.textContent || ""); }
    )[0];
  };
  const item = gymRow();
  if (item) {
    const rowBtn = item.querySelector(".spm-prow");
    ok(!!rowBtn, "found the tappable row button for Gym");
    if (rowBtn) {
      ok(rowBtn.getAttribute("aria-pressed") === "false", "Gym starts unchecked");
      rowBtn.click();
      await sleep(200);
      // renderPSheet() rebuilds the list, so re-query: the old node is detached.
      const after = gymRow() && gymRow().querySelector(".spm-prow");
      ok(after && after.getAttribute("aria-pressed") === "true",
         "tapping the row stages it on (aria-pressed flips)");
      ok(after && after.getAttribute("aria-label") === "Remove from Gym",
         "staged row relabels to 'Remove from Gym'");
      const done = document.querySelector("#spm-root .spm-pdone");
      ok(!!done && !done.disabled, "Done clickable after staging");
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
        out.push("--- harness playlistOps: " + JSON.stringify(h.playlistOps) + " ---");
        ok(!!mem["pl-gym"], "pl-gym was really added (verified against fake server truth)");
      }
    }
  } else {
    ok(false, "could not find the Gym row to stage");
  }

  const v = h.violations();
  out.push("--- violations: " + JSON.stringify(v) + " ---");
  ok(!v || !v.length, "no Spotify menu leaked behind our sheet");

  // --- isolate: call the adapter's bulk path directly ---
  const direct = await sp.savePlaylistDraft([
    { uri: "spotify:playlist:pl-road", id: "pl-road", name: "Road Trip", want: true },
  ]);
  out.push("--- direct savePlaylistDraft -> " + JSON.stringify(direct) + " ---");
  out.push("--- membership after direct: " + JSON.stringify(h.getMembership("harness")) + " ---");
  out.push("--- ops after direct: " + JSON.stringify(h.playlistOps) + " ---");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()