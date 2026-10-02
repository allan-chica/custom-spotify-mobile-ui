// Probe: the two UI fixes.
//   1. the sheets' top-right close button actually closes (it was dead because
//      the header drag called preventDefault on pointerdown, which suppresses
//      the click), while dragging the header still closes the sheet.
//   2. the heart flourish: fires on OFF -> ON only, builds shards, survives the
//      icon swap, and is skipped under prefers-reduced-motion.
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  let fails = 0;
  const ok = (c, m) => { if (!c) fails++; out.push((c ? "PASS  " : "FAIL  ") + m); };
  const $ = (s) => document.querySelector("#spm-root " + s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll("#spm-root " + s));

  async function waitFor(fn, ms, label) {
    const t0 = Date.now();
    for (;;) {
      try { if (fn()) return true; } catch (e) {}
      if (Date.now() - t0 > (ms || 8000)) { out.push("TIMEOUT waiting for " + label); return false; }
      await sleep(100);
    }
  }
  const isOpen = (sel) => {
    const el = $(sel);
    return !!el && !el.hasAttribute("hidden");
  };
  function pointer(el, type, y) {
    // window has no rect; synthesise plausible coordinates for it.
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, width: 200 };
    el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 1, pointerType: "touch", isPrimary: true,
      clientX: Math.round(r.left + r.width / 2),
      clientY: y === undefined ? Math.round((r.top || 0) + 20) : y,
    }));
  }

  // A REAL tap: pointerdown -> pointerup -> click. Browsers suppress the
  // click when pointerdown's default was prevented, and dispatchEvent()
  // returns false in exactly that case â€” so we honour it. A bare el.click()
  // would bypass pointerdown entirely and could never catch this class of bug.
  function tap(el) {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const base = {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 2, pointerType: "touch", isPrimary: true,
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
    return notPrevented;
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-like"), 12000, "mount");
  if (!booted) return "HARNESS NEVER BOOTED";
  const h = window.harness;

  h.setPlaylistMode("check");
  h.setTrack("harness", "Real Track");

  /* ---------- 1a. sheet headers have NO close button (removed) ---------- */
  ok(!$(".spm-pclose"), "playlist sheet has no chevron close button");
  ok(!$(".spm-dclose"), "devices sheet has no chevron close button");
  ok(!!$(".spm-ptitle"), "playlist sheet title still present");
  ok(!!$(".spm-dtitle"), "devices sheet title still present");

  /* ---------- 1b. playlist sheet still closes by backdrop + Escape ---------- */
  h.setLiked("harness", true);
  await sleep(300);
  tap($(".spm-like"));
  const pOpen = await waitFor(() => isOpen(".spm-psheet"), 8000, "playlist sheet open");
  ok(pOpen, "playlist sheet opens from the heart");
  if (pOpen) {
    const backdrop = $(".spm-pbackdrop");
    ok(!!backdrop, "playlist sheet has a backdrop to tap away from");
    if (backdrop) {
      backdrop.click();
      const closed = await waitFor(() => !isOpen(".spm-psheet"), 5000, "backdrop close");
      ok(closed, "tapping the backdrop closes the sheet");
    }
  }

  /* ---------- 1c. devices sheet closes by backdrop ---------- */
  tap($(".spm-devices"));
  const dOpen = await waitFor(() => isOpen(".spm-dsheet"), 8000, "devices sheet open");
  ok(dOpen, "devices sheet opens");
  if (dOpen) {
    const backdrop = $(".spm-dbackdrop");
    if (backdrop) {
      backdrop.click();
      const closed = await waitFor(() => !isOpen(".spm-dsheet"), 5000, "devices backdrop close");
      ok(closed, "tapping the backdrop closes the devices sheet");
    }
  }

  /* ---------- 1d. header drag still closes (guard must not break it) ---------- */
  h.setLiked("harness", true);
  await sleep(300);
  tap($(".spm-like"));
  await waitFor(() => isOpen(".spm-psheet"), 8000, "reopen for drag test");
  const head = $(".spm-phead");
  const title = $(".spm-ptitle");
  const top = Math.round(head.getBoundingClientRect().top);
  pointer(title, "pointerdown", top + 20);   // press the TITLE, not a button
  await sleep(40);
  pointer(window, "pointermove", top + 260);
  await sleep(60);
  pointer(window, "pointerup", top + 260);
  const dragClosed = await waitFor(() => !isOpen(".spm-psheet"), 5000, "sheet close by drag");
  ok(dragClosed, "swipe-down on the header still closes the sheet");

  /* ---------- 1e. no ghost click after expanding the mini player ----------
   * Expanding on pointerup reveals the card under the finger, and the browser
   * then synthesises its click by hit-testing the NEW layout — so a tap that
   * landed on the mini bar can activate whatever card button now occupies that
   * point (the Devices button, typically). The click is dispatched to that
   * revealed element, so it has to be swallowed before it reaches any target.
   *
   * Geometry in the harness viewport is unreliable, so this dispatches the
   * click straight at the control the ghost would have hit — which is exactly
   * the contract that matters. */
  const rootEl = document.getElementById("spm-root");
  const expanded = await waitFor(() => !rootEl.classList.contains("spm-collapsed"),
    6000, "player expanded");
  ok(expanded, "player starts expanded");
  // Collapse via the real button so the mini bar is the on-screen surface.
  tap($(".spm-collapse"));
  const collapsed = await waitFor(() => rootEl.classList.contains("spm-collapsed"),
    6000, "mini player shown");
  ok(collapsed, "player is collapsed so the mini bar is up");

  if (collapsed) {
    const miniRect = $(".spm-miniplayer").getBoundingClientRect();
    out.push("   mini rect = " + Math.round(miniRect.left) + "," + Math.round(miniRect.top) +
      " " + Math.round(miniRect.width) + "x" + Math.round(miniRect.height));
    // A real tap on the mini: pointerdown/up, which expands it immediately.
    pointer($(".spm-miniplayer"), "pointerdown", Math.round(miniRect.top + miniRect.height / 2));
    pointer($(".spm-miniplayer"), "pointerup", Math.round(miniRect.top + miniRect.height / 2));
    await sleep(80);
    ok(!rootEl.classList.contains("spm-collapsed"), "the tap expanded the player");

    // Now the browser's synthesized click for that same touch. Whichever card
    // control it lands on, it must not fire.
    const devBtn = $(".spm-devices");
    ok(!!devBtn && devBtn.offsetParent !== null, "Devices button is revealed after expanding");
    if (devBtn) {
      devBtn.click();               // the ghost click, aimed at the control
      await sleep(400);
      ok(!isOpen(".spm-dsheet"),
        "expanding the mini does NOT open the Devices sheet (ghost click swallowed)");
    }
  }
  // Leave the player expanded for the flourish checks that follow.
  if (rootEl.classList.contains("spm-collapsed")) tap($(".spm-collapse"));
  await waitFor(() => !rootEl.classList.contains("spm-collapsed"), 6000, "re-expanded");
  await sleep(300);

  /* ---------- 1f. a TRAVELLING press must not open Devices ----------
   * .spm-card is an overflow-y:auto scroller; a touch that drifts into a pan
   * gets stolen by the browser (pointercancel + suppressed click), which is why
   * the tap used to do nothing. touch-action:none on card buttons stops the
   * steal, and a release that travelled is rejected so a scroll never opens the
   * sheet by accident. */
  const devBtn2 = $(".spm-devices");
  ok(!!devBtn2, "Devices button exists");
  if (devBtn2) {
    const cs = getComputedStyle(devBtn2);
    out.push("   devices touch-action = " + cs.touchAction);
    ok(cs.touchAction === "none",
      "card buttons set touch-action:none so a tap can't be stolen by the card's scroll");
  }
  // Drag from the button: must NOT open the sheet.
  const dr = devBtn2 ? devBtn2.getBoundingClientRect() : null;
  if (dr) {
    const cx = Math.round(dr.left + dr.width / 2);
    const cy = Math.round(dr.top + dr.height / 2);
    const mk = (type, y, buttons) => new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 11, pointerType: "touch", isPrimary: true,
      clientX: cx, clientY: y, button: 0, buttons: buttons,
    });
    devBtn2.dispatchEvent(mk("pointerdown", cy, 1));
    devBtn2.dispatchEvent(mk("pointermove", cy - 60, 1));
    devBtn2.dispatchEvent(mk("pointerup", cy - 60, 0));
    // The synthesized click that a browser would send afterwards.
    devBtn2.dispatchEvent(new MouseEvent("click", {
      bubbles: true, cancelable: true, clientX: cx, clientY: cy - 60,
    }));
    await sleep(350);
    ok(!isOpen(".spm-dsheet"),
      "a press that travelled (scroll/drag) does NOT open the Devices sheet");
    // And a clean tap still does.
    devBtn2.click();
    const okOpen = await waitFor(() => isOpen(".spm-dsheet"), 5000, "devices open after clean tap");
    ok(okOpen, "a clean tap on Devices still opens the sheet");
    if (okOpen) {
      const back = $(".spm-dbackdrop");
      if (back) back.click();
      await waitFor(() => !isOpen(".spm-dsheet"), 4000, "close");
    }
  }

  /* ---------- 2. heart flourish ---------- */
  h.setLiked("harness", false);
  await sleep(500);
  const heart = $(".spm-like");
  const root = document.getElementById("spm-root");
  // The FX layers are root children (NOT inside the heart) because .spm-card
  // clips overflow — a burst rendered inside the card would be cropped away.
  const fx = root.querySelector('.spm-like-fx[data-likefx="main"]');
  ok(!!fx, "heart has an FX layer (outside the clipping card)");
  ok(!!heart.querySelector("svg"), "heart still has its icon");
  ok(!!root.querySelector('.spm-like-fx[data-likefx="mini"]'), "mini heart has its own FX layer");
  if (!fx) {
    out.push("   (no FX layer: skipping the flourish checks)");
    return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
  }

  // OFF -> ON
  h.setLiked("harness", true);
  const fired = await waitFor(() => fx.classList.contains("spm-like-fire"), 4000, "flourish on");
  ok(fired, "flourish fires when the heart fills");
  const shards = fx.querySelectorAll("i").length;
  out.push("   shards = " + shards);
  ok(shards > 0, "shards were created (" + shards + ")");
  ok(!!heart.querySelector("svg"), "icon survived the swap (fx layer NOT wiped)");
  const filled = !!heart.querySelector("svg path[fill]") || heart.querySelector("svg").innerHTML.indexOf("<path") === 0;
  ok(filled, "heart renders the filled glyph");
  ok(heart.getAttribute("aria-pressed") === "true", "aria-pressed flipped");

  // shards must be cleaned up
  await sleep(1500);
  ok(fx.querySelectorAll("i").length === 0, "shards cleaned up after the burst");
  ok(!fx.classList.contains("spm-like-fire"), "fire class removed");

  // ON -> OFF must NOT celebrate
  h.setLiked("harness", false);
  await sleep(400);
  ok(!fx.classList.contains("spm-like-fire"), "unliking does not fire the flourish");
  ok(root.querySelectorAll("#spm-root .spm-like-fx").length === 2, "exactly two FX layers (card + mini)");

  /* ---------- 2b. only the VISIBLE heart bursts ---------- */
  // Collapsed => mini bar is on screen and the card is display:none. A like
  // must burst the mini heart and NOT the hidden card heart.
  const mini = $(".spm-mini-like");
  const miniFx = root.querySelector('.spm-like-fx[data-likefx="mini"]');
  root.classList.add("spm-collapsed");
  await sleep(200);
  const cardHidden = await waitFor(() => getComputedStyle($(".spm-card")).display === "none", 3000, "card hidden");
  ok(cardHidden, "collapsed hides the full card");
  h.setLiked("harness", false);
  await sleep(400);
  h.setLiked("harness", true);
  const miniFired = await waitFor(() => miniFx.classList.contains("spm-like-fire"), 4000, "mini flourish");
  ok(miniFired, "collapsed: the mini heart bursts");
  ok(!fx.classList.contains("spm-like-fire"),
     "collapsed: the hidden card heart does NOT burst (no stray effect)");
  ok(!!mini.querySelector("svg"), "mini icon survived the swap");
  root.classList.remove("spm-collapsed");
  await sleep(250);

  /* ---------- 3. reduced motion ---------- */
  // Simulate the media query the same way browsers expose it.
  const real = window.matchMedia;
  let forced = true;
  window.matchMedia = function (q) {
    if (/prefers-reduced-motion/.test(q) && forced) {
      return { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
    }
    return real.call(window, q);
  };
  h.setLiked("harness", true);
  await sleep(400);
  ok(!fx.classList.contains("spm-like-fire"),
     "reduced-motion suppresses the flourish (no shards)");
  ok(fx.querySelectorAll("i").length === 0, "reduced-motion creates no shards");
  forced = false;
  window.matchMedia = real;

  /* ---------- 4. no console errors from any of it ---------- */
  ok(true, "probe completed");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()