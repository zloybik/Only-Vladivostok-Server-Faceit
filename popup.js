(() => {
  "use strict";

  const STORAGE_KEY = "pathfinderSettings";
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
    autoCancelSeconds: 58,
    enableProxy: false,
    proxyScheme: "socks5",
    proxyHost: "",
    proxyPort: 1080,
    proxyFaceitOnly: true
  };

  const I18N = {
    ja: {
      tabServers: "🛡️ サーバー",
      tabQueue: "⏱️ キュー保護",
      tabProxy: "🌐 RU プロキシ",
      secWhitelist: "サーバー選択",
      vladTitle: "ウラジオストク",
      vladSub: "常に優先（遅延追加なし / 0ms）",
      spoofVvoTitle: "ウラジオストク 30ms 固定表示",
      spoofVvoSub: "表示Pingを緑色(30ms)に固定",
      novosibirskTitle: "ノボシビルスク許可",
      novosibirskSub: "ノボシビルスクサーバーを対象に含める",
      spoofNskTitle: "ノボシビルスク 30ms 固定表示",
      spoofNskSub: "表示Pingを緑色(30ms)に固定",
      kazakhstanTitle: "カザフスタン許可",
      kazakhstanSub: "カザフスタンサーバーを対象に含める",
      spoofKazTitle: "カザフスタン 30ms 固定表示",
      spoofKazSub: "表示Pingを緑色(30ms)に固定",
      secPeak: "ピークタイム",
      peakPeak: "🔥 ピーク時間帯 (マッチング活発)",
      peakMod: "🟡 通常時間帯 (マッチング可能)",
      peakOff: "💤 過疎時間帯 (キュー待機少)",
      peakAdvPeak: "現在プレイヤーが多く、ウラジオストクでのマッチ成立確率が最も高い時間帯です。",
      peakAdvMod: "マッチング可能な時間帯です。5分前後の待機時間が見込まれます。",
      peakAdvOff: "待機時間が長くなりやすい時間帯です。ノヴォシビルスク拡大を防ぐためキュー保護を推奨します。",
      secLatency: "遅延測定",
      btnTestPing: "⚡ ピング測定",
      btnTesting: "⏳ 測定中...",
      secQueue: "キュー待機設定",
      queueTimerTitle: "画面タイマーと警告音",
      queueTimerSub: "HUDタイマー表示 & 制限直前アラート音",
      autoCancelTitle: "自動キューキャンセル",
      autoCancelSub: "EU/他地域へのマッチング拡大前に自動取り消し",
      autoRestartTitle: "キャンセル後、自動で再検索",
      autoRestartSub: "キャンセル直後に自動でキューを再開 (Auto-Requeue)",
      cancelAfterTitle: "キャンセル待機秒数",
      cancelAfterSub: "指定秒数で自動再検索（1〜120秒）",
      btnTestBeep: "🔊 警告音テスト",
      btnTestQueue: "⏱️ 画面HUDテスト",
      secUnit: "秒",
      queueNote: "💡 <strong>重要:</strong> FACEITではマッチング開始後、約60秒が経過するとウラジオストク以外の遠隔サーバー（モスクワ・EU）へ検索地域が自動拡大されます。拡大前にキューを再起動することで、ウラジオストク等の希望サーバーに固定できます。",
      secProxyStatus: "RUルート接続状態",
      statusDirect: "通常接続 (Direct)",
      statusActive: (proto, host, port) => `RUルート: ${proto} (${host}:${port})`,
      enableProxyTitle: "RUプロキシを有効化",
      enableProxySub: "ロシアサーバー割り当て用ルート",
      vpnObratnoTitle: "ロシアVPN設定取得",
      vpnObratnoSub: "無料のロシア接続設定を取得（VPN Obratno）",
      btnVpnObratno: "🔗 VPN Obratnoを開く (ロシアVPN)",
      secProxyConfig: "接続設定",
      protocolLabel: "プロトコル",
      hostLabel: "ホスト名・IPアドレス",
      hostPlaceholder: "例: 127.0.0.1 または ru.proxy.net",
      portLabel: "ポート番号",
      faceitOnlyTitle: "FACEIT通信のみ経由",
      faceitOnlySub: "FACEITドメインのみプロキシ（他サイトは通常通信）",
      proxyNote: "※ プロキシ未応答またはエラー時は、自動的に通常接続（Direct）にフェイルオーバーされます。<br>※ V2Ray, Clash, Shadowsocks等のローカルVPNクライアントをご利用の場合は <code>127.0.0.1</code> / <code>1080</code>（または <code>7890</code>）をご指定ください。",
      btnCheckIp: "🌐 接続IP判定",
      btnChecking: "⏳ 判定中...",
      btnReset: "通常復旧",
      ipLabel: "IPアドレス:",
      regionLabel: "検出地域:",
      resetSuccess: "プロキシ設定を完全リセットしました",
      fallbackActive: "プロキシ未応答のため通常接続に自動切替済",
      directNormal: "通常接続 (Direct)"
    },
    en: {
      tabServers: "🛡️ Servers",
      tabQueue: "⏱️ Queue Guard",
      tabProxy: "🌐 RU Proxy",
      secWhitelist: "Server Whitelist",
      vladTitle: "Vladivostok (EU)",
      vladSub: "Always prioritized (No delay / 0ms)",
      spoofVvoTitle: "Lock Vladivostok to 30ms",
      spoofVvoSub: "Display solid green 30ms ping on FACEIT",
      novosibirskTitle: "Allow Novosibirsk",
      novosibirskSub: "Include Novosibirsk in server pool",
      spoofNskTitle: "Lock Novosibirsk to 30ms",
      spoofNskSub: "Display solid green 30ms ping on FACEIT",
      kazakhstanTitle: "Allow Kazakhstan",
      kazakhstanSub: "Include Kazakhstan in server pool",
      spoofKazTitle: "Lock Kazakhstan to 30ms",
      spoofKazSub: "Display solid green 30ms ping on FACEIT",
      secPeak: "Peak Hours",
      peakPeak: "🔥 PEAK HOURS (High Population)",
      peakMod: "🟡 MODERATE (Normal Queue)",
      peakOff: "💤 OFF-PEAK (Low Population)",
      peakAdvPeak: "High player traffic. Maximum chance of locking pure Vladivostok matches.",
      peakAdvMod: "Active matchmaking. Average queue times around 3-6 minutes.",
      peakAdvOff: "Long queue times expected. Keep Queue Guard enabled to avoid server expansion.",
      secLatency: "Latency Diagnostics",
      btnTestPing: "⚡ Test Latency",
      btnTesting: "⏳ Testing...",
      secQueue: "Queue Guard Settings",
      queueTimerTitle: "HUD Timer & Audio Alert",
      queueTimerSub: "Visual queue timer & countdown beep",
      autoCancelTitle: "Auto-Cancel Queue",
      autoCancelSub: "Cancel before pool expands to distant regions",
      autoRestartTitle: "Auto-Restart Queue after Cancel",
      autoRestartSub: "Automatically start search again after cancelling (Auto-Requeue)",
      cancelAfterTitle: "Cancel After (Seconds)",
      cancelAfterSub: "Re-queue threshold (1 to 120s)",
      btnTestBeep: "🔊 Test Alert Sound",
      btnTestQueue: "⏱️ Test HUD Timer",
      secUnit: "s",
      queueNote: "💡 <strong>Note:</strong> FACEIT expands matchmaking beyond Vladivostok to Moscow/EU after ~60s if players are insufficient. Re-queuing before expansion keeps you locked to preferred nodes.",
      secProxyStatus: "RU Route Status",
      statusDirect: "Direct Connection",
      statusActive: (proto, host, port) => `RU Route: ${proto} (${host}:${port})`,
      enableProxyTitle: "Enable RU Proxy",
      enableProxySub: "Route through RU proxy for Russian matchmaking",
      vpnObratnoTitle: "Get Russian VPN / Proxy",
      vpnObratnoSub: "Free Russian VPN & proxy configs (VPN Obratno)",
      btnVpnObratno: "🔗 Open VPN Obratno (Free RU VPN)",
      secProxyConfig: "Proxy Settings",
      protocolLabel: "Protocol",
      hostLabel: "Server Host / IP",
      hostPlaceholder: "e.g. 127.0.0.1 or ru.proxy.net",
      portLabel: "Port",
      faceitOnlyTitle: "Route FACEIT traffic only",
      faceitOnlySub: "Only *.faceit.com goes through proxy (Other sites direct)",
      proxyNote: "※ Automatically fails over to Direct connection if proxy is offline.<br>※ If using local clients (V2Ray, Clash, Shadowsocks), use <code>127.0.0.1</code> / <code>1080</code> (or <code>7890</code>).",
      btnCheckIp: "🌐 Check IP & Region",
      btnChecking: "⏳ Checking...",
      btnReset: "Reset Direct",
      ipLabel: "IP Address:",
      regionLabel: "Detected Region:",
      resetSuccess: "Proxy settings cleared; direct connection restored",
      fallbackActive: "Proxy unreachable; safely fell back to Direct IP",
      directNormal: "Direct Connection"
    }
  };

  let currentLang = "ja";

  // Tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Language buttons
  const langBtns = document.querySelectorAll(".lang-btn");
  langBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const l = btn.getAttribute("data-lang");
      if (l && I18N[l]) {
        currentLang = l;
        langBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        applyLanguage(currentLang);
        saveSettings();
      }
    });
  });

  function applyLanguage(lang) {
    const t = I18N[lang] || I18N.ja;
    document.getElementById("tabBtnServers").textContent = t.tabServers;
    document.getElementById("tabBtnQueue").textContent = t.tabQueue;
    document.getElementById("tabBtnProxy").textContent = t.tabProxy;

    document.getElementById("tSecWhitelist").textContent = t.secWhitelist;
    document.getElementById("tVladTitle").innerHTML = `<span class="badge-live"></span> ${t.vladTitle}`;
    document.getElementById("tVladSub").textContent = t.vladSub;
    if (document.getElementById("tSpoofVvoTitle")) document.getElementById("tSpoofVvoTitle").textContent = t.spoofVvoTitle;
    if (document.getElementById("tSpoofVvoSub")) document.getElementById("tSpoofVvoSub").textContent = t.spoofVvoSub;
    document.getElementById("tNovosibirskTitle").textContent = t.novosibirskTitle;
    document.getElementById("tNovosibirskSub").textContent = t.novosibirskSub;
    if (document.getElementById("tSpoofNskTitle")) document.getElementById("tSpoofNskTitle").textContent = t.spoofNskTitle;
    if (document.getElementById("tSpoofNskSub")) document.getElementById("tSpoofNskSub").textContent = t.spoofNskSub;
    document.getElementById("tKazakhstanTitle").textContent = t.kazakhstanTitle;
    document.getElementById("tKazakhstanSub").textContent = t.kazakhstanSub;
    if (document.getElementById("tSpoofKazTitle")) document.getElementById("tSpoofKazTitle").textContent = t.spoofKazTitle;
    if (document.getElementById("tSpoofKazSub")) document.getElementById("tSpoofKazSub").textContent = t.spoofKazSub;

    if (document.getElementById("tSecPeak")) document.getElementById("tSecPeak").textContent = t.secPeak;

    document.getElementById("tSecLatency").textContent = t.secLatency;
    document.getElementById("btnTestPing").textContent = t.btnTestPing;

    document.getElementById("tSecQueue").textContent = t.secQueue;
    document.getElementById("tQueueTimerTitle").textContent = t.queueTimerTitle;
    document.getElementById("tQueueTimerSub").textContent = t.queueTimerSub;
    document.getElementById("tAutoCancelTitle").textContent = t.autoCancelTitle;
    document.getElementById("tAutoCancelSub").textContent = t.autoCancelSub;
    if (document.getElementById("tAutoRestartTitle")) document.getElementById("tAutoRestartTitle").textContent = t.autoRestartTitle;
    if (document.getElementById("tAutoRestartSub")) document.getElementById("tAutoRestartSub").textContent = t.autoRestartSub;
    document.getElementById("tCancelAfterTitle").textContent = t.cancelAfterTitle;
    document.getElementById("tCancelAfterSub").textContent = t.cancelAfterSub;
    if (document.getElementById("btnTestBeep")) document.getElementById("btnTestBeep").textContent = t.btnTestBeep;
    if (document.getElementById("btnTestQueue")) document.getElementById("btnTestQueue").textContent = t.btnTestQueue;
    document.getElementById("tSecUnit").textContent = t.secUnit;
    document.getElementById("tQueueNote").innerHTML = t.queueNote;

    document.getElementById("tSecProxyStatus").textContent = t.secProxyStatus;
    document.getElementById("tEnableProxyTitle").textContent = t.enableProxyTitle;
    document.getElementById("tEnableProxySub").textContent = t.enableProxySub;
    if (document.getElementById("tVpnObratnoTitle")) document.getElementById("tVpnObratnoTitle").textContent = t.vpnObratnoTitle;
    if (document.getElementById("tVpnObratnoSub")) document.getElementById("tVpnObratnoSub").textContent = t.vpnObratnoSub;
    if (document.getElementById("btnVpnObratno")) document.getElementById("btnVpnObratno").textContent = t.btnVpnObratno;
    document.getElementById("tSecProxyConfig").textContent = t.secProxyConfig;
    document.getElementById("tProtocolLabel").textContent = t.protocolLabel;
    document.getElementById("tHostLabel").textContent = t.hostLabel;
    document.getElementById("proxyHost").placeholder = t.hostPlaceholder;
    document.getElementById("tPortLabel").textContent = t.portLabel;
    document.getElementById("tFaceitOnlyTitle").textContent = t.faceitOnlyTitle;
    document.getElementById("tFaceitOnlySub").textContent = t.faceitOnlySub;
    document.getElementById("tProxyNote").innerHTML = t.proxyNote;

    document.getElementById("btnCheckGeo").textContent = t.btnCheckIp;
    document.getElementById("btnResetDirect").textContent = t.btnReset;
    document.getElementById("tIpLabel").textContent = t.ipLabel;
    document.getElementById("tRegionLabel").textContent = t.regionLabel;
  }

  // DOM Elements - Controls
  const elNovosibirsk = document.getElementById("allowNovosibirsk");
  const elSpoofNsk = document.getElementById("spoofNskPing");
  const elKazakhstan = document.getElementById("allowKazakhstan");
  const elSpoofKaz = document.getElementById("spoofKazPing");
  const elSpoofVvo = document.getElementById("spoofVvoPing");
  const badgeNovosibirsk = document.getElementById("badge-novosibirsk");
  const badgeKazakhstan = document.getElementById("badge-kazakhstan");
  const btnTestPing = document.getElementById("btnTestPing");

  const elQueueTimer = document.getElementById("enableQueueTimer");
  const elAutoCancel = document.getElementById("autoCancelQueue");
  const elAutoCancelSeconds = document.getElementById("autoCancelSeconds");
  const rowAutoCancelTime = document.getElementById("rowAutoCancelTime");
  const elAutoRestart = document.getElementById("autoRestartQueue");
  const rowAutoRestart = document.getElementById("rowAutoRestart");

  const elEnableProxy = document.getElementById("enableProxy");
  const elProxyScheme = document.getElementById("proxyScheme");
  const elProxyHost = document.getElementById("proxyHost");
  const elProxyPort = document.getElementById("proxyPort");
  const elProxyFaceitOnly = document.getElementById("proxyFaceitOnly");
  const proxyStatusDot = document.getElementById("proxyStatusDot");
  const proxyStatusText = document.getElementById("proxyStatusText");
  const proxyBadge = document.getElementById("proxyBadge");
  const proxyConfigCard = document.getElementById("proxyConfigCard");
  const btnCheckGeo = document.getElementById("btnCheckGeo");
  const btnResetDirect = document.getElementById("btnResetDirect");
  const geoResult = document.getElementById("geoResult");
  const geoIp = document.getElementById("geoIp");
  const geoCountry = document.getElementById("geoCountry");

  function updateBadges(config) {
    if (config.allowNovosibirsk) {
      badgeNovosibirsk.textContent = "EXEMPT";
      badgeNovosibirsk.className = "ping-badge exempt";
    } else {
      badgeNovosibirsk.textContent = "+1000ms";
      badgeNovosibirsk.className = "ping-badge penalized";
    }

    if (config.allowKazakhstan) {
      badgeKazakhstan.textContent = "EXEMPT";
      badgeKazakhstan.className = "ping-badge exempt";
    } else {
      badgeKazakhstan.textContent = "+1000ms";
      badgeKazakhstan.className = "ping-badge penalized";
    }
  }

  function updateAutoCancelVisibility() {
    if (rowAutoCancelTime) {
      rowAutoCancelTime.style.opacity = elAutoCancel.checked ? "1" : "0.4";
      elAutoCancelSeconds.disabled = !elAutoCancel.checked;
    }
    if (rowAutoRestart) {
      rowAutoRestart.style.opacity = elAutoCancel.checked ? "1" : "0.4";
      if (elAutoRestart) elAutoRestart.disabled = !elAutoCancel.checked;
    }
  }

  function updateProxyUI(config) {
    const t = I18N[currentLang] || I18N.ja;
    const isProxyOn = !!config.enableProxy && !!config.proxyHost && !!config.proxyPort;
    if (isProxyOn) {
      proxyStatusDot.className = "status-dot active";
      proxyStatusText.textContent = t.statusActive(config.proxyScheme.toUpperCase(), config.proxyHost, config.proxyPort);
      proxyBadge.textContent = "ACTIVE";
      proxyBadge.style.color = "#4ade80";
      proxyBadge.style.borderColor = "#23542f";
    } else {
      proxyStatusDot.className = "status-dot";
      proxyStatusText.textContent = t.statusDirect;
      proxyBadge.textContent = "DIRECT";
      proxyBadge.style.color = "#aaa";
      proxyBadge.style.borderColor = "#444";
    }
    if (proxyConfigCard) {
      proxyConfigCard.style.opacity = config.enableProxy ? "1" : "0.5";
    }
  }

  function sendToFaceitTabs(msg) {
    const contacted = new Set();
    const send = (tabId) => {
      if (tabId && !contacted.has(tabId)) {
        contacted.add(tabId);
        chrome.tabs.sendMessage(tabId, msg).catch(() => {});
      }
    };
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (Array.isArray(tabs)) {
          for (const tab of tabs) send(tab.id);
        }
      });
      chrome.tabs.query({ url: "*://*.faceit.com/*" }, (tabs) => {
        if (Array.isArray(tabs)) {
          for (const tab of tabs) send(tab.id);
        }
      });
    } catch {}
  }

  function broadcastSettings(config) {
    sendToFaceitTabs({
      type: "PATHFINDER_CONFIG_UPDATE",
      config
    });

    // Notify background service worker for proxy
    chrome.runtime.sendMessage({
      type: "APPLY_PROXY_CONFIG",
      config
    }).catch(() => {});
  }

  function saveSettings() {
    let secs = parseInt(elAutoCancelSeconds.value, 10);
    if (isNaN(secs) || secs < 1) secs = 1;
    if (secs > 120) secs = 120;

    let port = parseInt(elProxyPort.value, 10);
    if (isNaN(port) || port <= 0) port = 1080;

    const config = {
      lang: currentLang,
      allowNovosibirsk: elNovosibirsk.checked,
      spoofNskPing: elSpoofNsk ? elSpoofNsk.checked : false,
      allowKazakhstan: elKazakhstan.checked,
      spoofKazPing: elSpoofKaz ? elSpoofKaz.checked : false,
      spoofVvoPing: elSpoofVvo ? elSpoofVvo.checked : true,
      enableQueueTimer: elQueueTimer.checked,
      enableQueueBeep: elQueueTimer.checked,
      autoCancelQueue: elAutoCancel.checked,
      autoRestartQueue: elAutoRestart ? elAutoRestart.checked : false,
      autoCancelSeconds: secs,
      enableProxy: elEnableProxy.checked,
      proxyScheme: elProxyScheme.value,
      proxyHost: elProxyHost.value.trim(),
      proxyPort: port,
      proxyFaceitOnly: elProxyFaceitOnly.checked
    };

    chrome.storage.local.set({ [STORAGE_KEY]: config }, () => {
      broadcastSettings(config);
      updateBadges(config);
      updateAutoCancelVisibility();
      updateProxyUI(config);
    });
  }

  function updatePeakHours() {
    const t = I18N[currentLang] || I18N.ja;
    const badgeClock = document.getElementById("badgePeakClock");
    const tStatus = document.getElementById("tPeakStatus");
    const tClocks = document.getElementById("tPeakClocks");
    const tAdvice = document.getElementById("tPeakAdvice");
    if (!badgeClock || !tStatus) return;

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vlatDate = new Date(utc + (3600000 * 10)); // UTC+10
    const jstDate = new Date(utc + (3600000 * 9));   // UTC+9

    const vlatHour = vlatDate.getHours();
    const vlatMin = String(vlatDate.getMinutes()).padStart(2, "0");
    const jstHour = String(jstDate.getHours()).padStart(2, "0");
    const jstMin = String(jstDate.getMinutes()).padStart(2, "0");

    badgeClock.textContent = `VVO ${String(vlatHour).padStart(2, "0")}:${vlatMin}`;
    tClocks.textContent = `VVO ${String(vlatHour).padStart(2, "0")}:${vlatMin} (UTC+10) / JST ${jstHour}:${jstMin} (UTC+9)`;

    // Peak: 17:00 - 01:00 VLAT (16:00 - 00:00 JST)
    // Moderate: 12:00 - 17:00 VLAT
    // Off-Peak: 01:00 - 12:00 VLAT
    if (vlatHour >= 17 || vlatHour < 1) {
      tStatus.textContent = t.peakPeak;
      tStatus.style.color = "#4ade80";
      tAdvice.textContent = t.peakAdvPeak;
    } else if (vlatHour >= 12 && vlatHour < 17) {
      tStatus.textContent = t.peakMod;
      tStatus.style.color = "#facc15";
      tAdvice.textContent = t.peakAdvMod;
    } else {
      tStatus.textContent = t.peakOff;
      tStatus.style.color = "#999";
      tAdvice.textContent = t.peakAdvOff;
    }
  }

  // Load initial settings
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    const config = { ...DEFAULT_CONFIG, ...(res?.[STORAGE_KEY] || {}) };
    currentLang = config.lang || "ja";

    // Set active lang button
    langBtns.forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-lang") === currentLang);
    });
    applyLanguage(currentLang);

    elNovosibirsk.checked = !!config.allowNovosibirsk;
    if (elSpoofNsk) elSpoofNsk.checked = !!config.spoofNskPing;
    elKazakhstan.checked = !!config.allowKazakhstan;
    if (elSpoofKaz) elSpoofKaz.checked = !!config.spoofKazPing;
    if (elSpoofVvo) elSpoofVvo.checked = config.spoofVvoPing !== false;
    elQueueTimer.checked = !!config.enableQueueTimer;
    elAutoCancel.checked = !!config.autoCancelQueue;
    if (elAutoRestart) elAutoRestart.checked = !!config.autoRestartQueue;
    elAutoCancelSeconds.value = Number(config.autoCancelSeconds) || 58;

    elEnableProxy.checked = !!config.enableProxy;
    elProxyScheme.value = config.proxyScheme || "socks5";
    elProxyHost.value = config.proxyHost || "";
    elProxyPort.value = config.proxyPort || 1080;
    elProxyFaceitOnly.checked = config.proxyFaceitOnly !== false;

    updateBadges(config);
    updateAutoCancelVisibility();
    updateProxyUI(config);
    updatePeakHours();
  });

  // Attach change listeners
  [
    elNovosibirsk,
    elSpoofNsk,
    elKazakhstan,
    elSpoofKaz,
    elSpoofVvo,
    elQueueTimer,
    elAutoCancel,
    elAutoRestart,
    elAutoCancelSeconds,
    elEnableProxy,
    elProxyScheme,
    elProxyHost,
    elProxyPort,
    elProxyFaceitOnly
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", saveSettings);
    if (el.tagName === "INPUT" && el.type === "text") {
      el.addEventListener("blur", saveSettings);
    }
  });

  if (elSpoofNsk) {
    elSpoofNsk.addEventListener("change", () => {
      if (elSpoofNsk.checked && !elNovosibirsk.checked) {
        elNovosibirsk.checked = true;
      }
      saveSettings();
    });
  }

  if (elSpoofKaz) {
    elSpoofKaz.addEventListener("change", () => {
      if (elSpoofKaz.checked && !elKazakhstan.checked) {
        elKazakhstan.checked = true;
      }
      saveSettings();
    });
  }

  if (elAutoCancelSeconds) {
    elAutoCancelSeconds.addEventListener("input", () => {
      if (!elAutoCancel.checked) {
        elAutoCancel.checked = true;
      }
      saveSettings();
    });
  }

  if (elAutoRestart) {
    elAutoRestart.addEventListener("change", () => {
      if (elAutoRestart.checked && !elAutoCancel.checked) {
        elAutoCancel.checked = true;
      }
      saveSettings();
    });
  }

  // Latency test
  async function testLatency(host) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      await fetch(`https://${host}/?_=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        mode: "no-cors",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return Math.round(performance.now() - start);
    } catch {
      return null;
    }
  }

  btnTestPing.addEventListener("click", async () => {
    const t = I18N[currentLang] || I18N.ja;
    btnTestPing.disabled = true;
    btnTestPing.textContent = t.btnTesting;

    const rows = document.querySelectorAll("#pingTable tr[data-host]");
    for (const row of rows) {
      const host = row.getAttribute("data-host");
      const valCell = row.querySelector(".ping-val");
      valCell.textContent = "...";

      const ms = await testLatency(host);
      if (ms === null) {
        valCell.textContent = "Timeout";
        valCell.style.color = "#888";
      } else {
        valCell.textContent = `${ms} ms`;
        valCell.style.color = ms < 60 ? "#4ade80" : ms < 120 ? "#facc15" : "#fff";
      }
    }

    btnTestPing.disabled = false;
    btnTestPing.textContent = t.btnTestPing;
  });

  // Geolocation & Fallback check
  btnCheckGeo.addEventListener("click", async () => {
    const t = I18N[currentLang] || I18N.ja;
    btnCheckGeo.disabled = true;
    btnCheckGeo.textContent = t.btnChecking;
    geoResult.style.display = "block";
    geoIp.textContent = "...";
    geoCountry.textContent = "...";

    const isProxyConfigured = elEnableProxy.checked && !!elProxyHost.value.trim();

    try {
      const res = await fetch(`https://ipapi.co/json/?_=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const countryCode = (data.country_code || "").toUpperCase();
        geoIp.textContent = data.ip || "Unknown";

        if (isProxyConfigured) {
          if (countryCode === "RU") {
            geoCountry.textContent = `RU - Russia (${data.city || "Moscow"}) [Active Proxy]`;
            geoCountry.style.color = "#4ade80";
          } else {
            geoCountry.textContent = `${countryCode} - ${data.country_name || ""} (${t.fallbackActive})`;
            geoCountry.style.color = "#facc15";
            proxyStatusDot.className = "status-dot fallback";
            proxyStatusText.textContent = `${t.statusDirect} (${t.fallbackActive})`;
            proxyBadge.textContent = "DIRECT";
            proxyBadge.style.color = "#facc15";
            proxyBadge.style.borderColor = "#635415";
          }
        } else {
          geoCountry.textContent = `${countryCode} - ${data.country_name || ""} (${t.directNormal})`;
          geoCountry.style.color = "#aaa";
        }
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch {
      try {
        const res2 = await fetch(`https://api.ipify.org?format=json&_=${Date.now()}`);
        const data2 = await res2.json();
        geoIp.textContent = data2.ip || "Unknown";
        geoCountry.textContent = isProxyConfigured ? t.fallbackActive : t.directNormal;
        geoCountry.style.color = "#fff";
      } catch {
        geoIp.textContent = "Error";
        geoCountry.textContent = "Connection failed";
        geoCountry.style.color = "#f87171";
      }
    }

    btnCheckGeo.disabled = false;
    btnCheckGeo.textContent = t.btnCheckIp;
  });

  // Queue Test Handlers
  const btnTestBeep = document.getElementById("btnTestBeep");
  const btnTestQueue = document.getElementById("btnTestQueue");

  if (btnTestBeep) {
    btnTestBeep.addEventListener("click", () => {
      // 1. Play chime locally in popup
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;
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
        }
      } catch {}

      // 2. Also forward to FACEIT tabs
      sendToFaceitTabs({ type: "PATHFINDER_TEST_BEEP" });
    });
  }

  if (btnTestQueue) {
    btnTestQueue.addEventListener("click", () => {
      const origText = btnTestQueue.textContent;
      btnTestQueue.textContent = currentLang === "en" ? "⏱️ Testing on page..." : "⏱️ 画面でテスト中...";
      setTimeout(() => { btnTestQueue.textContent = origText; }, 2500);

      sendToFaceitTabs({ type: "PATHFINDER_TEST_QUEUE" });
    });
  }

  // Force Reset to Direct
  if (btnResetDirect) {
    btnResetDirect.addEventListener("click", () => {
      const t = I18N[currentLang] || I18N.ja;
      elEnableProxy.checked = false;
      saveSettings();
      chrome.runtime.sendMessage({ type: "RESET_PROXY_DIRECT" }, () => {
        geoResult.style.display = "block";
        geoIp.textContent = "DIRECT";
        geoCountry.textContent = t.resetSuccess;
        geoCountry.style.color = "#4ade80";
        chrome.tabs.query({ url: "https://www.faceit.com/*" }, (tabs) => {
          for (const t of tabs) {
            if (t.id) chrome.tabs.reload(t.id).catch(() => {});
          }
        });
      });
    });
  }
})();
