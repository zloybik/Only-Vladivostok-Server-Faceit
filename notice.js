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
    autoCancelSeconds: 58
  };

  let currentConfig = { ...DEFAULT_CONFIG };

  // Synchronize configuration with localStorage and document/window events for MAIN world
  function syncConfig(config) {
    currentConfig = { ...DEFAULT_CONFIG, ...config };
    try {
      window.localStorage.setItem("pathfinder_config", JSON.stringify(currentConfig));
      const evt = new CustomEvent("pathfinder:config-changed", { detail: currentConfig });
      window.dispatchEvent(evt);
      document.dispatchEvent(evt);
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
      display:flex; flex-direction:column; gap:10px; pointer-events:none;
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

  let lastFindMatchElement = null;
  let lastFindMatchRect = null;

  function trackFindMatch() {
    const els = document.querySelectorAll("button, [role='button'], div, a");
    for (const el of els) {
      const t = (el.textContent || "").trim().toLowerCase();
      if (t === "find match" || t === "マッチを探す" || t === "対戦を探す") {
        const r = el.getBoundingClientRect();
        if (r.width > 40 && r.height > 20 && r.top > window.innerHeight - 250) {
          lastFindMatchElement = el;
          lastFindMatchRect = {
            x: Math.round(r.left + r.width / 2),
            y: Math.round(r.top + r.height / 2),
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height
          };
          return;
        }
      }
    }
  }

  function clickElement(el) {
    if (!el) return;
    const target = (el.nodeType === Node.ELEMENT_NODE && el.closest)
      ? (el.closest("button, [role='button'], div") || el)
      : el;

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
      screenX: cx,
      screenY: cy,
      buttons: 1
    };

    const eventNames = ["pointerover", "mouseover", "pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    for (const name of eventNames) {
      try {
        const evt = name.startsWith("pointer")
          ? new PointerEvent(name, { ...eventOpts, pointerId: 1, pointerType: "mouse", isPrimary: true })
          : new MouseEvent(name, eventOpts);
        el.dispatchEvent(evt);
        if (target !== el) target.dispatchEvent(evt);
      } catch {}
    }
    if (typeof target.click === "function") {
      try { target.click(); } catch {}
    }
    if (typeof el.click === "function" && el !== target) {
      try { el.click(); } catch {}
    }
  }

  // Disallowed button text (never treat general navigation or dialog buttons as queue cancel)
  const FORBIDDEN_TEXT = [
    "publish party", "publish", "find match", "play", "party", "create party", "join",
    "skill level", "bracket", "brackets", "party finder", "mission", "missions", "invite",
    "戻る", "確認", "了解", "参加", "マッチを探す", "パーティー", "公開", "settings", "設定",
    "info", "help", "ヘルプ", "招待", "ミッション"
  ];

  function isForbiddenButton(text) {
    const t = (text || "").trim().toLowerCase();
    if (!t) return false;
    return FORBIDDEN_TEXT.some((f) => t === f || t.includes(f));
  }

  function findFaceitCancelButton() {
    // 1. Specific data-testid and aria-label selectors for leaving / cancelling queue
    const selectors = [
      'button[data-testid*="cancel" i]',
      'button[data-testid*="leave" i]',
      'button[data-testid*="queue-cancel" i]',
      '[aria-label*="cancel queue" i]',
      '[aria-label*="leave queue" i]',
      '[aria-label*="キューを退出" i]',
      '[aria-label*="キューから退出" i]',
      '[aria-label*="マッチメイキングをキャンセル" i]',
      '[aria-label*="cancel matchmaking" i]',
      'button[class*="cancel" i]',
      'button[class*="leave" i]'
    ];
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const btn of els) {
          if (!btn) continue;
          if (btn.closest('[role="dialog"], [aria-modal="true"], [class*="Modal" i], [class*="Tooltip" i]')) continue;
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const txt = (btn.textContent || "").trim().toLowerCase();
            if (!isForbiddenButton(txt)) {
              return btn;
            }
          }
        }
      } catch {}
    }

    // 2. Scan visible buttons for unambiguous cancel queue phrases
    const strictCancelKeywords = [
      "leave queue", "cancel matchmaking", "cancel queue", "stop matchmaking",
      "キャンセル", "キューを退出", "キューから退出", "退出", "マッチメイキングをキャンセル", "検索キャンセル", "検索をキャンセル", "マッチング中止",
      "покинуть очередь", "отменить поиск", "отменить"
    ];

    const allButtons = Array.from(document.querySelectorAll("button, [role='button']"));
    for (const b of allButtons) {
      if (!b) continue;
      if (b.closest('[role="dialog"], [aria-modal="true"], [class*="Modal" i], [class*="Tooltip" i]')) continue;
      const rect = b.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const t = (b.textContent || "").trim().toLowerCase();
      if (!t || isForbiddenButton(t)) continue;
      for (const kw of strictCancelKeywords) {
        if (t === kw || t.includes(kw)) {
          return b;
        }
      }
    }

    return null;
  }

  function cancelMatchmaking() {
    // 1. Explicit cancel button if found
    const explicitBtn = findFaceitCancelButton();
    if (explicitBtn) {
      clickElement(explicitBtn);
      return true;
    }

    // 2. Direct check on the remembered "FIND MATCH" div element
    if (lastFindMatchElement && lastFindMatchElement.isConnected) {
      const sub = lastFindMatchElement.querySelector('button, [role="button"], [aria-label*="cancel" i], [aria-label*="close" i], svg, [class*="close" i], [class*="cancel" i]');
      if (sub) clickElement(sub);
      clickElement(lastFindMatchElement);
    }

    // 3. Coordinate-based click on the exact location of the bottom match button
    const targetX = lastFindMatchRect ? lastFindMatchRect.x : Math.round(window.innerWidth / 2);
    const targetY = lastFindMatchRect ? lastFindMatchRect.y : Math.round(window.innerHeight - 80);

    // Try the right side of the button (where the "X" / cancel sub-button usually is)
    if (lastFindMatchRect) {
      const rightX = Math.round(lastFindMatchRect.left + lastFindMatchRect.width - 25);
      const rightEl = document.elementFromPoint(rightX, targetY);
      if (rightEl && !isForbiddenButton(rightEl.textContent)) {
        clickElement(rightEl);
      }
    }

    // Try center of the button
    const centerEl = document.elementFromPoint(targetX, targetY);
    if (centerEl && !isForbiddenButton(centerEl.textContent)) {
      clickElement(centerEl);
    }

    // 4. Scan bottom-center dock for any interactive candidate
    const dockCandidates = Array.from(document.querySelectorAll("button, [role='button'], div")).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= window.innerHeight - 200 && r.width >= 30 && r.height >= 20 &&
             r.left >= window.innerWidth * 0.25 && r.right <= window.innerWidth * 0.75;
    });

    for (const el of dockCandidates) {
      const t = (el.textContent || "").trim().toLowerCase();
      if (isForbiddenButton(t)) continue;
      if (
        t.includes("cancel") || t.includes("leave") || t.includes("stop") ||
        t.includes("キャンセル") || t.includes("退出") || t.includes("отмен") || t.includes("покинуть") ||
        t.includes("searching") || t.includes("matchmaking")
      ) {
        clickElement(el);
        return true;
      }
      if (el.querySelector("svg") || el.tagName === "BUTTON") {
        clickElement(el);
        return true;
      }
    }

    return true;
  }

  function isFaceitInQueue() {
    // 1. If the "FIND MATCH" / "マッチを探す" button is visible near bottom, we are definitely NOT in queue!
    const findMatchButtons = Array.from(document.querySelectorAll("button, [role='button'], div, a")).filter((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      if (t === "find match" || t === "マッチを探す" || t === "対戦を探す") {
        const rect = b.getBoundingClientRect();
        return rect.width > 40 && rect.height > 20 && rect.top > window.innerHeight - 250;
      }
      return false;
    });
    if (findMatchButtons.length > 0) {
      return false;
    }

    // 2. If party setup or another modal dialog is open, we are NOT in queue
    if (document.querySelector('[aria-modal="true"], [role="dialog"], [class*="Modal" i]')) {
      return false;
    }

    // 3. If an explicit cancel queue button is visible, we ARE in queue
    if (findFaceitCancelButton()) return true;

    // 4. Check for active matchmaking search indicators in page elements (ignoring top header)
    const queueContainers = Array.from(document.querySelectorAll('[class*="Matchmaking" i], [class*="Queue" i], [data-testid*="matchmaking" i]'));
    for (const c of queueContainers) {
      const rect = c.getBoundingClientRect();
      if (rect.top > 150 && rect.height > 20) {
        const txt = (c.textContent || "").toLowerCase();
        if (
          txt.includes("searching for match") ||
          txt.includes("matchmaking in progress") ||
          txt.includes("finding match") ||
          txt.includes("対戦相手を検索中") ||
          txt.includes("対戦を検索中") ||
          txt.includes("キュー待機中") ||
          txt.includes("マッチを検索中") ||
          txt.includes("поиск матча") ||
          txt.includes("в поиске матча")
        ) {
          return true;
        }
      }
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

    if (maxSec > 2 && elapsedSec >= warnSec && !hasBeepedThisQueue) {
      hasBeepedThisQueue = true;
      playWarningBeep();
      if (!currentConfig.allowNovosibirsk) {
        makePanel({
          title: `キュー時間警告 / Queue Warning (${warnSec}s)`,
          message: `まもなく設定時間の${maxSec}秒に達します。ノヴォシビルスクサーバーへの拡大を防ぐため、再検索してください。`,
          sub: `Approaching ${maxSec}s limit. Restart your queue to prevent Novosibirsk assignment.`,
          buttonLabel: "了解 / OK"
        });
      }
    }

    if (elapsedSec >= maxSec && currentConfig.autoCancelQueue) {
      cancelMatchmaking();
      stopQueueTimer();
      playWarningBeep();
      makePanel({
        title: "自動キャンセル / Auto-Cancelled",
        message: `${maxSec}秒に達したため、キューを自動キャンセルしました。`,
        sub: `Queue was automatically cancelled at ${maxSec}s limit.`,
        buttonLabel: "OK"
      });
    }
  }

  // Intercept user clicks directly on page
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;
    const btn = target.closest("button, [role='button'], div, a") || target;

    const t = (btn.textContent || target.textContent || "").trim().toLowerCase();
    const aria = (btn.getAttribute?.("aria-label") || target.getAttribute?.("aria-label") || "").toLowerCase();
    const testid = (btn.getAttribute?.("data-testid") || target.getAttribute?.("data-testid") || "").toLowerCase();

    // If user clicked FIND MATCH / PLAY: capture element and coords, then start queue timer!
    if (t === "find match" || t === "マッチを探す" || t === "対戦を探す") {
      lastFindMatchElement = btn;
      const r = btn.getBoundingClientRect();
      lastFindMatchRect = {
        x: Math.round(r.left + r.width / 2),
        y: Math.round(r.top + r.height / 2),
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height
      };
      startQueueTimer();
      return;
    }

    // If user clicked cancel / leave queue manually: stop queue timer!
    if (
      t.includes("leave queue") || t === "cancel" || t.includes("キャンセル") || t.includes("退出") ||
      aria.includes("leave") || aria.includes("cancel") || testid.includes("cancel") || testid.includes("leave")
    ) {
      if (!isForbiddenButton(t)) {
        setTimeout(stopQueueTimer, 200);
      }
    }
  }, true);

  // Periodic poll to maintain queue state
  setInterval(() => {
    trackFindMatch();

    // 1. Check if match ready (Accept button on screen)
    const acceptBtn = document.querySelector('button[data-testid*="accept" i], [aria-label*="accept" i]');
    if (acceptBtn && acceptBtn.getBoundingClientRect().width > 0) {
      stopQueueTimer();
      return;
    }

    if (queueStartTime === null) {
      if (isFaceitInQueue()) {
        startQueueTimer();
      }
    } else {
      // While timer is running, ONLY stop if FIND MATCH button is actually back on screen!
      const hasFindMatch = Array.from(document.querySelectorAll("button, [role='button'], div, a")).some((b) => {
        const t = (b.textContent || "").trim().toLowerCase();
        if (t === "find match" || t === "マッチを探す" || t === "対戦を探す") {
          const r = b.getBoundingClientRect();
          return r.width > 50 && r.height > 20 && r.top > window.innerHeight - 250;
        }
        return false;
      });

      // If FIND MATCH is back on screen AND at least 2.5s have passed since search started:
      if (hasFindMatch && (Date.now() - queueStartTime) > 2500) {
        stopQueueTimer();
      }
    }
  }, 1000);

  // Cross-world event listeners (listening on both document and window)
  function handleQueueStatus(e) {
    const state = e.detail?.state;
    if (state === "SEARCHING") startQueueTimer();
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
