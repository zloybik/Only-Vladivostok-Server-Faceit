// FACEIT Ping Override — Pathfinder
// Guarantees Vladivostok (and allowed nodes) are always lowest latency (~30-35ms).
(() => {
  "use strict";

  if (window.__PATHFINDER_PING_LOADED__) return;
  window.__PATHFINDER_PING_LOADED__ = true;

  const PING_HOST_SUFFIX = ".ping.faceit.com";
  const ARTIFICIAL_DELAY_MS = 1000;
  const INFLATED_FIELDS = new Set(["responseStart", "responseEnd", "duration"]);

  function readStoredConfig() {
    try {
      const domConfig = document.documentElement?.dataset?.pathfinderConfig;
      if (domConfig) return JSON.parse(domConfig);
    } catch {}
    try {
      const raw = window.localStorage.getItem("pathfinder_config");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  let activeConfig = readStoredConfig();

  function updateConfig(detail) {
    if (detail && typeof detail === "object") {
      activeConfig = { ...activeConfig, ...detail };
      try {
        window.localStorage.setItem("pathfinder_config", JSON.stringify(activeConfig));
      } catch {}
    }
  }

  function getConfig() {
    return { ...readStoredConfig(), ...activeConfig };
  }

  window.addEventListener("message", (event) => {
    if (event.data?.source === "pathfinder-bridge" && event.data.config) {
      updateConfig(event.data.config);
    }
  });

  window.addEventListener("pathfinder:config-changed", (event) => updateConfig(event?.detail));
  document.addEventListener("pathfinder:config-changed", (event) => updateConfig(event?.detail));

  function pingHost(resource) {
    try {
      const raw =
        typeof resource === "string"
          ? resource
          : resource instanceof URL
            ? resource.href
            : resource?.url;
      if (!raw || typeof raw !== "string" || !raw.includes(PING_HOST_SUFFIX)) return null;
      const hostname = new URL(raw, location.href).hostname.toLowerCase();
      return hostname.endsWith(PING_HOST_SUFFIX) ? hostname : null;
    } catch {
      return null;
    }
  }

  function isHostExempt(host) {
    if (!host) return false;
    const cfg = getConfig();
    const h = String(host).toLowerCase();
    // Vladivostok is ALWAYS exempt
    if (h.includes("vladivostok") || h.includes("vdk") || h.includes("vvo")) return true;
    // Novosibirsk and Kazakhstan are ONLY exempt if explicitly allowed
    if (cfg.allowNovosibirsk && (h.includes("novosibirsk") || h.includes("nsk"))) return true;
    if (cfg.allowKazakhstan && (h.includes("kazakhstan") || h.includes("almaty") || h.includes("astana") || h.includes("kz"))) return true;
    return false;
  }

  function isSpoofingEnabled(host) {
    if (!host) return false;
    const cfg = getConfig();
    const h = String(host).toLowerCase();
    if (h.includes("vladivostok") || h.includes("vdk") || h.includes("vvo")) {
      return cfg.spoofVvoPing !== false;
    }
    // Only spoof if parent server is allowed AND 30ms lock toggle is on
    if (cfg.allowNovosibirsk && (h.includes("novosibirsk") || h.includes("nsk"))) {
      return !!cfg.spoofNskPing;
    }
    if (cfg.allowKazakhstan && (h.includes("kazakhstan") || h.includes("almaty") || h.includes("astana") || h.includes("kz"))) {
      return !!cfg.spoofKazPing;
    }
    return false;
  }

  function getTargetDelay(host) {
    const cfg = getConfig();
    const h = String(host).toLowerCase();
    if (h.includes("vladivostok") || h.includes("vdk") || h.includes("vvo")) return 15; // results in ~30-35ms in FACEIT UI
    if (h.includes("novosibirsk") || h.includes("nsk")) {
      return cfg.spoofNskPing ? 15 : 45;
    }
    if (h.includes("kazakhstan") || h.includes("almaty") || h.includes("astana") || h.includes("kz")) {
      return cfg.spoofKazPing ? 15 : 60;
    }
    return 15;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 1. Hook window.fetch for latency measurement
  const nativeFetch = window.fetch;
  window.fetch = function (resource) {
    const host = pingHost(resource);
    if (!host) return nativeFetch.apply(this, arguments);

    // If exempt (Vladivostok, Novosibirsk, Kazakhstan):
    if (isHostExempt(host)) {
      if (isSpoofingEnabled(host)) {
        // Fire real request in background so browser network stack creates PerformanceResourceTiming entry
        try {
          const bg = nativeFetch.apply(this, arguments);
          bg.then((r) => r.clone().arrayBuffer().catch(() => {})).catch(() => {});
        } catch {}

        const ms = getTargetDelay(host);
        return sleep(ms).then(() => new Response("OK", {
          status: 200,
          statusText: "OK",
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Timing-Allow-Origin": "*"
          }
        }));
      }
      return nativeFetch.apply(this, arguments);
    }

    // For all other hosts (Germany, Finland, Moscow, etc.): inject +1000ms delay
    const result = nativeFetch.apply(this, arguments);
    result.then(() => {}).catch(() => {});

    return result.then((response) => {
      response.clone().arrayBuffer().catch(() => {});
      return sleep(ARTIFICIAL_DELAY_MS).then(() => response);
    });
  };

  // 2. Hook XMLHttpRequest in case FACEIT uses XHR for ping checks
  const NativeXHR = window.XMLHttpRequest;
  if (NativeXHR) {
    const nativeOpen = NativeXHR.prototype.open;
    const nativeSend = NativeXHR.prototype.send;

    NativeXHR.prototype.open = function (method, url, ...rest) {
      this.__pathfinderPingHost = pingHost(url);
      return nativeOpen.call(this, method, url, ...rest);
    };

    NativeXHR.prototype.send = function (...args) {
      const host = this.__pathfinderPingHost;
      if (host && isHostExempt(host)) {
        const ms = getTargetDelay(host);
        setTimeout(() => {
          try {
            Object.defineProperty(this, "readyState", { value: 4, configurable: true });
            Object.defineProperty(this, "status", { value: 200, configurable: true });
            Object.defineProperty(this, "statusText", { value: "OK", configurable: true });
            Object.defineProperty(this, "responseText", { value: "OK", configurable: true });
            Object.defineProperty(this, "response", { value: "OK", configurable: true });
            this.dispatchEvent(new Event("readystatechange"));
            this.dispatchEvent(new Event("load"));
            this.dispatchEvent(new Event("loadend"));
          } catch {}
        }, ms);
        return;
      }
      return nativeSend.apply(this, args);
    };
  }

  // 3. Hook Performance Timing APIs
  function clampEntry(entry, targetDurationMs) {
    return new Proxy(entry, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target);
        if (typeof value === "function") return value.bind(target);
        if (prop === "duration") return targetDurationMs;
        const base = typeof target.startTime === "number" ? target.startTime : (target.fetchStart || 0);
        if (prop === "responseStart") return base + Math.round(targetDurationMs * 0.6);
        if (prop === "responseEnd") return base + targetDurationMs;
        if (prop === "connectEnd") return base + Math.round(targetDurationMs * 0.3);
        if (prop === "requestStart") return base + Math.round(targetDurationMs * 0.4);
        return value;
      }
    });
  }

  function inflateEntry(entry, penalty) {
    return new Proxy(entry, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target);
        if (typeof value === "function") return value.bind(target);
        if (INFLATED_FIELDS.has(prop) && typeof value === "number" && value > 0) {
          return value + penalty;
        }
        return value;
      }
    });
  }

  function patchEntries(entries) {
    if (!Array.isArray(entries)) return entries;
    return entries.map((entry) => {
      const host = entry?.entryType === "resource" ? pingHost(entry.name) : null;
      if (!host) return entry;
      if (isHostExempt(host)) {
        if (isSpoofingEnabled(host)) {
          const ms = getTargetDelay(host);
          return clampEntry(entry, ms);
        }
        return entry;
      }
      // If already delayed by fetch, do not add another 1000ms
      if (typeof entry.duration === "number" && entry.duration >= ARTIFICIAL_DELAY_MS) {
        return entry;
      }
      return inflateEntry(entry, ARTIFICIAL_DELAY_MS);
    });
  }

  function wrapEntryList(list) {
    return {
      getEntries: () => patchEntries(list.getEntries()),
      getEntriesByType: (type) => patchEntries(list.getEntriesByType(type)),
      getEntriesByName: (name, type) => patchEntries(list.getEntriesByName(name, type))
    };
  }

  // Intercept PerformanceObserver
  const NativePerformanceObserver = window.PerformanceObserver;
  if (NativePerformanceObserver) {
    class PatchedPerformanceObserver extends NativePerformanceObserver {
      constructor(callback) {
        super((list, observer) => {
          callback.call(observer, wrapEntryList(list), observer);
        });
      }
    }
    window.PerformanceObserver = PatchedPerformanceObserver;
  }

  // Intercept window.performance
  if (window.performance) {
    const nativeGetEntries = window.performance.getEntries;
    const nativeGetEntriesByType = window.performance.getEntriesByType;
    const nativeGetEntriesByName = window.performance.getEntriesByName;

    if (typeof nativeGetEntries === "function") {
      window.performance.getEntries = function () {
        return patchEntries(nativeGetEntries.apply(this, arguments));
      };
    }
    if (typeof nativeGetEntriesByType === "function") {
      window.performance.getEntriesByType = function (type) {
        return patchEntries(nativeGetEntriesByType.apply(this, arguments));
      };
    }
    if (typeof nativeGetEntriesByName === "function") {
      window.performance.getEntriesByName = function (name, type) {
        return patchEntries(nativeGetEntriesByName.apply(this, arguments));
      };
    }
  }
})();
