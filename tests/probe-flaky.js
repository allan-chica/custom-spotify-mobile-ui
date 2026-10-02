// Probe: try to REPRODUCE the two intermittent phone bugs by repeating the
// exact user actions many times and recording every failure.
//
//   1. tap "Connect devices" N times -> does our sheet always open?
//   2. open the playlist sheet N times -> is the list ever short/filtered?
//
// Run: node tests/cdp-probe.js tests/harness.html tests/probe-flaky.js 4000
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
      if (Date.now() - t0 > (ms || 8000)) return false;
      await sleep(60);
    }
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-like"),
    12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";

  const h = window.harness;
  const sp = window.SpotMobile.spotify;

  // A realistic tap: pointerdown -> pointerup -> click, and honour the browser's
  // rule that a prevented pointerdown suppresses the click.
  function tap(el) {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const base = {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 7, pointerType: "touch", isPrimary: true,
      clientX: x, clientY: y, button: 0,
    };
    const notPrevented = el.dispatchEvent(
      new PointerEvent("pointerdown", Object.assign({ buttons: 1 }, base))
    );
    el.dispatchEvent(new PointerEvent("pointerup", Object.assign({ buttons: 0 }, base)));
    if (notPrevented) {
      el.dispatchEvent(new MouseEvent("click", {
        bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0,
      }));
    }
  }
  const isOpen = (sel) => {
    const el = $(sel);
    return !!el && !el.hasAttribute("hidden");
  };

  h.setPlaylistMode("check");
  h.setTrack("harness", "Real Track");
  h.setLiked("harness", true);

  /* ================= 1. Connect devices, repeatedly ================= */
  const DEV_TRIES = 25;
  let devOk = 0;
  const devFails = [];
  for (let i = 0; i < DEV_TRIES; i++) {
    tap($(".spm-devices"));
    const opened = await waitFor(() => isOpen(".spm-dsheet"), 4000, "devices open");
    if (opened) {
      devOk++;
      // Close it again, via the backdrop, as a user would.
      const back = $(".spm-dbackdrop");
      if (back) back.click();
      await waitFor(() => !isOpen(".spm-dsheet"), 4000, "devices close");
      await sleep(90);
    } else {
      const st = $(".spm-dstate");
      const notice = $(".spm-dnotice");
      devFails.push(i + ":status=" +
        (st && !st.hasAttribute("hidden")
          ? (st.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30)
          : "(hidden)") +
        ",notice=" + (notice && !notice.hasAttribute("hidden")
          ? (notice.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30)
          : "(hidden)"));
      // Make sure we are not wedged closed for the next attempt.
      if (isOpen(".spm-dsheet")) {
        const back = $(".spm-dbackdrop");
        if (back) back.click();
        await sleep(120);
      }
    }
  }
  out.push("--- devices: " + devOk + "/" + DEV_TRIES + " opened ---");
  devFails.forEach((f) => out.push("    failed at " + f));
  ok(devOk === DEV_TRIES, "Connect devices opened on every one of " + DEV_TRIES + " taps");

  /* ================= 2. playlist sheet, repeatedly ================= */
  const PL_TRIES = 12;
  const counts = [];
  const sources = [];
  const reasons = [];
  for (let i = 0; i < PL_TRIES; i++) {
    tap($(".spm-like"));
    const opened = await waitFor(() => isOpen(".spm-psheet"), 5000, "playlist sheet open");
    if (!opened) { counts.push("NOOPEN"); await sleep(120); continue; }
    await waitFor(() => $(".spm-plist") && $(".spm-plist").children.length > 0, 6000, "rows");
    // Let the deferred fresh read land.
    await sleep(700);
    const n = $(".spm-plist") ? $(".spm-plist").children.length : 0;
    const st = sp.getPlaylistsState();
    counts.push(n);
    sources.push(st.viaCuration ? "curation" : "LIBRARY");
    reasons.push(String(st.reason || ""));
    const back = $(".spm-pbackdrop");
    if (back) back.click();
    await waitFor(() => !isOpen(".spm-psheet"), 4000, "sheet close");
    await sleep(120);
  }
  const expected = 5;
  out.push("--- playlist rows per open (expected " + expected + "): " + counts.join(","));
  out.push("--- source per open: " + sources.join(","));
  out.push("--- reason per open: " + JSON.stringify(reasons));
  ok(counts.every((c) => c === expected),
    "every open listed all " + expected + " rows (no short/filtered list)");
  ok(sources.every((s) => s === "curation"),
    "every open read Spotify's own sheet, never the library fallback");
  ok(!reasons.some((r) => r), "no read reported a failure reason");

  /* ============ 3. a WRONG-SOURCE cache must never be painted ============
   * Force the fallback (curation button hidden) so the cache holds the library
   * list, then re-open. The sheet must not paint that stale wrong list: it
   * should show a loading state and converge on the real read. This is the
   * "two different lists, randomly" mechanism. */
  h.setPlaylistMode("nocuration");     // curation button hidden -> library fallback
  await sleep(300);
  const libList = await sp.getPlaylists({ fresh: true });
  const libState = sp.getPlaylistsState();
  out.push("--- forced fallback: " + (libList ? libList.length : 0) + " rows, viaCuration=" +
    libState.viaCuration);
  ok(libState.viaCuration === false, "forcing the fallback really did use the library");

  tap($(".spm-like"));
  const reopened = await waitFor(() => isOpen(".spm-psheet"), 6000, "sheet open over bad cache");
  if (reopened) {
    // Over a wrong-source cache the sheet must NOT paint rows before the fresh
    // read lands — it shows a loading state instead. Painting the cache and then
    // visibly replacing it is the "two different lists, randomly" mechanism.
    // (Row COUNT can't distinguish the sources in this harness; whether we
    // painted at all is the behaviour that actually changed.)
    const paintedNow = document.querySelectorAll("#spm-root .spm-plist .spm-pitem").length;
    const stateEl = document.querySelector("#spm-root .spm-pstate");
    const loadingUpFront = !!(stateEl && !stateEl.hasAttribute("hidden") &&
      /loading/i.test(stateEl.textContent || ""));
    out.push("   on open over a wrong-source cache: rows=" + paintedNow +
      " loadingState=" + loadingUpFront);
    ok(paintedNow === 0 && loadingUpFront,
      "a wrong-source cache is not painted as if it were the playlist list");
// Informational only: in "nocuration" mode the fallback drives a real context
    // menu, and how fast it converges is a harness-timing question, not the
    // behaviour under test. Bounded poll so we report rather than hang.
    let settledRows = 0;
    for (let i = 0; i < 40; i++) {
      settledRows = document.querySelectorAll("#spm-root .spm-plist .spm-pitem").length;
      if (settledRows) break;
      await sleep(250);
    }
    out.push("   after the fresh read: rows=" + settledRows +
      " (fallback mode; informational)");
    const back = $(".spm-pbackdrop");
    if (back) back.click();
    await waitFor(() => !isOpen(".spm-psheet"), 4000, "close");
  } else {
    ok(false, "sheet did not open over a wrong-source cache");
  }
  h.setPlaylistMode("check");
  await sleep(300);

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()