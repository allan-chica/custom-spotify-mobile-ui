// Probe: device transfers must never falsely report failure.
//   A) lagging header: the row leaves on ack but Spotify's current-device
//      header lags 3s behind. The adapter must say "unconfirmed" (never
//      "rejected"), the sheet must say "Still connecting" (never
//      "Couldn't switch"), then settle to success on its own.
//   B) very slow handshake: the transfer lands after the UI grace expires.
//      "Couldn't switch" may honestly show — but it must clear the moment
//      the device shows as current instead of sticking.
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
      await sleep(150);
    }
  }

  // A REAL tap: pointerdown -> pointerup -> click (bindTap fast path).
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

  function notice() {
    const n = $(".spm-dnotice");
    if (!n || n.hasAttribute("hidden")) return "";
    return (n.textContent || "").trim();
  }

  function rowByName(name) {
    const rows = document.querySelectorAll("#spm-root .spm-drow");
    for (let i = 0; i < rows.length; i++) {
      const nm = rows[i].querySelector(".spm-dname");
      if (nm && (nm.textContent || "").trim() === name) return rows[i];
    }
    return null;
  }

  function activeName() {
    const rows = document.querySelectorAll("#spm-root .spm-drow.spm-dactive");
    if (!rows.length) return "";
    const nm = rows[0].querySelector(".spm-dname");
    return nm ? (nm.textContent || "").trim() : "?";
  }

  const booted = await waitFor(() => window.harness && window.SpotMobile && $(".spm-devices"),
    12000, "extension mount");
  if (!booted) return "HARNESS NEVER BOOTED";
  const h = window.harness;
  const sp = window.SpotMobile.spotify;
  document.getElementById("np-toggle").click(); // playing: snapshot ticks run fast
  await sleep(300);

  /* ---------- A0) adapter verdict for a lagging header, direct call ---------- */
  h.setMode("laggingcurrent");
  const fresh0 = await sp.refreshDevices();
  const tv0 = (fresh0 || []).filter((d) => !d.isActive && d.name === "Living Room TV")[0];
  ok(!!tv0, "adapter lists the target device");
  const res0 = tv0 ? await sp.selectDevice(tv0) : null;
  ok(!!res0 && res0.ok === false && res0.reason === "unconfirmed",
    "accepted-but-lagging handshake is unconfirmed, never rejected (" +
    (res0 && (res0.ok + "/" + res0.reason)) + ")");
  await sleep(4500); // past the 3s header lag
  const after0 = await sp.refreshDevices();
  const active0 = (after0 || []).filter((d) => d.isActive)[0];
  ok(!!active0 && active0.name === "Living Room TV",
    "lagging header converges to the device on re-read");

  /* ---------- A) lagging header through the sheet UI ---------- */
  // (A0 already moved playback to the TV; this round trips to the PC.)
  tap($(".spm-devices"));
  const dOpen = await waitFor(() => isOpen(".spm-dsheet") &&
    document.querySelectorAll("#spm-root .spm-drow").length > 0, 8000, "devices sheet");
  ok(dOpen, "devices sheet opens with rows");
  const pcA = rowByName("Aladdin's PC");
  ok(!!pcA, "target row present");
  if (pcA) pcA.click();
  // The verdict lands ~1-2s in: it must never be a hard failure, even though
  // the header still shows the old device for 3s.
  let sawFailureA = false;
  let sawConnecting = false;
  for (let i = 0; i < 36; i++) {
    const t = notice();
    if (t.indexOf("Couldn't switch") !== -1) sawFailureA = true;
    if (t.indexOf("Still connecting") !== -1) sawConnecting = true;
    await sleep(250);
    if (activeName() === "Aladdin's PC" && !t) break;
  }
  ok(!sawFailureA, "no false failure while the header lags");
  ok(sawConnecting, "sheet says Still connecting (not failed) during the lag");
  const settledA = await waitFor(() => activeName() === "Aladdin's PC" && !notice(), 15000, "lagging settle");
  ok(settledA, "slow-but-accepted switch settles to success on its own");

  /* ---------- B) handshake lands after the UI grace expires ---------- */
  h.setMode("ultraslowtransfer"); // 28s handshake: verdict ~11s, grace ends ~26s
  const web = rowByName("This web browser");
  ok(!!web, "second target row present");
  if (web) web.click();
  const failedB = await waitFor(() => notice().indexOf("Couldn't switch to This web browser") !== -1,
    45000, "honest timeout for a very slow handshake");
  ok(failedB, "grace expiry still admits a genuinely unresolved switch");
  // The transfer lands at ~28s: the stuck error must clear and the row must
  // read current, instead of lying forever.
  const healedB = await waitFor(() => activeName() === "This web browser" &&
    notice().indexOf("Couldn't switch") === -1, 25000, "late success reconciles");
  ok(healedB, "late success clears the error and marks the device current");

  h.setMode("ok");

  /* ---------- C) a row Spotify flags unreachable still fails fast ---------- */
  // (Guards the other side of the verdict: untaken + flagged must stay a
  // fast "rejected", never a 15s spin.)
  const freshC = await sp.refreshDevices();
  const spk = (freshC || []).filter((d) => !d.isActive && d.name === "Bathroom speaker")[0];
  ok(!!spk, "flagged row present");
  const resC = spk ? await sp.selectDevice(spk) : null;
  ok(!!resC && resC.ok === false && resC.reason === "rejected",
    "flagged-and-untaken handshake rejects fast (" +
    (resC && (resC.ok + "/" + resC.reason)) + ")");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
