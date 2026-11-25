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

  const DISCORD_BOT_NAME = "Pathfinder";
  const DISCORD_BOT_AVATAR = "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png";

  async function sendDiscordWebhook(url, payload) {
    if (!url || typeof url !== "string") return { ok: false, error: "Empty URL" };
    const cleanUrl = url.trim();
    if (!/^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\//i.test(cleanUrl)) {
      return { ok: false, error: "Invalid Discord Webhook URL" };
    }
    try {
      const bodyPayload = {
        username: DISCORD_BOT_NAME,
        avatar_url: DISCORD_BOT_AVATAR,
        allowed_mentions: {
          parse: ["users", "roles", "everyone"]
        },
        ...(payload || {})
      };
      const res = await fetch(cleanUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (res.ok || res.status === 204) {
        return { ok: true };
      }
      return { ok: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  const matchCache = new Map();
  async function fetchMatchDetails(matchId) {
    if (!matchId || typeof matchId !== "string") return null;
    if (matchCache.has(matchId)) {
      return matchCache.get(matchId);
    }
    try {
      // First check /match/v2/match/{id} (contains clientCustom.server.ip/port), fallback to /matches/{id}
      let res = await fetch(`https://api.faceit.com/match/v2/match/${matchId}`, {
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) {
        res = await fetch(`https://api.faceit.com/match/v2/matches/${matchId}`, {
          headers: { "Accept": "application/json" }
        });
      }
      if (res.ok) {
        const json = await res.json();
        const data = json?.payload || json;
        if (data && (data.teams || data.clientCustom)) {
          matchCache.set(matchId, data);
          // Keep cache size bounded
          if (matchCache.size > 50) {
            const firstKey = matchCache.keys().next().value;
            matchCache.delete(firstKey);
          }
        }
        return data;
      }
    } catch {}
    return null;
  }

  // Discord Gateway WebSocket Manager for Real-Time Push (Zero HTTP Polling)
  let gatewayWs = null;
  let heartbeatTimer = null;
  let lastSequence = null;
  let activeGatewayChannel = null;
  let activeGatewayToken = null;

  function stopDiscordGateway() {
    activeGatewayChannel = null;
    activeGatewayToken = null;
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (gatewayWs) {
      try {
        gatewayWs.onclose = null;
        gatewayWs.onerror = null;
        gatewayWs.close(1000);
      } catch {}
      gatewayWs = null;
    }
    console.log("[Pathfinder Gateway] WebSocket stopped");
  }

  function startDiscordGateway(botToken, targetChannelId, allowedAuthorId) {
    if (!botToken || !targetChannelId) return;

    // Prevent reconnect loop if already connected or connecting
    if (gatewayWs && (gatewayWs.readyState === WebSocket.OPEN || gatewayWs.readyState === WebSocket.CONNECTING)) {
      if (activeGatewayChannel === targetChannelId && activeGatewayToken === botToken) {
        return;
      }
    }

    stopDiscordGateway();
    activeGatewayChannel = targetChannelId;
    activeGatewayToken = botToken;
    console.log(`[Pathfinder Gateway] Connecting WebSocket for channel ${targetChannelId}...`);

    try {
      gatewayWs = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

      gatewayWs.onopen = () => {
        console.log("%c[Pathfinder Gateway] Connected to Discord Gateway WebSocket!", "color: #4ade80; font-weight: bold;");
      };

      gatewayWs.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { op, d, s, t } = payload;
          if (s !== null && s !== undefined) lastSequence = s;

          // Opcode 10: HELLO -> start heartbeats & IDENTIFY
          if (op === 10) {
            const interval = d.heartbeat_interval;
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            heartbeatTimer = setInterval(() => {
              if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
                gatewayWs.send(JSON.stringify({ op: 1, d: lastSequence }));
              }
            }, interval);

            // Send IDENTIFY with Online presence and custom status
            // Intents: GUILDS (1) + GUILD_MESSAGES (512) + MESSAGE_CONTENT (32768) = 33281
            gatewayWs.send(JSON.stringify({
              op: 2,
              d: {
                token: botToken.trim(),
                intents: 33281,
                properties: {
                  os: "windows",
                  browser: "chrome",
                  device: "chrome"
                },
                presence: {
                  activities: [{
                    name: "FACEIT Team Chat",
                    type: 0
                  }],
                  status: "online",
                  afk: false
                }
              }
            }));
            console.log("%c[Pathfinder Gateway] Identified with Discord Gateway (Status: ONLINE)", "color: #4ade80; font-weight: bold;");
          }

          // Opcode 0: DISPATCH
          if (op === 0 && t === "MESSAGE_CREATE") {
            if (!d || d.channel_id !== targetChannelId) return;
            if (d.author?.bot) return;
            if (allowedAuthorId && d.author?.id !== allowedAuthorId) return;

            console.log("%c[Pathfinder Gateway] PUSH Message from Discord:", "color: #38bdf8; font-weight: bold;", d.content);
            chrome.tabs.query({ url: "*://*.faceit.com/*" }, (tabs) => {
              if (Array.isArray(tabs) && tabs.length > 0) {
                // Pick the room tab or active tab to prevent duplicate dispatch if multiple tabs are open
                const targetTab = tabs.find(t => t.active && t.url && t.url.includes("/room/")) ||
                                  tabs.find(t => t.url && t.url.includes("/room/")) ||
                                  tabs.find(t => t.active) ||
                                  tabs[0];
                if (targetTab?.id) {
                  chrome.tabs.sendMessage(targetTab.id, {
                    type: "PATHFINDER_INBOUND_GATEWAY_MSG",
                    message: d
                  }).catch(() => {});
                }
              }
            });
          }

          // Opcode 0: INTERACTION_CREATE (Discord Buttons / Veto Click)
          if (op === 0 && t === "INTERACTION_CREATE") {
            if (!d || d.channel_id !== targetChannelId) return;
            const customId = d.data?.custom_id || "";
            if (!customId.startsWith("veto_ban:")) return;

            console.log("%c[Pathfinder Gateway] VETO BUTTON CLICKED:", "color: #f43f5e; font-weight: bold;", customId);

            const parts = customId.split(":"); // ["veto_ban", matchId, phase, className, name]
            const targetName = parts[4] || parts[3] || "Map";

            // Acknowledge interaction to Discord immediately and update message
            fetch(`https://discord.com/api/v10/interactions/${d.id}/${d.token}/callback`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: 7, // UPDATE_MESSAGE
                data: {
                  content: `⏳ **[FACEIT Veto] ${targetName} をBAN中... / Banning ${targetName}...**`,
                  components: []
                }
              })
            }).catch(() => {});

            // Forward to active FACEIT room tab to click the DOM element via RePeek method
            chrome.tabs.query({ url: "*://*.faceit.com/*" }, (tabs) => {
              if (Array.isArray(tabs) && tabs.length > 0) {
                const targetTab = tabs.find(t => t.active && t.url && t.url.includes("/room/")) ||
                                  tabs.find(t => t.url && t.url.includes("/room/")) ||
                                  tabs[0];
                if (targetTab?.id) {
                  chrome.tabs.sendMessage(targetTab.id, {
                    type: "PATHFINDER_EXECUTE_VETO_BAN",
                    matchId: parts[1],
                    phase: parts[2],
                    className: parts[3],
                    name: targetName
                  }).catch(() => {});
                }
              }
            });
          }
        } catch (err) {
          console.warn("[Pathfinder Gateway] Error parsing WebSocket message:", err);
        }
      };

      gatewayWs.onclose = (e) => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        gatewayWs = null;
        console.log(`[Pathfinder Gateway] WebSocket closed (code ${e.code})`);
      };

      gatewayWs.onerror = (err) => {
        console.warn("[Pathfinder Gateway] WebSocket error:", err);
      };
    } catch (e) {
      console.warn("[Pathfinder Gateway] Exception opening WebSocket:", e);
    }
  }

  // Ensure Discord API requests have proper User-Agent header via declarativeNetRequest
  // to avoid Cloudflare 40333 ("internal network error") edge block.
  function setupDiscordHeadersRule() {
    if (!chrome?.declarativeNetRequest) return;
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [9999],
      addRules: [
        {
          id: 9999,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              {
                header: "User-Agent",
                operation: "set",
                value: "DiscordBot (https://github.com/discord/discord-api-docs, 10.0.0)"
              }
            ]
          },
          condition: {
            urlFilter: "||discord.com/api",
            resourceTypes: ["xmlhttprequest"]
          }
        }
      ]
    }).catch(() => {});
  }
  setupDiscordHeadersRule();
  try {
    chrome.runtime.onInstalled.addListener(setupDiscordHeadersRule);
    chrome.runtime.onStartup.addListener(setupDiscordHeadersRule);
  } catch {}

  // Message listener for immediate update
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "START_DISCORD_GATEWAY") {
      startDiscordGateway(msg.botToken, msg.channelId, msg.allowedAuthorId);
      sendResponse({ ok: true });
      return true;
    }
    if (msg?.type === "STOP_DISCORD_GATEWAY") {
      stopDiscordGateway();
      sendResponse({ ok: true });
      return true;
    }
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
    if (msg?.type === "SEND_DISCORD_WEBHOOK") {
      sendDiscordWebhook(msg.url, msg.payload).then((result) => {
        sendResponse(result);
      });
      return true;
    }
    if (msg?.type === "FETCH_MATCH_DETAILS" && msg.matchId) {
      fetchMatchDetails(msg.matchId).then((data) => {
        sendResponse({ ok: Boolean(data), data });
      });
      return true;
    }
    if (msg?.type === "FETCH_USER_SUMMARY" && Array.isArray(msg.ids)) {
      fetch("https://www.faceit.com/api/user-summary/v2/list", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids: msg.ids })
      })
      .then((r) => r.json())
      .then((json) => sendResponse({ ok: true, payload: json?.payload || json || {} }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
    if (msg?.type === "FETCH_DISCORD_MESSAGES") {
      const channelId = msg.channelId;
      const botToken = msg.botToken;
      const limit = msg.limit || 3;
      if (!channelId || !botToken) {
        sendResponse({ ok: false, error: "Missing channelId or botToken" });
        return true;
      }
      fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages?limit=${limit}`, {
        method: "GET",
        headers: {
          "Authorization": `Bot ${botToken.trim()}`
        }
      })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          return sendResponse({ ok: false, status: res.status, error: txt });
        }
        const data = await res.json();
        sendResponse({ ok: true, data });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }
    if (msg?.type === "ADD_DISCORD_REACTION") {
      const { channelId, messageId, emoji = "%E2%9C%85", botToken } = msg;
      if (!channelId || !messageId || !botToken) {
        sendResponse({ ok: false });
        return true;
      }
      fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reactions/${emoji}/@me`, {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${botToken.trim()}`
        }
      })
      .then((res) => sendResponse({ ok: res.ok }))
      .catch(() => sendResponse({ ok: false }));
      return true;
    }
    if (msg?.type === "TEST_DISCORD_BOT") {
      const { botToken, channelId } = msg;
      if (!botToken) {
        sendResponse({ ok: false, error: "Token is empty" });
        return true;
      }
      fetch("https://discord.com/api/v10/users/@me", {
        method: "GET",
        headers: {
          "Authorization": `Bot ${botToken.trim()}`
        }
      })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          return sendResponse({ ok: false, status: res.status, error: "Bot Token 無効: " + txt });
        }
        const user = await res.json();

        // If channelId is provided, also verify bot has access to that channel!
        if (channelId && channelId.trim()) {
          try {
            const chRes = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId.trim())}/messages?limit=1`, {
              method: "GET",
              headers: {
                "Authorization": `Bot ${botToken.trim()}`
              }
            });
            if (!chRes.ok) {
              const chTxt = await chRes.text();
              let detail = `[HTTP ${chRes.status}] ${chTxt}`;
              if (chRes.status === 403) detail = `[HTTP 403: ${chTxt}] Bot lacks permissions in this channel / ボットのチャンネル権限が不足しています`;
              if (chRes.status === 404) detail = `[HTTP 404: ${chTxt}] Channel not found! Check Channel ID / チャンネルが見つかりません。Channel IDを確認してください`;
              return sendResponse({ ok: false, user, status: chRes.status, error: detail });
            }
          } catch (e) {
            return sendResponse({ ok: false, user, error: "Channel fetch error: " + String(e) });
          }
        }

        sendResponse({ ok: true, user });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
    if (msg?.type === "SEND_DISCORD_VETO_PROMPT") {
      sendDiscordVetoButtons(msg.channelId, msg.botToken, msg.matchId, msg.phase, msg.entities).then((res) => {
        sendResponse(res);
      });
      return true;
    }
    if (msg?.type === "SEND_DISCORD_BOT_MESSAGE") {
      fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(msg.channelId.trim())}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${msg.botToken.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: msg.content })
      }).then(r => r.json()).then(res => sendResponse({ ok: true, res })).catch(e => sendResponse({ ok: false, error: String(e) }));
      return true;
    }
  });

  async function sendDiscordVetoButtons(channelId, botToken, matchId, phase, entities) {
    if (!channelId || !botToken || !Array.isArray(entities) || entities.length === 0) {
      return { ok: false, error: "Missing parameters or entities" };
    }
    try {
      const isMap = phase === "map";
      const title = isMap
        ? "🗺️ **[FACEIT Veto] マップBANの順番です！BANするマップを選択してください:**\n*It's your turn to ban! Select a map to ban:*"
        : "🌐 **[FACEIT Veto] サーバーBANの順番です！BANするサーバーを選択してください:**\n*It's your turn to ban! Select a server to ban:*";

      const rows = [];
      let currentRow = [];

      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        const rawName = ent.name || ent.class_name || "Unknown";
        const cleanName = rawName.replace(/^de_/i, "").toUpperCase();
        const className = ent.class_name || rawName.toLowerCase();

        currentRow.push({
          type: 2, // BUTTON
          style: 4, // DANGER (Red button for Ban)
          label: cleanName,
          custom_id: `veto_ban:${matchId}:${phase}:${className}:${cleanName}`
        });

        if (currentRow.length === 4 || i === entities.length - 1) {
          rows.push({
            type: 1, // ACTION_ROW
            components: currentRow
          });
          currentRow = [];
        }
      }

      const res = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId.trim())}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${botToken.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: title,
          components: rows
        })
      });

      if (res.ok) {
        const json = await res.json();
        return { ok: true, messageId: json?.id };
      }
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }
})();
