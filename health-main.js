// Watches FACEIT matchmaking data and reports ONLY Vladivostok's capacity state.
(() => {
  "use strict";

  const API_PATH = "/api/matchmaking-bff/v1/users/";
  const EVENT_NAME = "pathfinder:vladivostok-health";

  function normalized(value) {
    return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  }

  function locationValue(value) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      return value.id ?? value.name ?? value.code ?? value.slug ?? value.value ?? "";
    }
    return "";
  }

  function extractVladivostokState(data) {
    const matchmakings = data?.payload?.matchmakings;
    if (!Array.isArray(matchmakings)) return null;

    let sawCs2Matchmaking = false;
    for (const matchmaking of matchmakings) {
      if (!matchmaking || typeof matchmaking !== "object") continue;
      // The intercepted endpoint is already scoped to CS2/EU.
      sawCs2Matchmaking = true;
      if (!Array.isArray(matchmaking.servers)) continue;

      const server = matchmaking.servers.find((item) => {
        if (!item || typeof item !== "object") return false;
        const fields = [
          item.id,
          item.name,
          item.location,
          item.location_id,
          item.location_name,
          item.locationId,
          item.locationName
        ];
        return fields.some((field) => normalized(locationValue(field)) === "vladivostok");
      });

      if (!server) continue;
      const rawStatus = server.status ?? server.capacity_status ?? server.capacityStatus ?? "UNKNOWN";
      return { status: String(rawStatus), location: "Vladivostok" };
    }

    return sawCs2Matchmaking ? { status: "NOT_LISTED", location: "Vladivostok" } : null;
  }

  function publish(data) {
    const state = extractVladivostokState(data);
    if (!state) return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }));
  }

  const nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = function (...args) {
      const result = nativeFetch.apply(this, args);
      try {
        const requestUrl = args[0] instanceof Request ? args[0].url : String(args[0]);
        const url = new URL(requestUrl, location.href);
        if (url.origin === location.origin && url.pathname.includes(API_PATH) && url.pathname.endsWith("/matchmakings")) {
          result.then((response) => {
            if (!response.ok) return;
            response.clone().json().then(publish).catch(() => {});
          }).catch(() => {});
        }
      } catch {}
      return result;
    };
  }

  // Also cover clients that use XMLHttpRequest instead of fetch.
  const NativeXHR = window.XMLHttpRequest;
  if (NativeXHR) {
    const nativeOpen = NativeXHR.prototype.open;
    const nativeSend = NativeXHR.prototype.send;
    NativeXHR.prototype.open = function (method, url, ...rest) {
      this.__pathfinderMatchmakingUrl = String(url);
      return nativeOpen.call(this, method, url, ...rest);
    };
    NativeXHR.prototype.send = function (...args) {
      const raw = this.__pathfinderMatchmakingUrl || "";
      try {
        const url = new URL(raw, location.href);
        if (url.origin === location.origin && url.pathname.includes(API_PATH) && url.pathname.endsWith("/matchmakings")) {
          this.addEventListener("load", () => {
            if (this.status < 200 || this.status >= 300) return;
            try { publish(JSON.parse(this.responseText)); } catch {}
          }, { once: true });
        }
      } catch {}
      return nativeSend.apply(this, args);
    };
  }
})();
