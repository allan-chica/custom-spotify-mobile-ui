/* Spotify Mobile Prototype — spmTokenHook.js
 *
 * Runs in the PAGE world (not the content-script isolated world), loaded via
 * a <script> tag injected by spotifyAdapter.js and exposed through
 * web_accessible_resources in manifest.json.
 *
 * PASSIVE ONLY: wraps window.fetch to observe the Authorization/client-token
 * headers Spotify's own code sends to api-partner.spotify.com and
 * spclient.wg.spotify.com, and relays copies to the isolated world via
 * window.postMessage. It never modifies requests, never writes DOM, never
 * logs anything, and never exfiltrates: messages stay in-page and the
 * adapter forwards the tokens solely to Spotify's own endpoints.
 *
 * If this file fails to load (CSP, harness file:// pages, tests), the
 * adapter silently keeps its DOM-based flows — see ensureTokenHook().
 */

(function () {
  "use strict";

  if (window.__spmTokenHookInstalled) return;
  window.__spmTokenHookInstalled = true;

  function getHeader(headers, name) {
    try {
      if (!headers) return "";
      if (typeof headers.get === "function") {
        try {
          return headers.get(name) || "";
        } catch (e) {
          return "";
        }
      }
      if (typeof headers === "object") {
        if (headers[name] !== undefined) return String(headers[name]);
        var lower = String(name).toLowerCase();
        var keys = Object.keys(headers);
        for (var i = 0; i < keys.length; i++) {
          if (String(keys[i]).toLowerCase() === lower) return String(headers[keys[i]]);
        }
      }
    } catch (e) {}
    return "";
  }

  function maybeRelay(url, opts) {
    try {
      var u = String((url && url.url) || url || "");
      if (u.indexOf("api-partner.spotify.com") === -1 && u.indexOf("spclient.wg.spotify.com") === -1) return;
      if (!opts || !opts.headers) return;
      var auth = getHeader(opts.headers, "authorization");
      if (!auth || auth.indexOf("Bearer ") !== 0) return;
      window.postMessage({
        source: "spm-token-hook",
        auth: auth,
        clientToken: getHeader(opts.headers, "client-token"),
        appVersion: getHeader(opts.headers, "spotify-app-version"),
      }, "*");
    } catch (e) {}
  }

  try {
    var origFetch = window.fetch;
    if (typeof origFetch === "function") {
      window.fetch = function (url, opts) {
        maybeRelay(url, opts);
        return origFetch.apply(this, arguments);
      };
    }
  } catch (e) {}
})();
