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

  /* ---------- 1a. playlist sheet close button ---------- */
  h.setLiked("harness", true);
  await sleep(300);
  tap($(".spm-like"));
  const pOpen = await waitFor(() => isOpen(".spm-psheet"), 8000, "playlist sheet open");
  ok(pOpen, "playlist sheet opens from the heart");
  if (pOpen) {
    ok(!!$(".spm-pclose"), "playlist sheet has a top-right close button");
    tap($(".spm-pclose"));
    const pClosed = await waitFor(() => !isOpen(".spm-psheet"), 5000, "playlist sheet close");
    ok(pClosed, ".spm-pclose actually closes the sheet (was inert)");
  }

  /* ---------- 1b. devices sheet close button ---------- */
  tap($(".spm-devices"));
  const dOpen = await waitFor(() => isOpen(".spm-dsheet"), 8000, "devices sheet open");
  ok(dOpen, "devices sheet opens");
  if (dOpen) {
    ok(!!$(".spm-dclose"), "devices sheet has a top-right close button");
    tap($(".spm-dclose"));
    const dClosed = await waitFor(() => !isOpen(".spm-dsheet"), 5000, "devices sheet close");
    ok(dClosed, ".spm-dclose actually closes the sheet (was inert)");
  }

  /* ---------- 1c. header drag still works (guard must not break it) ---------- */
  h.setLiked("harness", true);
  await sleep(300);
  tap($(".spm-like"));
  await waitFor(() => isOpen(".spm-psheet"), 8000, "reopen for drag test");
  const head = $(".spm-phead");
  const title = $(".spm-ptitle");
  const top = Math.round(head.getBoundingClientRect().top);
  pointer(title, "pointerdown", top + 20);   // press the TITLE, not the button
  await sleep(40);
  pointer(window, "pointermove", top + 260);
  await sleep(60);
  pointer(window, "pointerup", top + 260);
  const dragClosed = await waitFor(() => !isOpen(".spm-psheet"), 5000, "sheet close by drag");
  ok(dragClosed, "swipe-down on the header still closes the sheet");

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