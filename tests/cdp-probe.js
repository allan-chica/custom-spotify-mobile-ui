// Generic page probe: load a page in headless Chrome, collect console errors
// and uncaught exceptions, settle, then evaluate a probe script in the page and
// print its result.
//
//   node tests/cdp-probe.js <page-url> <probe-file.js> [settleMs]
//
// The probe file must be an expression evaluating to a string/JSON value.
const { spawn } = require("child_process");
const os = require("os");
const nodePath = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs");

// Accepts a repo-relative page path or an absolute one / full URL.
const pageArg = process.argv[2];
const pageUrl = /^[a-z]+:\/\//i.test(pageArg)
  ? pageArg
  : pathToFileURL(nodePath.resolve(pageArg)).href;
const probeFile = process.argv[3];
const settleMs = parseInt(process.argv[4] || "2500", 10);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9344;

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + nodePath.join(os.tmpdir(), "cdp-probe-" + process.pid),
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(500);
    try {
      const list = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
      target = list.find((t) => t.type === "page");
    } catch (e) {}
  }
  if (!target) throw new Error("no chrome target");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const problems = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      return;
    }
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails || {};
      problems.push("EXCEPTION: " + (d.exception && d.exception.description || d.text));
    }
    if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
      problems.push(
        m.params.type.toUpperCase() + ": " +
          m.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ")
      );
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
  await send("Page.navigate", { url: pageUrl });
  await sleep(settleMs);

  // The probe may be a bare IIFE ("(function(){...})();"), so trim trailing
  // semicolons/whitespace before embedding it in a `return (...)` expression.
  const probe = fs.readFileSync(probeFile, "utf8").replace(/[\s;]+$/, "");
  const r = await send("Runtime.evaluate", {
    expression: "(async () => { return await (" + probe + "); })()",
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    console.log("PROBE THREW: " + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text));
  } else {
    console.log(typeof r.result.value === "string" ? r.result.value : JSON.stringify(r.result.value, null, 2));
  }
  if (problems.length) {
    console.log("\n--- page errors/warnings ---");
    problems.slice(0, 25).forEach((p) => console.log(p));
  } else {
    console.log("\n(no page errors)");
  }
  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => {
  console.error("probe driver error: " + e.message);
  try { chrome.kill(); } catch (x) {}
  process.exit(3);
});