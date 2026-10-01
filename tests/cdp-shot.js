// Screenshot a page via CDP. Usage:
//   node tests/cdp-shot.js <page> <out.png> [width] [height] [waitMs]
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const nodePath = require("path");
const { pathToFileURL } = require("url");

const pageArg = process.argv[2];
const outFile = process.argv[3];
const W = parseInt(process.argv[4] || "520", 10);
const H = parseInt(process.argv[5] || "900", 10);
const waitMs = parseInt(process.argv[6] || "1200", 10);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9355;

// Keep any ?query/#hash OUT of the path resolution, then re-append it.
const qMatch = pageArg.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
const pagePath = qMatch ? qMatch[1] : pageArg;
const pageQuery = (qMatch && qMatch[2]) || "";
const pageHash = (qMatch && qMatch[3]) || "";
const pageUrl = /^[a-z]+:\/\//i.test(pageArg)
  ? pageArg
  : pathToFileURL(nodePath.resolve(pagePath)).href + pageQuery + pageHash;

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--force-device-scale-factor=2", "--hide-scrollbars",
  "--remote-allow-origins=*", "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + nodePath.join(os.tmpdir(), "cdp-shot-" + process.pid),
  "--window-size=" + W + "," + H, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(400);
    try {
      const list = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
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
  await send("Emulation.setDeviceMetricsOverride", {
    width: W, height: H, deviceScaleFactor: 2, mobile: false,
  });
  // SPM_LIGHT=1 renders the prefers-color-scheme: light palette.
  const scheme = process.env.SPM_LIGHT === "1" ? "light" : "dark";
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: scheme }],
  });
  await send("Page.navigate", { url: pageUrl });
  await sleep(waitMs);

  const r = await send("Runtime.evaluate", {
    expression: "(document.title + ' | errors:' + (window.__err || 0))",
    returnByValue: true,
  });
  console.log("page: " + r.result.value);
  try {
    const logs = await send("Runtime.evaluate", {
      expression: "JSON.stringify(window.__logs || [])",
      returnByValue: true,
    });
    (JSON.parse(logs.result.value) || []).forEach((l) => console.log("  log: " + l));
  } catch (e) {}

  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(outFile, Buffer.from(shot.data, "base64"));
  console.log("wrote " + outFile + " (" + fs.statSync(outFile).size + " bytes)");
  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => {
  console.error("shot error: " + e.message);
  try { chrome.kill(); } catch (x) {}
  process.exit(1);
});