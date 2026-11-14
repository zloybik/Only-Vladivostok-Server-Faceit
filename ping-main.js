// FACEIT Ping Override — derived from the supplied FACEIT Elo Diff 0.5.1 source.
// This changes browser-side ping measurements only; it does not alter real network latency.
(() => {
  "use strict";

  const PING_HOST_SUFFIX = ".ping.faceit.com";
  const EXEMPT_HOST = "vladivostok.eu.ping.faceit.com";
  const ARTIFICIAL_DELAY_MS = 1000;
  const INFLATED_FIELDS = new Set(["responseStart", "responseEnd", "duration"]);

  function pingHost(resource) {
    try {
      const raw =
        typeof resource === "string"
          ? resource
          : resource instanceof URL
            ? resource.href
            : resource?.url;
      if (typeof raw !== "string" || !raw.includes(PING_HOST_SUFFIX)) return null;
      const hostname = new URL(raw, location.href).hostname.toLowerCase();
      return hostname.endsWith(PING_HOST_SUFFIX) ? hostname : null;
    } catch {
      return null;
    }
  }

  function penaltyForHost(host) {
    return host === EXEMPT_HOST ? 0 : ARTIFICIAL_DELAY_MS;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // FACEIT may measure ping using wall-clock time around fetch(). Delaying the
  // response makes that fallback include the configured artificial latency.
  const nativeFetch = window.fetch;
  window.fetch = function (resource) {
    const host = pingHost(resource);
    if (!host) return nativeFetch.apply(this, arguments);

    const penalty = penaltyForHost(host);
    const startedAt = performance.now();
    const result = nativeFetch.apply(this, arguments);

    // Preserve the original response and let the browser produce its resource timing entry.
    result.then(() => {}).catch(() => {});
    if (!penalty) return result;

    return result.then((response) => {
      // Drain a clone so the resource timing entry becomes available promptly.
      response.clone().arrayBuffer().catch(() => {});
      return sleep(penalty).then(() => response);
    });
  };

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
    return entries.map((entry) => {
      const host = entry.entryType === "resource" ? pingHost(entry.name) : null;
      const penalty = host ? penaltyForHost(host) : 0;
      return penalty ? inflateEntry(entry, penalty) : entry;
    });
  }

  function wrapEntryList(list) {
    return {
      getEntries: () => patchEntries(list.getEntries()),
      getEntriesByType: (type) => patchEntries(list.getEntriesByType(type)),
      getEntriesByName: (name, type) => patchEntries(list.getEntriesByName(name, type))
    };
  }

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
})();
