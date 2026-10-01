/* Spotify playlist-read diagnostic — paste into the DevTools console on a
 * loaded open.spotify.com tab (extension active). Reports which source the
 * extension is really using: Spotify's own "Add to playlist" sheet (correct)
 * or the Your Library scrape (wrong).
 *
 * It clicks Spotify's own heart button and closes the sheet again. It does not
 * change any playlist, and does not like/unlike the track permanently.
 *
 * Everything is async on purpose: a busy-wait would block the main thread and
 * the sheet could never mount, which is the very thing being tested.
 */
(async function diagnose() {
  const L = [];
  const say = (s) => L.push(s);
  const h = (t) => { L.push(""); L.push("== " + t + " " + "=".repeat(Math.max(2, 56 - t.length))); };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const norm = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase();
  const pad = (s, n) => String(s == null ? "" : s) + " ".repeat(Math.max(0, n - String(s).length));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, ms, every) {
    const t0 = Date.now();
    for (;;) {
      let v = null;
      try { v = fn(); } catch (e) {}
      if (v) return v;
      if (Date.now() - t0 > (ms || 3000)) return null;
      await sleep(every || 60);
    }
  }

  const sp = window.SpotMobile && window.SpotMobile.spotify;
  if (!sp) {
    console.log("NO SpotMobile.spotify — is the extension loaded on this tab?");
    return;
  }

  /* --- the curation button, and why it might not be found --- */
  function curationButton() {
    const scopes = [$('[data-testid="now-playing-widget"]'), $('[data-testid="now-playing-bar"]')];
    for (const scope of scopes) {
      if (!scope) continue;
      for (const b of $$('button[data-encore-id="buttonTertiary"]', scope)) {
        const c = b.getAttribute("aria-checked");
        const l = norm(b.getAttribute("aria-label"));
        if (c === null) continue;
        if (l === "add to liked songs" || l === "add to playlist" || l.indexOf("liked songs") !== -1) {
          return b;
        }
      }
    }
    say("    document-wide buttonTertiary[aria-checked] candidates: " +
      $$('button[data-encore-id="buttonTertiary"][aria-checked]').length);
    $$('button[data-encore-id="buttonTertiary"][aria-checked]').slice(0, 8).forEach((b) => {
      say("      label=" + pad(JSON.stringify(b.getAttribute("aria-label")), 26) +
          " checked=" + pad(JSON.stringify(b.getAttribute("aria-checked")), 7) +
          " inWidget=" + !!b.closest('[data-testid="now-playing-widget"]') +
          " inBar=" + !!b.closest('[data-testid="now-playing-bar"]'));
    });
    if (!$('[data-testid="now-playing-widget"]')) say("    !! no [data-testid=now-playing-widget]");
    if (!$('[data-testid="now-playing-bar"]')) say("    !! no [data-testid=now-playing-bar]");
    return null;
  }

  /* How a row's identity resolves. Mirrors the adapter and names the rung. */
  function rowUri(btn) {
    const re = /listrow-title-(spotify:(?:collection:tracks|playlist:[A-Za-z0-9_-]+)|new-playlist)/;
    const own = (btn.getAttribute("aria-labelledby") || "").match(re);
    if (own) return { uri: own[1], via: "button" };
    for (const n of $$("[aria-labelledby]", btn)) {
      const m = (n.getAttribute("aria-labelledby") || "").match(re);
      if (m) return { uri: m[1], via: "nested:" + (n.getAttribute("data-encore-id") || n.tagName) };
    }
    const t = btn.querySelector('p[data-encore-id="listRowTitle"]');
    if (t && t.id) {
      const m2 = t.id.match(re);
      if (m2) return { uri: m2[1], via: "title-id" };
    }
    return { uri: "", via: "UNRESOLVED" };
  }

  function describeList(ul) {
    const rects = ul.getClientRects();
    const r = ul.getBoundingClientRect();
    const rows = $$('button[role="menuitemcheckbox"]', ul);
    const via = {};
    let resolved = 0;
    rows.forEach((b) => {
      const u = rowUri(b);
      via[u.via] = (via[u.via] || 0) + 1;
      if (u.uri) resolved++;
    });
    let vis = "?";
    try { vis = getComputedStyle(ul).visibility; } catch (e) {}
    return {
      rects: rects.length, w: Math.round(r.width), h: Math.round(r.height), vis,
      label: ul.getAttribute("aria-label"), depth: ul.getAttribute("data-depth"),
      setsize: rows.length ? rows[0].getAttribute("aria-setsize") : null,
      rows: rows.length, resolved, via,
      tippy: !!ul.closest("[data-tippy-root]"), ourRoot: !!ul.closest("#spm-root"),
    };
  }

  function dumpPageState() {
    const menus = $$('ul[role="menu"], div[role="menu"]').filter((m) => {
      const r = m.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    say("    visible [role=menu] elements: " + menus.length);
    menus.slice(0, 6).forEach((m) => {
      say("      id=" + pad(JSON.stringify(m.id), 22) + " depth=" +
          pad(JSON.stringify(m.getAttribute("data-depth")), 5) + " label=" +
          pad(JSON.stringify(m.getAttribute("aria-label")), 28) +
          " " + Math.round(m.getBoundingClientRect().width) + "x" + Math.round(m.getBoundingClientRect().height));
    });
    say("    [data-tippy-root] nodes in DOM: " + $$("[data-tippy-root]").length);
    say("    searchboxes [role=searchbox]: " + $$('input[role="searchbox"]').length);
    say("    a leaked veil <style data-spm=playlist-veil> present: " +
      !!$('style[data-spm="playlist-veil"]'));
  }

  const out = () => {
    const text = L.join("\n");
    console.log("\n" + text + "\n");
    return text;
  };

  try {
    h("ENVIRONMENT");
    say("    url            = " + location.href.slice(0, 72));
    say("    #spm-root      = " + !!$("#spm-root") + "   (our UI mounted)");
    say("    leaked veil    = " + !!$('style[data-spm="playlist-veil"]'));
    say("    tippy roots    = " + $$("[data-tippy-root]").length);

    h("GATE 1  curation button (the heart that opens the list)");
    let btn = curationButton();
    say("    " + (btn
      ? "FOUND   aria-label=" + JSON.stringify(btn.getAttribute("aria-label")) +
        "  aria-checked=" + JSON.stringify(btn.getAttribute("aria-checked"))
      : "NOT FOUND"));
    if (!btn) { dumpPageState(); out(); return; }

    h("GATE 2  liked state");
    let liked = null;
    try { liked = sp.isLiked(); } catch (e) { liked = "threw: " + e.message; }
    say("    isLiked()=" + liked +
        "   button aria-checked=" + btn.getAttribute("aria-checked") +
        "   aria-label=" + JSON.stringify(btn.getAttribute("aria-label")));

    h("GATE 3  does clicking it open Spotify's sheet?");
    let existing = $("#curation-sheet-list");
    let openedByUs = false;
    let t0 = Date.now();
    if (existing) {
      say("    a #curation-sheet-list is ALREADY in the DOM (left over from a read)");
    } else {
      if (norm(btn.getAttribute("aria-label")) === "add to liked songs") {
        say("    unsaved track -> clicking once to Like first (the transient dance)");
        btn.click();
        await waitFor(() => norm((curationButton() || btn).getAttribute("aria-label")) === "add to playlist", 3000);
        btn = curationButton() || btn;
        say("    after Like: aria-checked=" + btn.getAttribute("aria-checked") +
            " label=" + JSON.stringify(btn.getAttribute("aria-label")));
      }
      say("    clicking the button…");
      btn.click();
      openedByUs = true;
    }
    const ul = await waitFor(() => $("#curation-sheet-list"), 5000, 60);
    say("    " + (ul
      ? "OPENED in ~" + (Date.now() - t0) + "ms"
      : "DID NOT OPEN within 5000ms   <-- failure point"));
    if (!ul) { dumpPageState(); out(); return; }

    h("GATE 4  what is inside the sheet");
    const d = describeList(ul);
    say("    clientRects=" + d.rects + "  size=" + d.w + "x" + d.h + "  computedVisibility=" + d.vis);
    say("    adapter needs isVisible() = clientRects>0 AND w>0 AND h>0  -> " +
        ((d.rects > 0 && d.w > 0 && d.h > 0) ? "PASS" : "FAIL"));
    say("    aria-label=" + JSON.stringify(d.label) + "  data-depth=" + JSON.stringify(d.depth));
    say("    menuitemcheckbox rows = " + d.rows + "   aria-setsize on first row = " + d.setsize);
    say("    rows resolving to a spotify: uri = " + d.resolved + " / " + d.rows);
    say("    identity resolved via     = " + JSON.stringify(d.via));
    say("    inside [data-tippy-root]=" + d.tippy + "   inside #spm-root=" + d.ourRoot);
    say("");
    $$('button[role="menuitemcheckbox"]', ul).slice(0, 20).forEach((b) => {
      const u = rowUri(b);
      const p = b.querySelector('p[data-encore-id="listRowTitle"]');
      say("      " + pad(u.uri || "?", 40) + " checked=" + pad(b.getAttribute("aria-checked"), 6) +
          " name=" + JSON.stringify(p ? (p.textContent || "").trim() : ""));
    });
    if (d.rows === 0) say("      (no menuitemcheckbox rows at all -> content never mounted)");

    // Close the sheet we opened, exactly as a user would, so the extension
    // has to open it itself. Otherwise we would be measuring a read against a
    // sheet we are holding open ourselves.
    if (openedByUs || existing) {
      say("");
      say("    closing the sheet (Cancel) so the extension must open it itself…");
      const cancel = $$("button").find((b) => norm(b.textContent) === "cancel" &&
        !b.closest("#spm-root"));
      if (cancel) cancel.click();
      else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      const gone = await waitFor(() => !$("#curation-sheet-list"), 2000, 60);
      say("    sheet closed: " + (gone ? "yes" : "NO (still in the DOM)"));
    }

    h("GATE 5  which source does the extension actually USE?");
    // Await the read itself — reading the cache first would report whatever
    // was already there and hide which source won.
    let fresh = null;
    try {
      fresh = await sp.getPlaylists({ fresh: true });
    } catch (e) {
      say("    getPlaylists threw: " + (e && e.message));
    }
    const st = sp.getPlaylistsState();
    const rows = fresh || st.list || [];
    say("    rows returned = " + rows.length);
    say("    source        = " + (st.viaCuration ? '"curation"  <- CORRECT (Spotify\'s own sheet)'
                                                : '"library"   <- WRONG (Your Library scrape)'));
    say("    ok flag       = " + st.ok + "   reason=" + JSON.stringify(st.reason));
    say("");
    const blank = rows.filter((p) => !p.id && !p.isLikedSongs).length;
    if (blank) say("    !! " + blank + " row(s) have an EMPTY id — these are the broken ones");
    const names = {};
    rows.forEach((p) => { names[norm(p.name)] = (names[norm(p.name)] || 0) + 1; });
    const dupes = Object.keys(names).filter((n) => names[n] > 1);
    if (dupes.length) say("    !! duplicate names: " + JSON.stringify(dupes));
    say("");
    rows.forEach((p) => {
      say("      " + (p.containsTrack ? "[x] " : "[ ] ") + pad(JSON.stringify(p.id), 26) +
          pad(p.name || "", 26) + pad(p.subtitle || "", 16) + (p.artwork ? "" : "(no artwork)"));
    });

    h("OUR OWN SHEET (as rendered right now)");
    const ours = $$("#spm-root .spm-plist .spm-pitem").map((li) =>
      (li.textContent || "").replace(/\s+/g, " ").trim());
    say("    #spm-root rows = " + ours.length);
    ours.forEach((t) => say("      " + t));
    if (!ours.length) {
      say("    (our sheet is not open — tap the heart on a SAVED track, then re-run)");
    }

    if (openedByUs) {
      say("");
      say("    (diagnostic finished; the sheet above was left as-is)");
    }
  } catch (e) {
    say("");
    say("THREW: " + ((e && e.stack) || e));
  }
  out();
  return L.join("\n");
})();