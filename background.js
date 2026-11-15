// Background Service Worker for Pathfinder: manages proxy configuration, lifecycle, and auto-failover.
(() => {
  "use strict";

  const STORAGE_KEY = "pathfinderSettings";

  function applyProxyConfig(config) {
    if (!config || !config.enableProxy || !config.proxyHost || !config.proxyPort) {
      chrome.proxy.settings.clear({ scope: "regular" }, () => {
        if (chrome.runtime.lastError) {}
      });
      return;
    }

    const host = String(config.proxyHost).trim();
    const port = parseInt(config.proxyPort, 10);
    const scheme = String(config.proxyScheme || "socks5").toLowerCase();
    const faceitOnly = config.proxyFaceitOnly !== false;

    // Standard PAC directives with automatic fallback to DIRECT on error
    let proxyDirective = "";
    if (scheme === "socks5") {
      proxyDirective = `SOCKS5 ${host}:${port}; SOCKS ${host}:${port}; DIRECT`;
    } else if (scheme === "https") {
      proxyDirective = `HTTPS ${host}:${port}; DIRECT`;
    } else {
      proxyDirective = `PROXY ${host}:${port}; DIRECT`;
    }

    // PAC script: routes FACEIT and check endpoints, falls back to DIRECT if unreachable
    let pacScript = "";
    if (faceitOnly) {
      pacScript = `
        function FindProxyForURL(url, host) {
          if (
            shExpMatch(host, "*.faceit.com") ||
            shExpMatch(host, "faceit.com") ||
            shExpMatch(host, "*.faceit-cdn.net") ||
            shExpMatch(host, "api.ipify.org") ||
            shExpMatch(host, "ipapi.co")
          ) {
            return "${proxyDirective}";
          }
          return "DIRECT";
        }
      `;
    } else {
      pacScript = `
        function FindProxyForURL(url, host) {
          return "${proxyDirective}";
        }
      `;
    }

    chrome.proxy.settings.set(
      {
        value: {
          mode: "pac_script",
          pacScript: {
            data: pacScript
          }
        },
        scope: "regular"
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn("Pathfinder Proxy Error:", chrome.runtime.lastError.message);
        }
      }
    );
  }

  // Automatic Failover: When proxy fails (e.g. net::ERR_TUNNEL_CONNECTION_FAILED),
  // instantly clear proxy to restore direct connection and prevent page breakage!
  if (chrome.proxy?.onProxyError) {
    chrome.proxy.onProxyError.addListener((details) => {
      console.warn("Pathfinder Proxy Error caught:", details?.error);
      chrome.proxy.settings.clear({ scope: "regular" }, () => {
        chrome.storage.local.get([STORAGE_KEY], (res) => {
          const cfg = res?.[STORAGE_KEY];
          if (cfg && cfg.enableProxy) {
            cfg.enableProxy = false;
            cfg.proxyFallbackActive = true;
            cfg.lastProxyError = details?.error || "ERR_PROXY_FAILED";
            chrome.storage.local.set({ [STORAGE_KEY]: cfg });

            // Notify open FACEIT tabs of the failover
            chrome.tabs.query({ url: "https://www.faceit.com/*" }, (tabs) => {
              for (const t of tabs) {
                if (t.id) {
                  chrome.tabs.sendMessage(t.id, {
                    type: "PATHFINDER_PROXY_FAILED",
                    error: details?.error || "ERR_TUNNEL_CONNECTION_FAILED"
                  }).catch(() => {});
                }
              }
            });
          }
        });
      });
    });
  }

  // Restore proxy state on startup or install
  chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      if (res?.[STORAGE_KEY]) applyProxyConfig(res[STORAGE_KEY]);
    });
  });

  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      if (res?.[STORAGE_KEY]) applyProxyConfig(res[STORAGE_KEY]);
    });
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) {
      applyProxyConfig(changes[STORAGE_KEY].newValue);
    }
  });

  // Message listener for immediate update
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "APPLY_PROXY_CONFIG" && msg.config) {
      applyProxyConfig(msg.config);
      sendResponse({ ok: true });
    }
    if (msg?.type === "RESET_PROXY_DIRECT") {
      chrome.proxy.settings.clear({ scope: "regular" }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }
  });
})();
