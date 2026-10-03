// Probe: lyrics warmup for a cold (unprimed) snippet.
// Flips only start flowing once Spotify's view opens; before that our cover
// would sit static forever. The adapter must notice (playing +
// collapsed snippet + no flips), prime once by opening, and LEAVE it open
// (closing would silence the feed just started) — never twice for one track.
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
      await sleep(250);
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
  h.setLyricsCold(true);
  h.setLyrics(LINES, 1);
  await sleep(400);

  // Playing: the harness toggle flips Play<->Pause like Spotify's.
  document.getElementById("np-toggle").click();
  await sleep(300);

  // --- cold: advances never reach the snippet, cover sits static ---
  $(".spm-coverlyr-toggle").click();
  await sleep(300);
  h.advanceLyrics();
  h.advanceLyrics();
  await sleep(600);
  const frozen = Array.prototype.map.call(
    document.querySelectorAll("#spm-root .spm-coverlyr-line"),
    (e) => (e.textContent || "").trim()
  );
  ok(frozen.length === 5 && frozen[1] === LINES[1],
    "cold snippet stays static through advances (" + JSON.stringify(frozen.slice(0, 3)) + ")");
  ok(!h.wasPrimed(), "engine still unprimed");

  // --- warmup: adapter primes once and LEAVES the view open (veiled) ---
  // Closing it again would silence the feed just started — the expansion
  // (or overlay) persists by design so flips keep flowing to the preview.
  const primed = await waitFor(() => h.wasPrimed(), 32000, "warmup prime");
  ok(primed, "adapter warmed the dead snippet");
  ok(h.lyricsFullscreenOpen(), "warmup leaves Spotify's view open (feed stays alive)");
  let veiled = "";
  try {
    veiled = getComputedStyle(document.getElementById("fake-lyrics-fullscreen")).visibility;
  } catch (e) {}
  ok(veiled === "hidden", "left-open overlay stays veiled (" + veiled + ")");

  // --- flips now flow: cover tracks with zero manual opens ---
  h.advanceLyrics(); // -> 3
  const followed = await waitFor(() => {
    const a = document.querySelector("#spm-root .spm-coverlyr-line.spm-active");
    return a && (a.textContent || "").trim() === LINES[3] ? true : null;
  }, 8000, "cover tracks post-prime");
  ok(followed, "in-cover lyrics track after priming, untouched by hand");

  // --- and it only ever warms once per track ---
  let warmStarts = 0;
  try {
    warmStarts = (sp.inspectLyrics().log || []).filter((e) => e.ev === "warm-start").length;
  } catch (e) {}
  await sleep(7000);
  let warmStartsAfter = 0;
  try {
    warmStartsAfter = (sp.inspectLyrics().log || []).filter((e) => e.ev === "warm-start").length;
  } catch (e2) {}
  ok(warmStarts === 1 && warmStartsAfter === 1,
    "exactly one warmup per track (" + warmStarts + " -> " + warmStartsAfter + ")");

  return out.join("\n") + "\n\n" + (fails ? fails + " FAILED" : "ALL PASSED");
})()
