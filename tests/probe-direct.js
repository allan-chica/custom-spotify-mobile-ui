// Probe: direct Pathfinder playlist path (editablePlaylists + applyCurations).
// Stubs window.fetch for the Pathfinder endpoint with canned responses and
// seeds auth through the same postMessage channel the page-world token hook
// uses — no code changes needed. Verifies: normalization, pagination,
// batched commit, server search, DOM fallback on failure, Liked exclusion.
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  let fails = 0;
  const ok = (c, m) => { if (!c) fails++; out.push((c ? "PASS  " : "FAIL  ") + m); };

  async function waitFor(fn, ms, label) {
    const t0 = Date.now();
    for (;;) {
      try { if (fn()) return true; } catch (e) {}
      if (Date.now() - t0 > (ms || 8000)) { out.push("TIMEOUT waiting for " + label); return false; }
      await sleep(100);
    }
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile, 12000, "boot");
  if (!booted) return "HARNESS NEVER BOOTED";
  const sp = window.SpotMobile.spotify;

  // --- canned library: Liked + 55 playlists (forces offset pagination) ---
  function item(name, uri, cur, pinned) {
    return { curates: !!cur, pinned: !!pinned, item: { _uri: uri, data: {
      name: name, uri: uri,
      images: { items: [{ sources: [{ url: "https://img/" + encodeURIComponent(name) + ".png", height: 300, width: 300 }] }] }
    } } };
  }
  const LIB = [item("Liked Songs", "spotify:collection:tracks", false, true)];
  for (let i = 0; i < 55; i++) {
    const nm = "Pl" + (i < 10 ? "0" + i : i);
    LIB.push(item(nm, "spotify:playlist:pl" + i, i % 7 === 0, false));
  }
  const calls = { editable: [], apply: [] };
  let failMode = false;
  const realFetch = window.fetch;
  window.fetch = function (url, opts) {
    const u = String((url && url.url) || url || "");
    if (u.indexOf("api-partner.spotify.com/pathfinder/v2/query") !== -1) {
      let b = {};
      try { b = JSON.parse(opts.body); } catch (e) {}
      if (b.operationName === "editablePlaylists") {
        if (failMode) return Promise.reject(new Error("stub offline"));
        const tf = String((b.variables && b.variables.textFilter) || "").toLowerCase();
        const off = (b.variables && b.variables.offset) || 0;
        const lim = (b.variables && b.variables.limit) || 50;
        calls.editable.push({ off, lim, tf, uris: (b.variables && b.variables.uris) || [] });
        const filtered = tf ? LIB.filter((e) => ((((e.item || {}).data || {}).name) || "").toLowerCase().indexOf(tf) !== -1) : LIB.slice();
        const page = filtered.slice(off, off + lim);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: { me: { editablePlaylists: {
          __typename: "EditablePlaylistPage", items: page,
          pagingInfo: { limit: lim, offset: off }, totalCount: filtered.length } } } }) });
      }
      if (b.operationName === "applyCurations") {
        if (failMode) return Promise.reject(new Error("stub offline"));
        calls.apply.push(b.variables && b.variables.input);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: { applyCurations: [
          { __typename: "TrackResponseWrapper", data: { __typename: "Track", isCurated: true } } ] } }) });
      }
    }
    return realFetch.apply(this, arguments);
  };

  try {
    // Warmup read registers the adapter's token-hook listener (DOM fallback
    // in harness); the auth message must come after, as real hook traffic
    // always postdates adapter init.
    await sp.getPlaylists({ fresh: true });
    // Seed auth through the token-hook channel (same entry point, no code change).
    window.postMessage({ source: "spm-token-hook", auth: "Bearer TEST", clientToken: "ct", appVersion: "v" }, "*");
    await sleep(200);

    // Track URI in harness must be a spotify:track: for the direct path.
    const t = sp.getCurrentTrackUri();
    ok(t && /^spotify:track:/.test(t.uri || ""), "harness track uri is a track (" + ((t && t.uri) || "?") + ")");

    // --- fresh read: pagination (56 items, limit 50 -> 2 calls), normalize ---
    const list = await sp.getPlaylists({ fresh: true });
    ok(Array.isArray(list) && list.length === 56, "direct read returns all 56 rows (got " + (list && list.length) + ")");
    ok(calls.editable.length === 2 && calls.editable[1].off === 50, "paged with offset loop (" + JSON.stringify(calls.editable.map((c) => c.off)) + ")");
    ok(list[0] && list[0].isLikedSongs && list[0].id === "__liked__", "Liked first with __liked__ id");
    ok(list[1] && list[1].id === "pl0" && list[1].uri === "spotify:playlist:pl0", "playlist id/uri parsed");
    ok(list[1] && list[1].artwork === "https://img/Pl00.png", "artwork picked from sources");
    ok(list[1] && list[1].containsTrack === true && list[2].containsTrack === false, "curates mapped to containsTrack");
    const st = sp.getPlaylistsState();
    ok(st && st.via === "direct" && st.viaCuration === true, "state reports via=direct");

    // --- batched commit: 2 changes -> exactly ONE applyCurations ---
    calls.apply.length = 0;
    const draft = await sp.savePlaylistDraft([
      { uri: "spotify:playlist:pl1", id: "pl1", name: "Pl01", isLikedSongs: false, want: true },
      { uri: "spotify:playlist:pl2", id: "pl2", name: "Pl02", isLikedSongs: false, want: false },
    ]);
    ok(draft && draft.ok === true, "direct draft commits");
    ok(calls.apply.length === 1, "ONE batched request for 2 changes (got " + calls.apply.length + ")");
    const curs = (calls.apply[0] && calls.apply[0].curations) || [];
    ok(curs.length === 2 && curs[0].curationType === "CURATE" && curs[1].curationType === "UNCURATE",
      "batch carries CURATE+UNCURATE with playlist uris");
    ok(calls.apply[0].itemUris && calls.apply[0].itemUris.length === 1, "single track uri in batch");

    // --- server search ---
    const sres = await sp.searchPlaylists("Pl01");
    ok(sres && sres.ok && sres.list.length === 1 && sres.list[0].name === "Pl01", "server textFilter returns match");
    ok(calls.editable[calls.editable.length - 1].tf === "pl01", "textFilter sent to server");

    // --- Liked in draft -> DOM path (heart untouched by direct) ---
    calls.apply.length = 0;
    const likedRes = await sp.savePlaylistDraft([
      { uri: "spotify:collection:tracks", id: "__liked__", name: "Liked Songs", isLikedSongs: true, want: true },
    ]);
    ok(calls.apply.length === 0, "Liked draft sends no applyCurations");
    ok(likedRes && typeof likedRes.ok === "boolean", "Liked draft handled (ok=" + (likedRes && likedRes.ok) + ")");

    // --- failure -> DOM fallback still returns a list ---
    failMode = true;
    const fb = await sp.getPlaylists({ fresh: true });
    ok(Array.isArray(fb) && fb.length > 0, "fallback returns DOM list when direct fails (got " + (fb && fb.length) + ")");
    const fbs = sp.getPlaylistsState();
    ok(fbs && fbs.via !== "direct", "state no longer claims direct after fallback (via=" + (fbs && fbs.via) + ")");
    failMode = false;

    // --- UI: server search merges, draft survives, clear restores ---
    const h = window.harness;
    h.setLiked("harness", true);
    const $ = (s) => document.querySelector("#spm-root " + s);
    $(".spm-like").click();
    const opened = await waitFor(() => {
      const s = document.querySelector("#spm-root .spm-psheet");
      return s && !s.hasAttribute("hidden");
    }, 8000, "sheet opens");
    ok(opened, "sheet opens for search test");
    await waitFor(() => document.querySelectorAll("#spm-root .spm-plist .spm-pitem").length === 56, 8000, "56 direct rows");
    const visRows = () => Array.prototype.map.call(
      document.querySelectorAll("#spm-root .spm-plist .spm-pitem"),
      (el) => (el.textContent || "").replace(/\s+/g, " ").trim());
    const callsBefore = calls.editable.length;
    const input = document.querySelector("#spm-root .spm-psearch-input");
    ok(!!input, "search input present");
    input.value = "Pl01";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(900); // debounce 350 + stub round-trip
    let shown = visRows();
    ok(shown.length === 1 && /Pl01/.test(shown[0]), "server search narrows to Pl01 (got " + JSON.stringify(shown) + ")");
    ok(calls.editable.length > callsBefore, "search issued a server query");
    // Stage Pl01 ON, then search away and back: draft must survive.
    const rowBtn = document.querySelector("#spm-root .spm-plist .spm-pitem .spm-prow");
    ok(!!rowBtn, "Pl01 row tappable");
    if (rowBtn) rowBtn.click();
    await sleep(300);
    input.value = "Pl02";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(900);
    shown = visRows();
    ok(shown.length === 1 && /Pl02/.test(shown[0]), "second search shows Pl02");
    input.value = "Pl01";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(900);
    const backBtn = document.querySelector("#spm-root .spm-plist .spm-pitem .spm-prow");
    ok(!!backBtn && backBtn.getAttribute("aria-pressed") === "true", "staged Pl01 survives search round-trip");
    // Clear: full list back with no extra server read needed for paint.
    const callsAtClear = calls.editable.length;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(700);
    shown = visRows();
    ok(shown.length === 56, "clear restores full list (got " + shown.length + ")");
    ok(calls.editable.length === callsAtClear, "clear needs no extra query");
    // Cancel discards the staged draft (no commit).
    calls.apply.length = 0;
    const cancel = document.querySelector("#spm-root .spm-pcancel");
    if (cancel) cancel.click();
    await sleep(500);
    ok(calls.apply.length === 0, "cancel sends no mutation");
  } finally {
    window.fetch = realFetch;
  }
  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})();
