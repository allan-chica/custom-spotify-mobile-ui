// Probe: volume icon button + popup (the inline aux slider is gone).
//   - aux row carries an icon-only Volume button (no inline slider anywhere)
//   - tapping it opens a small popup with the working mute + slider
//   - dragging the slider drives the adapter volume; mute toggles it
//   - popup closes via toggle, outside press, and Escape
//   - fullscreen lyrics header carries no title text (close only)
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  let fails = 0;
  const ok = (c, m) => { if (!c) fails++; out.push((c ? "PASS  " : "FAIL  ") + m); };

  const $ = (s) => document.querySelector("#spm-root " + s);
  const isOpen = (sel) => { const el = $(sel); return !!el && !el.hasAttribute("hidden"); };

  async function waitFor(fn, ms, label) {
    const t0 = Date.now();
    for (;;) {
      try { if (fn()) return true; } catch (e) {}
      if (Date.now() - t0 > (ms || 8000)) { out.push("TIMEOUT waiting for " + label); return false; }
      await sleep(100);
    }
  }

  function tap(el) {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const base = { bubbles: true, cancelable: true, composed: true,
      pointerId: 2, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, button: 0 };
    el.dispatchEvent(new PointerEvent("pointerdown", Object.assign({ buttons: 1 }, base)));
    el.dispatchEvent(new PointerEvent("pointerup", Object.assign({ buttons: 0 }, base)));
    el.dispatchEvent(new MouseEvent("click",
      { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 }));
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-volbtn"),
    12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";
  const sp = window.SpotMobile.spotify;

  // --- aux row: icon button, no inline slider ---
  const volBtn = $(".spm-volbtn");
  ok(!!volBtn, "aux row has an icon-only volume button");
  ok(volBtn && volBtn.textContent.trim() === "", "volume button carries no text label");
  ok(!!volBtn && !!volBtn.querySelector("svg"), "volume button shows the speaker icon");
  ok(!document.querySelector("#spm-root .spm-vol"), "inline volume cluster is gone");
  const pop0 = $(".spm-volpop");
  ok(!!pop0 && pop0.hasAttribute("hidden"), "volume popup hidden by default");
  ok(!!$(".spm-volpop .spm-vol-bar"), "popup owns the volume slider");
  ok(!!$(".spm-volpop .spm-mute"), "popup owns the mute toggle");

  // --- toggle opens the popup ---
  tap(volBtn);
  const pOpen = await waitFor(() => isOpen(".spm-volpop"), 5000, "volume popup");
  ok(pOpen, "tap opens the volume popup");
  ok(volBtn.getAttribute("aria-expanded") === "true", "button marks aria-expanded");

  // --- slider drag drives the adapter volume ---
  const bar = $(".spm-volpop .spm-vol-bar");
  const r = bar.getBoundingClientRect();
  const x = Math.round(r.left + r.width * 0.3);
  const y = Math.round(r.top + r.height / 2);
  bar.dispatchEvent(new PointerEvent("pointerdown",
    { bubbles: true, cancelable: true, composed: true, pointerId: 3,
      pointerType: "touch", isPrimary: true, clientX: x, clientY: y, buttons: 1, button: 0 }));
  bar.dispatchEvent(new PointerEvent("pointerup",
    { bubbles: true, cancelable: true, composed: true, pointerId: 3,
      pointerType: "touch", isPrimary: true, clientX: x, clientY: y, buttons: 0, button: 0 }));
  await sleep(400); // past the 60ms volume debounce
  let vol = -1;
  try { vol = sp.getVolume(); } catch (e) {}
  ok(vol >= 0.2 && vol <= 0.4, "slider sets ~30% volume through the adapter (" + vol + ")");

  // --- mute toggles to zero and back via the adapter read ---
  const mute = $(".spm-volpop .spm-mute");
  mute.click();
  await sleep(400);
  let muted = -1;
  try { muted = sp.getVolume(); } catch (e) {}
  ok(muted <= 0.001, "mute drives volume to zero (" + muted + ")");
  mute.click();
  await sleep(400);
  let back = -1;
  try { back = sp.getVolume(); } catch (e) {}
  ok(back >= 0.2 && back <= 0.4, "unmute restores the pre-mute level (" + back + ")");

  // --- popup closes via toggle, outside press, and Escape ---
  tap(volBtn);
  await sleep(300);
  ok(!isOpen(".spm-volpop"), "toggle closes the popup");
  tap(volBtn);
  await waitFor(() => isOpen(".spm-volpop"), 5000, "reopen");
  // A press starting anywhere outside the popup and its button closes it.
  // Dispatched on body so no card gesture or control gets involved.
  document.body.dispatchEvent(new PointerEvent("pointerdown",
    { bubbles: true, cancelable: true, composed: true, pointerId: 4,
      pointerType: "touch", isPrimary: true, clientX: 4, clientY: 4, buttons: 1, button: 0 }));
  await sleep(300);
  ok(!isOpen(".spm-volpop"), "outside press closes the popup");
  tap(volBtn);
  await waitFor(() => isOpen(".spm-volpop"), 5000, "reopen 2");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await sleep(300);
  ok(!isOpen(".spm-volpop"), "Escape closes the popup");

  // --- fullscreen header: close button only, no title text ---
  tap($(".spm-coverlyr-toggle"));
  await sleep(300);
  const expand = $(".spm-coverlyr-expand");
  if (expand) expand.click();
  const lOpen = await waitFor(() => isOpen(".spm-lsheet"), 8000, "fullscreen");
  ok(lOpen, "fullscreen opens");
  ok(!document.querySelector("#spm-root .spm-ltitle"), "fullscreen header has no title element");
  const headText = ((document.querySelector("#spm-root .spm-lhead") || {}).textContent || "").trim();
  ok(headText === "", "fullscreen header carries no title text");
  ok(!!$(".spm-lclose"), "close button still present");
  const xBtn = $(".spm-lclose");
  if (xBtn) xBtn.click();
  await waitFor(() => !isOpen(".spm-lsheet"), 6000, "fullscreen closes");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
