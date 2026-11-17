(() => {
  "use strict";

  const HEALTH_EVENT = "pathfinder:vladivostok-health";
  const SERVERS_HEALTH_EVENT = "pathfinder:servers-health";
  const QUEUE_STATUS_EVENT = "pathfinder:queue-status";
  const ROOT_ID = "pathfinder-ui-root";
  const GITHUB_REPO = "zloybik/Only-Vladivostok-Server-Faceit";
  const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  const DEFAULT_CONFIG = {
    lang: "ja",
    allowNovosibirsk: false,
    allowKazakhstan: false,
    spoofVvoPing: true,
    spoofNskPing: false,
    spoofKazPing: false,
    enableQueueTimer: true,
    enableQueueBeep: true,
    autoCancelQueue: true,
    autoRestartQueue: false,
    autoCancelSeconds: 58
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

  chrome.storage.local.get(["pathfinderSettings"], (res) => {
    if (res?.pathfinderSettings) {
      syncConfig(res.pathfinderSettings);
    } else {
      syncConfig(DEFAULT_CONFIG);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pathfinderSettings) {
      syncConfig(changes.pathfinderSettings.newValue);
    }
  });

  chrome.runtime.onMessage?.addListener((msg) => {
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
  });

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
      chipObj.text.textContent = `${baseFullName}: AVAILABLE${peakSuffix}`;
    } else if (status.includes("HIGH_TRAFFIC")) {
      chipObj.chip.classList.add("status-warn");
      chipObj.text.textContent = `${baseFullName}: HIGH LOAD${peakSuffix}`;
    } else if (status.includes("FULL")) {
      chipObj.chip.classList.add("status-full");
      chipObj.text.textContent = `${baseFullName}: FULL`;
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

  // Intercept user clicks directly on page
  document.addEventListener("click", (e) => {
    // Ignore programmatic / synthetic clicks from our extension
    if (!e.isTrusted) return;

    const target = e.target;
    if (!target || isNavigationLink(target)) return;

    // Check if user clicked inside the playbar button slot ONLY
    if (isPlayButtonSlot(target)) {
      cancelCooldownUntil = 0;
      if (isFaceitInQueue()) {
        // User clicked the play button while in queue -> manually cancelled
        stopQueueTimer();
      } else {
        // User clicked the play button while idle -> starting queue
        startQueueTimer();
      }
    }
  }, true);

  // Periodic poll to maintain queue state
  setInterval(() => {
    // 1. Check if match ready (Accept button on screen)
    const acceptBtn = document.querySelector('button[data-testid*="accept" i], [aria-label*="accept" i]');
    if (acceptBtn && acceptBtn.getBoundingClientRect().width > 0) {
      stopQueueTimer();
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
    const state = e.detail?.state;
    if (state === "SEARCHING" && Date.now() >= cancelCooldownUntil) startQueueTimer();
    if (state === "MATCH_FOUND" || state === "IDLE") stopQueueTimer();
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
    img.src = chrome.runtime.getURL("pathfinder-upper.png");
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
    const currentVersion = chrome.runtime.getManifest().version;
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
    try {
      const currentVersion = chrome.runtime.getManifest().version;
      const storageKey = "pathfinderUpdateCache";
      const stored = await chrome.storage.local.get([storageKey]);
      const cache = stored[storageKey];
      const now = Date.now();

      if (cache && now - cache.checkedAt < UPDATE_CHECK_INTERVAL_MS) {
        if (cache.latestVersion && compareVersions(cache.latestVersion, currentVersion) > 0) {
          showUpdatePanel(cache.latestVersion, cache.releaseUrl);
        }
        return;
      }

      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!res.ok) return;

      const data = await res.json();
      const latestVersion = String(data.tag_name || "").replace(/^v/i, "").trim();
      const releaseUrl = data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
      if (!latestVersion) return;

      await chrome.storage.local.set({
        [storageKey]: {
          checkedAt: now,
          latestVersion,
          releaseUrl
        }
      });

      if (compareVersions(latestVersion, currentVersion) > 0) {
        showUpdatePanel(latestVersion, releaseUrl);
      }
    } catch { }
  }

  // One-time install reminder
  chrome.storage.local.get(["pathfinderInstallNoticeShown"], (result) => {
    if (chrome.runtime.lastError || result.pathfinderInstallNoticeShown) return;
    chrome.storage.local.set({ pathfinderInstallNoticeShown: true });
    makePanel({
      title: "キュー検索のリマインダー / Queue reminder",
      message: "ノヴォシビルスクサーバーへの割り当てを防ぐため、1分ごとにキューを再検索してください。",
      sub: "Restart your queue every minute to reduce the chance of being assigned to Novosibirsk.",
      buttonLabel: "了解 / Got it"
    });
  });

  let lastState = null;
  let healthPanel = null;
  function renderHealth(detail) {
    const raw = String(detail?.status ?? "UNKNOWN");
    applyChipStatus(vvoChip, "VLADIVOSTOK", raw);

    if (raw === lastState) return;
    lastState = raw;
    if (healthPanel) healthPanel.remove();
    healthPanel = null;

    if (raw === "LOCATION_CAPACITY_STATUS_AVAILABLE") return;

    const title = "ウラジオストク サーバー状態 / Vladivostok server status";
    let message;
    let sub;
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

  window.addEventListener(HEALTH_EVENT, (event) => renderHealth(event.detail));
  document.addEventListener(HEALTH_EVENT, (event) => renderHealth(event.detail));

  function handleServersHealth(event) {
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
