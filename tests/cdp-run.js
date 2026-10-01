// Minimal CDP driver: load a page in headless Chrome, wait for
// document.title to settle on DONE/FAILED, print #out.
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");
const nodePath = require("path");
const target_path = process.argv[2];
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + require("path").join(require("os").tmpdir(), "cdp-profile-" + process.pid),
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(500);
    try {
      const r = await fetch("http://127.0.0.1:" + PORT + "/json/list");
      const list = await r.json();
      target = list.find((t) => t.type === "page");
    } catch (e) {}
  }
  if (!target) throw new Error("no chrome target");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  });
  await new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  // Accepts a repo-relative path or an absolute one.
  const url = pathToFileURL(nodePath.resolve(target_path)).href;
  await send("Page.navigate", { url });

  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    return r.result && r.result.value;
  };
  // One round-trip: title + body text can never straddle a navigation.
  const snapshot = async () => {
    const r = await send("Runtime.evaluate", {
      returnByValue: true,
      expression:
        "JSON.stringify({t:document.title,o:(document.getElementById('out')||{}).textContent||''})",
    });
    try { return JSON.parse(r.result.value); } catch (e) { return { t: "", o: "" }; }
  };

  let last = "";
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    const s = await snapshot();
    if (s.t === "DONE" || s.t === "FAILED") {
      console.log(s.o);
      console.log(s.t === "DONE" ? "\n=== ALL PASSED ===" : "\n=== FAILURES PRESENT ===");
      ws.close();
      chrome.kill();
      process.exit(s.t === "DONE" ? 0 : 1);
    }
    if (s.o !== last) {
      last = s.o;
      console.error("[" + i + "] title=" + s.t + " out=" + s.o.slice(0, 160));
    }
  }
  const s = await snapshot();
  console.log("TIMEOUT (title=" + s.t + "). last out:\n" + s.o);
  ws.close();
  chrome.kill();
  process.exit(2);
})().catch((e) => {
  console.error("driver error: " + e.message);
  try { chrome.kill(); } catch (x) {}
  process.exit(3);
});