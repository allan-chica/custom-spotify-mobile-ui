// Probe: in-cover Lyrics (squircle swap) + hold expiry.
//   - mic "Lyrics" toggle swaps the artwork squircle for a lyrics box that is
//     pixel-identical to the blob (inset 0, clipped by its radius), wearing
//     Spotify's lyric background with passed lines dimmed
//   - full wrapped list with a soft active cross-fade; the active line glides
//     into view with a smooth scroll; expand sits clear of the corner radius
//   - expand opens the fullscreen mirror; a teardown gap holds, then expires
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
  await sleep(400);
  document.getElementById("np-toggle").click(); // playing (snapshot ticks run fast)
  await sleep(300);

  // --- mic toggle exists, cover hidden by default ---
  const toggle = $(".spm-coverlyr-toggle");
  ok(!!toggle, "mic Lyrics toggle exists in the aux row");
  ok(toggle && toggle.textContent.trim() === "Lyrics", "toggle reads Lyrics");
  ok(!!toggle && !!toggle.querySelector("svg"), "toggle carries the mic icon");
  const cover0 = $(".spm-coverlyr");
  ok(!!cover0 && cover0.hasAttribute("hidden"), "cover lyrics hidden by default");

  // --- toggle on: full list, active marked, passed dimmed ---
  toggle.click();
  const shown = await waitFor(() => {
    const c = $(".spm-coverlyr");
    return c && !c.hasAttribute("hidden") &&
      document.querySelectorAll("#spm-root .spm-coverlyr-line").length === 5 ? true : null;
  }, 8000, "cover lyrics list");
  ok(shown, "toggle reveals the snippet's rows in the cover");
  ok(toggle.getAttribute("aria-pressed") === "true", "toggle marks aria-pressed");
  const cActive = document.querySelector("#spm-root .spm-coverlyr-line.spm-active");
  ok(!!cActive && (cActive.textContent || "") === LINES[1], "cover highlights the active row");
  const cPassed = document.querySelectorAll("#spm-root .spm-coverlyr-line.spm-passed");
  ok(cPassed.length === 1 && (cPassed[0].textContent || "") === LINES[0],
    "exactly the lines before active read as passed");
  // The cross-fade animates in, so poll past the transition instead of
  // sampling a single frame.
  const dimmed = await waitFor(() => {
    try {
      const p = document.querySelector("#spm-root .spm-coverlyr-line.spm-passed");
      return p && parseFloat(getComputedStyle(p).opacity) < 1 ? true : null;
    } catch (e) { return null; }
  }, 5000, "passed lines dim");
  ok(dimmed, "passed lines dim below full opacity");

  // --- lines wrap instead of cutting, with a soft active cross-fade ---
  let wrap = "";
  let tOverflow = "";
  try {
    const row = document.querySelector("#spm-root .spm-coverlyr-line");
    wrap = getComputedStyle(row).whiteSpace;
    tOverflow = getComputedStyle(row).textOverflow;
  } catch (e) {}
  ok(wrap === "normal" && tOverflow === "clip", "long lines wrap, never ellipsis (" + wrap + "/" + tOverflow + ")");
  let trans = "";
  try { trans = getComputedStyle(document.querySelector("#spm-root .spm-coverlyr-line")).transition; } catch (e) {}
  ok(/0\.45s/.test(trans) && /color/.test(trans) && /opacity/.test(trans),
    "active cross-fades softly (" + trans + ")");

  // --- same box as the artwork: not a pixel bigger nor smaller ---
  let sameBox = false;
  try {
    const blobR = document.querySelector("#spm-root .spm-blob").getBoundingClientRect();
    const coverR = document.querySelector("#spm-root .spm-coverlyr").getBoundingClientRect();
    sameBox = Math.abs(blobR.width - coverR.width) <= 1 &&
      Math.abs(blobR.height - coverR.height) <= 1 &&
      getComputedStyle(document.querySelector("#spm-root .spm-blob")).overflow === "hidden";
  } catch (e) {}
  ok(sameBox, "cover lyrics box matches the artwork squircle exactly");

  // --- lyric background color drives the box; expand clears the radius ---
  let bg = "";
  try { bg = getComputedStyle(document.querySelector("#spm-root .spm-coverlyr")).backgroundColor; } catch (e) {}
  ok(/10,\s*10,\s*10/.test(bg), "cover wears Spotify's lyric background (" + bg + ")");
  let expTop = "";
  let expRight = "";
  try {
    const cs = getComputedStyle(document.querySelector("#spm-root .spm-coverlyr-expand"));
    expTop = cs.top;
    expRight = cs.right;
  } catch (e) {}
  ok(expTop === "16px" && expRight === "16px", "expand sits clear of the corner (" + expTop + "/" + expRight + ")");

  // --- tracking follows; the active line glides into view ---
  // (The collapsed snippet only carries 5 rows, so open the fullscreen first:
  // its dialog carries ALL lines and the cover mirrors that copy while open.)
  const expandFirst = $(".spm-coverlyr-expand");
  ok(!!expandFirst, "larger-view expand button exists top-right");
  if (expandFirst) expandFirst.click();
  const lOpen = await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && !s.hasAttribute("hidden");
  }, 8000, "fullscreen from cover expand");
  ok(lOpen, "expand opens our fullscreen");
  h.advanceLyrics(); // -> index 3 (skips the gap row)
  const cFollowed = await waitFor(() => {
    const a = document.querySelector("#spm-root .spm-coverlyr-line.spm-active");
    return a && (a.textContent || "") === LINES[3] ? true : null;
  }, 8000, "cover highlight follows");
  ok(cFollowed, "cover highlight tracks Spotify's advance");
  // Tall wrapped content scrolls: long lines wrap to several rows each, so
  // the list overflows the box and the active line glides into view.
  const LONG = [
    "This is a deliberately very long lyric line that must wrap onto several lines inside the narrow cover box instead of being cut off",
    "Another extremely long line testing the wrap behavior with easily enough words to span at least two or three visual rows",
    "",
    "A third long line after the gap so advancing keeps tall wrapped content both above and below the active row for scrolling",
    "Short five",
    "Short six",
    "Short seven",
    "Short eight",
  ];
  h.setLyricsSplit(LINES.slice(0, 5), 1, LONG, 1);
  await sleep(500);
  h.advanceLyricsScope("dialog"); // -> index 3 (skips the gap row)
  const longFollowed = await waitFor(() => {
    const a = document.querySelector("#spm-root .spm-coverlyr-line.spm-active");
    return a && (a.textContent || "") === LONG[3] ? true : null;
  }, 8000, "cover follows tall content");
  ok(longFollowed, "cover tracks long wrapped lines");
  const scrolled = await waitFor(() => {
    try {
      return document.querySelector("#spm-root .spm-coverlyr-list").scrollTop > 0 ? true : null;
    } catch (e) { return null; }
  }, 8000, "cover smooth-scrolls to the active line");
  ok(scrolled, "active line glides into view with a smooth scroll");

  // --- jumping songs restarts both views at the top, never deep ---
  // (The first delivery after a jump still carries the OLD song's rows and
  // active line: centering that stale line is the "starts at the bottom"
  // bug. The dialog stays open with tall rows so both scrollers could strand
  // deep — they must both come back to the top instead.)
  const JUMP = [];
  for (let i = 0; i < 20; i++) JUMP.push("jump song line " + i + " with enough words to stay tall");
  h.setTrack("tjump", "Jump Song");
  await sleep(600);
  h.setLyricsSplit(JUMP.slice(0, 5), -1, JUMP, -1); // fetch completes, dialog stays open
  const jumpedTop = await waitFor(() => {
    try {
      const rows = document.querySelectorAll("#spm-root .spm-coverlyr-line");
      const cl = document.querySelector("#spm-root .spm-coverlyr-list");
      const fb = document.querySelector("#spm-root .spm-lbody");
      return rows.length && (rows[0].textContent || "") === JUMP[0] &&
        cl.scrollTop < 5 && fb.scrollTop < 5 ? true : null;
    } catch (e) { return null; }
  }, 8000, "both views restart at the top");
  ok(jumpedTop, "song jump restarts cover + fullscreen at the top");

  // --- X closes fullscreen; cover state survives on the snippet copy ---
  const xBtn = $(".spm-lclose");
  if (xBtn) xBtn.click();
  await waitFor(() => {
    const s = document.querySelector("#spm-root .spm-lsheet");
    return s && s.hasAttribute("hidden");
  }, 6000, "fullscreen closes");
  const coverStill = $(".spm-coverlyr");
  ok(!!coverStill && !coverStill.hasAttribute("hidden"), "cover lyrics stay on after fullscreen closes");
  // Closing takes the dialog down too, so the cover lands on the live
  // snippet copy (JUMP's first rows), not stranded LONG text.
  const afterCloseFirst = (() => {
    try {
      const r = document.querySelector("#spm-root .spm-coverlyr-line");
      return r ? r.textContent : "?";
    } catch (e) { return "?"; }
  })();
  ok(afterCloseFirst === JUMP[0], "cover falls back to the live snippet copy after close");

  // --- new song's lines arrive in the cover untouched by hand ---
  const NEW = ["new one", "new two", "", "new three", "new four", "new five", "new six", "new seven"];
  h.setTrackLyrics("track2", NEW, 0);
  h.setTrack("track2", "New Track");
  await sleep(600);
  h.setLyrics(NEW, 0); // models Spotify's fetch completing for the new song
  const cSwitched = await waitFor(() => {
    const rows = document.querySelectorAll("#spm-root .spm-coverlyr-line");
    return rows.length && (rows[0].textContent || "") === NEW[0] ? true : null;
  }, 8000, "cover follows the new song");
  ok(cSwitched, "cover swaps to the NEW song's lines after a track change");

  // --- toggle off restores the artwork box ---
  toggle.click();
  await sleep(300);
  const coverOff = $(".spm-coverlyr");
  ok(!!coverOff && coverOff.hasAttribute("hidden"), "toggle off hides the cover lyrics");
  ok(toggle.getAttribute("aria-pressed") === "false", "toggle releases aria-pressed");

  // --- cover holds (not blanks) across a teardown gap, then expires ---
  toggle.click(); // back on, showing NEW rows
  await sleep(300);
  h.setTrack("track3", "Third Track");
  await sleep(600);
  h.setLyrics([], -1); // section torn down, new song's rows not mounted yet
  try { sp.refreshLyrics(); } catch (e) {}
  await sleep(300);
  const heldRows = document.querySelectorAll("#spm-root .spm-coverlyr-line").length;
  ok(heldRows > 0, "cover holds last paint through the gap (" + heldRows + " rows)");
  // Past the 4s hold bound the snapshot ticks expire it (adapter
  // re-deliveries are sig-deduped, so only the tick re-evaluation converges).
  const expired = await waitFor(() =>
    document.querySelectorAll("#spm-root .spm-coverlyr-line").length === 0 ? true : null,
  12000, "expired hold converges");
  ok(expired, "expired hold converges to the empty state for a lyrics-less track");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
