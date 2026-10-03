/* Spotify Mobile Prototype — content.js
 * Entry point. Mounts the custom mobile UI on top of open.spotify.com.
 * Spotify keeps handling playback; we only drive its existing controls
 * through window.SpotMobile.spotify (spotifyAdapter.js).
 */

(function () {
  "use strict";

  var MOUNT_RETRIES = 60;
  var MOUNT_DELAY_MS = 500;

  function getSpotify() {
    return window.SpotMobile && window.SpotMobile.spotify;
  }

  function mount(attempt) {
    attempt = attempt || 0;
    var spotify = getSpotify();
    var factory = window.SpotMobile && window.SpotMobile.createMobilePlayer;

    if (!spotify || !factory) {
      if (attempt < 5) {
        setTimeout(function () {
          mount(attempt + 1);
        }, 300);
      } else {
        console.warn("[spm] adapter/UI scripts not loaded yet.");
      }
      return;
    }

    if (document.getElementById("spm-root")) return; // already mounted (SPA nav)

    try {
      var player = factory(spotify);
      player.mount(document.body);
      console.info("[spm] mobile player mounted.", "build", (spotify && spotify.build) || "?");
    } catch (err) {
      console.warn("[spm] mount failed:", err);
      if (attempt < MOUNT_RETRIES) {
        setTimeout(function () {
          mount(attempt + 1);
        }, MOUNT_DELAY_MS);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      mount(0);
    });
  } else {
    mount(0);
  }

  // Spotify is an SPA: URL changes don't reload content scripts.
  // Re-ensure our UI is still mounted after client-side navigation.
  // No polling: history events plus a body-level childList watcher (direct
  // children only — Spotify renders deep inside its app container, so this
  // almost never fires) re-mount if our root ever goes missing. Note the
  // history patch below only sees same-world calls (content-script isolated
  // world); page-world SPA navigations keep our body-level node in place, so
  // they need no action beyond the watcher safety net.
  function ensureMounted() {
    try {
      if (!document.getElementById("spm-root")) mount(0);
    } catch (e) {}
  }
  try {
    var _spmPushState = history.pushState;
    history.pushState = function () {
      var r = _spmPushState.apply(this, arguments);
      ensureMounted();
      return r;
    };
  } catch (ePush) {}
  try {
    var _spmReplaceState = history.replaceState;
    history.replaceState = function () {
      var r = _spmReplaceState.apply(this, arguments);
      ensureMounted();
      return r;
    };
  } catch (eReplace) {}
  try {
    window.addEventListener("popstate", ensureMounted);
    window.addEventListener("hashchange", ensureMounted);
  } catch (eEvents) {}
  (function watchBody() {
    try {
      if (!document.body) {
        setTimeout(watchBody, 500);
        return;
      }
      var bodyWatcher = new MutationObserver(function () {
        ensureMounted();
      });
      bodyWatcher.observe(document.body, { childList: true, subtree: false });
    } catch (eBody) {}
  })();
})();
