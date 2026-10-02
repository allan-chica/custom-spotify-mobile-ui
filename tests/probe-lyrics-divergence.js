// Probe: disagreeing lyric copies must never split the views.
// After a track change Spotify can leave a stale snippet next to a live
// overlay (or vice versa). The adapter must serve BOTH views from the most
// recently mutated copy — the mini preview and the fullscreen must always
// show the same song.
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

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-lyrics-open"),
    12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";

  const h = window.harness;
  const sp = window.SpotMobile.spotify;

  const OLD = ["old one", "old two", "", "old three", "old four"];
  const NEW = ["new one", "new two", "", "new three", "new four", "new five", "new six", "new seven"];
  // Stale visible snippet (old song) + live dialog (new song), dialog newest.
  h.setLyricsSplit(OLD, 1, NEW, 3);
  await sleep(500);
  h.advanceLyricsScope("dialog"); // -> dialog active 4, dialog newest touch
  await sleep(500);

  // --- adapter serves the live copy to the preview ---
  const st = sp.getLyricsState();
  const prevTexts = (st.preview || []).map((p) => p.text);
  ok(!!st && st.available === true, "disagreeing copies still read as available");
  ok(prevTexts.length === NEW.length && prevTexts[0] === NEW[0],
    "preview serves the live (dialog) copy, not the stale snippet (" +
    JSON.stringify(prevTexts.slice(0, 2)) + ")");
  ok(!!st && st.active === 4, "active resolves in the live copy (" + (st && st.active) + ")");

  // --- our preview paints the live copy ---
  const painted = await waitFor(() => {
    const rows = document.querySelectorAll("#spm-root .spm-lyrics-line");
    return rows.length > 0 ? true : null;
  }, 8000, "preview rows");
  ok(painted, "preview rendered");
  const shown = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-lyrics-line"),
    (e) => (e.textContent || "").trim()
  );
  ok(shown.some((t) => t === "new three"), "preview shows NEW song lines (not stale old ones)");
  const activePrev = document.querySelector("#spm-root .spm-lyrics-line.spm-active");
  ok(!!activePrev && (activePrev.textContent || "").trim() === "new four",
    "preview highlight sits on the live copy's row");

  // --- reverse: section goes live, dialog goes stale ---
  // (Active stays inside the snippet's rendered window so the mark is
  // resolvable, like the live page where the white row is always mounted.)
  h.setLyricsSplit(NEW, 2, OLD, 1);
  await sleep(300);
  h.advanceLyricsScope("section"); // section newest touch, active -> 3
  await sleep(500);
  const st2 = sp.getLyricsState();
  const prev2 = (st2.preview || []).map((p) => p.text);
  // Snippet window (5 rows) now carries the NEW song from the live section.
  ok(prev2.length === 5 && prev2[0] === NEW[0],
    "preview follows freshness back to the section copy");
  ok(!!st2 && st2.active === 3, "active resolves in the newly-live copy (" + (st2 && st2.active) + ")");
  const shown2 = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-lyrics-line"),
    (e) => (e.textContent || "").trim()
  );
  ok(shown2.some((t) => t === "new three"), "preview repaints from the newly-live copy");

  // --- our fullscreen agrees with the preview (same source, same song) ---
  $(".spm-lyrics-open").click();
  const lOpen = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && !s.hasAttribute("hidden");
  }, 8000, "our lyrics fullscreen");
  ok(lOpen, "our fullscreen opens");
  await sleep(600);
  const ours = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-lline"),
    (e) => (e.textContent || "")
  );
  const mine = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-lyrics-line"),
    (e) => (e.textContent || "").trim()
  );
  const overlap = ours.filter((t) => t !== "" && mine.indexOf(t) !== -1);
  ok(ours.length > 0 && overlap.length > 0,
    "fullscreen and preview show the SAME song (" + overlap.length + " shared rows)");
  const xBtn = $(".spm-lclose");
  if (xBtn) xBtn.click();
  await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && s.hasAttribute("hidden");
  }, 6000, "close");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
