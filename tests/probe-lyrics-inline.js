// Probe: inline lyrics expansion (no overlay build).
// Some builds expand the snippet in place on Show more instead of opening a
// separate fullscreen overlay. The adapter must resolve the open through the
// grown snippet, track through it, and LEAVE the expansion on our close
// (flips only flow while the live view exists) — with the overlay path
// never firing.
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

  const LINES = [
    "Moon, a hole of light",
    "Through the big top tent up high",
    "",
    "Here before and after me",
    "Shinin' down on me",
    "Moon, tell me if I could",
    "Send up my heart to you?",
    "So when I die, which I must do",
  ];
  h.setLyrics(LINES, 1);
  h.setLyricsInline(true);
  await sleep(400);

  const st0 = sp.getLyricsState();
  ok(!!st0 && st0.hasMore === true, "inline build offers Show more");

  // --- tap preview -> inline expansion, never a dialog ---
  $(".spm-lyrics-open").click();
  const lOpen = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && !s.hasAttribute("hidden");
  }, 8000, "our lyrics fullscreen");
  ok(lOpen, "our fullscreen opens from the preview tap");
  const fullCount = await waitFor(() => {
    const rows = document.querySelectorAll("#spm-root .spm-lline");
    return rows.length === LINES.length ? true : null;
  }, 8000, "full lyrics rows");
  ok(fullCount, "our fullscreen lists ALL lines from the grown snippet (" +
    document.querySelectorAll("#spm-root .spm-lline").length + "/" + LINES.length + ")");
  ok(!h.lyricsFullscreenOpen(), "no Spotify overlay opened (inline path)");

  // --- tracking through the inline copy ---
  h.advanceLyrics(); // -> index 3 (skips the gap row)
  const followed = await waitFor(() => {
    const a = document.querySelector("#spm-root .spm-lline.spm-active");
    return a && (a.textContent || "") === LINES[3] ? true : null;
  }, 8000, "highlight follows inline advance");
  ok(followed, "active highlight tracks the inline copy");

  // --- X closes ours but LEAVES the expansion: flips only flow while
  // Spotify's live view exists, so collapsing would silence the feed (and
  // the minified preview with it). The expansion persists by design.
  const xBtn = $(".spm-lclose");
  if (xBtn) xBtn.click();
  const closedOurs = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && s.hasAttribute("hidden");
  }, 6000, "our fullscreen closes");
  ok(closedOurs, "X closes our fullscreen");
  await sleep(500);
  const stAfter = sp.getLyricsState();
  ok(!!stAfter && stAfter.preview.length === LINES.length && stAfter.hasMore === false,
    "expansion persists after close (" + (stAfter && stAfter.preview.length) + " rows, no trigger)");
  let collapsedAfterClose = false;
  try {
    const log = (sp.inspectLyrics().log || []).map((e) => e.ev);
    collapsedAfterClose = log.indexOf("collapse-ok") !== -1 || log.indexOf("collapse-unconfirmed") !== -1;
  } catch (e) {}
  ok(!collapsedAfterClose, "no collapse ran on close (feed stays alive)");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
