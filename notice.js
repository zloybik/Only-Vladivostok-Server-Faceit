(() => {
  "use strict";

  const HEALTH_EVENT = "pathfinder:vladivostok-health";
  const SERVERS_HEALTH_EVENT = "pathfinder:servers-health";
  const QUEUE_STATUS_EVENT = "pathfinder:queue-status";
  const ROOT_ID = "pathfinder-ui-root";
  const GITHUB_REPO = "zloybik/Only-Vladivostok-Server-Faceit";
  const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  function isContextValid() {
    try {
      return Boolean(typeof chrome !== "undefined" && chrome?.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function safeSendMessage(payload) {
    if (!isContextValid()) return;
    try {
      chrome.runtime.sendMessage(payload).catch(() => {});
    } catch { }
  }

  function safeStorageGet(keys, cb) {
    if (!isContextValid() || !chrome?.storage?.local) return;
    try {
      chrome.storage.local.get(keys, (res) => {
        try {
          if (chrome.runtime?.lastError || !isContextValid()) return;
          if (cb) cb(res);
        } catch {}
      });
    } catch {}
  }

  function safeStorageSet(data, cb) {
    if (!isContextValid() || !chrome?.storage?.local) return;
    try {
      chrome.storage.local.set(data, () => {
        try {
          if (chrome.runtime?.lastError || !isContextValid()) return;
          if (cb) cb();
        } catch {}
      });
    } catch {}
  }

  function safeGetAssetUrl(path) {
    if (!isContextValid()) return "";
    try {
      return chrome.runtime.getURL(path);
    } catch {
      return "";
    }
  }

  function safeGetVersion() {
    if (!isContextValid()) return "1.9.0";
    try {
      return chrome.runtime.getManifest()?.version || "1.9.0";
    } catch {
      return "1.9.0";
    }
  }

  const DEFAULT_CONFIG = {
    lang: "ja",
    allowNovosibirsk: false,
    allowKazakhstan: false,
    spoofVvoPing: true,
    spoofNskPing: false,
    spoofKazPing: false,
    notifyVvoSlots: true,
    enableQueueTimer: true,
    enableQueueBeep: true,
    autoCancelQueue: true,
    autoRestartQueue: false,
    autoCancelSeconds: 58,
    enableAntiSnipe: false,
    dropQueueOnVvoFull: true,
    enableDiscordAlerts: false,
    discordWebhookUrl: "",
    discordLang: "ja",
    discordCustomPing: "",
    discordNotifyMatch: true,
    discordNotifyRoom: true,
    discordNotifyServerIp: false,
    discordNotifySlots: false,
    discordRelayRoomChat: false,
    autoSendLanguageNotice: false,
    languageNoticeText: "Hello team! English or Japanese please / 英語または日本語でお願いします",
    enableDiscordInbound: false,
    discordBotToken: "",
    discordBotChannelId: "",
    discordBotAuthorId: "",
    discordInboundTagPrefix: false,
    enableDiscordVeto: true
  };

  let currentConfig = { ...DEFAULT_CONFIG };

  // Synchronize configuration with localStorage and document/window events for MAIN world
  function syncConfig(config) {
    currentConfig = { ...DEFAULT_CONFIG, ...config };
    try {
      if (document.documentElement) {
        document.documentElement.dataset.pathfinderConfig = JSON.stringify(currentConfig);
      }
      window.localStorage.setItem("pathfinder_config", JSON.stringify(currentConfig));
      const evt = new CustomEvent("pathfinder:config-changed", { detail: currentConfig, bubbles: true, composed: true });
      window.dispatchEvent(evt);
      document.dispatchEvent(evt);
      window.postMessage({ source: "pathfinder-bridge", config: currentConfig }, "*");
    } catch { }
    updateHudVisibility();
  }

  try {
    if (isContextValid() && chrome?.storage?.local) {
      chrome.storage.local.get(["pathfinderSettings"], (res) => {
        if (!isContextValid()) return;
        if (res?.pathfinderSettings) {
          syncConfig(res.pathfinderSettings);
        } else {
          syncConfig(DEFAULT_CONFIG);
        }
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (!isContextValid()) return;
        if (area === "local" && changes.pathfinderSettings) {
          syncConfig(changes.pathfinderSettings.newValue);
        }
      });
    } else {
      syncConfig(DEFAULT_CONFIG);
    }
  } catch {
    syncConfig(DEFAULT_CONFIG);
  }

  try {
    if (isContextValid() && chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (!isContextValid()) return;
        if (msg?.type === "PATHFINDER_CONFIG_UPDATE" && msg.config) {
          syncConfig(msg.config);
        }
        if (msg?.type === "PATHFINDER_PROXY_FAILED") {
          makePanel({
            title: "プロキシ接続エラー / Proxy Connection Failed",
            message: "プロキシサーバーへの接続に失敗したため、通常接続（Direct）に自動復帰しました。",
            sub: `Proxy connection error (${msg.error || "ERR_TUNNEL"}). Reverted to Direct connection automatically.`,
            buttonLabel: "再読み込み / Reload",
            onAction: () => location.reload()
          });
        }
        if (msg?.type === "PATHFINDER_TEST_BEEP") {
          playWarningBeep();
        }
        if (msg?.type === "PATHFINDER_TEST_QUEUE") {
          startQueueTimer(true);
          playWarningBeep();
          makePanel({
            title: "⏱️ キュー保護 HUD テスト / HUD Timer Test",
            message: "画面右上にキュー監視タイマーが表示されています。正常に動作しています。",
            sub: "The Queue Guard HUD widget is now visible at top-right.",
            buttonLabel: "OK"
          });
          setTimeout(() => {
            if (!isFaceitInQueue()) {
              stopQueueTimer();
            }
          }, 10000);
        }
        if (msg?.type === "PATHFINDER_TEST_LANG_NOTICE") {
          const matchIdMatch = location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/i);
          const currentMatchId = matchIdMatch ? matchIdMatch[1] : null;
          if (!currentMatchId) {
            makePanel({
              title: "💬 言語通知テスト / Language Notice Test",
              message: "FACEITのマッチルーム画面（/cs2/room/...）を開いた状態でテストしてください。",
              sub: "Please open a match room page before testing this feature.",
              buttonLabel: "OK"
            });
          } else {
            makePanel({
              title: "💬 言語通知テスト実行中 / Testing Language Notice",
              message: "チャット入力欄を検出してメッセージを送信します...",
              sub: "Searching for chat input and sending test notice to Team Chat...",
              buttonLabel: "OK"
            });
            trySendLanguageNotice(currentMatchId, true);
          }
        }
        if (msg?.type === "PATHFINDER_TEST_DISCORD_INBOUND") {
          const matchIdMatch = location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/i);
          const currentMatchId = matchIdMatch ? matchIdMatch[1] : "test-room";
          inboundTestModeExpiry = Date.now() + 60000;
          makePanel({
            title: "🧪 Discord ➔ FACEIT チャット逆転送テスト",
            message: "Discordでメッセージを送信してください！チームチャットへ即座に転送されます（60秒間有効）。",
            sub: "Type a message in Discord now! It will be typed into Team Chat (active for 60s).",
            buttonLabel: "OK"
          });
          if (msg.botToken) currentConfig.discordBotToken = msg.botToken;
          if (msg.channelId) currentConfig.discordBotChannelId = msg.channelId;
          if (msg.authorId !== undefined) currentConfig.discordBotAuthorId = msg.authorId;
          if (msg.tagPrefix !== undefined) currentConfig.discordInboundTagPrefix = msg.tagPrefix;
          currentConfig.enableDiscordInbound = true;

          initDiscordInboundBridge(currentMatchId, true);
        }
        if (msg?.type === "PATHFINDER_INBOUND_GATEWAY_MSG" && msg.message) {
          enqueueInboundDiscordMessage(msg.message);
        }
        if (msg?.type === "PATHFINDER_SPAWN_TEST_VETO_ARENA") {
          spawnVetoTestArena(msg.phase || "map");
        }
        if (msg?.type === "PATHFINDER_START_FULL_VETO_SIM") {
          startFullVetoSimulation();
        }
        if (msg?.type === "PATHFINDER_EXECUTE_VETO_BAN") {
          console.log("%c[Pathfinder Veto] Received remote ban command from Discord:", "color: #f43f5e; font-weight: bold;", msg.name, msg.className);
          if (msg.matchId === "sim-match" && activeSimulation) {
            handleSimulationBan(msg.name, msg.className);
            return;
          }
          const isTest = msg.matchId === "test-match" || !location.pathname.includes("/room/");
          if (isTest && !document.getElementById("pathfinder-veto-test-arena")) {
            spawnVetoTestArena(msg.phase || "map");
          }
          const success = executeVetoBanInDom(msg.name, msg.className, msg.phase);
          if (success) {
            makePanel({
              title: "🚫 FACEIT Veto (Discord Remote)",
              message: `${msg.name || msg.className} をBANしました！ / Banned!`,
              sub: "RePeek DOM click 成功 (Discord Gateway 連携)",
              buttonLabel: "OK"
            });
          } else if (isTest) {
            makePanel({
              title: "🧪 Veto Test (Discord Remote)",
              message: `DiscordからのBANリクエストを受信: ${msg.name || msg.className}`,
              sub: "本番マッチ（/room/...）では自動でマップがBANされます。",
              buttonLabel: "OK"
            });
          } else {
            makePanel({
              title: "⚠️ Veto Ban Failed",
              message: `${msg.name || msg.className} のBAN要素が見つかりませんでした`,
              sub: "Could not find map/location element in DOM",
              buttonLabel: "OK"
            });
          }
        }
      });
    }
  } catch { }

  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const shadow = root.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; font-family:"Hiragino Sans","Yu Gothic UI","Meiryo",Arial,sans-serif; }

    /* Top HUD Bar for Server Chips & Queue Guard Widget */
    .hud-bar {
      position:fixed; top:16px; right:20px;
      display:flex; flex-direction:column; gap:8px;
      pointer-events:none; z-index:2147483647;
    }
    .hud-chip-container {
      display:flex; gap:6px; justify-content:flex-end; pointer-events:auto;
    }
    .hud-chip {
      background:#161616; border:1px solid #3a3a3a; border-radius:6px;
      padding:5px 10px; font-size:11px; font-weight:700; color:#ddd;
      display:flex; align-items:center; gap:7px; box-shadow:0 4px 14px #0008;
      transition:border-color .2s;
    }
    .hud-chip .dot {
      width:7px; height:7px; border-radius:50%; background:#777;
    }
    .hud-chip.status-avail .dot { background:#4ade80; box-shadow:0 0 6px #4ade8088; }
    .hud-chip.status-warn .dot { background:#facc15; box-shadow:0 0 6px #facc1588; }
    .hud-chip.status-full .dot { background:#f87171; box-shadow:0 0 6px #f8717188; }
    .hud-chip.status-off .dot { background:#777; }

    .queue-widget {
      background:#141414; border:1px solid #444; border-radius:8px;
      padding:8px 12px; color:#fff; box-shadow:0 6px 20px #0009;
      display:none; flex-direction:column; gap:5px; pointer-events:auto;
      width:270px; font-size:12px; animation:pf-in .2s ease-out;
    }
    .queue-widget.active { display:flex; }
    .queue-header {
      display:flex; justify-content:space-between; align-items:center;
      font-size:11px; color:#aaa; font-weight:700;
    }
    .queue-timer-val {
      font-size:20px; font-weight:800; font-family:monospace; color:#fff;
      letter-spacing:.05em;
    }
    .queue-timer-val.warning {
      color:#f87171; animation:pf-pulse 1s infinite alternate;
    }
    .queue-progress-bar {
      width:100%; height:4px; background:#2a2a2a; border-radius:2px; overflow:hidden;
    }
    .queue-progress-fill {
      height:100%; width:0%; background:#4ade80; transition:width 1s linear, background-color .3s;
    }
    .queue-progress-fill.warning {
      background:#f87171;
    }
    .queue-subtext {
      font-size:10px; color:#888;
    }

    /* Bottom Notification Panels Stack */
    .stack {
      position:fixed; right:20px; bottom:20px;
      display:flex; flex-direction:column-reverse; gap:10px; pointer-events:none;
      z-index:2147483647;
    }
    .panel {
      box-sizing:border-box; pointer-events:auto; position:relative;
      width:min(420px,calc(100vw - 32px)); display:flex; gap:13px; align-items:center;
      padding:13px 42px 13px 13px; color:#f3f3f3; background:#111; border:1px solid #555;
      border-radius:7px; box-shadow:0 8px 28px #0009; font:13px/1.45 "Hiragino Sans","Yu Gothic UI","Meiryo",Arial,sans-serif;
      animation:pf-in .22s ease-out both;
    }
    .panel img { width:66px; height:88px; object-fit:contain; object-position:center bottom; flex:0 0 66px; filter:grayscale(1); }
    .copy { min-width:0; }
    .eyebrow { margin:0 0 4px; color:#aaa; font-size:10px; font-weight:800; letter-spacing:.12em; }
    h2 { margin:0 0 6px; color:#fff; font-size:15px; line-height:1.25; }
    p { margin:0; color:#d0d0d0; }
    .sub { margin-top:5px; color:#999; font-size:11px; }
    button, a.btn {
      appearance:none; display:inline-block; text-decoration:none;
      border:1px solid #666; border-radius:4px; padding:6px 10px;
      color:#fff; background:#252525; font:600 11px "Hiragino Sans","Yu Gothic UI","Meiryo",Arial,sans-serif; cursor:pointer;
    }
    button:hover, a.btn:hover { background:#3a3a3a; }
    a.btn.primary { border-color:#888; background:#333; }
    a.btn.primary:hover { background:#484848; }
    .close { position:absolute; top:6px; right:7px; border:0; padding:2px 6px; color:#aaa; background:transparent; font-size:19px; }
    .actions { display:flex; justify-content:flex-end; gap:8px; margin-top:9px; }
    .health { border-left:3px solid #aaa; }
    .health.bad { border-left-color:#fff; }
    .update { border-left:3px solid #fff; }
    @keyframes pf-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pf-pulse { from { opacity:1; } to { opacity:0.4; } }
    @media(max-width:600px) { .hud-bar { top:10px; right:10px; } .stack { right:10px; bottom:10px; } .panel img { width:52px; height:72px; flex-basis:52px; } }
    @media(prefers-reduced-motion:reduce) { .panel { animation:none; } }
  `;

  const hudBar = document.createElement("div");
  hudBar.className = "hud-bar";

  const chipsContainer = document.createElement("div");
  chipsContainer.className = "hud-chip-container";

  function createChip(label) {
    const chip = document.createElement("div");
    chip.className = "hud-chip status-avail";
    const dot = document.createElement("span");
    dot.className = "dot";
    const text = document.createElement("span");
    text.textContent = label;
    chip.append(dot, text);
    return { chip, dot, text };
  }

  // Full server names
  const vvoChip = createChip("VLADIVOSTOK: ONLINE");
  const nskChip = createChip("NOVOSIBIRSK: ALLOWED");
  const kazChip = createChip("KAZAKHSTAN: ALLOWED");

  chipsContainer.append(vvoChip.chip, nskChip.chip, kazChip.chip);

  // Queue Assistant Widget
  const queueWidget = document.createElement("div");
  queueWidget.className = "queue-widget";
  queueWidget.innerHTML = `
    <div class="queue-header">
      <span class="queue-guard-title">QUEUE GUARD</span>
      <span class="queue-subtext">ノヴォシビルスク拡大防止 / Max 60s</span>
    </div>
    <div style="display:flex; align-items:baseline; justify-content:space-between; margin-top:3px;">
      <div class="queue-timer-val">00:00</div>
      <div class="queue-target-val" style="font-size:11px; color:#888;">Limit: &lt; 00:58</div>
    </div>
    <div class="queue-progress-bar">
      <div class="queue-progress-fill"></div>
    </div>
  `;

  const queueTimerVal = queueWidget.querySelector(".queue-timer-val");
  const queueProgressFill = queueWidget.querySelector(".queue-progress-fill");
  const queueTargetVal = queueWidget.querySelector(".queue-target-val");
  const queueGuardTitle = queueWidget.querySelector(".queue-guard-title");

  const stack = document.createElement("div");
  stack.className = "stack";

  hudBar.append(chipsContainer, queueWidget);
  shadow.append(style, hudBar, stack);

  function updateHudVisibility() {
    nskChip.chip.style.display = currentConfig.allowNovosibirsk ? "flex" : "none";
    kazChip.chip.style.display = currentConfig.allowKazakhstan ? "flex" : "none";
    if (!currentConfig.enableQueueTimer) {
      queueWidget.classList.remove("active");
    }
  }

  let cachedRadarData = null;
  safeStorageGet(["vvoRadar"], (res) => {
    cachedRadarData = res?.vvoRadar || null;
  });
  try {
    if (isContextValid() && chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!isContextValid()) return;
        if (area === "local" && changes.vvoRadar) {
          cachedRadarData = changes.vvoRadar.newValue || null;
        }
      });
    }
  } catch { }

  function isVladivostokPeak() {
    try {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const vlatHour = new Date(utc + (3600000 * 10)).getHours();
      return vlatHour >= 17 || vlatHour < 1;
    } catch {
      return false;
    }
  }

  function applyChipStatus(chipObj, baseFullName, rawStatus) {
    const status = String(rawStatus || "UNKNOWN").toUpperCase();
    chipObj.chip.className = "hud-chip";
    const peakSuffix = (baseFullName === "VLADIVOSTOK" && isVladivostokPeak()) ? " 🔥 PEAK" : "";

    if (status.includes("AVAILABLE")) {
      chipObj.chip.classList.add("status-avail");
      const isRequeuing = baseFullName === "VLADIVOSTOK" && cachedRadarData?.lastMatchEnded && (Date.now() - cachedRadarData.lastMatchEnded < 12 * 60 * 1000);
      const dynamicTag = isRequeuing ? " 🔥 RE-QUEUE" : peakSuffix;
      chipObj.text.textContent = `${baseFullName}: AVAILABLE${dynamicTag}`;
    } else if (status.includes("HIGH_TRAFFIC")) {
      chipObj.chip.classList.add("status-warn");
      chipObj.text.textContent = `${baseFullName}: HIGH LOAD${peakSuffix}`;
    } else if (status.includes("FULL")) {
      chipObj.chip.classList.add("status-full");
      let fullDurationTag = "";
      if (baseFullName === "VLADIVOSTOK" && cachedRadarData?.lastBusyStart && (Date.now() - cachedRadarData.lastBusyStart < 90 * 60 * 1000)) {
        const mins = Math.floor((Date.now() - cachedRadarData.lastBusyStart) / 60000);
        fullDurationTag = ` (~${mins}m)`;
      }
      chipObj.text.textContent = `${baseFullName}: FULL${fullDurationTag}`;
    } else {
      chipObj.chip.classList.add("status-off");
      chipObj.text.textContent = `${baseFullName}: NOT LISTED`;
    }
  }

  // Audio tone generation for warning alert (Two-tone pleasant chime A5 -> E6)
  function playWarningBeep() {
    if (!currentConfig.enableQueueBeep) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // Tone 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2: 1318.5Hz (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.5, now + 0.16);
      gain2.gain.setValueAtTime(0.25, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.42);
    } catch { }
  }

  // Queue Timer Logic
  let queueStartTime = null;
  let queueInterval = null;
  let hasBeepedThisQueue = false;

  function isNavigationLink(el) {
    if (!el) return false;
    const a = el.tagName === "A" ? el : (el.closest ? el.closest("a") : null);
    if (!a) return false;
    const href = a.getAttribute("href");
    return !!href && href !== "#" && !href.startsWith("javascript:");
  }

  function isPlayButtonSlot(el) {
    if (!el || isNavigationLink(el)) return false;
    // Reject anything inside navigation bars, popovers, drawers, modals
    if (el.closest?.('[name="navbarstart"], [name="navbarend"], [class*="TabNavigationItem" i], [class*="Popover" i], [role="dialog"], [aria-modal="true"], [class*="Modal" i]')) {
      return false;
    }
    return !!el.closest?.(
      '[class*="PlayButtonSlot" i], [class*="sc-39c4ac78-3"], [class*="PlayButtonWrapper" i]'
    );
  }

  function isStartQueueButton(el) {
    return isPlayButtonSlot(el);
  }

  function getPlayButton() {
    const slot = document.querySelector(
      '[class*="PlayButtonSlot" i], [class*="sc-39c4ac78-3"], [class*="PlayButtonWrapper" i]'
    );
    if (!slot) return null;
    const btn = slot.querySelector('button, [role="button"]') || (slot.tagName === "BUTTON" ? slot : null);
    if (btn && !isNavigationLink(btn)) {
      return btn;
    }
    return null;
  }

  function clickElement(el) {
    if (!el || isNavigationLink(el)) return;
    const target = (el.nodeType === Node.ELEMENT_NODE && el.closest)
      ? (el.closest("button, [role='button']") || el)
      : el;
    if (!target || isNavigationLink(target)) return;

    if (typeof target.click === "function") {
      try {
        target.click();
        return;
      } catch {}
    }

    const r = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const cx = r.left + (r.width > 0 ? r.width / 2 : 0);
    const cy = r.top + (r.height > 0 ? r.height / 2 : 0);
    const eventOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: cx,
      clientY: cy,
      buttons: 1
    };
    try {
      target.dispatchEvent(new MouseEvent("click", eventOpts));
    } catch {}
  }

  let cancelCooldownUntil = 0;

  function cancelMatchmaking() {
    cancelCooldownUntil = Date.now() + 3500;
    // In FACEIT, clicking the play button slot button while in queue cancels the queue
    const playBtn = getPlayButton();
    if (playBtn) {
      clickElement(playBtn);
      return true;
    }
    return false;
  }

  function isBlockingModalOpen() {
    // 1. Accept match modal -> ALWAYS blocking!
    if (document.querySelector('button[data-testid*="accept" i], [aria-label*="accept" i]')) {
      triggerMatchFoundDiscord();
      return true;
    }

    // 2. Visible modals / dialogs
    const dialogs = document.querySelectorAll('[aria-modal="true"], [role="dialog"]');
    for (const d of dialogs) {
      if (d.getAttribute("aria-hidden") === "true") continue;
      const r = d.getBoundingClientRect();
      if (r.width > 250 && r.height > 150) {
        return true;
      }
    }
    return false;
  }

  function isFindMatchElement(el) {
    return isStartQueueButton(el);
  }

  function restartMatchmaking(attempts = 0) {
    if (isBlockingModalOpen()) return;

    const playBtn = getPlayButton();
    // Only restart when button exists and NOT in queue (i.e. reset to idle)
    if (playBtn && !isFaceitInQueue()) {
      cancelCooldownUntil = 0;
      clickElement(playBtn);
      startQueueTimer();
      return;
    }

    // If button hasn't re-rendered yet: retry
    if (attempts < 15) {
      setTimeout(() => restartMatchmaking(attempts + 1), 300);
    }
  }

  function isFaceitInQueue() {
    // 1. If a blocking modal dialog is open, we are NOT in queue
    if (isBlockingModalOpen()) {
      return false;
    }

    // 2. PlayButtonSlot inspection (100% language-independent!)
    const slot = document.querySelector(
      '[class*="PlayButtonSlot" i], [class*="sc-39c4ac78-3"], [class*="PlayButtonWrapper" i]'
    );
    if (slot) {
      // Countdown component inside play slot
      if (slot.querySelector('[class*="CountDownWrapper" i], [class*="sc-b58dd53c-5"]')) {
        return true;
      }
      const btn = slot.querySelector('button, [role="button"]') || (slot.tagName === "BUTTON" ? slot : null);
      if (btn) {
        // Active timer digits e.g. "00:14"
        const txt = (btn.innerText || btn.textContent || "").trim();
        if (/\d+:\d+/.test(txt)) return true;
        // Cancel "X" icon slot inside play button
        if (btn.querySelector('[class*="EndSlot" i], [class*="sc-b58dd53c-1"]')) {
          return true;
        }
      }
    }

    // 3. Fallback: CountDownWrapper in dock
    const cd = document.querySelector('[class*="CountDownWrapper" i], [class*="sc-b58dd53c-5"]');
    if (cd && cd.closest('[class*="PlayBar" i], [class*="PlayButton" i]')) {
      return true;
    }

    return false;
  }

  function startQueueTimer(forceShow = false) {
    if (queueStartTime !== null) {
      queueWidget.style.display = "";
      if (forceShow || currentConfig.enableQueueTimer) {
        queueWidget.classList.add("active");
      }
      return;
    }
    queueStartTime = Date.now();
    hasBeepedThisQueue = false;
    queueWidget.style.display = "";
    if (forceShow || currentConfig.enableQueueTimer) {
      queueWidget.classList.add("active");
    }
    if (queueInterval) clearInterval(queueInterval);
    queueInterval = setInterval(updateQueueTimer, 200);
    updateQueueTimer();
  }

  function stopQueueTimer() {
    cancelAntiSnipe();
    queueStartTime = null;
    hasBeepedThisQueue = false;
    if (queueInterval) {
      clearInterval(queueInterval);
      queueInterval = null;
    }
    queueWidget.classList.remove("active");
    queueWidget.style.display = "none";
    queueTimerVal.classList.remove("warning");
    queueProgressFill.classList.remove("warning");
    queueProgressFill.style.width = "0%";
    queueTimerVal.textContent = "00:00";
  }

  function updateQueueTimer() {
    if (!isContextValid()) {
      stopQueueTimer();
      return;
    }
    if (!queueStartTime) return;

    const maxSec = Math.max(1, Number(currentConfig.autoCancelSeconds) || 58);
    const warnSec = Math.max(1, maxSec <= 3 ? 1 : (maxSec <= 15 ? maxSec - 2 : maxSec - 5));

    const targetMin = String(Math.floor(maxSec / 60)).padStart(2, "0");
    const targetSec = String(maxSec % 60).padStart(2, "0");
    if (queueTargetVal) {
      queueTargetVal.textContent = `Limit: < ${targetMin}:${targetSec}`;
    }
    if (queueGuardTitle) {
      queueGuardTitle.textContent = `QUEUE GUARD (MAX ${maxSec}s)`;
    }

    const elapsedSec = Math.floor((Date.now() - queueStartTime) / 1000);
    const m = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const s = String(elapsedSec % 60).padStart(2, "0");
    queueTimerVal.textContent = `${m}:${s}`;

    const pct = Math.min(100, Math.round((elapsedSec / maxSec) * 100));
    queueProgressFill.style.width = `${pct}%`;

    if (elapsedSec >= warnSec - 2) {
      queueTimerVal.classList.add("warning");
      queueProgressFill.classList.add("warning");
    } else {
      queueTimerVal.classList.remove("warning");
      queueProgressFill.classList.remove("warning");
    }

    if (elapsedSec >= warnSec && !hasBeepedThisQueue) {
      hasBeepedThisQueue = true;
      playWarningBeep();
      makePanel({
        title: `キュー時間警告 / Queue Warning (${warnSec}s)`,
        message: `まもなく設定時間の${maxSec}秒に達します。マッチング地域拡大を防ぐため、再検索してください。`,
        sub: `Approaching ${maxSec}s limit. Restart your queue to prevent distant server assignment.`,
        buttonLabel: "了解 / OK"
      });
    }

    if (elapsedSec >= maxSec && currentConfig.autoCancelQueue) {
      cancelMatchmaking();
      stopQueueTimer();
      playWarningBeep();

      const willRestart = !!currentConfig.autoCancelQueue && !!currentConfig.autoRestartQueue;

      makePanel({
        title: willRestart ? "自動再検索 / Auto-Requeuing" : "自動キャンセル / Auto-Cancelled",
        message: willRestart
          ? `${maxSec}秒に達したため、キューをリセットして自動再検索します。`
          : `${maxSec}秒に達したため、キューを自動キャンセルしました。`,
        sub: willRestart
          ? `Resetting queue at ${maxSec}s limit and re-queuing automatically...`
          : `Queue was automatically cancelled at ${maxSec}s limit.`,
        buttonLabel: "OK"
      });

      if (willRestart) {
        setTimeout(() => {
          restartMatchmaking(0);
        }, 800);
      }
    }
  }

  let antiSnipeTimer = null;
  let antiSnipeInterval = null;
  let antiSnipePanel = null;

  function cancelAntiSnipe() {
    if (antiSnipeTimer) {
      clearTimeout(antiSnipeTimer);
      antiSnipeTimer = null;
    }
    if (antiSnipeInterval) {
      clearInterval(antiSnipeInterval);
      antiSnipeInterval = null;
    }
    if (antiSnipePanel) {
      antiSnipePanel.remove();
      antiSnipePanel = null;
    }
  }

  function startAntiSnipeQueue(targetEl) {
    cancelAntiSnipe();

    const delayMs = Math.round(2000 + Math.random() * 5000); // 2.0s to 7.0s
    const startTime = Date.now();
    const endTime = startTime + delayMs;

    antiSnipePanel = makePanel({
      title: "アンチスナイプ遅延 / Anti-Snipe Delay",
      message: `スナイプ防止のため、${(delayMs / 1000).toFixed(1)}秒後にマッチメイキングを開始します...`,
      sub: `Waiting ${(delayMs / 1000).toFixed(1)}s jitter delay before matchmaking starts. Click button again or Cancel to abort.`,
      buttonLabel: "キャンセル / Cancel",
      onAction: () => {
        cancelAntiSnipe();
      }
    });

    antiSnipeInterval = setInterval(() => {
      if (!isContextValid()) {
        cancelAntiSnipe();
        return;
      }
      const remainingMs = Math.max(0, endTime - Date.now());
      if (antiSnipePanel && antiSnipePanel.parentNode) {
        const bodyEl = antiSnipePanel.querySelector(".copy > p:not(.eyebrow):not(.sub)");
        if (bodyEl) {
          bodyEl.textContent = `スナイプ防止のため、${(remainingMs / 1000).toFixed(1)}秒後にマッチメイキングを開始します...`;
        }
      }
      if (remainingMs <= 0) {
        if (antiSnipeInterval) {
          clearInterval(antiSnipeInterval);
          antiSnipeInterval = null;
        }
      }
    }, 100);

    antiSnipeTimer = setTimeout(() => {
      cancelAntiSnipe();
      const playBtn = getPlayButton() || (targetEl && targetEl.closest ? targetEl.closest("button, [role='button']") : targetEl);
      if (playBtn) {
        clickElement(playBtn);
        startQueueTimer();
      }
    }, delayMs);
  }

  // Intercept user clicks directly on page
  document.addEventListener("click", (e) => {
    if (!isContextValid()) return;
    // Ignore programmatic / synthetic clicks from our extension
    if (!e.isTrusted) return;

    const target = e.target;
    if (!target || isNavigationLink(target)) return;

    // Check if user clicked inside the playbar button slot ONLY
    if (isPlayButtonSlot(target)) {
      cancelCooldownUntil = 0;

      // If anti-snipe delay is running, clicking play button again cancels it
      if (antiSnipeTimer) {
        e.stopImmediatePropagation();
        e.preventDefault();
        cancelAntiSnipe();
        return;
      }

      if (isFaceitInQueue()) {
        // User clicked the play button while in queue -> manually cancelled
        stopQueueTimer();
      } else {
        // User clicked the play button while idle -> starting queue
        if (currentConfig.enableAntiSnipe) {
          e.stopImmediatePropagation();
          e.preventDefault();
          startAntiSnipeQueue(target);
          return;
        }
        startQueueTimer();
      }
    }
  }, true);

  function formatDiscordMentions(rawInput, defaultMention) {
    if (rawInput === undefined || rawInput === null) return defaultMention;
    const trimmed = String(rawInput).trim();
    if (!trimmed) return defaultMention;
    if (/^(none|off|no|false|0|disable|disabled)$/i.test(trimmed)) {
      return "";
    }
    const parts = trimmed.split(/[\s,;]+/);
    const mentions = [];
    for (const part of parts) {
      const p = part.trim();
      if (!p) continue;
      if (/^<@&?\d+>$/.test(p)) {
        mentions.push(p);
      } else if (/^&(\d{17,21})$/.test(p)) {
        mentions.push(`<@&${p.slice(1)}>`);
      } else if (/^@(\d{17,21})$/.test(p)) {
        mentions.push(`<@${p.slice(1)}>`);
      } else if (/^\d{17,21}$/.test(p)) {
        mentions.push(`<@${p}>`);
      } else if (p.toLowerCase() === "@everyone" || p.toLowerCase() === "@here") {
        mentions.push(p.toLowerCase());
      } else if (p.startsWith("<@") && p.endsWith(">")) {
        mentions.push(p);
      } else {
        mentions.push(p.startsWith("@") ? p : `<@${p}>`);
      }
    }
    return mentions.length > 0 ? mentions.join(" ") : defaultMention;
  }

  let lastDiscordMatchTime = 0;
  function triggerMatchFoundDiscord() {
    if (!currentConfig.enableDiscordAlerts || !currentConfig.discordWebhookUrl || currentConfig.discordNotifyMatch === false) return;
    if (Date.now() - lastDiscordMatchTime < 45000) return; // 45s cooldown
    lastDiscordMatchTime = Date.now();

    const isJa = (currentConfig.discordLang || "ja") === "ja";
    const mention = formatDiscordMentions(currentConfig.discordCustomPing, "@everyone");
    const prefix = mention ? `${mention} ` : "";
    const payload = isJa ? {
      content: `${prefix}🎮 **FACEIT — マッチが見つかりました！**`,
      embeds: [
        {
          title: "FACEIT マッチング — チェックイン受付中 (30秒)",
          description: "マッチが成立しました！30秒以内にチェックイン（Accept）を完了してください。",
          color: 16744192,
          fields: [
            { name: "対象地域", value: "Vladivostok (EU)", inline: true },
            { name: "状態", value: "チェックイン受付中 (30s)", inline: true }
          ],
          footer: {
            text: "Pathfinder Discord Alerts",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    } : {
      content: `${prefix}🎮 **FACEIT — Match Ready!**`,
      embeds: [
        {
          title: "FACEIT Match Ready — Check-in (30s)",
          description: "Match is ready! Please check in (Accept) within 30 seconds.",
          color: 16744192,
          fields: [
            { name: "Target Region", value: "Vladivostok (EU)", inline: true },
            { name: "Status", value: "CHECK-IN OPEN (30s)", inline: true }
          ],
          footer: {
            text: "Pathfinder Discord Alerts",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    safeSendMessage({
      type: "SEND_DISCORD_WEBHOOK",
      url: currentConfig.discordWebhookUrl,
      payload
    });
  }

  let lastDiscordSlotsTime = 0;
  function triggerSlotsFreeDiscord() {
    if (!isContextValid()) return;
    if (!currentConfig.enableDiscordAlerts || !currentConfig.discordWebhookUrl || !currentConfig.discordNotifySlots) return;
    if (Date.now() - lastDiscordSlotsTime < 60000) return; // 60s cooldown
    lastDiscordSlotsTime = Date.now();

    const isJa = (currentConfig.discordLang || "ja") === "ja";
    const mention = formatDiscordMentions(currentConfig.discordCustomPing, "@here");
    const prefix = mention ? `${mention} ` : "";
    const payload = isJa ? {
      content: `${prefix}🟢 **ウラジオストクサーバーの空き枠を確認！**`,
      embeds: [
        {
          title: "ウラジオストク空きスロット検知",
          description: "ウラジオストクサーバーの空き枠が確認されました！今すぐマッチング可能です。",
          color: 4901984,
          fields: [
            { name: "サーバー", value: "Vladivostok (EU)", inline: true },
            { name: "状態", value: "利用可能 (AVAILABLE)", inline: true }
          ],
          footer: {
            text: "Pathfinder Discord Alerts",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    } : {
      content: `${prefix}🟢 **Vladivostok Server Slots Open!**`,
      embeds: [
        {
          title: "Vladivostok Server Available",
          description: "Vladivostok server instances are now available and free. Safe to queue!",
          color: 4901984,
          fields: [
            { name: "Server", value: "Vladivostok (EU)", inline: true },
            { name: "Status", value: "AVAILABLE", inline: true }
          ],
          footer: {
            text: "Pathfinder Discord Alerts",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    safeSendMessage({
      type: "SEND_DISCORD_WEBHOOK",
      url: currentConfig.discordWebhookUrl,
      payload
    });
  }

  function getFlagEmoji(countryCode) {
    if (!countryCode || typeof countryCode !== "string") return "🌐";
    const clean = countryCode.trim().toUpperCase();
    if (clean.length !== 2) return "🌐";
    const offset = 127397;
    try {
      return String.fromCodePoint(clean.charCodeAt(0) + offset, clean.charCodeAt(1) + offset);
    } catch {
      return "🌐";
    }
  }

  let cachedMyNick = "";
  let cachedMyId = "";

  function getCurrentUserInfo() {
    let id = document.documentElement?.dataset?.pathfinderUserId || cachedMyId || "";
    let nick = document.documentElement?.dataset?.pathfinderUserNick || cachedMyNick || "";
    const acceptedMid = document.documentElement?.dataset?.pathfinderAcceptedMatchId || "";

    if (!id || !nick) {
      // 1. Redux Persist (modern FACEIT storage)
      try {
        const persist = window.localStorage.getItem("persist:root");
        if (persist) {
          const root = JSON.parse(persist);
          if (root.auth) {
            const auth = JSON.parse(root.auth);
            const u = auth?.user;
            if (!id) id = u?.id || u?.guid || "";
            if (!nick) nick = u?.nickname || u?.name || "";
          }
        }
      } catch {}

      try {
        for (const k of ["user", "auth", "faceit_user", "SP_USER", "FACEIT_AUTH_USER"]) {
          const raw = window.localStorage.getItem(k);
          if (raw) {
            const p = JSON.parse(raw);
            if (!id) id = p?.id || p?.user?.id || p?.guid || "";
            if (!nick) nick = p?.nickname || p?.user?.nickname || p?.name || "";
          }
        }
      } catch {}
    }
    if (!nick) {
      try {
        const playerLinks = document.querySelectorAll('a[href*="/players/"], [data-testid*="user-nav"] a, [data-testid*="profile"] a');
        for (const link of playerLinks) {
          const href = link.getAttribute("href") || "";
          const m = href.match(/\/players\/([^/?#]+)/i);
          if (m && m[1] && m[1] !== "index") {
            nick = decodeURIComponent(m[1]);
            break;
          }
        }
      } catch {}
    }
    if (nick) cachedMyNick = nick;
    if (id) cachedMyId = id;
    return { id, nick, acceptedMid };
  }

  function isPlayerInMatch(matchData, myId, myNick, acceptedMid) {
    const matchId = matchData?.id || matchData?.match_id;
    if (acceptedMid && matchId && acceptedMid === matchId) {
      return true;
    }

    const teams = matchData?.teams;
    if (!teams) return false;
    const allPlayers = [
      ...(teams.faction1?.roster || []),
      ...(teams.faction2?.roster || [])
    ];
    if (allPlayers.length === 0) return false;

    if (myId) {
      if (allPlayers.some(p => p.id === myId || p.guid === myId)) return true;
    }
    if (myNick) {
      const lower = myNick.toLowerCase();
      if (allPlayers.some(p =>
        (p.nickname || "").toLowerCase() === lower ||
        (p.game_player_name || "").toLowerCase() === lower ||
        (p.gameName || "").toLowerCase() === lower
      )) {
        return true;
      }
    }
    return false;
  }

  function isMatchActive(matchData) {
    const state = String(matchData?.state || matchData?.status || "").toUpperCase();
    if (!state) return false;
    if (["FINISHED", "CANCELLED", "ABORTED", "TIMEOUT", "CLOSED"].includes(state)) {
      return false;
    }
    return ["VOTING", "CHECK_IN", "CONFIGURING", "READY", "ONGOING", "SUBMITTED"].includes(state);
  }

  const inMemoryNotifiedMatchRooms = new Set();
  function hasMatchBeenPinged(matchId) {
    if (inMemoryNotifiedMatchRooms.has(matchId)) return Promise.resolve(true);
    return new Promise((resolve) => {
      safeStorageGet(["notifiedMatchRooms"], (res) => {
        const notified = res?.notifiedMatchRooms || {};
        if (notified[matchId]) {
          inMemoryNotifiedMatchRooms.add(matchId);
          resolve(true);
        } else {
          resolve(false);
        }
      });
      // Safety timeout in case storage doesn't respond
      setTimeout(() => resolve(inMemoryNotifiedMatchRooms.has(matchId)), 200);
    });
  }

  function markMatchAsPinged(matchId) {
    if (!matchId) return;
    inMemoryNotifiedMatchRooms.add(matchId);
    safeStorageGet(["notifiedMatchRooms"], (res) => {
      const notified = res?.notifiedMatchRooms || {};
      notified[matchId] = Date.now();
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      for (const k in notified) {
        if (notified[k] < cutoff) delete notified[k];
      }
      safeStorageSet({ notifiedMatchRooms: notified });
    });
  }

  const inMemoryNotifiedMatchIps = new Set();
  function hasMatchIpBeenPinged(matchId) {
    if (inMemoryNotifiedMatchIps.has(matchId)) return Promise.resolve(true);
    return new Promise((resolve) => {
      safeStorageGet(["notifiedMatchIps"], (res) => {
        const notified = res?.notifiedMatchIps || {};
        if (notified[matchId]) {
          inMemoryNotifiedMatchIps.add(matchId);
          resolve(true);
        } else {
          resolve(false);
        }
      });
      setTimeout(() => resolve(inMemoryNotifiedMatchIps.has(matchId)), 200);
    });
  }

  function markMatchIpAsPinged(matchId) {
    if (!matchId) return;
    inMemoryNotifiedMatchIps.add(matchId);
    safeStorageGet(["notifiedMatchIps"], (res) => {
      const notified = res?.notifiedMatchIps || {};
      notified[matchId] = Date.now();
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      for (const k in notified) {
        if (notified[k] < cutoff) delete notified[k];
      }
      safeStorageSet({ notifiedMatchIps: notified });
    });
  }

  function formatRosterField(roster, myId, myNick, partyCounts) {
    if (!Array.isArray(roster) || roster.length === 0) return "N/A";
    return roster.map(p => {
      const flag = getFlagEmoji(p.country);
      const flagPrefix = flag ? `${flag} ` : "";
      const isMe = (myId && (p.id === myId || p.guid === myId)) ||
                   (myNick && (
                     (p.nickname || "").toLowerCase() === myNick.toLowerCase() ||
                     (p.gameName || "").toLowerCase() === myNick.toLowerCase() ||
                     (p.game_player_name || "").toLowerCase() === myNick.toLowerCase()
                   ));
      const nick = isMe ? `👉 **${p.nickname || "Player"}**` : `**${p.nickname || "Player"}**`;
      const elo = p.elo ? ` • ${Number(p.elo).toLocaleString()} ELO` : "";
      const lvlNum = p.gameSkillLevel || p.game_skill_level;
      const lvl = lvlNum ? ` [Lvl ${lvlNum}]` : "";
      const partySize = (p.partyId && partyCounts) ? (partyCounts[p.partyId] || 1) : 1;
      const partyTag = partySize > 1 ? ` 👥` : "";
      return `${flagPrefix}${nick}${elo}${lvl}${partyTag}`;
    }).join("\n");
  }

  const attemptedMatchFetches = new Set();
  function requestMatchDetailsViaBackground(matchId) {
    if (!matchId || attemptedMatchFetches.has(matchId)) {
      return Promise.resolve(null);
    }
    attemptedMatchFetches.add(matchId);

    return new Promise((resolve) => {
      if (!isContextValid()) return resolve(null);
      try {
        chrome.runtime.sendMessage({ type: "FETCH_MATCH_DETAILS", matchId }, (res) => {
          try {
            if (chrome.runtime?.lastError || !res?.ok || !res?.data) {
              resolve(null);
            } else {
              resolve(res.data);
            }
          } catch {
            resolve(null);
          }
        });
      } catch {
        resolve(null);
      }
    });
  }

  function sendRichMatchRoomDiscord(matchId, matchData, myId, myNick) {
    const isJa = (currentConfig.discordLang || "ja") === "ja";
    const roomUrl = `https://www.faceit.com/${isJa ? "ja" : "en"}/cs2/room/${matchId}`;
    const mention = formatDiscordMentions(currentConfig.discordCustomPing, "@here");
    const prefix = mention ? `${mention} ` : "";

    const teams = matchData?.teams || {};
    const f1 = teams.faction1 || {};
    const f2 = teams.faction2 || {};
    const f1Name = f1.name || "Team 1";
    const f2Name = f2.name || "Team 2";

    const f1Roster = Array.isArray(f1.roster) ? f1.roster : [];
    const f2Roster = Array.isArray(f2.roster) ? f2.roster : [];

    // Calculate party counts to highlight premade duos/trios/stacks
    const partyCounts = {};
    for (const p of [...f1Roster, ...f2Roster]) {
      if (p.partyId) {
        partyCounts[p.partyId] = (partyCounts[p.partyId] || 0) + 1;
      }
    }

    const f1EloList = f1Roster.map(p => p.elo).filter(Boolean);
    const f2EloList = f2Roster.map(p => p.elo).filter(Boolean);

    const f1Avg = f1EloList.length > 0 ? Math.round(f1EloList.reduce((a, b) => a + b, 0) / f1EloList.length) : (f1.stats?.rating || 0);
    const f2Avg = f2EloList.length > 0 ? Math.round(f2EloList.reduce((a, b) => a + b, 0) / f2EloList.length) : (f2.stats?.rating || 0);

    const f1WinProb = typeof f1.stats?.winProbability === "number" ? Math.round(f1.stats.winProbability * 100) : null;
    const f2WinProb = typeof f2.stats?.winProbability === "number" ? Math.round(f2.stats.winProbability * 100) : null;
    const f1WinStr = f1WinProb !== null ? ` • ${f1WinProb}% Win` : "";
    const f2WinStr = f2WinProb !== null ? ` • ${f2WinProb}% Win` : "";

    // Server location extraction (supports locations array, voting pick, and configured_server)
    const rawLoc = matchData.locations?.[0]?.guid ||
                   matchData.locations?.[0]?.name ||
                   (typeof matchData.locations?.[0] === "string" ? matchData.locations[0] : "") ||
                   matchData.voting?.location?.pick?.[0] ||
                   matchData.configured_server?.location ||
                   "";
    let serverDisplay = isJa ? "🗳️ 投票中 (Veto)" : "🗳️ Veto in progress";
    if (rawLoc) {
      const lowerLoc = rawLoc.toLowerCase();
      if (lowerLoc.includes("vladivostok")) {
        serverDisplay = "🟢 Vladivostok";
      } else if (lowerLoc.includes("novosibirsk")) {
        serverDisplay = "🟡 Novosibirsk";
      } else if (lowerLoc.includes("kazakhstan") || lowerLoc.includes("almaty")) {
        serverDisplay = "🟡 Kazakhstan";
      } else if (lowerLoc.includes("moscow")) {
        serverDisplay = "📍 Moscow";
      } else {
        serverDisplay = `📍 ${rawLoc}`;
      }
    }

    // Map pick extraction (supports maps array and voting pick)
    const rawMap = matchData.maps?.[0]?.name ||
                   matchData.maps?.[0]?.class_name ||
                   matchData.voting?.map?.pick?.[0] ||
                   "";
    const mapClean = rawMap ? rawMap.replace(/^de_/i, "").toUpperCase() : "";
    const mapDisplay = mapClean ? `🗺️ ${mapClean}` : (isJa ? "🗳️ 投票中 (Veto)" : "🗳️ Veto in progress");

    const fields = [
      {
        name: `🔵 ${f1Name}${f1Avg ? ` (${f1Avg.toLocaleString()} Avg ELO${f1WinStr})` : ""}`,
        value: formatRosterField(f1Roster, myId, myNick, partyCounts),
        inline: false
      },
      {
        name: `🔴 ${f2Name}${f2Avg ? ` (${f2Avg.toLocaleString()} Avg ELO${f2WinStr})` : ""}`,
        value: formatRosterField(f2Roster, myId, myNick, partyCounts),
        inline: false
      },
      {
        name: isJa ? "📍 サーバー" : "📍 Server",
        value: serverDisplay,
        inline: true
      },
      {
        name: isJa ? "🗺️ マップ" : "🗺️ Map",
        value: mapDisplay,
        inline: true
      }
    ];

    if (f1Avg && f2Avg) {
      const diff = Math.abs(f1Avg - f2Avg);
      fields.push({
        name: isJa ? "⚖️ ELO差" : "⚖️ ELO Diff",
        value: `±${diff} ELO`,
        inline: true
      });
    }

    fields.push({
      name: "🆔 Match ID",
      value: `\`${matchId}\``,
      inline: true
    });

    const payload = isJa ? {
      content: `${prefix}⚔️ **FACEIT マッチルーム開設！ [${f1Name} vs ${f2Name}]**\n🔗 <${roomUrl}>`,
      embeds: [
        {
          title: `FACEIT マッチルーム — ピック＆バン進行中`,
          description: `マッチが成立し、部屋が作成されました！\n👉 [**マッチルームを開いて投票に参加 (Open Room)**](${roomUrl})`,
          color: 16737792,
          fields,
          footer: {
            text: "Pathfinder Match Intel",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    } : {
      content: `${prefix}⚔️ **FACEIT Live Match Room! [${f1Name} vs ${f2Name}]**\n🔗 <${roomUrl}>`,
      embeds: [
        {
          title: `FACEIT Match Room — Veto Stage`,
          description: `Match formed and live room is ready!\n👉 [**Click to Join Match Room (Open Room)**](${roomUrl})`,
          color: 16737792,
          fields,
          footer: {
            text: "Pathfinder Match Intel",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    safeSendMessage({
      type: "SEND_DISCORD_WEBHOOK",
      url: currentConfig.discordWebhookUrl,
      payload
    });
  }

  function extractConnectCommand(matchData) {
    if (matchData) {
      // 1. Check clientCustom.server (Standard FACEIT API response for /match/v2/match/{id} used by Repeek & Faceit Enhancer)
      const clientServer = matchData.clientCustom?.server;
      if (clientServer?.ip && clientServer?.port) {
        return `connect ${clientServer.ip}:${clientServer.port}`;
      }

      // 2. Check configured_server / server object
      const cs = matchData.configured_server || matchData.server;
      if (cs && (cs.ip || cs.host)) {
        const host = cs.ip || cs.host;
        const port = cs.port || 27015;
        return `connect ${host}:${port}`;
      }

      // 3. Check entityCustom
      if (matchData.entityCustom?.serverIp) {
        const host = matchData.entityCustom.serverIp;
        const port = matchData.entityCustom.serverPort || 27015;
        return `connect ${host}:${port}`;
      }

      // 4. connection_string or csgo_server_ip (strip any password)
      const raw = (matchData.connection_string || matchData.csgo_server_ip || "").trim();
      if (raw) {
        const clean = raw.replace(/;\s*password\s+[^\s;]+/i, "").trim();
        return clean.startsWith("connect") ? clean : `connect ${clean}`;
      }
    }

    // 5. DOM Check (matches Faceit & Repeek buttons / links)
    try {
      const steamOrAcLink = document.querySelector('a[href^="steam://connect/"], a[href^="faceitac://connect/"]');
      if (steamOrAcLink) {
        const href = steamOrAcLink.getAttribute("href") || "";
        const hostPort = href.replace(/^(steam|faceitac):\/\/connect\//i, "").trim().split("/")[0];
        if (hostPort && /^[0-9a-zA-Z.:]+$/.test(hostPort)) {
          return `connect ${hostPort}`;
        }
      }

      const connectInput = document.querySelector('input[value*="connect " i]');
      if (connectInput?.value && /connect\s+[0-9a-z.:]+/i.test(connectInput.value)) {
        return connectInput.value.replace(/;\s*password\s+[^\s;]+/i, "").trim();
      }
    } catch {}

    return null;
  }

  function sendServerIpDiscord(matchId, matchData, connectCmd) {
    if (!connectCmd) return;
    const isJa = (currentConfig.discordLang || "ja") === "ja";
    const roomUrl = `https://www.faceit.com/${isJa ? "ja" : "en"}/cs2/room/${matchId}`;
    const mention = formatDiscordMentions(currentConfig.discordCustomPing, "@here");
    const prefix = mention ? `${mention} ` : "";

    const rawLoc = matchData?.locations?.[0]?.guid ||
                   matchData?.locations?.[0]?.name ||
                   (typeof matchData?.locations?.[0] === "string" ? matchData.locations[0] : "") ||
                   matchData?.voting?.location?.pick?.[0] ||
                   matchData?.configured_server?.location ||
                   "";
    let serverDisplay = isJa ? "🟢 Vladivostok" : "🟢 Vladivostok";
    if (rawLoc) {
      const lower = rawLoc.toLowerCase();
      if (lower.includes("vladivostok")) serverDisplay = "🟢 Vladivostok";
      else if (lower.includes("novosibirsk")) serverDisplay = "🟡 Novosibirsk";
      else if (lower.includes("kazakhstan")) serverDisplay = "🟡 Kazakhstan";
      else if (lower.includes("moscow")) serverDisplay = "📍 Moscow";
      else serverDisplay = `📍 ${rawLoc}`;
    }

    const rawMap = matchData?.maps?.[0]?.name ||
                   matchData?.maps?.[0]?.class_name ||
                   matchData?.voting?.map?.pick?.[0] ||
                   "";
    const mapDisplay = rawMap ? `🗺️ ${rawMap.replace(/^de_/i, "").toUpperCase()}` : "";

    let steamUrl = "";
    let hostPortDisplay = "";
    const ipMatch = connectCmd.match(/connect\s+([0-9a-zA-Z.:]+)/i);
    if (ipMatch && ipMatch[1]) {
      hostPortDisplay = ipMatch[1];
      steamUrl = `steam://connect/${hostPortDisplay}`;
    }

    const cleanConnectCmd = hostPortDisplay ? `connect ${hostPortDisplay}` : connectCmd.replace(/;\s*password\s+[^\s;]+/i, "").trim();

    const fields = [
      {
        name: isJa ? "💻 CS2 コンソール接続コマンド" : "💻 CS2 Console Connect Command",
        value: `\`\`\`bat\n${cleanConnectCmd}\n\`\`\``,
        inline: false
      },
      {
        name: isJa ? "📍 サーバー" : "📍 Server",
        value: serverDisplay,
        inline: true
      }
    ];

    if (mapDisplay) {
      fields.push({
        name: isJa ? "🗺️ マップ" : "🗺️ Map",
        value: mapDisplay,
        inline: true
      });
    }

    if (steamUrl) {
      fields.push({
        name: isJa ? "🚀 Steam 直接起動" : "🚀 1-Click Steam Launch",
        value: `[**${isJa ? "CS2を起動して接続" : "Launch & Connect"}**](${steamUrl})`,
        inline: true
      });
    }

    fields.push({
      name: "🔗 Room Link",
      value: `[**${isJa ? "ルームを開く" : "Open Room"}**](${roomUrl})`,
      inline: true
    });

    const payload = isJa ? {
      content: `${prefix}🚀 **CS2 サーバー準備完了！接続コマンドが発行されました**`,
      embeds: [
        {
          title: "FACEIT CS2 — サーバー接続準備完了 (Connect IP)",
          description: `サーバーの準備が完了しました。コンソールを開いて接続してください。\n👉 [**マッチルームへ移動**](${roomUrl})`,
          color: 4402688,
          fields,
          footer: {
            text: "Pathfinder Server Connect",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    } : {
      content: `${prefix}🚀 **CS2 Server Ready! Connect command is ready**`,
      embeds: [
        {
          title: "FACEIT CS2 — Dedicated Server Ready (Connect IP)",
          description: `Server has been configured. Open your CS2 console and connect.\n👉 [**Open Match Room**](${roomUrl})`,
          color: 4402688,
          fields,
          footer: {
            text: "Pathfinder Server Connect",
            icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    safeSendMessage({
      type: "SEND_DISCORD_WEBHOOK",
      url: currentConfig.discordWebhookUrl,
      payload
    });
  }

  async function checkServerIpNotification(matchId, matchData) {
    if (!isContextValid()) return;
    if (!currentConfig.enableDiscordAlerts || !currentConfig.discordWebhookUrl || !currentConfig.discordNotifyServerIp) return;
    if (!matchId || matchId === "index" || matchId.length < 5) return;

    if (await hasMatchIpBeenPinged(matchId)) return;

    const connectCmd = extractConnectCommand(matchData);
    if (!connectCmd) return;

    if (matchData && !isMatchActive(matchData)) {
      markMatchIpAsPinged(matchId);
      return;
    }

    const { id: myId, nick: myNick, acceptedMid } = getCurrentUserInfo();
    if (matchData && !isPlayerInMatch(matchData, myId, myNick, acceptedMid)) {
      markMatchIpAsPinged(matchId);
      return;
    }

    markMatchIpAsPinged(matchId);
    sendServerIpDiscord(matchId, matchData, connectCmd);
  }

  let isProcessingMatchRoom = false;
  async function processMatchRoom(rawInput) {
    if (!isContextValid()) return;
    if (!currentConfig.enableDiscordAlerts || !currentConfig.discordWebhookUrl || currentConfig.discordNotifyRoom === false) return;

    let matchData = null;
    let matchId = null;

    if (typeof rawInput === "string") {
      matchId = rawInput;
    } else if (rawInput && typeof rawInput === "object") {
      matchData = rawInput?.payload || rawInput;
      matchId = matchData?.id || matchData?.match_id;
    }

    if (!matchId || matchId === "index" || matchId.length < 5) return;

    // 1. Check if already pinged
    if (await hasMatchBeenPinged(matchId)) {
      return;
    }

    if (isProcessingMatchRoom) return;
    isProcessingMatchRoom = true;
    try {
      // If matchData is not yet fetched, request it through background service worker (single-shot, no CORS)
      if (!matchData || !matchData.teams) {
        matchData = await requestMatchDetailsViaBackground(matchId);
      }
      if (!matchData || !matchData.teams) return;

      // 2. Check if match is currently active (NOT finished, NOT cancelled)
      if (!isMatchActive(matchData)) {
        markMatchAsPinged(matchId);
        return;
      }

      // 3. Check if current player is in the match
      const { id: myId, nick: myNick, acceptedMid } = getCurrentUserInfo();
      if (!isPlayerInMatch(matchData, myId, myNick, acceptedMid)) {
        markMatchAsPinged(matchId);
        return;
      }

      // Mark as pinged BEFORE sending to prevent duplicate triggers
      markMatchAsPinged(matchId);

      // Build and send the rich Embed!
      sendRichMatchRoomDiscord(matchId, matchData, myId, myNick);

      // Check Server IP notification if option is enabled
      checkServerIpNotification(matchId, matchData);
    } finally {
      isProcessingMatchRoom = false;
    }
  }

  // --- Room Chat Automation: Language Auto-Call & Discord Chat Relay ---
  const sentLanguageNoticeRooms = new Set();
  let langNoticeRetryTimer = null;

  function isChatSidebarVisible() {
    try {
      const sb = document.querySelector('div[class*="ChatSidebarContainer" i], div[class*="ChatSidebar" i], aside[class*="ChatSidebar" i], div[class*="chat-sidebar" i]');
      if (!sb || !sb.isConnected) return false;
      const rect = sb.getBoundingClientRect();
      const style = getComputedStyle(sb);
      return rect.width > 120 && rect.height > 120 && rect.right > 0 && rect.left < window.innerWidth &&
             style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
    } catch {
      return false;
    }
  }

  function ensureChatSidebarOpen() {
    if (isChatSidebarVisible()) return; // Already open, never toggle!
    try {
      // 1. Header / Navigation rail chat toggle buttons
      const btn = document.querySelector(
        'div[class*="MainHeader__ChatButtonContainer" i] button, ' +
        'div[class*="LocalNavigationWrapper" i] div[class*="MainHeader__ChatButtonContainer" i] button, ' +
        'button[aria-label*="chat" i], button[aria-label*="チャット" i], ' +
        'button[data-testid*="chat-toggle" i], button[data-testid*="chat-button" i], [data-testid*="chat" i] button, ' +
        'div[class*="NavigationRail" i] button, button[class*="ChatToggle" i]'
      );
      if (btn && btn.isConnected) {
        btn.click();
        return;
      }

      // 2. Fallback: any button containing an SVG chat icon or title with chat
      const fallbackBtn = Array.from(document.querySelectorAll('button')).find(b => {
        const title = (b.getAttribute('title') || b.getAttribute('aria-label') || '').toLowerCase();
        return title.includes('chat') || title.includes('チャット');
      });
      if (fallbackBtn && fallbackBtn.isConnected) {
        fallbackBtn.click();
      }
    } catch {}
  }

  function isButtonExcluded(btn) {
    if (!btn || !btn.isConnected) return true;
    try {
      // Exclude emoji, gif, image, attachment, and form action buttons
      const label = (btn.getAttribute("aria-label") || btn.getAttribute("title") || "").toLowerCase();
      const cls = (btn.className || "").toString().toLowerCase();
      if (/emoji|emote|smiley|gif|attach|image|photo|upload|sticker/i.test(label) || /emoji|emote|gif|attach/i.test(cls)) {
        return true;
      }
      if (btn.closest('form, footer, [class*="InputContainer" i], [class*="Toolbar" i], [class*="ActionContainer" i], [class*="actions" i]')) {
        return true;
      }
    } catch {}
    return false;
  }

  function dismissEmojiPicker() {
    try {
      const picker = document.querySelector('[class*="EmojiPicker" i], [class*="emoji-picker" i], [class*="EmojiMart" i], [data-testid*="emoji-picker" i], [id*="emoji-picker" i]');
      if (picker && picker.isConnected) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      }
    } catch {}
  }

  function ensureTeamSectionExpanded() {
    try {
      // 1. Look for explicit TeamCollapseButton
      const teamCollapseBtns = Array.from(document.querySelectorAll(
        'button[class*="TeamCollapseButton" i], button[class*="ChatSection__Team" i], [data-testid*="team-collapse" i], [data-testid*="collapse-team" i]'
      )).filter(b => !isButtonExcluded(b));

      for (const btn of teamCollapseBtns) {
        if (btn.getAttribute("aria-expanded") === "false") {
          btn.click();
          return true;
        }
      }

      // 2. Chat sections containing Team / チーム
      const sections = Array.from(document.querySelectorAll('[class*="ChatSection__Container" i], section[class*="chat" i], div[class*="ChatSection" i]'));
      for (const sec of sections) {
        const headerEl = sec.querySelector('[class*="ChatSection__Header" i], [class*="Header" i], h6, header');
        const headerText = headerEl?.textContent || "";
        if (/チーム|team/i.test(headerText)) {
          // Strictly look inside the header for accordion toggle button
          const headerBtn = headerEl?.querySelector('button') || sec.querySelector('button[class*="Collapse" i], button[class*="Expand" i], button[aria-label*="collapse" i], button[aria-label*="expand" i], button[aria-label*="展開" i], button[aria-label*="折りたた" i]');
          if (headerBtn && !isButtonExcluded(headerBtn) && headerBtn.getAttribute("aria-expanded") === "false") {
            headerBtn.click();
            return true;
          }
        }
      }

      // 3. If 2 sections exist, check if 2nd section (Team Chat) has collapsed button strictly in its header
      if (sections.length >= 2) {
        const secHeader = sections[1].querySelector('[class*="ChatSection__Header" i], [class*="Header" i], h6, header');
        const secondSecBtn = secHeader?.querySelector('button') || sections[1].querySelector('button[class*="Collapse" i], button[class*="Expand" i]');
        if (secondSecBtn && !isButtonExcluded(secondSecBtn) && secondSecBtn.getAttribute("aria-expanded") === "false") {
          secondSecBtn.click();
          return true;
        }
      }
    } catch (err) {
      console.warn("[Pathfinder] Error expanding team chat section:", err);
    }
    return false;
  }

  function findTeamChatInput() {
    // 1. Check ChatSection__Container specifically containing "チーム" or "team" in header
    try {
      const sections = Array.from(document.querySelectorAll('[class*="ChatSection__Container" i]'));
      for (const sec of sections) {
        const headerText = sec.querySelector('[class*="ChatSection__Header" i], h6, header')?.textContent || "";
        if (/チーム|team/i.test(headerText)) {
          const inp = sec.querySelector('textarea');
          if (inp && inp.isConnected && (inp.offsetParent !== null || inp.getClientRects().length > 0)) {
            return inp;
          }
        }
      }

      // 2. Through TeamCollapseButton (explicitly marked with "Team")
      const teamBtn = document.querySelector('[class*="TeamCollapseButton" i], [class*="ChatSection__Team" i]');
      if (teamBtn) {
        const sec = teamBtn.closest('[class*="ChatSection__Container" i], section, div');
        const inp = sec?.querySelector('textarea');
        if (inp && inp.isConnected && (inp.offsetParent !== null || inp.getClientRects().length > 0)) {
          return inp;
        }
      }

      // 3. Through scrollable-container-team
      const teamList = document.querySelector('[id*="scrollable-container-team" i]');
      if (teamList) {
        const sec = teamList.closest('[class*="ChatSection__Container" i], [class*="ChatContainer" i], div[class*="RrW8Nq_outerContainer" i]') ||
                    teamList.parentElement?.parentElement?.parentElement;
        const inp = sec?.querySelector('textarea');
        if (inp && inp.isConnected && (inp.offsetParent !== null || inp.getClientRects().length > 0)) {
          return inp;
        }
      }

      // 4. If exactly 2 ChatSection__Containers exist, the second one (index 1) is ALWAYS Team Chat
      if (sections.length >= 2) {
        const inp = sections[1].querySelector('textarea');
        if (inp && inp.isConnected && (inp.offsetParent !== null || inp.getClientRects().length > 0)) {
          return inp;
        }
      }

      // 5. Fallback: all visible textareas in ChatSidebar (strictly bottom one, NEVER top Room Chat)
      const allTextareas = Array.from(document.querySelectorAll('div[class*="ChatSidebar" i] textarea, textarea[enterkeyhint="send"]'))
        .filter(t => t.isConnected && (t.offsetParent !== null || t.getClientRects().length > 0));
      if (allTextareas.length >= 2) {
        return allTextareas[allTextareas.length - 1];
      }

      // If only 1 textarea is found, strictly verify it is NOT Room Chat
      if (allTextareas.length === 1) {
        const parentSec = allTextareas[0].closest('[class*="ChatSection__Container" i]');
        const headerText = parentSec?.querySelector('[class*="ChatSection__Header" i], h6')?.textContent || "";
        if (/ルーム|room\s*chat/i.test(headerText)) {
          console.warn("[Pathfinder] Only Room Chat input is found; aborting to avoid sending into global chat!");
          return null;
        }
        return allTextareas[0];
      }
    } catch (err) {
      console.warn("[Pathfinder] Error locating Team Chat input:", err);
    }

    return null;
  }

  let latestMatchRoomState = null;

  function isMatchWarmupActive() {
    return Array.from(document.querySelectorAll('button, a, div')).some(el => {
      const txt = (el.textContent || '').trim();
      return /CONNECT TO SERVER|サーバーに接続|サーバーへ接続|connect\s+[0-9]{1,3}\.[0-9]{1,3}|接続待機|Waiting for players/i.test(txt);
    });
  }

  function isMatchLiveOrFinished(matchData) {
    const state = String(matchData?.state || matchData?.status || latestMatchRoomState || "").toUpperCase();
    if (state === "FINISHED" || state === "CLOSED" || state === "CANCELLED") {
      return true;
    }
    // Detect finished match elements in DOM (buttons: Watch Demo / Return to matchmaking)
    const finishedButtons = Array.from(document.querySelectorAll('button, a')).find(el => {
      const txt = (el.textContent || '').trim();
      return /デモを見る|watch\s*demo|マッチメイキングへ戻る|return\s*to\s*matchmaking|back\s*to\s*matchmaking/i.test(txt);
    });
    if (finishedButtons) return true;

    // If warmup / connect phase is still active, match is NOT live yet (players still connecting)
    if (isMatchWarmupActive()) {
      return false;
    }

    if (state === "ONGOING") {
      return true;
    }

    // Detect live in-game match / knife round indicators in DOM
    const liveEl = document.querySelector('[class*="LiveIndicator"], [class*="Scoreboard"], [class*="MatchScore"], [class*="live-indicator"], [data-testid*="scoreboard"], span[class*="LiveBadge"]');
    if (liveEl) return true;
    return false;
  }

  function isMatchInLiveGame(matchData) {
    return isMatchLiveOrFinished(matchData);
  }

  function trySendLanguageNotice(matchId, force = false) {
    if (!isContextValid()) return;
    if (!force && !currentConfig.autoSendLanguageNotice) return;
    if (!matchId || matchId === "index" || matchId.length < 5) return;
    if (!force && sentLanguageNoticeRooms.has(matchId)) return;

    // NEVER auto-send into finished or live games! (Allow only when user manually clicks test: force === true)
    if (!force && isMatchLiveOrFinished()) {
      console.log(`[Pathfinder] Skipping auto language notice for match ${matchId}: match is already finished or live`);
      sentLanguageNoticeRooms.add(matchId);
      return;
    }

    let attempts = 0;
    if (langNoticeRetryTimer) clearInterval(langNoticeRetryTimer);

    langNoticeRetryTimer = setInterval(() => {
      attempts++;
      if (!isContextValid() || (!force && sentLanguageNoticeRooms.has(matchId))) {
        clearInterval(langNoticeRetryTimer);
        return;
      }

      if (!force && isMatchLiveOrFinished()) {
        clearInterval(langNoticeRetryTimer);
        sentLanguageNoticeRooms.add(matchId);
        return;
      }

      if (attempts > 80) {
        clearInterval(langNoticeRetryTimer);
        if (force) {
          makePanel({
            title: "⚠️ チャット入力欄が見つかりません / Chat Not Found",
            message: "チームチャット入力欄を検出できませんでした。右側のチームチャットが開いているか確認してください。",
            sub: "Could not find Team Chat input. Please ensure Team Chat is visible and try again.",
            buttonLabel: "OK"
          });
        }
        return;
      }

      if (!location.pathname.includes(matchId)) {
        clearInterval(langNoticeRetryTimer);
        return;
      }

      // Ensure sidebar is open, but NEVER toggle if already open
      ensureChatSidebarOpen();
      ensureTeamSectionExpanded();

      // Locate team chat textarea using EXT proven method
      const targetInput = findTeamChatInput();
      if (!targetInput) return;

      sentLanguageNoticeRooms.add(matchId);
      clearInterval(langNoticeRetryTimer);

      const msgText = currentConfig.languageNoticeText || "Hello team! English or Japanese please / 英語または日本語でお願いします";

      try {
        targetInput.focus();

        // 1. Direct React setter on prototype to update internal React state (same as EXT)
        const proto = targetInput instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
        if (descriptor && descriptor.set) {
          descriptor.set.call(targetInput, msgText);
        } else {
          targetInput.value = msgText;
        }

        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        targetInput.dispatchEvent(new Event("change", { bubbles: true }));

        // 2. Dispatch Enter keydown + keyup after brief delay (same as EXT)
        const triggerSend = () => {
          const enterDown = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          const enterUp = new KeyboardEvent("keyup", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          targetInput.dispatchEvent(enterDown);
          targetInput.dispatchEvent(enterUp);

          const form = targetInput.closest("form");
          if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        };

        setTimeout(() => {
          triggerSend();

          // Double check if value cleared after submit; retry if needed
          setTimeout(() => {
            if (targetInput.value && targetInput.value.length > 0) {
              triggerSend();
            }

            if (force) {
              makePanel({
                title: "💬 言語通知テスト成功 / Sent Successfully",
                message: "チームチャットへ「ロシア語不可」メッセージを自動送信しました！",
                sub: "Language notice has been successfully dispatched to Team Chat.",
                buttonLabel: "OK"
              });
            }
          }, 250);
        }, 100);
      } catch (err) {
        console.warn("[Pathfinder] Auto language notice dispatch error:", err);
      }
    }, 400);
  }

  // Live Room Chat Relay into Discord Webhook
  const relayedMessageSignatures = new Set();
  let chatObserver = null;
  let activeChatRelayMatchId = null;

  function stopChatRelay(reason) {
    if (chatObserver) {
      chatObserver.disconnect();
      chatObserver = null;
    }
    if (activeChatRelayMatchId) {
      console.log(`[Pathfinder] Room chat relay stopped for match ${activeChatRelayMatchId}: ${reason || "knife round/match started"}`);
    }
  }

  function extractMessageText(node) {
    try {
      const clone = node.cloneNode(true);
      // Remove author, nickname, timestamp, reactions, actions, avatar, svg, and img elements
      clone.querySelectorAll('[class*="nickName" i], [class*="nickname" i], [class*="author" i], [class*="sender" i], [class*="time" i], [class*="timestamp" i], [class*="messageActions" i], [class*="reaction" i], [data-message-actions="true"], time, img, svg, [class*="avatar" i]').forEach(el => el.remove());
      
      // Look for paragraph or content text (FACEIT uses span.RrW8Nq_messageText > div.paragraph)
      const contentEl = clone.querySelector('span[class*="messageText" i], div[class*="paragraph" i], [class*="contentStack" i], p, [class*="message-body" i], [class*="text-message" i], [class*="content" i]');
      let text = contentEl ? contentEl.textContent.trim() : clone.textContent.trim();
      text = text.replace(/^[\s\u200B-\u200D\uFEFF]+|[\s\u200B-\u200D\uFEFF]+$/g, "");
      
      // Strictly reject if text is only a timestamp (e.g. "23:03" or "11:05 PM")
      if (/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?$/i.test(text)) {
        return "";
      }
      return text;
    } catch {
      return "";
    }
  }

  function initChatRelay(matchId) {
    if (!isContextValid()) return;
    if (!currentConfig.enableDiscordAlerts || !currentConfig.discordWebhookUrl || !currentConfig.discordRelayRoomChat) {
      stopChatRelay("Chat relay disabled");
      return;
    }

    if (!matchId || matchId === "index" || matchId.length < 5) return;
    if (isMatchInLiveGame()) {
      stopChatRelay("Match already live/knife round started");
      return;
    }

    if (activeChatRelayMatchId === matchId && chatObserver) return;
    activeChatRelayMatchId = matchId;

    if (chatObserver) {
      chatObserver.disconnect();
      chatObserver = null;
    }

    function scanAndRelayMessages(isInitial) {
      if (!isContextValid()) return;
      if (!currentConfig.enableDiscordAlerts || !currentConfig.discordWebhookUrl || !currentConfig.discordRelayRoomChat) {
        stopChatRelay("Chat relay disabled in config");
        return;
      }

      // Automatically halt chat relay once knife round or live match starts
      if (isMatchInLiveGame()) {
        stopChatRelay("Knife round / live match started");
        return;
      }

      const { id: myId, nick: myNick } = getCurrentUserInfo();
      const myLowerNick = (myNick || "").toLowerCase();

      const msgNodes = document.querySelectorAll(
        'div[class*="messageItem" i], div[class*="message-item" i], div[class*="MessagePreContainer" i], div[class*="Message__Container" i], div[class*="ChatMessage" i], div[class*="MessageRow" i], li[class*="message" i]'
      );
      if (!msgNodes || msgNodes.length === 0) return;

      for (const node of msgNodes) {
        // 1. Check if node is user's own message
        const isSelfNode = node.matches('[class*="self" i], [class*="own" i], [class*="outgoing" i], [class*="is-me" i], [data-is-me="true"]') ||
                           !!node.querySelector('[class*="self" i], [class*="own" i], [class*="outgoing" i], [class*="is-me" i]');
        if (isSelfNode) continue;

        const senderEl = node.querySelector(
          'a[class*="nickName" i], [class*="nickName" i], [class*="nickname" i], [class*="author" i], [class*="sender" i], a[class*="name" i], span[class*="Sender" i]'
        );
        if (!senderEl) continue;

        let sender = senderEl.textContent.trim();
        // Remove any trailing time from sender (e.g. "n4n4 23:03" -> "n4n4")
        sender = sender.replace(/\s*\d{1,2}:\d{2}.*$/, "").trim();
        if (!sender) continue;

        // Filter out own messages by nickname
        if (myLowerNick && sender.toLowerCase() === myLowerNick) continue;
        if (cachedMyNick && sender.toLowerCase() === cachedMyNick.toLowerCase()) continue;

        // Extract real message text (excludes timestamp)
        const text = extractMessageText(node);
        if (!text) continue;

        const sig = `${matchId}:${sender}:${text}`;
        if (relayedMessageSignatures.has(sig)) continue;
        relayedMessageSignatures.add(sig);

        // On initial scan when opening room, only record existing messages to prevent old history replay
        if (isInitial) continue;

        // Relay teammate message to Discord webhook
        safeSendMessage({
          type: "SEND_DISCORD_WEBHOOK",
          url: currentConfig.discordWebhookUrl,
          payload: {
            username: "Pathfinder • Team Chat",
            content: `💬 **[FACEIT Team Chat] ${sender}:** ${text}`,
            allowed_mentions: { parse: [] }
          }
        });
      }
    }

    // Initial indexing of existing history
    scanAndRelayMessages(true);

    chatObserver = new MutationObserver(() => {
      scanAndRelayMessages(false);
    });

    try {
      chatObserver.observe(document.body, { childList: true, subtree: true });
    } catch {}
  }

  // --- Discord Inbound Bridge (Discord ➔ FACEIT Team Chat) ---
  let inboundBridgeTimer = null;
  let lastHandledDiscordMsgId = null;
  let activeInboundMatchId = null;
  let isCheckingDiscordInbound = false;

  function sanitizeDiscordInboundMessage(text) {
    if (!text) return "";
    // 1. Remove Discord custom emojis <:name:id> or <a:name:id>
    let clean = text.replace(/<a?:[a-zA-Z0-9_~]+:\d+>/g, "");
    // 2. Remove standard Unicode emojis and pictographs
    clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, "");
    // 3. Normalize horizontal whitespace per line (keep \n)
    clean = clean.replace(/[^\S\r\n]+/g, " ");
    // 4. Collapse 3+ newlines into single newline
    clean = clean.replace(/(\r?\n){2,}/g, "\n");
    return clean.trim();
  }

  function splitIntoChatChunks(text, maxLen = 180) {
    if (!text) return [];
    // If entire message fits within maxLen, keep all newlines intact in a single message!
    if (text.length <= maxLen) {
      return [text];
    }

    // Only split if exceeding maxLen
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }

      // Try to break at a newline first within maxLen
      let breakIdx = remaining.lastIndexOf("\n", maxLen);
      if (breakIdx <= 0) {
        // Fallback: try to break at space
        breakIdx = remaining.lastIndexOf(" ", maxLen);
      }
      if (breakIdx <= 0) {
        // Hard cut if no newline or space found
        breakIdx = maxLen;
      }

      chunks.push(remaining.slice(0, breakIdx).trim());
      remaining = remaining.slice(breakIdx).trim();
    }

    return chunks.filter(Boolean);
  }

  async function sendTextToTeamChat(msgText) {
    let targetInput = findTeamChatInput();
    if (!targetInput) {
      console.log("[Pathfinder Discord Bridge] Team chat input not found, opening sidebar and expanding Team Chat...");
      ensureChatSidebarOpen();
      await new Promise(r => setTimeout(r, 200));
      ensureTeamSectionExpanded();
      await new Promise(r => setTimeout(r, 200));

      // Retry up to 5 times (total ~1.5s) to allow React to mount the textarea
      for (let attempt = 1; attempt <= 5; attempt++) {
        targetInput = findTeamChatInput();
        if (targetInput) break;
        ensureTeamSectionExpanded();
        await new Promise(r => setTimeout(r, 250));
      }
    }

    if (!targetInput) {
      console.warn("[Pathfinder Discord Bridge] Team chat input still not found after opening attempts!");
      return false;
    }

    dismissEmojiPicker();

    try {
      targetInput.focus();

      // Try insertText first (works best with React / draft / contenteditable)
      let inserted = false;
      try {
        inserted = document.execCommand('insertText', false, msgText);
      } catch {}

      if (!inserted || targetInput.value !== msgText) {
        const proto = targetInput instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
        if (descriptor && descriptor.set) {
          descriptor.set.call(targetInput, msgText);
        } else {
          targetInput.value = msgText;
        }
      }

      targetInput.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      targetInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

      await new Promise(r => setTimeout(r, 100));

      const enterDown = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      const enterUp = new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      targetInput.dispatchEvent(enterDown);
      targetInput.dispatchEvent(enterUp);

      return true;
    } catch (err) {
      console.warn("[Pathfinder] Failed to send inbound Discord text to team chat:", err);
      return false;
    }
  }

  const inboundSendQueue = [];
  const processedInboundMsgIds = new Set();
  let isProcessingInboundQueue = false;

  async function enqueueInboundDiscordMessage(msg) {
    if (!msg || !msg.id) return;
    if (processedInboundMsgIds.has(msg.id)) {
      console.log(`[Pathfinder Discord Bridge] Duplicate message ignored: ${msg.id}`);
      return;
    }
    processedInboundMsgIds.add(msg.id);
    if (processedInboundMsgIds.size > 200) {
      const first = processedInboundMsgIds.values().next().value;
      processedInboundMsgIds.delete(first);
    }

    inboundSendQueue.push(msg);
    if (isProcessingInboundQueue) return;
    isProcessingInboundQueue = true;

    while (inboundSendQueue.length > 0) {
      const current = inboundSendQueue.shift();
      const rawContent = current.content || "";
      if (!rawContent) {
        console.warn("[Pathfinder Discord Bridge] Empty message text received!");
        continue;
      }

      const cleanText = sanitizeDiscordInboundMessage(rawContent);
      if (!cleanText) {
        console.log("[Pathfinder Discord Bridge] Inbound message ignored (only emojis):", rawContent);
        continue;
      }

      const chunks = splitIntoChatChunks(cleanText, 160);
      if (chunks.length === 0) continue;

      let allChunksSent = true;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const finalMessage = currentConfig.discordInboundTagPrefix ? `[Discord] ${chunk}` : chunk;
        console.log(`%c[Pathfinder Discord Bridge] Typing chunk ${i + 1}/${chunks.length} into Team Chat:`, "color: #4ade80; font-weight: bold;", finalMessage);
        const sent = await sendTextToTeamChat(finalMessage);

        if (sent) {
          console.log(`[Pathfinder] Inbound Discord message chunk sent to Team Chat: "${finalMessage}"`);
        } else {
          allChunksSent = false;
        }

        // Delay between chunks to let FACEIT register each message independently
        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 450));
        }
      }

      if (allChunksSent) {
        if (currentConfig.discordBotToken && current.channel_id && current.id) {
          safeSendMessage({
            type: "ADD_DISCORD_REACTION",
            channelId: current.channel_id,
            messageId: current.id,
            botToken: currentConfig.discordBotToken
          });
        }
        makePanel({
          title: "💬 Discord ➔ Team Chat",
          message: chunks.join("\n"),
          sub: `From Discord (${current.author?.username || "You"})${chunks.length > 1 ? ` (${chunks.length} msgs)` : ""}`,
          buttonLabel: "OK"
        });
      }

      // Pause 400ms between consecutive messages to ensure FACEIT processes each without overlap
      await new Promise(r => setTimeout(r, 400));
    }

    isProcessingInboundQueue = false;
  }

  let inboundTestModeExpiry = 0;
  let isGatewayActive = false;

  function stopDiscordInboundBridge(reason) {
    if (Date.now() < inboundTestModeExpiry && !String(reason).includes("disabled") && !String(reason).includes("missing")) {
      // Keep running during explicit 60s manual test even if room is finished or state changed
      return;
    }
    isGatewayActive = false;
    if (inboundBridgeTimer) {
      clearInterval(inboundBridgeTimer);
      inboundBridgeTimer = null;
    }
    safeSendMessage({ type: "STOP_DISCORD_GATEWAY" });
    if (activeInboundMatchId) {
      console.log(`[Pathfinder] Discord inbound bridge stopped for match ${activeInboundMatchId}: ${reason || "knife round/finished"}`);
      activeInboundMatchId = null;
    }
  }

  function initDiscordInboundBridge(matchId, force = false) {
    if (!isContextValid()) return;
    const isForce = force || (Date.now() < inboundTestModeExpiry);
    if (!isForce && (!currentConfig.enableDiscordInbound || !currentConfig.discordBotToken || !currentConfig.discordBotChannelId)) {
      stopDiscordInboundBridge("Discord inbound disabled in config");
      return;
    }
    if (!matchId || matchId === "index" || matchId.length < 5) return;
    if (!isForce && isMatchInLiveGame()) {
      stopDiscordInboundBridge("Match already live or knife round");
      return;
    }
    // Prevent reconnect loop if already active for this match
    if (activeInboundMatchId === matchId && isGatewayActive) return;

    activeInboundMatchId = matchId;
    isGatewayActive = true;

    const botToken = currentConfig.discordBotToken?.trim();
    const channelId = currentConfig.discordBotChannelId?.trim();
    const allowedAuthorId = (currentConfig.discordBotAuthorId || "").trim();

    if (!botToken || !channelId) {
      console.warn("[Pathfinder Discord Bridge] Missing botToken or channelId:", { hasToken: !!botToken, hasChannel: !!channelId });
      stopDiscordInboundBridge("Token or Channel ID missing");
      return;
    }

    // Connect Discord WebSocket Gateway for real-time instant push (0 HTTP requests!)
    safeSendMessage({
      type: "START_DISCORD_GATEWAY",
      botToken,
      channelId,
      allowedAuthorId
    });

    console.log(`%c[Pathfinder Discord Bridge] GATEWAY ACTIVE for match ${matchId} in channel ${channelId}${force ? " (TEST FORCE MODE)" : ""}`, "color: #93c5fd; font-weight: bold;");
  }

  let lastCheckedRoomPath = "";
  function checkMatchRoomUrl() {
    if (!isContextValid()) return;
    const currentPath = location.pathname;

    const match = currentPath.match(/\/room\/([a-zA-Z0-9-]+)/i);
    if (match && match[1]) {
      const matchId = match[1];
      if (matchId !== "index" && matchId.length >= 5) {
        if (activeChatRelayMatchId && activeChatRelayMatchId !== matchId) {
          stopChatRelay("Switched match room");
          stopDiscordInboundBridge("Switched match room");
          latestMatchRoomState = null;
        }
        trySendLanguageNotice(matchId);
        initChatRelay(matchId);
        initDiscordInboundBridge(matchId);
      }
    } else {
      if (chatObserver || inboundBridgeTimer) {
        stopChatRelay("Left match room");
        stopDiscordInboundBridge("Left match room");
        latestMatchRoomState = null;
      }
    }

    if (currentPath === lastCheckedRoomPath) return;

    if (match && match[1]) {
      lastCheckedRoomPath = currentPath;
      const matchId = match[1];
      if (matchId === "index" || matchId.length < 5) return;
      processMatchRoom(matchId);
    }
  }

  let lastPromptedVetoRound = null;
  let activeSimulation = null;

  function startFullVetoSimulation() {
    const existing = document.getElementById("pathfinder-veto-test-arena");
    if (existing) existing.remove();
    activeSimulation = null;

    const ALL_MAPS = [
      { name: "Dust2", class_name: "de_dust2" },
      { name: "Mirage", class_name: "de_mirage" },
      { name: "Inferno", class_name: "de_inferno" },
      { name: "Nuke", class_name: "de_nuke" },
      { name: "Ancient", class_name: "de_ancient" },
      { name: "Anubis", class_name: "de_anubis" },
      { name: "Vertigo", class_name: "de_vertigo" },
      { name: "Cache", class_name: "de_cache" }
    ];
    const totalRounds = ALL_MAPS.length - 1;

    const overlay = document.createElement("div");
    overlay.id = "pathfinder-veto-test-arena";
    overlay.setAttribute("data-phase", "full-sim");
    overlay.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 540px;
      max-width: 92vw;
      background: #0d121f;
      border: 1px solid #3b2a59;
      border-radius: 14px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85);
      padding: 16px 20px;
      z-index: 2147483640;
      color: #f8fafc;
      font-family: "Hiragino Sans", "Yu Gothic UI", "Meiryo", Arial, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div>
          <div style="font-size: 14px; font-weight: 800; color: #c084fc; display: flex; align-items: center; gap: 6px;">
            <span>🎮</span> FACEIT Match Veto Simulation
          </div>
          <div id="pathfinder-sim-status" style="font-size: 11px; color: #a78bfa; margin-top: 2px; font-weight: 700;">
            ⚔️ [Round 1/${totalRounds}] あなたのBAN番です！Discordでマップを選択してください
          </div>
        </div>
        <button id="pathfinder-close-test-arena" type="button" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 2px 6px; line-height: 1;">✕</button>
      </div>
      <div id="pathfinder-arena-cards" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector("#pathfinder-close-test-arena");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        activeSimulation = null;
        overlay.remove();
      });
    }

    const cardsContainer = overlay.querySelector("#pathfinder-arena-cards");
    const cardElements = new Map();

    ALL_MAPS.forEach(m => {
      const card = document.createElement("div");
      card.className = "VoteEntity pathfinder-mock-card";
      card.setAttribute("data-testid", `vote-entity-${m.class_name}`);
      card.style.cssText = `
        background: #182035;
        border: 1px solid #2d3b5e;
        border-radius: 8px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        transition: all 0.25s ease;
      `;

      card.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: #f8fafc; letter-spacing: 0.5px;">${m.name.toUpperCase()}</div>
        <button type="button" class="pathfinder-mock-ban-btn" style="
          background: #ef4444;
          border: none;
          color: #ffffff;
          padding: 4px 8px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          text-align: center;
          transition: background 0.15s;
        ">BAN</button>
      `;

      cardsContainer.appendChild(card);
      cardElements.set(m.class_name, card);
    });

    activeSimulation = {
      round: 1,
      totalRounds,
      remaining: [...ALL_MAPS],
      isMyTurn: true,
      cardElements,
      statusEl: overlay.querySelector("#pathfinder-sim-status")
    };

    safeSendMessage({
      type: "SEND_DISCORD_VETO_PROMPT",
      channelId: currentConfig.discordBotChannelId,
      botToken: currentConfig.discordBotToken,
      matchId: "sim-match",
      phase: "map",
      entities: activeSimulation.remaining
    });
  }

  function handleSimulationBan(name, className) {
    if (!activeSimulation || !activeSimulation.isMyTurn) return false;

    const raw = (className || name || "").toLowerCase();
    const clean = raw.replace(/^de_/i, "");
    const foundIdx = activeSimulation.remaining.findIndex(m => {
      return m.class_name.toLowerCase().includes(clean) || m.name.toLowerCase().includes(clean);
    });
    if (foundIdx === -1) return false;

    const bannedMap = activeSimulation.remaining[foundIdx];
    activeSimulation.remaining.splice(foundIdx, 1);
    activeSimulation.isMyTurn = false;

    const card = activeSimulation.cardElements.get(bannedMap.class_name);
    if (card) {
      card.style.background = "#2b1115";
      card.style.borderColor = "#ef4444";
      card.style.opacity = "0.45";
      const btn = card.querySelector("button");
      if (btn) {
        btn.textContent = "BAN (YOU) 🚫";
        btn.disabled = true;
        btn.style.background = "#450a0a";
        btn.style.cursor = "not-allowed";
      }
    }

    makePanel({
      title: "🚫 FACEIT Veto (Discord Remote)",
      message: `${bannedMap.name.toUpperCase()} をBANしました！ / Banned!`,
      sub: "RePeek DOM click 成功 (シミュレーション)",
      buttonLabel: "OK"
    });

    if (activeSimulation.remaining.length <= 1) {
      finishSimulation();
      return true;
    }

    activeSimulation.round++;
    if (activeSimulation.statusEl) {
      activeSimulation.statusEl.textContent = `⏳ [Round ${activeSimulation.round}/${activeSimulation.totalRounds}] 相手チームがBAN中... / Opponent is thinking...`;
      activeSimulation.statusEl.style.color = "#f59e0b";
    }

    setTimeout(() => {
      if (!activeSimulation || activeSimulation.remaining.length <= 1) return;

      const oppIdx = Math.floor(Math.random() * activeSimulation.remaining.length);
      const oppBanned = activeSimulation.remaining[oppIdx];
      activeSimulation.remaining.splice(oppIdx, 1);

      const oppCard = activeSimulation.cardElements.get(oppBanned.class_name);
      if (oppCard) {
        oppCard.style.background = "#241829";
        oppCard.style.borderColor = "#a855f7";
        oppCard.style.opacity = "0.45";
        const btn = oppCard.querySelector("button");
        if (btn) {
          btn.textContent = "BAN (ENEMY) 🚫";
          btn.disabled = true;
          btn.style.background = "#3b1740";
          btn.style.cursor = "not-allowed";
        }
      }

      if (activeSimulation.remaining.length <= 1) {
        finishSimulation();
        return;
      }

      activeSimulation.round++;
      activeSimulation.isMyTurn = true;
      if (activeSimulation.statusEl) {
        activeSimulation.statusEl.textContent = `⚔️ [Round ${activeSimulation.round}/${activeSimulation.totalRounds}] あなたのBAN番です！残り${activeSimulation.remaining.length}マップ`;
        activeSimulation.statusEl.style.color = "#a78bfa";
      }

      safeSendMessage({
        type: "SEND_DISCORD_VETO_PROMPT",
        channelId: currentConfig.discordBotChannelId,
        botToken: currentConfig.discordBotToken,
        matchId: "sim-match",
        phase: "map",
        entities: activeSimulation.remaining
      });
    }, 2500);

    return true;
  }

  function finishSimulation() {
    if (!activeSimulation) return;
    const decided = activeSimulation.remaining[0];
    if (decided) {
      const winCard = activeSimulation.cardElements.get(decided.class_name);
      if (winCard) {
        winCard.style.background = "linear-gradient(135deg, #1e293b, #0f3d64)";
        winCard.style.borderColor = "#38bdf8";
        winCard.style.boxShadow = "0 0 20px rgba(56, 189, 248, 0.6)";
        winCard.style.opacity = "1";
        const btn = winCard.querySelector("button");
        if (btn) {
          btn.textContent = "🏆 DECIDED";
          btn.disabled = true;
          btn.style.background = "#0284c7";
          btn.style.cursor = "default";
        }
      }
      if (activeSimulation.statusEl) {
        activeSimulation.statusEl.textContent = `🏆 決定マップ: ${decided.name.toUpperCase()} (シミュレーション完了)`;
        activeSimulation.statusEl.style.color = "#38bdf8";
      }

      makePanel({
        title: "🏆 FACEIT Veto 完了 / Simulation Finished",
        message: `決定マップ: ${decided.name.toUpperCase()}`,
        sub: "全ラウンドのDiscordリモートVetoが正常に完了しました！",
        buttonLabel: "OK"
      });

      safeSendMessage({
        type: "SEND_DISCORD_BOT_MESSAGE",
        channelId: currentConfig.discordBotChannelId,
        botToken: currentConfig.discordBotToken,
        content: `🏆 **[FACEIT Veto 完了 / Simulation Finished]**\n決定マップ / Decided Map: **${decided.name.toUpperCase()}**\n*全ラウンドのDiscordリモート操作テストが成功しました！*`
      });
    }
  }

  function spawnVetoTestArena(phase = "map") {
    const existing = document.getElementById("pathfinder-veto-test-arena");
    if (existing) {
      if (existing.getAttribute("data-phase") !== phase) {
        existing.remove();
      } else {
        return;
      }
    }

    const isLocation = phase === "location";
    const overlay = document.createElement("div");
    overlay.id = "pathfinder-veto-test-arena";
    overlay.setAttribute("data-phase", phase);
    overlay.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 480px;
      max-width: 90vw;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.75);
      padding: 16px 18px;
      z-index: 2147483640;
      color: #f8fafc;
      font-family: "Hiragino Sans", "Yu Gothic UI", "Meiryo", Arial, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: ${isLocation ? "#38bdf8" : "#ff5500"}; display: flex; align-items: center; gap: 6px;">
            <span>${isLocation ? "🌐" : "🎯"}</span> FACEIT ${isLocation ? "Server" : "Map"} Veto Live Test Arena
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            DiscordのBANボタンを押すと、この画面上のカードがDOMイベントで実際にBANされます
          </div>
        </div>
        <button id="pathfinder-close-test-arena" type="button" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 2px 6px; line-height: 1;">✕</button>
      </div>
      <div id="pathfinder-arena-cards" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector("#pathfinder-close-test-arena");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => overlay.remove());
    }

    const cardsContainer = overlay.querySelector("#pathfinder-arena-cards");
    const testEntities = isLocation ? [
      { name: "Germany", class_name: "germany" },
      { name: "Finland", class_name: "finland" },
      { name: "Sweden", class_name: "sweden" },
      { name: "Singapore", class_name: "singapore" }
    ] : [
      { name: "Dust2", class_name: "de_dust2" },
      { name: "Mirage", class_name: "de_mirage" },
      { name: "Cache", class_name: "de_cache" },
      { name: "Nuke", class_name: "de_nuke" }
    ];

    testEntities.forEach(m => {
      const card = document.createElement("div");
      card.className = "VoteEntity pathfinder-mock-card";
      card.setAttribute("data-testid", `vote-entity-${m.class_name}`);
      card.style.cssText = `
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      `;

      card.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #f8fafc; letter-spacing: 0.5px;">${m.name.toUpperCase()}</div>
        <button type="button" class="pathfinder-mock-ban-btn" style="
          background: #ef4444;
          border: none;
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          text-align: center;
          transition: background 0.15s;
        ">BAN</button>
      `;

      const btn = card.querySelector("button");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        card.style.background = "#2b1115";
        card.style.borderColor = "#7f1d1d";
        card.style.opacity = "0.45";
        btn.textContent = "BANNED 🚫";
        btn.disabled = true;
        btn.style.background = "#450a0a";
        btn.style.cursor = "not-allowed";
        console.log(`%c[Pathfinder Veto Test] Mock card ${m.name} clicked & banned via DOM!`, "color: #4ade80; font-weight: bold;");
      });

      cardsContainer.appendChild(card);
    });

    setTimeout(() => {
      if (overlay.isConnected) {
        overlay.style.transition = "opacity 0.5s ease";
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 500);
      }
    }, 60000);
  }

  function executeVetoBanInDom(entityName, entityClassName, phase) {
    const rawTarget = (entityName || entityClassName || "").trim();
    if (!rawTarget) return false;

    const cleanName = rawTarget.replace(/^de_/i, "").toLowerCase();
    const cleanClass = (entityClassName || "").replace(/^de_/i, "").toLowerCase();

    console.log(`[Pathfinder Veto] Searching DOM to ban: cleanName="${cleanName}", cleanClass="${cleanClass}"`);

    function triggerRealisticClick(el) {
      if (!el) return;
      el.focus?.();
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      el.click();
    }

    function findAndClickCard() {
      // 1. Look for cards matching name or class_name
      const candidates = Array.from(document.querySelectorAll(
        '[class*="VoteEntity" i], [class*="vote-entity" i], [class*="VetoEntity" i], [class*="VoteCard" i], [data-testid*="vote" i], [data-testid*="entity" i], div[class*="Card" i]'
      ));

      for (const card of candidates) {
        const cardText = (card.textContent || "").toLowerCase();
        const testId = (card.getAttribute("data-testid") || "").toLowerCase();
        const className = (card.className || "").toString().toLowerCase();

        const isMatch = (cleanName && cardText.includes(cleanName)) ||
                        (cleanClass && (testId.includes(cleanClass) || className.includes(cleanClass)));
        if (!isMatch) continue;

        // Skip already disabled/banned cards
        if (card.matches('[disabled], [class*="disabled" i], [class*="banned" i], [class*="dropped" i], [aria-disabled="true"]')) {
          continue;
        }

        // Check if there is an explicit Ban button inside the card
        const banBtn = card.querySelector('button, [role="button"], [class*="Button" i]');
        if (banBtn && !banBtn.disabled) {
          console.log(`[Pathfinder Veto] Found ban button inside card for ${rawTarget}:`, banBtn);
          triggerRealisticClick(banBtn);
          return true;
        }

        // Otherwise click the card itself
        console.log(`[Pathfinder Veto] Clicking candidate card for ${rawTarget}:`, card);
        triggerRealisticClick(card);
        return true;
      }

      // 2. Fallback: Search all visible buttons by text
      const allButtons = Array.from(document.querySelectorAll('button')).filter(b => {
        return b.offsetParent !== null && !b.disabled && !isButtonExcluded(b);
      });

      for (const b of allButtons) {
        const text = (b.textContent || "").toLowerCase();
        if ((cleanName && text.includes(cleanName)) || (cleanClass && text.includes(cleanClass))) {
          console.log(`[Pathfinder Veto] Clicking fallback button for ${rawTarget}:`, b);
          triggerRealisticClick(b);
          return true;
        }
      }

      return false;
    }

    // Try finding card in page
    let found = findAndClickCard();
    if (!found && (!location.pathname.includes("/room/") || !document.getElementById("pathfinder-veto-test-arena"))) {
      // If not in a live match, spawn the live test arena and click the mock card
      spawnVetoTestArena(phase || "map");
      found = findAndClickCard();
    }

    if (!found) {
      console.log(`[Pathfinder Veto] Could not find clickable card or button for: ${rawTarget}`);
    }
    return found;
  }

  function checkVetoStatus(matchData) {
    if (!isContextValid()) return;
    if (!currentConfig.enableDiscordVeto) return;
    if (!currentConfig.discordBotToken || !currentConfig.discordBotChannelId) return;

    const voting = matchData?.voting;
    if (!voting) return;

    const state = String(matchData?.state || matchData?.status || "").toUpperCase();
    if (state !== "VOTING" && !voting.voter) return;

    const matchId = matchData?.id || matchData?.match_id;
    if (!matchId) return;

    const { id: myId, nick: myNick } = getCurrentUserInfo();
    const f1 = matchData?.teams?.faction1;
    const f2 = matchData?.teams?.faction2;
    const f1Roster = f1?.roster || [];
    const f2Roster = f2?.roster || [];

    const f1HasMe = f1Roster.some(p => (myId && (p.id === myId || p.guid === myId)) || (myNick && p.nickname?.toLowerCase() === myNick.toLowerCase()));
    const f2HasMe = f2Roster.some(p => (myId && (p.id === myId || p.guid === myId)) || (myNick && p.nickname?.toLowerCase() === myNick.toLowerCase()));
    if (!f1HasMe && !f2HasMe) return;

    const myFaction = f1HasMe ? "faction1" : "faction2";
    const myTeam = f1HasMe ? f1 : f2;

    // Check if current voter matches our team or our user ID
    const currentVoter = voting.voter;
    const isOurTurn = (currentVoter === myFaction || currentVoter === myId || currentVoter === myTeam?.leader);
    if (!isOurTurn) return;

    // Determine current voting phase: location or map
    let phase = null;
    let availableEntities = [];

    // Check location phase first (if entities present and not yet picked)
    if (voting.location && Array.isArray(voting.location.entities) && voting.location.entities.length > 1 && (!voting.location.pick || voting.location.pick.length === 0)) {
      const dropped = new Set(voting.location.drop || []);
      const remaining = voting.location.entities.filter(e => !dropped.has(e.class_name) && !dropped.has(e.name) && !dropped.has(e.guid));
      if (remaining.length > 1) {
        phase = "location";
        availableEntities = remaining;
      }
    }

    // Check map phase
    if (!phase && voting.map && Array.isArray(voting.map.entities) && voting.map.entities.length > 1 && (!voting.map.pick || voting.map.pick.length === 0)) {
      const dropped = new Set(voting.map.drop || []);
      const remaining = voting.map.entities.filter(e => !dropped.has(e.class_name) && !dropped.has(e.name) && !dropped.has(e.guid));
      if (remaining.length > 1) {
        phase = "map";
        availableEntities = remaining;
      }
    }

    if (!phase || availableEntities.length <= 1) return;

    // Unique round signature: matchId + phase + remaining entities count/names
    const roundSig = `${matchId}:${phase}:${availableEntities.map(e => e.class_name || e.name).sort().join(",")}`;
    if (lastPromptedVetoRound === roundSig) return;
    lastPromptedVetoRound = roundSig;

    console.log(`%c[Pathfinder Veto] It is our turn to ban ${phase}! Available:`, "color: #f43f5e; font-weight: bold;", availableEntities.map(e => e.name || e.class_name));

    safeSendMessage({
      type: "SEND_DISCORD_VETO_PROMPT",
      matchId,
      phase,
      entities: availableEntities,
      channelId: currentConfig.discordBotChannelId,
      botToken: currentConfig.discordBotToken
    });
  }

  function handleMatchRoomDetailsEvent(e) {
    if (!e.detail) return;
    const mData = e.detail?.payload || e.detail;
    const state = String(mData?.state || mData?.status || "").toUpperCase();
    if (state) {
      latestMatchRoomState = state;
    }
    if (isMatchInLiveGame(mData)) {
      stopChatRelay("Match state is " + state);
      stopDiscordInboundBridge("Match state is " + state);
    }
    checkVetoStatus(mData);
    processMatchRoom(e.detail);
    const mId = mData?.id || mData?.match_id;
    if (mId) checkServerIpNotification(mId, mData);
  }

  window.addEventListener("popstate", checkMatchRoomUrl);
  window.addEventListener("pathfinder:match-room-details", handleMatchRoomDetailsEvent);
  document.addEventListener("pathfinder:match-room-details", handleMatchRoomDetailsEvent);

  let lastVetoPollTime = 0;
  function pollVetoStatusIfNeeded(matchId) {
    if (!currentConfig.enableDiscordVeto || !currentConfig.discordBotToken || !currentConfig.discordBotChannelId) return;
    if (Date.now() - lastVetoPollTime < 2500) return;
    lastVetoPollTime = Date.now();
    try {
      chrome.runtime.sendMessage({ type: "FETCH_MATCH_DETAILS", matchId }, (res) => {
        if (res?.ok && res?.data) {
          checkVetoStatus(res.data);
        }
      });
    } catch {}
  }

  // Periodic poll to maintain queue state
  const pollInterval = setInterval(() => {
    if (!isContextValid()) {
      clearInterval(pollInterval);
      return;
    }

    checkMatchRoomUrl();

    // Check if live match / knife round has begun to immediately halt chat relay
    if ((chatObserver || inboundBridgeTimer) && isMatchInLiveGame() && Date.now() >= inboundTestModeExpiry) {
      stopChatRelay("Knife round / live match detected via poll");
      stopDiscordInboundBridge("Knife round / live match detected via poll");
    }

    const roomMatch = location.pathname.match(/\/(?:cs2|csgo)?\/?room\/([a-zA-Z0-9-]+)/i);
    if (roomMatch && roomMatch[1] && roomMatch[1] !== "index") {
      pollVetoStatusIfNeeded(roomMatch[1]);
      // Check for Server Connect IP if option is enabled (fallback via DOM or active room)
      if (currentConfig.enableDiscordAlerts && currentConfig.discordWebhookUrl && currentConfig.discordNotifyServerIp) {
        checkServerIpNotification(roomMatch[1], null);
      }
    }

    // 1. Check if match ready (Accept button on screen)
    const acceptBtn = document.querySelector('button[data-testid*="accept" i], [aria-label*="accept" i]');
    if (acceptBtn && acceptBtn.getBoundingClientRect().width > 0) {
      stopQueueTimer();
      triggerMatchFoundDiscord();
      return;
    }

    // During cancellation cooldown, do NOT auto-start queue timer!
    if (Date.now() < cancelCooldownUntil) {
      return;
    }

    const inQueue = isFaceitInQueue();
    if (queueStartTime === null) {
      if (inQueue) {
        startQueueTimer();
      }
    } else {
      // While timer is running, if queue is no longer active (after 2.5s initial grace period)
      if (!inQueue && (Date.now() - queueStartTime) > 2500) {
        stopQueueTimer();
      }
    }
  }, 1000);

  // Cross-world event listeners (listening on both document and window)
  function handleQueueStatus(e) {
    if (!isContextValid()) return;
    const state = e.detail?.state;
    const matchId = e.detail?.payload?.match_id || e.detail?.payload?.booking?.match_id;
    if (matchId) {
      if (document.documentElement) {
        document.documentElement.dataset.pathfinderAcceptedMatchId = matchId;
      }
      processMatchRoom(e.detail?.payload || matchId);
    }
    if (state === "SEARCHING" && Date.now() >= cancelCooldownUntil) startQueueTimer();
    if (state === "MATCH_FOUND") {
      stopQueueTimer();
      triggerMatchFoundDiscord();
    } else if (state === "IDLE") {
      stopQueueTimer();
    }
  }
  window.addEventListener(QUEUE_STATUS_EVENT, handleQueueStatus);
  document.addEventListener(QUEUE_STATUS_EVENT, handleQueueStatus);

  function makePanel({ title, message, sub = "", kind = "notice", buttonLabel = "OK", linkUrl = "", linkLabel = "", onAction = null }) {
    // Keep stack clean: remove older panels so only 1 notification is visible at a time
    while (stack.children.length >= 1) {
      stack.firstChild.remove();
    }

    const panel = document.createElement("section");
    panel.className = `panel ${kind}`;
    panel.setAttribute("role", "status");
    const img = document.createElement("img");
    const assetUrl = safeGetAssetUrl("pathfinder-upper.png");
    if (assetUrl) {
      img.src = assetUrl;
    }
    img.alt = "Pathfinder";
    const copy = document.createElement("div");
    copy.className = "copy";
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "PATHFINDER";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const body = document.createElement("p");
    body.textContent = message;
    copy.append(eyebrow, heading, body);
    if (sub) {
      const small = document.createElement("p");
      small.className = "sub";
      small.textContent = sub;
      copy.append(small);
    }
    const close = document.createElement("button");
    close.className = "close";
    close.type = "button";
    close.setAttribute("aria-label", "閉じる / Close");
    close.textContent = "×";
    const dismiss = () => panel.remove();
    close.addEventListener("click", dismiss);

    const actions = document.createElement("div");
    actions.className = "actions";
    if (linkUrl && linkLabel) {
      const link = document.createElement("a");
      link.className = "btn primary";
      link.href = linkUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = linkLabel;
      actions.append(link);
    }
    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = buttonLabel;
    ok.addEventListener("click", () => {
      dismiss();
      if (typeof onAction === "function") onAction();
    });
    actions.append(ok);

    copy.append(actions);
    panel.append(img, copy, close);
    stack.append(panel);

    // Auto-dismiss after 6 seconds to prevent stacking
    setTimeout(() => {
      if (panel.parentNode) panel.remove();
    }, 6000);

    return panel;
  }

  function compareVersions(a, b) {
    const pa = String(a).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
    const pb = String(b).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const na = pa[i] ?? 0;
      const nb = pb[i] ?? 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  function showUpdatePanel(latestVersion, releaseUrl) {
    const currentVersion = safeGetVersion();
    makePanel({
      title: `新しいバージョンが利用可能です / Update available (v${latestVersion})`,
      message: `新しいリリース v${latestVersion} が公開されました（現在: v${currentVersion}）。GitHubから最新版をダウンロードしてください。`,
      sub: `A new release v${latestVersion} is available (current: v${currentVersion}). Download the latest version from GitHub.`,
      kind: "update",
      linkUrl: releaseUrl,
      linkLabel: "GitHub で取得 / Download",
      buttonLabel: "後で / Later"
    });
  }

  async function checkForUpdates() {
    if (!isContextValid()) return;
    try {
      const currentVersion = safeGetVersion();
      const storageKey = "pathfinderUpdateCache";
      safeStorageGet([storageKey], (stored) => {
        const cache = stored ? stored[storageKey] : null;
        const now = Date.now();

        if (cache && now - cache.checkedAt < UPDATE_CHECK_INTERVAL_MS) {
          if (cache.latestVersion && compareVersions(cache.latestVersion, currentVersion) > 0) {
            showUpdatePanel(cache.latestVersion, cache.releaseUrl);
          }
          return;
        }

        fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { Accept: "application/vnd.github+json" }
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (!data) return;
          const latestVersion = String(data.tag_name || "").replace(/^v/i, "").trim();
          const releaseUrl = data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
          if (!latestVersion) return;

          safeStorageSet({
            [storageKey]: {
              checkedAt: now,
              latestVersion,
              releaseUrl
            }
          });

          if (compareVersions(latestVersion, currentVersion) > 0) {
            showUpdatePanel(latestVersion, releaseUrl);
          }
        }).catch(() => {});
      });
    } catch { }
  }

  // One-time install reminder
  try {
    safeStorageGet(["pathfinderInstallNoticeShown"], (result) => {
      if (result?.pathfinderInstallNoticeShown) return;
      safeStorageSet({ pathfinderInstallNoticeShown: true });
      makePanel({
        title: "キュー検索のリマインダー / Queue reminder",
        message: "ノヴォシビルスクサーバーへの割り当てを防ぐため、1分ごとにキューを再検索してください。",
        sub: "Restart your queue every minute to reduce the chance of being assigned to Novosibirsk.",
        buttonLabel: "了解 / Got it"
      });
    });
  } catch { }

  let lastState = null;
  let healthPanel = null;
  let lastBusyStartTime = 0;

  function updateRadarData(status) {
    safeStorageGet(["vvoRadar"], (res) => {
      const prev = res?.vvoRadar || {};
      const now = Date.now();
      const isBusy = status === "LOCATION_CAPACITY_STATUS_FULL" || status === "LOCATION_CAPACITY_STATUS_HIGH_TRAFFIC";

      if (isBusy) {
        if (!lastBusyStartTime) lastBusyStartTime = now;
        const updated = {
          ...prev,
          lastBusyStart: lastBusyStartTime || prev.lastBusyStart || now,
          lastState: status,
          updatedAt: now
        };
        cachedRadarData = updated;
        safeStorageSet({ vvoRadar: updated });
      } else if (status === "LOCATION_CAPACITY_STATUS_AVAILABLE") {
        const busyStart = lastBusyStartTime || prev.lastBusyStart || (now - 35 * 60 * 1000);
        const duration = Math.max(1, Math.round((now - busyStart) / 60000));
        lastBusyStartTime = 0;
        const updated = {
          ...prev,
          lastMatchEnded: now,
          lastDuration: duration,
          lastBusyStart: busyStart,
          lastState: "AVAILABLE",
          updatedAt: now
        };
        cachedRadarData = updated;
        safeStorageSet({ vvoRadar: updated });
      }
    });
  }

  function renderHealth(detail) {
    const raw = String(detail?.status ?? "UNKNOWN");
    updateRadarData(raw);
    applyChipStatus(vvoChip, "VLADIVOSTOK", raw);

    if (raw === lastState) return;
    const previousState = lastState;
    lastState = raw;
    if (healthPanel) healthPanel.remove();
    healthPanel = null;

    if (raw === "LOCATION_CAPACITY_STATUS_AVAILABLE") {
      if (previousState && (previousState.includes("FULL") || previousState.includes("HIGH_TRAFFIC"))) {
        if (currentConfig.notifyVvoSlots !== false) {
          playWarningBeep();
          healthPanel = makePanel({
            title: "ウラジオストク空きスロット検知 / Vladivostok Slots Open",
            message: "ウラジオストクサーバーの空き枠が確認されました！今すぐマッチング可能です。",
            sub: "Vladivostok server instances are now available and free. Safe to queue!",
            buttonLabel: "OK"
          });
        }
        triggerSlotsFreeDiscord();
      }
      return;
    }

    const title = "ウラジオストク サーバー状態 / Vladivostok server status";
    let message;
    let sub;
    if (raw === "LOCATION_CAPACITY_STATUS_FULL" || raw === "NOT_LISTED") {
      if (currentConfig.dropQueueOnVvoFull !== false) {
        if (isFaceitInQueue() || queueStartTime !== null) {
          cancelMatchmaking();
          stopQueueTimer();
          playWarningBeep();
          healthPanel = makePanel({
            title: "緊急キャンセル: 満員検知 / Emergency Drop: Server Full",
            message: "検索中にウラジオストクサーバーが満員(FULL)になりました。他地域(モスクワ等)への誤マッチングを防ぐため、キューを直ちに自動キャンセルしました。",
            sub: "Vladivostok became FULL during active search. Automatically dropped queue to avoid distant EU/Moscow routing.",
            kind: "health bad",
            buttonLabel: "OK"
          });
          return;
        }
      }
    }

    if (raw === "LOCATION_CAPACITY_STATUS_FULL") {
      message = "ウラジオストクサーバーは現在満員です。次のキューでの利用は控えてください。";
      sub = "Vladivostok servers are currently full. Avoid relying on this server for your next queue.";
    } else if (raw === "LOCATION_CAPACITY_STATUS_HIGH_TRAFFIC") {
      message = "ウラジオストクサーバーは現在高トラフィックです。ご注意ください。";
      sub = "Vladivostok server is currently experiencing high traffic. Please be careful.";
    } else if (raw === "NOT_LISTED") {
      message = "現在のマッチメイキング一覧にウラジオストクサーバーが見つかりません。稼働状況を確認できません。";
      sub = "Vladivostok is not present in the current matchmaking server list. Its availability cannot be confirmed.";
    } else {
      message = `ウラジオストクサーバーから不明または利用不可のステータスが返されました: ${raw}`;
      sub = `Vladivostok returned an unrecognized or unavailable status: ${raw}.`;
    }
    healthPanel = makePanel({
      title,
      message,
      sub,
      kind: "health bad",
      buttonLabel: "確認 / Understood"
    });
  }

  window.addEventListener(HEALTH_EVENT, (event) => {
    if (!isContextValid()) return;
    renderHealth(event.detail);
  });
  document.addEventListener(HEALTH_EVENT, (event) => {
    if (!isContextValid()) return;
    renderHealth(event.detail);
  });

  function handleServersHealth(event) {
    if (!isContextValid()) return;
    const states = event.detail;
    if (!states) return;
    if (states.vladivostok) applyChipStatus(vvoChip, "VLADIVOSTOK", states.vladivostok.status);
    if (states.novosibirsk) applyChipStatus(nskChip, "NOVOSIBIRSK", states.novosibirsk.status);
    if (states.kazakhstan) applyChipStatus(kazChip, "KAZAKHSTAN", states.kazakhstan.status);
  }
  window.addEventListener(SERVERS_HEALTH_EVENT, handleServersHealth);
  document.addEventListener(SERVERS_HEALTH_EVENT, handleServersHealth);

  (document.documentElement || document.body).append(root);
  checkForUpdates();
  updateHudVisibility();
})();
