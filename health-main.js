// Watches FACEIT matchmaking data and reports server capacity and queue states.
(() => {
  "use strict";

  const API_PATH = "/api/matchmaking-bff/v1/users/";
  const EVENT_HEALTH = "pathfinder:vladivostok-health";
  const EVENT_SERVERS_HEALTH = "pathfinder:servers-health";
  const EVENT_QUEUE_STATUS = "pathfinder:queue-status";

  function dispatchBoth(type, detail) {
    try {
      const evt = new CustomEvent(type, { detail });
      window.dispatchEvent(evt);
      document.dispatchEvent(evt);
    } catch { }
  }

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

  function matchServerTarget(server, targetName) {
    if (!server || typeof server !== "object") return false;
    const fields = [
      server.id,
      server.name,
      server.location,
      server.location_id,
      server.location_name,
      server.locationId,
      server.locationName
    ];
    return fields.some((field) => normalized(locationValue(field)).includes(targetName));
  }

  function extractServersState(data) {
    const matchmakings = data?.payload?.matchmakings;
    if (!Array.isArray(matchmakings)) return null;

    let sawCs2Matchmaking = false;
    const result = {
      vladivostok: null,
      novosibirsk: null,
      kazakhstan: null
    };

    for (const matchmaking of matchmakings) {
      if (!matchmaking || typeof matchmaking !== "object") continue;
      sawCs2Matchmaking = true;
      if (!Array.isArray(matchmaking.servers)) continue;

      for (const server of matchmaking.servers) {
        if (!result.vladivostok && matchServerTarget(server, "vladivostok")) {
          const rawStatus = server.status ?? server.capacity_status ?? server.capacityStatus ?? "UNKNOWN";
          result.vladivostok = { status: String(rawStatus), location: "Vladivostok" };
        }
        if (!result.novosibirsk && matchServerTarget(server, "novosibirsk")) {
          const rawStatus = server.status ?? server.capacity_status ?? server.capacityStatus ?? "UNKNOWN";
          result.novosibirsk = { status: String(rawStatus), location: "Novosibirsk" };
        }
        if (!result.kazakhstan && (matchServerTarget(server, "kazakhstan") || matchServerTarget(server, "almaty") || matchServerTarget(server, "astana"))) {
          const rawStatus = server.status ?? server.capacity_status ?? server.capacityStatus ?? "UNKNOWN";
          result.kazakhstan = { status: String(rawStatus), location: "Kazakhstan" };
        }
      }
    }

    if (sawCs2Matchmaking) {
      if (!result.vladivostok) result.vladivostok = { status: "NOT_LISTED", location: "Vladivostok" };
      if (!result.novosibirsk) result.novosibirsk = { status: "NOT_LISTED", location: "Novosibirsk" };
      if (!result.kazakhstan) result.kazakhstan = { status: "NOT_LISTED", location: "Kazakhstan" };
    }

    return sawCs2Matchmaking ? result : null;
  }

  function publish(data) {
    const states = extractServersState(data);
    if (!states) return;
    if (states.vladivostok) {
      dispatchBoth(EVENT_HEALTH, states.vladivostok);
    }
    dispatchBoth(EVENT_SERVERS_HEALTH, states);
  }

  function checkQueuePayload(data) {
    try {
      if (!data || typeof data !== "object") return;
      const payload = data.payload || data;

      // Check if match has been found / check-in
      if (payload.booking || payload.match_id || payload.state === "CHECK_IN" || payload.status === "CHECK_IN") {
        dispatchBoth(EVENT_QUEUE_STATUS, { state: "MATCH_FOUND", payload });
      }
    } catch { }
  }

  function checkQueueUrl(url, method = "GET") {
    try {
      const u = new URL(url, location.href);
      if (u.origin === location.origin && (u.pathname.includes("/matchmaking") || u.pathname.includes("/queue"))) {
        const isLeave = method === "DELETE" || u.pathname.endsWith("/leave") || u.pathname.endsWith("/cancel");
        const isJoin = (method === "POST" || method === "PUT") && (u.pathname.includes("/queue/join") || u.pathname.endsWith("/queues") || u.pathname.includes("/matchmakings/join"));
        if (isLeave) {
          dispatchBoth(EVENT_QUEUE_STATUS, { state: "IDLE" });
        } else if (isJoin) {
          dispatchBoth(EVENT_QUEUE_STATUS, { state: "SEARCHING" });
        }
      }
    } catch { }
  }

  const nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = function (...args) {
      const req = args[0];
      const method = (req instanceof Request ? req.method : args[1]?.method) || "GET";
      const requestUrl = req instanceof Request ? req.url : String(req);

      checkQueueUrl(requestUrl, method);

      const result = nativeFetch.apply(this, args);
      try {
        const url = new URL(requestUrl, location.href);
        if (url.origin === location.origin && url.pathname.includes(API_PATH) && url.pathname.endsWith("/matchmakings")) {
          result.then((response) => {
            if (!response.ok) return;
            response.clone().json().then((json) => {
              publish(json);
              checkQueuePayload(json);
            }).catch(() => { });
          }).catch(() => { });
        }
      } catch { }
      return result;
    };
  }

  // Also cover clients that use XMLHttpRequest instead of fetch.
  const NativeXHR = window.XMLHttpRequest;
  if (NativeXHR) {
    const nativeOpen = NativeXHR.prototype.open;
    const nativeSend = NativeXHR.prototype.send;
    NativeXHR.prototype.open = function (method, url, ...rest) {
      this.__pathfinderMethod = method;
      this.__pathfinderMatchmakingUrl = String(url);
      return nativeOpen.call(this, method, url, ...rest);
    };
    NativeXHR.prototype.send = function (...args) {
      const raw = this.__pathfinderMatchmakingUrl || "";
      const method = this.__pathfinderMethod || "GET";
      checkQueueUrl(raw, method);

      try {
        const url = new URL(raw, location.href);
        if (url.origin === location.origin && url.pathname.includes(API_PATH) && url.pathname.endsWith("/matchmakings")) {
          this.addEventListener("load", () => {
            if (this.status < 200 || this.status >= 300) return;
            try {
              const json = JSON.parse(this.responseText);
              publish(json);
              checkQueuePayload(json);
            } catch { }
          }, { once: true });
        }
      } catch { }
      return nativeSend.apply(this, args);
    };
  }
})();
