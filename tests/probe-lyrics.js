// Probe: custom fullscreen lyrics mirror, end to end.
//   - adapter reads the preview snippet + Spotify palette from the section
//   - tapping our preview opens Spotify's fullscreen (veiled) + our own
//     fullscreen with ALL lines and the active row highlighted
//   - advancing Spotify's active line moves our highlight with it (tracking)
//   - X closes ours AND Spotify's fullscreen (never one without the other)
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

  const h = window.harness;
  const sp = window.SpotMobile.spotify;

  const LINES = [
    "I'd say, see you later, if I thought I'd see you later",
    "And I'd tell you, that I loved you, if I did",
    "",
    "It's so strange, deciding, how to feel about it",
    "It's such strange, emotion, standing there beside it",
    "I'm home, with moonlight on the river, saying my goodbyes",
    "And I'd cry, if I thought it would help it",
    "But it won't, so I won't",
  ];
  h.setLyrics(LINES, 1);
  await sleep(400);

  // --- adapter sync read: snippet + palette + active ---
  const st = sp.getLyricsState();
  ok(!!st && st.available === true, "adapter sees the lyrics section");
  ok(!!st && st.preview.length === 5, "preview snippet read (" + (st && st.preview.length) + " rows)");
  ok(!!st && st.preview[1] && st.preview[1].text === LINES[1], "preview text matches Spotify rows");
  ok(!!st && st.preview[2] && st.preview[2].text === "", "gap rows kept as empty (not dropped)");
  ok(!!st && st.active === 1, "active row resolved (aria-current)");
  ok(!!st && /255,\s*0,\s*0/.test(st.colors.active), "active color passthrough (" + (st && st.colors.active) + ")");
  ok(!!st && st.hasMore === true, "Show more detected");

  // --- our cover paints Spotify's lines + colors ---
  $(".spm-coverlyr-toggle").click();
  const coverRows = await waitFor(() =>
    document.querySelectorAll("#spm-root .spm-coverlyr-line").length > 0, 8000, "cover rows");
  ok(coverRows, "our cover renders Spotify rows");
  const shown = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-coverlyr-line"),
    (e) => (e.textContent || "").trim()
  );
  ok(shown.some((t) => t === LINES[1]), "cover shows the active line text");
  const activePrev = document.querySelector("#spm-root .spm-coverlyr-line.spm-active");
  ok(!!activePrev && (activePrev.textContent || "").trim() === LINES[1],
    "cover highlights the active row");
  // The cross-fade animates in, so poll past the transition.
  const colorOk = await waitFor(() => {
    try {
      const a = document.querySelector("#spm-root .spm-coverlyr-line.spm-active");
      const c = a ? getComputedStyle(a).color : "";
      return /255,\s*0,\s*0/.test(c) ? true : null;
    } catch (e) { return null; }
  }, 5000, "cover active color settles");
  let activeColor = "";
  try {
    const a = document.querySelector("#spm-root .spm-coverlyr-line.spm-active");
    activeColor = a ? getComputedStyle(a).color : "";
  } catch (e) {}
  ok(colorOk, "cover active row wears Spotify's color (" + activeColor + ")");

  // --- tap expand -> both fullscreens (theirs veiled, ours visible) ---
  $(".spm-coverlyr-expand").click();
  const lOpen = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && !s.hasAttribute("hidden");
  }, 8000, "our lyrics fullscreen");
  ok(lOpen, "our fullscreen opens from the expand tap");
  const fullCount = await waitFor(() => {
    const rows = document.querySelectorAll("#spm-root .spm-lline");
    return rows.length === LINES.length ? true : null;
  }, 8000, "full lyrics rows");
  const ours = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-lline"),
    (e) => (e.textContent || "")
  );
  ok(fullCount && ours.length === LINES.length, "our fullscreen lists ALL lines (" + ours.length + "/" + LINES.length + ")");
  ok(h.lyricsFullscreenOpen(), "Spotify fullscreen opened behind ours");
  const ourActive = document.querySelector("#spm-root .spm-lline.spm-active");
  ok(!!ourActive && (ourActive.textContent || "") === LINES[1], "fullscreen highlights the active row");

  // --- hit-testing lockdown: taps must land on our overlay, never the card ---
  // (On mobile the root is pointer-events:none; without these rules every tap
  // falls through to the card beneath — X "does nothing" while the tap likes
  // the song. These rules are not viewport-gated, so they assert headlessly.)
  let cardPE = "";
  let sheetPE = "";
  try {
    cardPE = getComputedStyle(document.querySelector("#spm-root .spm-card")).pointerEvents;
    sheetPE = getComputedStyle(document.querySelector("#spm-root .spm-lsheet")).pointerEvents;
  } catch (e) {}
  ok(cardPE === "none", "card is inert while lyrics fullscreen is open (" + cardPE + ")");
  ok(sheetPE === "auto", "lyrics overlay receives taps (" + sheetPE + ")");

  // --- teardown hold: Spotify yanks the rows mid-open, we keep our paint ---
  h.clearLyricsFullscreenRows();
  await sleep(500);
  const held = document.querySelectorAll("#spm-root .spm-lline").length;
  ok(held === LINES.length, "same-track teardown holds last paint (" + held + "/" + LINES.length + ")");

  // --- tracking: advance Spotify's line, ours must follow ---
  h.advanceLyrics(); // -> index 3 (skips the gap row)
  const followed = await waitFor(() => {
    const a = document.querySelector("#spm-root .spm-lline.spm-active");
    return a && (a.textContent || "") === LINES[3] ? true : null;
  }, 8000, "highlight follows Spotify");
  ok(followed, "active highlight tracks Spotify's advance (gap skipped)");

  // --- key-glitch hold: player text gap + torn-down rows must not blank ---
  h.setPlayerTrackText("");
  h.clearLyricsFullscreenRows();
  await sleep(500);
  const held2 = document.querySelectorAll("#spm-root .spm-lline").length;
  ok(held2 === LINES.length, "empty-key teardown holds last paint (" + held2 + "/" + LINES.length + ")");
  h.setPlayerTrackText("Harness Track");
  h.advanceLyrics(); // repaints rows, active -> 4
  const followed2 = await waitFor(() => {
    const a = document.querySelector("#spm-root .spm-lline.spm-active");
    return a && (a.textContent || "") === LINES[4] ? true : null;
  }, 8000, "recover after glitch");
  ok(followed2, "recovers with tracking intact after the glitch");

  // --- X closes ours AND Spotify's ---
  const xBtn = $(".spm-lclose");
  ok(!!xBtn, "X button exists");
  if (xBtn) xBtn.click();
  const closedOurs = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && s.hasAttribute("hidden");
  }, 6000, "our fullscreen closes");
  ok(closedOurs, "X closes our fullscreen");
  await sleep(400);
  ok(!h.lyricsFullscreenOpen(), "X also closed Spotify's fullscreen");
  let cardPEAfter = "";
  try {
    cardPEAfter = getComputedStyle(document.querySelector("#spm-root .spm-card")).pointerEvents;
  } catch (e) {}
  ok(cardPEAfter !== "none", "card receives taps again after close (" + cardPEAfter + ")");

  // --- reopen against an expanded snippet (no Show more): reads section ---
  h.expandLyricsSnippet();
  await sleep(300);
  $(".spm-coverlyr-expand").click();
  const reopened = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && !s.hasAttribute("hidden");
  }, 8000, "reopen on expanded snippet");
  ok(reopened, "reopen works with no Show more button");
  const reopenCount = await waitFor(() => {
    const rows = document.querySelectorAll("#spm-root .spm-lline");
    return rows.length === LINES.length ? true : null;
  }, 8000, "reopened rows");
  ok(reopenCount, "reopened fullscreen lists ALL lines from the section (" +
    document.querySelectorAll("#spm-root .spm-lline").length + "/" + LINES.length + ")");
  ok(!h.lyricsFullscreenOpen(), "no Spotify overlay needed when snippet is expanded");
  const xBtn2 = $(".spm-lclose");
  if (xBtn2) xBtn2.click();
  await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && s.hasAttribute("hidden");
  }, 6000, "reopened close");

  // --- unavailable path: no section -> honest empty state, no throw ---
  h.setLyrics([], -1);
  await sleep(300);
  const st2 = sp.getLyricsState();
  ok(!!st2 && st2.available === false, "no section reads as unavailable (not a crash)");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
