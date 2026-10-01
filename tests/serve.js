/* Minimal static server for the harness (test-only, no dependencies).
 *
 *   node tests/serve.js [port]
 *
 * Serves the project root so tests/harness.html can load the real extension
 * files (spotifyAdapter.js / ui.js / content.js / style.css) unmodified.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2] || 8787);
const root = path.resolve(__dirname, "..");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = url === "/" ? "tests/harness.html" : url.replace(/^\/+/, "");
  const file = path.resolve(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found: " + rel);
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log("harness: http://127.0.0.1:" + port + "/tests/harness.html");
});
