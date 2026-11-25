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
    enableDiscordVeto: true,
    enableProxy: false,
    proxyScheme: "socks5",
    proxyHost: "",
    proxyPort: 1080,
    proxyFaceitOnly: true
  };

  const I18N = {
    ja: {
      tabServers: "🛡️ サーバー",
      tabQueue: "⏱️ キュー",
      tabParty: "👥 パティ",
      tabProxy: "🌐 プロキシ",
      secWhitelist: "サーバー選択",
      vladTitle: "ウラジオストク",
      vladSub: "常に優先（遅延追加なし / 0ms）",
      spoofVvoTitle: "ウラジオストク 30ms 固定表示",
      spoofVvoSub: "表示Pingを緑色(30ms)に固定",
      notifySlotsTitle: "空きスロット検知通知",
      notifySlotsSub: "満員(FULL)から空きが出た際に自動通知",
      novosibirskTitle: "ノボシビルスク許可",
      novosibirskSub: "ノボシビルスクサーバーを対象に含める",
      spoofNskTitle: "ノボシビルスク 30ms 固定表示",
      spoofNskSub: "表示Pingを緑色(30ms)に固定",
      kazakhstanTitle: "カザフスタン許可",
      kazakhstanSub: "カザフスタンサーバーを対象に含める",
      spoofKazTitle: "カザフスタン 30ms 固定表示",
      spoofKazSub: "表示Pingを緑色(30ms)に固定",
      btnSyncText: "最適サーバー自動選択に同期",
      btnSyncSub: "手動選択(4サーバー制限)を解除し、最小ping自動選択に設定",
      btnSyncDone: "✓ 最適化完了 (Optimized Active)",
      btnSyncFail: "⚠️ 同期失敗 (FACEITページを開いてください)",
      secPeak: "ピークタイム",
      peakPeak: "🔥 ピーク時間帯 (マッチング活発)",
      peakMod: "🟡 通常時間帯 (マッチング可能)",
      peakOff: "💤 過疎時間帯 (キュー待機少)",
      peakAdvPeak: "現在プレイヤーが多く、ウラジオストクでのマッチ成立確率が最も高い時間帯です。",
      peakAdvMod: "マッチング可能な時間帯です。5分前後の待機時間が見込まれます。",
      peakAdvOff: "待機時間が長くなりやすい時間帯です。ノヴォシビルスク拡大を防ぐためキュー保護を推奨します。",
      secRadar: "VVO 稼働動向レーダー",
      radarStatusLabel: "サーバー稼働動向",
      radarMonitoring: "集計中...",
      radarBadgeHot: "🔥 RE-QUEUING",
      radarBadgeInGame: "🔴 IN-GAME",
      radarBadgeAvail: "🟢 AVAILABLE",
      radarBadgeIdle: "💤 IDLE",
      radarHotMain: (m) => `直前に試合が終了 (${m}分前)`,
      radarHotSub: "🎯 チャンス: 直前の試合参加者が現在キューを再検索している可能性が最も高い時間帯です！今すぐ検索を開始してください。",
      radarInGameMain: (m) => `試合進行中 (開始から約${m}分経過)`,
      radarInGameSub: (rem) => `💡 予想: あと約${rem}分ほどで試合が終了し、パティがキューに戻る見込みです。`,
      radarAvailMain: (m) => `サーバー空き枠あり (前回稼働: ${m}分前)`,
      radarAvailSub: "サーバーは安定稼働中です。Queue Guardを有効にしてマッチングを開始してください。",
      radarIdleMain: "直近の稼働履歴なし (空き状態)",
      radarIdleSub: "直近で大きな負荷は検知されていません。ピークタイム(17:00〜01:00 VLAT)にキューが活発になります。",
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
      antiSnipeTitle: "アンチスナイプ遅延",
      antiSnipeSub: "検索開始時に2〜7秒のランダム遅延を追加",
      dropOnFullTitle: "満員時の緊急キャンセル",
      dropOnFullSub: "検索中にウラジオストクが満員(FULL)になったら即座に中断",
      cancelAfterTitle: "キャンセル待機秒数",
      cancelAfterSub: "指定秒数で自動再検索（1〜120秒）",
      btnTestBeep: "🔊 警告音テスト",
      btnTestQueue: "⏱️ 画面HUDテスト",
      secUnit: "秒",
      queueNote: "💡 <strong>重要:</strong> FACEITではマッチング開始後、約60秒が経過するとウラジオストク以外の遠隔サーバー（モスクワ・EU）へ検索地域が自動拡大されます。拡大前にキューを再起動することで、ウラジオストク等の希望サーバーに固定できます。",
      secPartyDesc: "パティ設定の共有",
      partyExplainer: "パティ全員で同じ設定コードを共有することで、キュー時間やサーバー設定の不一致による誤マッチを防止します。",
      secPartyExport: "設定コードの書き出し",
      btnExportCode: "📋 現在の設定コードをコピー",
      exportCopied: "✅ コピーしました！Discordやチャットで共有してください",
      secPartyImport: "設定コードの読み込み",
      inputImportPlaceholder: "PF1-... (ここにコードを貼り付け)",
      btnImportCode: "📥 コードを適用する",
      importSuccess: "🎉 設定を同期しました！全設定が更新されました",
      importError: "⚠️ 無効なコードです。正しいPF1コードを入力してください",
      secRoom: "ルーム",
      secDiscord: "DISCORD 通知連携",
      discordTitle: "Discord Webhook連携",
      discordSub: "マッチ確定や空きスロット検知をDiscordへ通知",
      discordUrlLabel: "Webhook URL",
      discordUrlPlaceholder: "https://discord.com/api/webhooks/...",
      webhookBadgeEmpty: "未設定",
      webhookBadgeSet: "設定済み",
      webhookMaskShow: "URLを表示",
      webhookMaskHide: "URLを非表示",
      discordLangTitle: "通知メッセージ言語",
      discordLangSub: "Discordへ送信するメッセージの言語",
      discordPingTitle: "メンション対象 (Discord ID)",
      discordPingSub: "空欄で @everyone / @here。特定IDを指定する場合は入力（カンマ区切り）",
      discordPingPlaceholder: "例: 123456789012345678, 234567890123456789",
      discordMatchTitle: "マッチ確定時の通知 (@everyone)",
      discordMatchSub: "チェックイン発生時にDiscordへ全員通知",
      discordRoomTitle: "マッチルーム開設通知",
      discordRoomSub: "部屋が作成されたらDiscordへ直リンクを送信",
      discordServerIpTitle: "サーバーIP (Connect) 通知",
      discordServerIpSub: "サーバー準備完了時にCS2接続コマンドをDiscordへ送信",
      discordSlotsTitle: "空きスロット検知通知 (@here)",
      discordSlotsSub: "満員から空きが出た際にDiscordへ通知",
      relayChatTitle: "マッチチャットのDiscord転送",
      relayChatSub: "部屋チャット（味方の発言）をDiscordへ転送（試合・ナイフラウンド開始まで有効）",
      discordInboundTitle: "Discord ➔ FACEIT チャット逆転送",
      discordInboundSub: "Discordの指定チャンネルに書いた発言をチームチャットへ送信（ウォームアップ終了まで有効）",
      discordVetoTitle: "Discord Veto (リモートマップBAN)",
      discordVetoSub: "BAN番時にDiscordへボタン送信し、スマホからタップでBAN",
      tBotTokenLabel: "Discord Bot Token:",
      tBotChannelLabel: "送信先 Channel ID:",
      tBotAuthorLabel: "あなたの Discord User ID (この人のみ許可):",
      tInboundPrefixTitle: "[Discord] タグを付与",
      tInboundPrefixSub: "発言の先頭に「[Discord] 」プレフィックスを付ける",
      btnTestDiscordBot: "🧪 Bot 接続テスト",
      btnTestDiscordVeto: "🗺️ マップBANテスト",
      btnTestDiscordVetoServer: "🌐 サーバーBANテスト",
      btnDemoFullVeto: "🎮 フルVetoシミュレーション (Real Match Demo)",
      btnTestingBot: "⏳ Bot接続確認中...",
      botTestSuccess: (name) => `✅ 接続成功！Bot: "${name}"`,
      botTestError: (err) => `❌ 接続失敗: ${err || "Token無効"}`,
      langNoticeTitle: "チャット言語自動送信 (英語/日本語)",
      langNoticeSub: "部屋作成時に「英語・日本語希望」を自動発言",
      btnTestLangNotice: "💬 現在の部屋でテスト発言",
      btnTestingLangNotice: "⏳ 部屋でテスト中...",
      btnTestDiscord: "🔔 Discordテスト送信",
      btnTestingDiscord: "⏳ 送信中...",
      btnDemoDiscord: "🧪 有効な通知の連続デモテスト",
      btnDemoTesting: "⏳ デモ送信中...",
      demoNoticeProgress: (cur, total, name) => `🎬 [${cur}/${total}] ${name} を送信中...`,
      demoNoticeDone: (n) => `✅ 有効な全通知 (${n}件) のデモ送信が完了しました！`,
      demoNoneActive: "⚠️ 有効な通知がありません。上のスイッチをONにしてください",
      discordSuccess: "✅ テスト通知を送信しました！Discordを確認してください",
      discordErrorEmpty: "⚠️ Webhook URLを入力してください",
      discordErrorInvalid: "⚠️ 無効なDiscord Webhook URLです",
      discordErrorFailed: "⚠️ 送信に失敗しました。URLを確認してください",
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
      tabQueue: "⏱️ Queue",
      tabParty: "👥 Party",
      tabProxy: "🌐 Proxy",
      secWhitelist: "Server Whitelist",
      vladTitle: "Vladivostok (EU)",
      vladSub: "Always prioritized (No delay / 0ms)",
      spoofVvoTitle: "Lock Vladivostok to 30ms",
      spoofVvoSub: "Display solid green 30ms ping on FACEIT",
      notifySlotsTitle: "Server Slot Free Alert",
      notifySlotsSub: "Notify when Vladivostok frees up from FULL",
      novosibirskTitle: "Allow Novosibirsk",
      novosibirskSub: "Include Novosibirsk in server pool",
      spoofNskTitle: "Lock Novosibirsk to 30ms",
      spoofNskSub: "Display solid green 30ms ping on FACEIT",
      kazakhstanTitle: "Allow Kazakhstan",
      kazakhstanSub: "Include Kazakhstan in server pool",
      spoofKazTitle: "Lock Kazakhstan to 30ms",
      spoofKazSub: "Display solid green 30ms ping on FACEIT",
      btnSyncText: "Sync to Optimized Location",
      btnSyncSub: "Reset manual 4-server selection and lock to lowest ping",
      btnSyncDone: "✓ Synced to Optimized Location",
      btnSyncFail: "⚠️ Sync failed (Open FACEIT page first)",
      secPeak: "Peak Hours",
      peakPeak: "🔥 PEAK HOURS (High Population)",
      peakMod: "🟡 MODERATE (Normal Queue)",
      peakOff: "💤 OFF-PEAK (Low Population)",
      peakAdvPeak: "High player traffic. Maximum chance of locking pure Vladivostok matches.",
      peakAdvMod: "Active matchmaking. Average queue times around 3-6 minutes.",
      peakAdvOff: "Long queue times expected. Keep Queue Guard enabled to avoid server expansion.",
      secRadar: "VVO Activity Radar",
      radarStatusLabel: "Server Dynamics",
      radarMonitoring: "MONITORING",
      radarBadgeHot: "🔥 RE-QUEUING",
      radarBadgeInGame: "🔴 IN-GAME",
      radarBadgeAvail: "🟢 AVAILABLE",
      radarBadgeIdle: "💤 IDLE",
      radarHotMain: (m) => `Match just ended (${m}m ago)`,
      radarHotSub: "🎯 Prime time to queue! Players from the previous match are likely re-queuing right now.",
      radarInGameMain: (m) => `Matches in progress (started ~${m}m ago)`,
      radarInGameSub: (rem) => `💡 Expect stacks to finish and re-queue in ~${rem} min.`,
      radarAvailMain: (m) => `Server open (Last busy: ${m}m ago)`,
      radarAvailSub: "Server capacity is available. Safe to queue with Queue Guard enabled.",
      radarIdleMain: "No recent heavy traffic recorded (Idle)",
      radarIdleSub: "No high load detected recently. Queues typically peak between 17:00 - 01:00 VLAT.",
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
      antiSnipeTitle: "Anti-Snipe Delay",
      antiSnipeSub: "Random 2-7s jitter before matchmaking starts",
      dropOnFullTitle: "Emergency Cancel on FULL",
      dropOnFullSub: "Auto-drop queue if Vladivostok becomes FULL while searching",
      cancelAfterTitle: "Cancel After (Seconds)",
      cancelAfterSub: "Re-queue threshold (1 to 120s)",
      btnTestBeep: "🔊 Test Alert Sound",
      btnTestQueue: "⏱️ Test HUD Timer",
      secUnit: "s",
      queueNote: "💡 <strong>Note:</strong> FACEIT expands matchmaking beyond Vladivostok to Moscow/EU after ~60s if players are insufficient. Re-queuing before expansion keeps you locked to preferred nodes.",
      secPartyDesc: "Party Matchmaking Sync",
      partyExplainer: "Share your configuration code with your party to ensure all members use identical queue thresholds and server whitelists.",
      secPartyExport: "Export Config Code",
      btnExportCode: "📋 Copy Current Settings Code",
      exportCopied: "✅ Copied to clipboard! Share with your party in Discord",
      secPartyImport: "Import Config Code",
      inputImportPlaceholder: "PF1-... (Paste party code here)",
      btnImportCode: "📥 Apply Code",
      importSuccess: "🎉 Settings synchronized! All options updated",
      importError: "⚠️ Invalid code. Please enter a valid PF1 code",
      secRoom: "ROOM",
      secDiscord: "DISCORD ALERTS",
      discordTitle: "Discord Webhook Integration",
      discordSub: "Forward match found & slot free alerts to Discord",
      discordUrlLabel: "Webhook URL",
      discordUrlPlaceholder: "https://discord.com/api/webhooks/...",
      webhookBadgeEmpty: "NOT SET",
      webhookBadgeSet: "CONFIGURED",
      webhookMaskShow: "Show URL",
      webhookMaskHide: "Hide URL",
      discordLangTitle: "Message Language",
      discordLangSub: "Language of notifications sent to Discord",
      discordPingTitle: "Mention Target (Discord ID)",
      discordPingSub: "Blank for @everyone / @here. Enter user/role IDs (comma separated)",
      discordPingPlaceholder: "e.g. 123456789012345678, 234567890123456789",
      discordMatchTitle: "Match Ready Alert (@everyone)",
      discordMatchSub: "Notify party when match check-in appears (30s)",
      discordRoomTitle: "Live Match Room Alert",
      discordRoomSub: "Send clickable match room URL to Discord when ready",
      discordServerIpTitle: "Server Connect IP Alerts",
      discordServerIpSub: "Send CS2 console connect string to Discord when server is ready",
      discordSlotsTitle: "Slot Free Alert (@here)",
      discordSlotsSub: "Notify party when Vladivostok slots open up",
      relayChatTitle: "Relay Room Chat to Discord",
      relayChatSub: "Forward teammates' match room chat to Discord (active until knife round/match starts)",
      discordInboundTitle: "Discord ➔ Team Chat (Inbound Relay)",
      discordInboundSub: "Forward messages from Discord channel into FACEIT Team Chat (active until warmup ends)",
      discordVetoTitle: "Discord Veto (Remote Map BAN)",
      discordVetoSub: "Send map ban buttons to Discord on your turn to ban from phone",
      tBotTokenLabel: "Discord Bot Token:",
      tBotChannelLabel: "Channel ID:",
      tBotAuthorLabel: "Your Discord User ID (whitelist only):",
      tInboundPrefixTitle: "Prefix with [Discord] tag",
      tInboundPrefixSub: "Prepend '[Discord] ' to messages sent into game",
      btnTestDiscordBot: "🧪 Test Bot Connection",
      btnTestDiscordVeto: "🗺️ Test Map Veto",
      btnTestDiscordVetoServer: "🌐 Test Server Veto",
      btnDemoFullVeto: "🎮 Full Veto Simulation (Real Match Demo)",
      btnTestingBot: "⏳ Checking Bot...",
      botTestSuccess: (name) => `✅ Connected! Bot: "${name}"`,
      botTestError: (err) => `❌ Failed: ${err || "Invalid Token"}`,
      langNoticeTitle: "Language Barrier Auto-Message",
      langNoticeSub: "Automatically post 'I don't speak Russian, English please' when room forms",
      btnTestLangNotice: "💬 Test Send in Current Room",
      btnTestingLangNotice: "⏳ Testing in room...",
      btnTestDiscord: "🔔 Send Test Alert",
      btnTestingDiscord: "⏳ Sending...",
      btnDemoDiscord: "🧪 Demo Active Alerts (Sequential Test)",
      btnDemoTesting: "⏳ Sending Demo...",
      demoNoticeProgress: (cur, total, name) => `🎬 [${cur}/${total}] Sending ${name}...`,
      demoNoticeDone: (n) => `✅ Demo alerts sent for all ${n} active notifications!`,
      demoNoneActive: "⚠️ No alerts enabled. Turn on at least one toggle above.",
      discordSuccess: "✅ Test message sent! Check your Discord channel",
      discordErrorEmpty: "⚠️ Please enter a Discord Webhook URL",
      discordErrorInvalid: "⚠️ Invalid Discord Webhook URL",
      discordErrorFailed: "⚠️ Failed to send test webhook. Check your URL",
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
    if (document.getElementById("tabBtnParty")) document.getElementById("tabBtnParty").textContent = t.tabParty;
    document.getElementById("tabBtnProxy").textContent = t.tabProxy;

    document.getElementById("tSecWhitelist").textContent = t.secWhitelist;
    document.getElementById("tVladTitle").innerHTML = `<span class="badge-live"></span> ${t.vladTitle}`;
    document.getElementById("tVladSub").textContent = t.vladSub;
    if (document.getElementById("tSpoofVvoTitle")) document.getElementById("tSpoofVvoTitle").textContent = t.spoofVvoTitle;
    if (document.getElementById("tSpoofVvoSub")) document.getElementById("tSpoofVvoSub").textContent = t.spoofVvoSub;
    if (document.getElementById("tNotifySlotsTitle")) document.getElementById("tNotifySlotsTitle").textContent = t.notifySlotsTitle;
    if (document.getElementById("tNotifySlotsSub")) document.getElementById("tNotifySlotsSub").textContent = t.notifySlotsSub;
    document.getElementById("tNovosibirskTitle").textContent = t.novosibirskTitle;
    document.getElementById("tNovosibirskSub").textContent = t.novosibirskSub;
    if (document.getElementById("tSpoofNskTitle")) document.getElementById("tSpoofNskTitle").textContent = t.spoofNskTitle;
    if (document.getElementById("tSpoofNskSub")) document.getElementById("tSpoofNskSub").textContent = t.spoofNskSub;
    document.getElementById("tKazakhstanTitle").textContent = t.kazakhstanTitle;
    document.getElementById("tKazakhstanSub").textContent = t.kazakhstanSub;
    if (document.getElementById("tSpoofKazTitle")) document.getElementById("tSpoofKazTitle").textContent = t.spoofKazTitle;
    if (document.getElementById("tSpoofKazSub")) document.getElementById("tSpoofKazSub").textContent = t.spoofKazSub;
    if (document.getElementById("btnSyncText")) document.getElementById("btnSyncText").textContent = t.btnSyncText;
    if (document.getElementById("btnSyncSub")) document.getElementById("btnSyncSub").textContent = t.btnSyncSub;

    if (document.getElementById("tSecPeak")) document.getElementById("tSecPeak").textContent = t.secPeak;
    if (document.getElementById("tSecRadar")) document.getElementById("tSecRadar").textContent = t.secRadar;
    if (document.getElementById("tRadarStatusLabel")) document.getElementById("tRadarStatusLabel").textContent = t.radarStatusLabel;

    document.getElementById("tSecLatency").textContent = t.secLatency;
    document.getElementById("btnTestPing").textContent = t.btnTestPing;

    document.getElementById("tSecQueue").textContent = t.secQueue;
    document.getElementById("tQueueTimerTitle").textContent = t.queueTimerTitle;
    document.getElementById("tQueueTimerSub").textContent = t.queueTimerSub;
    document.getElementById("tAutoCancelTitle").textContent = t.autoCancelTitle;
    document.getElementById("tAutoCancelSub").textContent = t.autoCancelSub;
    if (document.getElementById("tAutoRestartTitle")) document.getElementById("tAutoRestartTitle").textContent = t.autoRestartTitle;
    if (document.getElementById("tAutoRestartSub")) document.getElementById("tAutoRestartSub").textContent = t.autoRestartSub;
    if (document.getElementById("tAntiSnipeTitle")) document.getElementById("tAntiSnipeTitle").textContent = t.antiSnipeTitle;
    if (document.getElementById("tAntiSnipeSub")) document.getElementById("tAntiSnipeSub").textContent = t.antiSnipeSub;
    if (document.getElementById("tDropOnFullTitle")) document.getElementById("tDropOnFullTitle").textContent = t.dropOnFullTitle;
    if (document.getElementById("tDropOnFullSub")) document.getElementById("tDropOnFullSub").textContent = t.dropOnFullSub;
    document.getElementById("tCancelAfterTitle").textContent = t.cancelAfterTitle;
    document.getElementById("tCancelAfterSub").textContent = t.cancelAfterSub;
    if (document.getElementById("btnTestBeep")) document.getElementById("btnTestBeep").textContent = t.btnTestBeep;
    if (document.getElementById("btnTestQueue")) document.getElementById("btnTestQueue").textContent = t.btnTestQueue;
    document.getElementById("tSecUnit").textContent = t.secUnit;
    document.getElementById("tQueueNote").innerHTML = t.queueNote;

    if (document.getElementById("tSecPartyDesc")) document.getElementById("tSecPartyDesc").textContent = t.secPartyDesc;
    if (document.getElementById("tPartyExplainer")) document.getElementById("tPartyExplainer").textContent = t.partyExplainer;
    if (document.getElementById("tSecPartyExport")) document.getElementById("tSecPartyExport").textContent = t.secPartyExport;
    if (document.getElementById("btnExportCode")) document.getElementById("btnExportCode").textContent = t.btnExportCode;
    if (document.getElementById("tSecPartyImport")) document.getElementById("tSecPartyImport").textContent = t.secPartyImport;
    if (document.getElementById("inputImportCode")) document.getElementById("inputImportCode").placeholder = t.inputImportPlaceholder;
    if (document.getElementById("btnImportCode")) document.getElementById("btnImportCode").textContent = t.btnImportCode;

    if (document.getElementById("tSecRoom")) document.getElementById("tSecRoom").textContent = t.secRoom;
    if (document.getElementById("tSecDiscord")) document.getElementById("tSecDiscord").textContent = t.secDiscord;
    if (document.getElementById("tDiscordTitle")) document.getElementById("tDiscordTitle").textContent = t.discordTitle;
    if (document.getElementById("tDiscordSub")) document.getElementById("tDiscordSub").textContent = t.discordSub;
    if (document.getElementById("tDiscordUrlLabel")) document.getElementById("tDiscordUrlLabel").textContent = t.discordUrlLabel;
    if (document.getElementById("discordWebhookUrl")) document.getElementById("discordWebhookUrl").placeholder = t.discordUrlPlaceholder;
    if (document.getElementById("tDiscordLangTitle")) document.getElementById("tDiscordLangTitle").textContent = t.discordLangTitle;
    if (document.getElementById("tDiscordLangSub")) document.getElementById("tDiscordLangSub").textContent = t.discordLangSub;
    if (document.getElementById("tDiscordPingTitle")) document.getElementById("tDiscordPingTitle").textContent = t.discordPingTitle;
    if (document.getElementById("tDiscordPingSub")) document.getElementById("tDiscordPingSub").textContent = t.discordPingSub;
    if (document.getElementById("discordCustomPing")) document.getElementById("discordCustomPing").placeholder = t.discordPingPlaceholder;
    if (document.getElementById("tDiscordMatchTitle")) document.getElementById("tDiscordMatchTitle").textContent = t.discordMatchTitle;
    if (document.getElementById("tDiscordMatchSub")) document.getElementById("tDiscordMatchSub").textContent = t.discordMatchSub;
    if (document.getElementById("tDiscordRoomTitle")) document.getElementById("tDiscordRoomTitle").textContent = t.discordRoomTitle;
    if (document.getElementById("tDiscordRoomSub")) document.getElementById("tDiscordRoomSub").textContent = t.discordRoomSub;
    if (document.getElementById("tDiscordServerIpTitle")) document.getElementById("tDiscordServerIpTitle").textContent = t.discordServerIpTitle;
    if (document.getElementById("tDiscordServerIpSub")) document.getElementById("tDiscordServerIpSub").textContent = t.discordServerIpSub;
    if (document.getElementById("tDiscordSlotsTitle")) document.getElementById("tDiscordSlotsTitle").textContent = t.discordSlotsTitle;
    if (document.getElementById("tDiscordSlotsSub")) document.getElementById("tDiscordSlotsSub").textContent = t.discordSlotsSub;
    if (document.getElementById("tRelayChatTitle")) document.getElementById("tRelayChatTitle").textContent = t.relayChatTitle;
    if (document.getElementById("tRelayChatSub")) document.getElementById("tRelayChatSub").textContent = t.relayChatSub;
    if (document.getElementById("tDiscordInboundTitle")) document.getElementById("tDiscordInboundTitle").textContent = t.discordInboundTitle;
    if (document.getElementById("tDiscordInboundSub")) document.getElementById("tDiscordInboundSub").textContent = t.discordInboundSub;
    if (document.getElementById("tDiscordVetoTitle")) document.getElementById("tDiscordVetoTitle").textContent = t.discordVetoTitle;
    if (document.getElementById("tDiscordVetoSub")) document.getElementById("tDiscordVetoSub").textContent = t.discordVetoSub;
    if (document.getElementById("tBotTokenLabel")) document.getElementById("tBotTokenLabel").textContent = t.tBotTokenLabel;
    if (document.getElementById("tBotChannelLabel")) document.getElementById("tBotChannelLabel").textContent = t.tBotChannelLabel;
    if (document.getElementById("tBotAuthorLabel")) document.getElementById("tBotAuthorLabel").textContent = t.tBotAuthorLabel;
    if (document.getElementById("tInboundPrefixTitle")) document.getElementById("tInboundPrefixTitle").textContent = t.tInboundPrefixTitle;
    if (document.getElementById("tInboundPrefixSub")) document.getElementById("tInboundPrefixSub").textContent = t.tInboundPrefixSub;
    if (document.getElementById("btnTestDiscordBot")) document.getElementById("btnTestDiscordBot").textContent = t.btnTestDiscordBot;
    if (document.getElementById("btnTestDiscordVeto")) document.getElementById("btnTestDiscordVeto").textContent = t.btnTestDiscordVeto;
    if (document.getElementById("btnTestDiscordVetoServer")) document.getElementById("btnTestDiscordVetoServer").textContent = t.btnTestDiscordVetoServer;
    if (document.getElementById("btnDemoFullVeto")) document.getElementById("btnDemoFullVeto").textContent = t.btnDemoFullVeto;
    if (btnToggleBotMask) {
      const isPass = elDiscordBotToken ? elDiscordBotToken.type === "password" : true;
      btnToggleBotMask.textContent = isPass ? (lang === "ja" ? "表示" : "Show") : (lang === "ja" ? "隠す" : "Hide");
    }
    if (document.getElementById("tLangNoticeTitle")) document.getElementById("tLangNoticeTitle").textContent = t.langNoticeTitle;
    if (document.getElementById("tLangNoticeSub")) document.getElementById("tLangNoticeSub").textContent = t.langNoticeSub;
    if (document.getElementById("btnTestLangNotice")) document.getElementById("btnTestLangNotice").textContent = t.btnTestLangNotice;
    if (document.getElementById("btnTestDiscord")) document.getElementById("btnTestDiscord").textContent = t.btnTestDiscord;
    if (document.getElementById("btnDemoDiscord")) document.getElementById("btnDemoDiscord").textContent = t.btnDemoDiscord;

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
    updateWebhookBadge();
  }

  // DOM Elements - Controls
  const elNovosibirsk = document.getElementById("allowNovosibirsk");
  const elSpoofNsk = document.getElementById("spoofNskPing");
  const elKazakhstan = document.getElementById("allowKazakhstan");
  const elSpoofKaz = document.getElementById("spoofKazPing");
  const elSpoofVvo = document.getElementById("spoofVvoPing");
  const elNotifyVvoSlots = document.getElementById("notifyVvoSlots");
  const badgeNovosibirsk = document.getElementById("badge-novosibirsk");
  const badgeKazakhstan = document.getElementById("badge-kazakhstan");
  const btnTestPing = document.getElementById("btnTestPing");

  const elQueueTimer = document.getElementById("enableQueueTimer");
  const elAutoCancel = document.getElementById("autoCancelQueue");
  const elAutoCancelSeconds = document.getElementById("autoCancelSeconds");
  const rowAutoCancelTime = document.getElementById("rowAutoCancelTime");
  const elAutoRestart = document.getElementById("autoRestartQueue");
  const elAntiSnipe = document.getElementById("enableAntiSnipe");
  const elDropQueueOnFull = document.getElementById("dropQueueOnVvoFull");
  const rowAutoRestart = document.getElementById("rowAutoRestart");
  const rowSpoofNsk = document.getElementById("rowSpoofNsk");
  const rowSpoofKaz = document.getElementById("rowSpoofKaz");

  const elEnableDiscordAlerts = document.getElementById("enableDiscordAlerts");
  const discordConfigBody = document.getElementById("discordConfigBody");
  const elDiscordWebhookUrl = document.getElementById("discordWebhookUrl");
  const elDiscordLang = document.getElementById("discordLang");
  const elDiscordCustomPing = document.getElementById("discordCustomPing");
  const elDiscordNotifyMatch = document.getElementById("discordNotifyMatch");
  const elDiscordNotifyRoom = document.getElementById("discordNotifyRoom");
  const elDiscordNotifyServerIp = document.getElementById("discordNotifyServerIp");
  const elDiscordNotifySlots = document.getElementById("discordNotifySlots");
  const elDiscordRelayRoomChat = document.getElementById("discordRelayRoomChat");
  const elEnableDiscordInbound = document.getElementById("enableDiscordInbound");
  const discordInboundBody = document.getElementById("discordInboundBody");
  const elDiscordBotToken = document.getElementById("discordBotToken");
  const btnToggleBotMask = document.getElementById("btnToggleBotMask");
  const elDiscordBotChannelId = document.getElementById("discordBotChannelId");
  const elDiscordBotAuthorId = document.getElementById("discordBotAuthorId");
  const elDiscordInboundTagPrefix = document.getElementById("discordInboundTagPrefix");
  const elEnableDiscordVeto = document.getElementById("enableDiscordVeto");
  const btnTestDiscordBot = document.getElementById("btnTestDiscordBot");
  const btnTestDiscordVeto = document.getElementById("btnTestDiscordVeto");
  const btnTestDiscordVetoServer = document.getElementById("btnTestDiscordVetoServer");
  const btnDemoFullVeto = document.getElementById("btnDemoFullVeto");
  const discordBotNotice = document.getElementById("discordBotNotice");
  const elAutoSendLanguageNotice = document.getElementById("autoSendLanguageNotice");
  const langNoticeCustomBody = document.getElementById("langNoticeCustomBody");
  const elLanguageNoticeText = document.getElementById("languageNoticeText");
  const btnTestLangNotice = document.getElementById("btnTestLangNotice");
  const btnTestDiscord = document.getElementById("btnTestDiscord");
  const btnDemoDiscord = document.getElementById("btnDemoDiscord");
  const discordNotice = document.getElementById("discordNotice");
  const webhookStatusBadge = document.getElementById("webhookStatusBadge");
  const btnToggleWebhookMask = document.getElementById("btnToggleWebhookMask");

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
    const cancelOn = !!elAutoCancel.checked;
    if (rowAutoCancelTime) {
      rowAutoCancelTime.style.opacity = cancelOn ? "1" : "0.35";
      rowAutoCancelTime.style.pointerEvents = cancelOn ? "auto" : "none";
      elAutoCancelSeconds.disabled = !cancelOn;
    }
    if (rowAutoRestart) {
      rowAutoRestart.style.opacity = cancelOn ? "1" : "0.35";
      rowAutoRestart.style.pointerEvents = cancelOn ? "auto" : "none";
      if (elAutoRestart) {
        elAutoRestart.disabled = !cancelOn;
        if (!cancelOn) {
          elAutoRestart.checked = false;
        }
      }
    }
  }

  function updateSubtogglesVisibility() {
    const nskOn = !!elNovosibirsk.checked;
    if (rowSpoofNsk) {
      rowSpoofNsk.style.opacity = nskOn ? "1" : "0.35";
      rowSpoofNsk.style.pointerEvents = nskOn ? "auto" : "none";
      if (elSpoofNsk) {
        elSpoofNsk.disabled = !nskOn;
        if (!nskOn) elSpoofNsk.checked = false;
      }
    }
    const kazOn = !!elKazakhstan.checked;
    if (rowSpoofKaz) {
      rowSpoofKaz.style.opacity = kazOn ? "1" : "0.35";
      rowSpoofKaz.style.pointerEvents = kazOn ? "auto" : "none";
      if (elSpoofKaz) {
        elSpoofKaz.disabled = !kazOn;
        if (!kazOn) elSpoofKaz.checked = false;
      }
    }
  }

  function updateDiscordVisibility() {
    const on = !!(elEnableDiscordAlerts && elEnableDiscordAlerts.checked);
    if (discordConfigBody) {
      discordConfigBody.style.opacity = on ? "1" : "0.35";
      discordConfigBody.style.pointerEvents = on ? "auto" : "none";
    }
  }

  function updateDiscordInboundVisibility() {
    const on = !!(elEnableDiscordInbound && elEnableDiscordInbound.checked);
    if (discordInboundBody) {
      discordInboundBody.style.display = on ? "block" : "none";
    }
  }

  function updateLanguageNoticeVisibility() {
    if (langNoticeCustomBody && elAutoSendLanguageNotice) {
      langNoticeCustomBody.style.display = elAutoSendLanguageNotice.checked ? "block" : "none";
    }
  }

  function updateWebhookBadge() {
    if (!webhookStatusBadge) return;
    const t = I18N[currentLang] || I18N.ja;
    const val = elDiscordWebhookUrl ? elDiscordWebhookUrl.value.trim() : "";
    if (val.length > 0) {
      webhookStatusBadge.textContent = t.webhookBadgeSet || "設定済み";
      webhookStatusBadge.style.background = "rgba(74, 222, 128, 0.15)";
      webhookStatusBadge.style.color = "#4ade80";
      webhookStatusBadge.style.borderColor = "rgba(74, 222, 128, 0.35)";
    } else {
      webhookStatusBadge.textContent = t.webhookBadgeEmpty || "未設定";
      webhookStatusBadge.style.background = "#262626";
      webhookStatusBadge.style.color = "#777777";
      webhookStatusBadge.style.borderColor = "#333333";
    }
    if (btnToggleWebhookMask && elDiscordWebhookUrl) {
      btnToggleWebhookMask.title = elDiscordWebhookUrl.type === "password" ? (t.webhookMaskShow || "URLを表示") : (t.webhookMaskHide || "URLを非表示");
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

    if (!elNovosibirsk.checked && elSpoofNsk) {
      elSpoofNsk.checked = false;
    }
    if (!elKazakhstan.checked && elSpoofKaz) {
      elSpoofKaz.checked = false;
    }
    if (!elAutoCancel.checked && elAutoRestart) {
      elAutoRestart.checked = false;
    }

    const config = {
      lang: currentLang,
      allowNovosibirsk: elNovosibirsk.checked,
      spoofNskPing: elNovosibirsk.checked && elSpoofNsk ? elSpoofNsk.checked : false,
      allowKazakhstan: elKazakhstan.checked,
      spoofKazPing: elKazakhstan.checked && elSpoofKaz ? elSpoofKaz.checked : false,
      spoofVvoPing: elSpoofVvo ? elSpoofVvo.checked : true,
      notifyVvoSlots: elNotifyVvoSlots ? elNotifyVvoSlots.checked : true,
      enableQueueTimer: elQueueTimer.checked,
      enableQueueBeep: elQueueTimer.checked,
      autoCancelQueue: elAutoCancel.checked,
      autoRestartQueue: elAutoCancel.checked && elAutoRestart ? elAutoRestart.checked : false,
      autoCancelSeconds: secs,
      enableAntiSnipe: elAntiSnipe ? elAntiSnipe.checked : false,
      dropQueueOnVvoFull: elDropQueueOnFull ? elDropQueueOnFull.checked : true,
      enableDiscordAlerts: elEnableDiscordAlerts ? elEnableDiscordAlerts.checked : false,
      discordWebhookUrl: elDiscordWebhookUrl ? elDiscordWebhookUrl.value.trim() : "",
      discordLang: elDiscordLang ? elDiscordLang.value : "ja",
      discordCustomPing: elDiscordCustomPing ? elDiscordCustomPing.value.trim() : "",
      discordNotifyMatch: elDiscordNotifyMatch ? elDiscordNotifyMatch.checked : true,
      discordNotifyRoom: elDiscordNotifyRoom ? elDiscordNotifyRoom.checked : true,
      discordNotifyServerIp: elDiscordNotifyServerIp ? elDiscordNotifyServerIp.checked : false,
      discordNotifySlots: elDiscordNotifySlots ? elDiscordNotifySlots.checked : false,
      discordRelayRoomChat: elDiscordRelayRoomChat ? elDiscordRelayRoomChat.checked : false,
      enableDiscordInbound: elEnableDiscordInbound ? elEnableDiscordInbound.checked : false,
      discordBotToken: elDiscordBotToken ? elDiscordBotToken.value.trim() : "",
      discordBotChannelId: elDiscordBotChannelId ? elDiscordBotChannelId.value.trim() : "",
      discordBotAuthorId: elDiscordBotAuthorId ? elDiscordBotAuthorId.value.trim() : "",
      discordInboundTagPrefix: elDiscordInboundTagPrefix ? elDiscordInboundTagPrefix.checked : false,
      enableDiscordVeto: elEnableDiscordVeto ? elEnableDiscordVeto.checked : true,
      autoSendLanguageNotice: elAutoSendLanguageNotice ? elAutoSendLanguageNotice.checked : false,
      languageNoticeText: elLanguageNoticeText ? elLanguageNoticeText.value.trim() : "Hello team! English or Japanese please / 英語または日本語でお願いします",
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
      updateSubtogglesVisibility();
      updateDiscordVisibility();
      updateDiscordInboundVisibility();
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

  function updateRadarUI() {
    const t = I18N[currentLang] || I18N.ja;
    const badge = document.getElementById("badgeRadarState");
    const mainEl = document.getElementById("tRadarMainText");
    const subEl = document.getElementById("tRadarSubText");
    if (!badge || !mainEl) return;

    chrome.storage.local.get(["vvoRadar"], (res) => {
      const radar = res?.vvoRadar;
      const now = Date.now();

      if (!radar || (!radar.lastBusyStart && !radar.lastMatchEnded)) {
        badge.textContent = t.radarBadgeIdle;
        badge.style.borderColor = "#444";
        badge.style.color = "#888";
        mainEl.textContent = t.radarIdleMain;
        mainEl.style.color = "#bbb";
        if (subEl) subEl.textContent = t.radarIdleSub;
        return;
      }

      const isCurrentlyBusy = radar.lastState === "FULL" || radar.lastState === "HIGH_TRAFFIC" || radar.lastState === "LOCATION_CAPACITY_STATUS_FULL" || radar.lastState === "LOCATION_CAPACITY_STATUS_HIGH_TRAFFIC";
      const timeSinceBusy = radar.lastBusyStart ? Math.max(0, now - radar.lastBusyStart) : Infinity;
      const minsSinceBusy = Math.floor(timeSinceBusy / 60000);

      const timeSinceEnd = radar.lastMatchEnded ? Math.max(0, now - radar.lastMatchEnded) : Infinity;
      const minsSinceEnd = Math.floor(timeSinceEnd / 60000);

      if (isCurrentlyBusy) {
        badge.textContent = t.radarBadgeInGame;
        badge.style.borderColor = "#7f1d1d";
        badge.style.color = "#f87171";
        mainEl.textContent = t.radarInGameMain(minsSinceBusy);
        mainEl.style.color = "#fca5a5";
        const remaining = Math.max(0, 40 - minsSinceBusy);
        if (subEl) subEl.textContent = t.radarInGameSub(remaining);
      } else if (minsSinceEnd <= 12) {
        badge.textContent = t.radarBadgeHot;
        badge.style.borderColor = "#15803d";
        badge.style.color = "#4ade80";
        mainEl.textContent = t.radarHotMain(minsSinceEnd);
        mainEl.style.color = "#4ade80";
        if (subEl) subEl.textContent = t.radarHotSub;
      } else if (minsSinceBusy <= 90) {
        badge.textContent = t.radarBadgeAvail;
        badge.style.borderColor = "#22c55e";
        badge.style.color = "#22c55e";
        mainEl.textContent = t.radarAvailMain(minsSinceBusy);
        mainEl.style.color = "#eee";
        if (subEl) subEl.textContent = t.radarAvailSub;
      } else {
        badge.textContent = t.radarBadgeIdle;
        badge.style.borderColor = "#444";
        badge.style.color = "#888";
        mainEl.textContent = t.radarIdleMain;
        mainEl.style.color = "#bbb";
        if (subEl) subEl.textContent = t.radarIdleSub;
      }
    });
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
    if (elSpoofNsk) elSpoofNsk.checked = elNovosibirsk.checked && !!config.spoofNskPing;
    elKazakhstan.checked = !!config.allowKazakhstan;
    if (elSpoofKaz) elSpoofKaz.checked = elKazakhstan.checked && !!config.spoofKazPing;
    if (elSpoofVvo) elSpoofVvo.checked = config.spoofVvoPing !== false;
    if (elNotifyVvoSlots) elNotifyVvoSlots.checked = config.notifyVvoSlots !== false;
    elQueueTimer.checked = !!config.enableQueueTimer;
    elAutoCancel.checked = !!config.autoCancelQueue;
    if (elAutoRestart) elAutoRestart.checked = elAutoCancel.checked && !!config.autoRestartQueue;
    elAutoCancelSeconds.value = Number(config.autoCancelSeconds) || 58;
    if (elAntiSnipe) elAntiSnipe.checked = !!config.enableAntiSnipe;
    if (elDropQueueOnFull) elDropQueueOnFull.checked = config.dropQueueOnVvoFull !== false;
    if (elEnableDiscordAlerts) elEnableDiscordAlerts.checked = !!config.enableDiscordAlerts;
    if (elDiscordWebhookUrl) elDiscordWebhookUrl.value = config.discordWebhookUrl || "";
    if (elDiscordLang) elDiscordLang.value = config.discordLang || "ja";
    if (elDiscordCustomPing) elDiscordCustomPing.value = config.discordCustomPing || "";
    if (elDiscordNotifyMatch) elDiscordNotifyMatch.checked = config.discordNotifyMatch !== false;
    if (elDiscordNotifyRoom) elDiscordNotifyRoom.checked = config.discordNotifyRoom !== false;
    if (elDiscordNotifyServerIp) elDiscordNotifyServerIp.checked = !!config.discordNotifyServerIp;
    if (elDiscordNotifySlots) elDiscordNotifySlots.checked = !!config.discordNotifySlots;
    if (elDiscordRelayRoomChat) elDiscordRelayRoomChat.checked = !!config.discordRelayRoomChat;
    if (elEnableDiscordInbound) elEnableDiscordInbound.checked = !!config.enableDiscordInbound;
    if (elDiscordBotToken) elDiscordBotToken.value = config.discordBotToken || "";
    if (elDiscordBotChannelId) elDiscordBotChannelId.value = config.discordBotChannelId || "";
    if (elDiscordBotAuthorId) elDiscordBotAuthorId.value = config.discordBotAuthorId || "";
    if (elDiscordInboundTagPrefix) elDiscordInboundTagPrefix.checked = !!config.discordInboundTagPrefix;
    if (elEnableDiscordVeto) elEnableDiscordVeto.checked = config.enableDiscordVeto !== false;
    updateDiscordInboundVisibility();
    if (elAutoSendLanguageNotice) elAutoSendLanguageNotice.checked = !!config.autoSendLanguageNotice;
    if (elLanguageNoticeText) elLanguageNoticeText.value = config.languageNoticeText || "Hello team! English or Japanese please / 英語または日本語でお願いします";
    updateLanguageNoticeVisibility();
    updateWebhookBadge();

    elEnableProxy.checked = !!config.enableProxy;
    elProxyScheme.value = config.proxyScheme || "socks5";
    elProxyHost.value = config.proxyHost || "";
    elProxyPort.value = config.proxyPort || 1080;
    elProxyFaceitOnly.checked = config.proxyFaceitOnly !== false;

    updateBadges(config);
    updateAutoCancelVisibility();
    updateSubtogglesVisibility();
    updateDiscordVisibility();
    updateProxyUI(config);
    updatePeakHours();
    updateRadarUI();
    setInterval(updateRadarUI, 10000);
  });

  // Attach change listeners
  [
    elSpoofVvo,
    elNotifyVvoSlots,
    elQueueTimer,
    elAutoCancelSeconds,
    elAntiSnipe,
    elDropQueueOnFull,
    elDiscordWebhookUrl,
    elDiscordLang,
    elDiscordCustomPing,
    elDiscordNotifyMatch,
    elDiscordNotifyRoom,
    elDiscordNotifyServerIp,
    elDiscordNotifySlots,
    elDiscordRelayRoomChat,
    elEnableDiscordInbound,
    elDiscordBotToken,
    elDiscordBotChannelId,
    elDiscordBotAuthorId,
    elDiscordInboundTagPrefix,
    elEnableDiscordVeto,
    elAutoSendLanguageNotice,
    elLanguageNoticeText,
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

  if (elAutoCancel) {
    elAutoCancel.addEventListener("change", () => {
      if (!elAutoCancel.checked && elAutoRestart) {
        elAutoRestart.checked = false;
      }
      updateAutoCancelVisibility();
      saveSettings();
    });
  }

  if (elEnableDiscordAlerts) {
    elEnableDiscordAlerts.addEventListener("change", () => {
      updateDiscordVisibility();
      saveSettings();
    });
  }

  if (elEnableDiscordInbound) {
    elEnableDiscordInbound.addEventListener("change", () => {
      updateDiscordInboundVisibility();
      saveSettings();
    });
  }

  if (btnToggleBotMask && elDiscordBotToken) {
    btnToggleBotMask.addEventListener("click", () => {
      const isPass = elDiscordBotToken.type === "password";
      elDiscordBotToken.type = isPass ? "text" : "password";
      const isJa = currentLang === "ja";
      btnToggleBotMask.textContent = isPass
        ? (isJa ? "隠す" : "Hide")
        : (isJa ? "表示" : "Show");
    });
  }

  if (btnTestDiscordBot) {
    btnTestDiscordBot.addEventListener("click", () => {
      const t = I18N[currentLang] || I18N.ja;
      const botToken = elDiscordBotToken ? elDiscordBotToken.value.trim() : "";
      const channelId = elDiscordBotChannelId ? elDiscordBotChannelId.value.trim() : "";
      const authorId = elDiscordBotAuthorId ? elDiscordBotAuthorId.value.trim() : "";
      const tagPrefix = elDiscordInboundTagPrefix ? elDiscordInboundTagPrefix.checked : false;

      if (!botToken) {
        if (discordBotNotice) {
          discordBotNotice.style.display = "block";
          discordBotNotice.textContent = t.botTestError("Token is empty");
          discordBotNotice.style.color = "#f87171";
        }
        return;
      }
      saveSettings();
      btnTestDiscordBot.disabled = true;
      btnTestDiscordBot.textContent = t.btnTestingBot;

      chrome.runtime.sendMessage({ type: "TEST_DISCORD_BOT", botToken, channelId }, (res) => {
        btnTestDiscordBot.disabled = false;
        btnTestDiscordBot.textContent = t.btnTestDiscordBot;
        if (discordBotNotice) {
          discordBotNotice.style.display = "block";
          if (res?.ok && res.user) {
            const extra = channelId ? " (Channel OK)" : "";
            discordBotNotice.textContent = t.botTestSuccess(res.user.username + extra);
            discordBotNotice.style.color = "#4ade80";
            sendToFaceitTabs({
              type: "PATHFINDER_TEST_DISCORD_INBOUND",
              botToken,
              channelId,
              authorId,
              tagPrefix
            });
          } else {
            discordBotNotice.textContent = t.botTestError(res?.error || res?.status || "Connection error");
            discordBotNotice.style.color = "#f87171";
          }
        }
      });
    });
  }

  function triggerVetoTest(phase, entities, btn) {
    const botToken = elDiscordBotToken ? elDiscordBotToken.value.trim() : "";
    const channelId = elDiscordBotChannelId ? elDiscordBotChannelId.value.trim() : "";
    if (!botToken || !channelId) {
      if (discordBotNotice) {
        discordBotNotice.style.display = "block";
        discordBotNotice.textContent = "Bot Token / Channel ID を入力してください";
        discordBotNotice.style.color = "#f87171";
      }
      return;
    }
    saveSettings();
    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = "⏳ 送信中...";

    // Spawn interactive Test Arena in FACEIT tabs so the user can verify the DOM click live!
    try {
      chrome.tabs.query({ url: "*://*.faceit.com/*" }, (tabs) => {
        if (Array.isArray(tabs)) {
          tabs.forEach(t => {
            if (t?.id) chrome.tabs.sendMessage(t.id, { type: "PATHFINDER_SPAWN_TEST_VETO_ARENA", phase }).catch(() => {});
          });
        }
      });
    } catch {}

    chrome.runtime.sendMessage({
      type: "SEND_DISCORD_VETO_PROMPT",
      channelId,
      botToken,
      matchId: "test-match",
      phase,
      entities
    }, (res) => {
      btn.disabled = false;
      btn.textContent = origText;
      if (discordBotNotice) {
        discordBotNotice.style.display = "block";
        if (res?.ok) {
          discordBotNotice.textContent = `✅ ${phase === "location" ? "サーバー" : "マップ"} Veto ボタンを送信しました！Discordを確認してください`;
          discordBotNotice.style.color = "#4ade80";
        } else {
          discordBotNotice.textContent = "❌ 送信失敗: " + (res?.error || res?.status || "Error");
          discordBotNotice.style.color = "#f87171";
        }
      }
    });
  }

  if (btnTestDiscordVeto) {
    btnTestDiscordVeto.addEventListener("click", () => {
      triggerVetoTest("map", [
        { name: "Mirage", class_name: "de_mirage" },
        { name: "Dust2", class_name: "de_dust2" },
        { name: "Cache", class_name: "de_cache" },
        { name: "Nuke", class_name: "de_nuke" }
      ], btnTestDiscordVeto);
    });
  }

  if (btnTestDiscordVetoServer) {
    btnTestDiscordVetoServer.addEventListener("click", () => {
      triggerVetoTest("location", [
        { name: "Germany", class_name: "germany" },
        { name: "Finland", class_name: "finland" },
        { name: "Sweden", class_name: "sweden" },
        { name: "Singapore", class_name: "singapore" }
      ], btnTestDiscordVetoServer);
    });
  }

  if (btnDemoFullVeto) {
    btnDemoFullVeto.addEventListener("click", () => {
      const botToken = elDiscordBotToken ? elDiscordBotToken.value.trim() : "";
      const channelId = elDiscordBotChannelId ? elDiscordBotChannelId.value.trim() : "";
      if (!botToken || !channelId) {
        if (discordBotNotice) {
          discordBotNotice.style.display = "block";
          discordBotNotice.textContent = "Bot Token / Channel ID を入力してください";
          discordBotNotice.style.color = "#f87171";
        }
        return;
      }
      saveSettings();
      btnDemoFullVeto.disabled = true;
      const origText = btnDemoFullVeto.textContent;
      btnDemoFullVeto.textContent = "⏳ シミュレーション起動中...";

      try {
        chrome.tabs.query({ url: "*://*.faceit.com/*" }, (tabs) => {
          btnDemoFullVeto.disabled = false;
          btnDemoFullVeto.textContent = origText;
          if (Array.isArray(tabs) && tabs.length > 0) {
            tabs.forEach(t => {
              if (t?.id) chrome.tabs.sendMessage(t.id, { type: "PATHFINDER_START_FULL_VETO_SIM" }).catch(() => {});
            });
            if (discordBotNotice) {
              discordBotNotice.style.display = "block";
              discordBotNotice.textContent = "🎮 FACEITタブでシミュレーションを開始しました！Discordを確認してください";
              discordBotNotice.style.color = "#c084fc";
            }
          } else {
            if (discordBotNotice) {
              discordBotNotice.style.display = "block";
              discordBotNotice.textContent = "⚠️ FACEITのタブ (faceit.com) を開いてから実行してください";
              discordBotNotice.style.color = "#fbbf24";
            }
          }
        });
      } catch (err) {
        btnDemoFullVeto.disabled = false;
        btnDemoFullVeto.textContent = origText;
      }
    });
  }

  if (elAutoSendLanguageNotice) {
    elAutoSendLanguageNotice.addEventListener("change", () => {
      updateLanguageNoticeVisibility();
      saveSettings();
    });
  }

  if (elDiscordWebhookUrl) {
    elDiscordWebhookUrl.addEventListener("input", updateWebhookBadge);
  }

  if (btnToggleWebhookMask && elDiscordWebhookUrl) {
    btnToggleWebhookMask.addEventListener("click", () => {
      const t = I18N[currentLang] || I18N.ja;
      if (elDiscordWebhookUrl.type === "password") {
        elDiscordWebhookUrl.type = "text";
        btnToggleWebhookMask.textContent = "🙈";
        btnToggleWebhookMask.title = t.webhookMaskHide || "URLを非表示";
      } else {
        elDiscordWebhookUrl.type = "password";
        btnToggleWebhookMask.textContent = "👁️";
        btnToggleWebhookMask.title = t.webhookMaskShow || "URLを表示";
      }
    });
  }

  if (elAutoRestart) {
    elAutoRestart.addEventListener("change", () => {
      if (elAutoRestart.checked && !elAutoCancel.checked) {
        elAutoRestart.checked = false;
      }
      updateAutoCancelVisibility();
      saveSettings();
    });
  }

  if (elNovosibirsk) {
    elNovosibirsk.addEventListener("change", () => {
      if (!elNovosibirsk.checked && elSpoofNsk) {
        elSpoofNsk.checked = false;
      }
      updateSubtogglesVisibility();
      saveSettings();
    });
  }

  if (elSpoofNsk) {
    elSpoofNsk.addEventListener("change", () => {
      if (elSpoofNsk.checked && !elNovosibirsk.checked) {
        elNovosibirsk.checked = true;
      }
      updateSubtogglesVisibility();
      saveSettings();
    });
  }

  if (elKazakhstan) {
    elKazakhstan.addEventListener("change", () => {
      if (!elKazakhstan.checked && elSpoofKaz) {
        elSpoofKaz.checked = false;
      }
      updateSubtogglesVisibility();
      saveSettings();
    });
  }

  if (elSpoofKaz) {
    elSpoofKaz.addEventListener("change", () => {
      if (elSpoofKaz.checked && !elKazakhstan.checked) {
        elKazakhstan.checked = true;
      }
      updateSubtogglesVisibility();
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

  // Force Optimized Location sync
  const btnSyncOpt = document.getElementById("btnSyncOptimizedLocation");
  if (btnSyncOpt) {
    btnSyncOpt.addEventListener("click", () => {
      const t = I18N[currentLang] || I18N.ja;
      const textEl = document.getElementById("btnSyncText");
      if (textEl) textEl.textContent = "⏳ ...";
      btnSyncOpt.style.opacity = "0.7";
      btnSyncOpt.disabled = true;

      chrome.tabs.query({ url: "*://*.faceit.com/*" }, (tabs) => {
        let sent = false;
        if (Array.isArray(tabs) && tabs.length > 0) {
          const targetTab = tabs.find((x) => x.active) || tabs[0];
          chrome.tabs.sendMessage(targetTab.id, { type: "FORCE_SYNC_OPTIMIZED_LOCATION" }, (res) => {
            btnSyncOpt.disabled = false;
            btnSyncOpt.style.opacity = "1";
            if (res?.ok) {
              if (textEl) textEl.textContent = t.btnSyncDone;
              btnSyncOpt.style.background = "linear-gradient(135deg, #16a34a 0%, #15803d 100%)";
              setTimeout(() => {
                applyLanguage(currentLang);
                btnSyncOpt.style.background = "";
              }, 2500);
            } else {
              if (textEl) textEl.textContent = t.btnSyncFail;
              setTimeout(() => {
                applyLanguage(currentLang);
              }, 2500);
            }
          });
          sent = true;
        }
        if (!sent) {
          btnSyncOpt.disabled = false;
          btnSyncOpt.style.opacity = "1";
          if (textEl) textEl.textContent = t.btnSyncFail;
          setTimeout(() => {
            applyLanguage(currentLang);
          }, 2500);
        }
      });
    });
  }

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

  if (btnTestLangNotice) {
    btnTestLangNotice.addEventListener("click", () => {
      saveSettings();
      const t = I18N[currentLang] || I18N.ja;
      const origText = btnTestLangNotice.textContent;
      btnTestLangNotice.textContent = t.btnTestingLangNotice;
      btnTestLangNotice.disabled = true;
      setTimeout(() => {
        btnTestLangNotice.textContent = origText;
        btnTestLangNotice.disabled = false;
      }, 3000);

      sendToFaceitTabs({ type: "PATHFINDER_TEST_LANG_NOTICE" });
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

  // Party Code Sync
  function generatePartyCode() {
    let secs = parseInt(elAutoCancelSeconds.value, 10);
    if (isNaN(secs) || secs < 1) secs = 1;
    if (secs > 120) secs = 120;

    const payload = {
      v: 1,
      an: elNovosibirsk.checked ? 1 : 0,
      sn: elSpoofNsk && elSpoofNsk.checked ? 1 : 0,
      ak: elKazakhstan.checked ? 1 : 0,
      sk: elSpoofKaz && elSpoofKaz.checked ? 1 : 0,
      sv: elSpoofVvo && !elSpoofVvo.checked ? 0 : 1,
      ns: elNotifyVvoSlots && !elNotifyVvoSlots.checked ? 0 : 1,
      qt: elQueueTimer.checked ? 1 : 0,
      ac: elAutoCancel.checked ? 1 : 0,
      ar: elAutoRestart && elAutoRestart.checked ? 1 : 0,
      as: secs,
      snip: elAntiSnipe && elAntiSnipe.checked ? 1 : 0,
      df: elDropQueueOnFull && elDropQueueOnFull.checked ? 1 : 0
    };

    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return `PF1-${b64}`;
  }

  function applyPartyCode(rawCode) {
    const code = String(rawCode || "").trim().replace(/^["']|["']$/g, "");
    if (!code.startsWith("PF1-")) {
      throw new Error("Invalid prefix");
    }
    let b64 = code.slice(4).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) {
      b64 += "=";
    }
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") {
      throw new Error("Invalid format");
    }

    elNovosibirsk.checked = !!data.an;
    if (elSpoofNsk) elSpoofNsk.checked = !!data.an && !!data.sn;
    elKazakhstan.checked = !!data.ak;
    if (elSpoofKaz) elSpoofKaz.checked = !!data.ak && !!data.sk;
    if (elSpoofVvo) elSpoofVvo.checked = data.sv !== 0;
    if (elNotifyVvoSlots) elNotifyVvoSlots.checked = data.ns !== 0;

    elQueueTimer.checked = data.qt !== 0;
    elAutoCancel.checked = data.ac !== 0;
    if (elAutoRestart) elAutoRestart.checked = !!data.ac && !!data.ar;
    if (elAntiSnipe) elAntiSnipe.checked = !!data.snip;
    if (elDropQueueOnFull) elDropQueueOnFull.checked = data.df !== 0;

    let secs = Number(data.as) || 58;
    if (secs < 1) secs = 1;
    if (secs > 120) secs = 120;
    elAutoCancelSeconds.value = secs;

    updateAutoCancelVisibility();
    updateSubtogglesVisibility();
    saveSettings();
  }

  const btnExportCode = document.getElementById("btnExportCode");
  const exportCopyNotice = document.getElementById("exportCopyNotice");
  const inputImportCode = document.getElementById("inputImportCode");
  const btnImportCode = document.getElementById("btnImportCode");
  const importNotice = document.getElementById("importNotice");

  if (btnExportCode) {
    btnExportCode.addEventListener("click", async () => {
      const t = I18N[currentLang] || I18N.ja;
      const code = generatePartyCode();
      if (inputImportCode) inputImportCode.value = code;

      try {
        await navigator.clipboard.writeText(code);
      } catch {
        // Fallback copy
        if (inputImportCode) {
          inputImportCode.focus();
          inputImportCode.select();
          document.execCommand("copy");
        }
      }

      if (exportCopyNotice) {
        exportCopyNotice.textContent = t.exportCopied;
        exportCopyNotice.style.display = "block";
        setTimeout(() => {
          exportCopyNotice.style.display = "none";
        }, 4000);
      }
    });
  }

  if (btnImportCode) {
    btnImportCode.addEventListener("click", () => {
      const t = I18N[currentLang] || I18N.ja;
      const val = (inputImportCode ? inputImportCode.value : "").trim();
      if (!val) {
        if (importNotice) {
          importNotice.textContent = t.importError;
          importNotice.style.color = "#f87171";
          importNotice.style.display = "block";
        }
        return;
      }

      try {
        applyPartyCode(val);
        if (importNotice) {
          importNotice.textContent = t.importSuccess;
          importNotice.style.color = "#4ade80";
          importNotice.style.display = "block";
          setTimeout(() => {
            importNotice.style.display = "none";
          }, 5000);
        }
      } catch (err) {
        if (importNotice) {
          importNotice.textContent = t.importError;
          importNotice.style.color = "#f87171";
          importNotice.style.display = "block";
        }
      }
    });
  }

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

  // Discord Webhook Test Handler
  if (btnTestDiscord) {
    btnTestDiscord.addEventListener("click", () => {
      const t = I18N[currentLang] || I18N.ja;
      const url = elDiscordWebhookUrl ? elDiscordWebhookUrl.value.trim() : "";
      if (!url) {
        if (discordNotice) {
          discordNotice.textContent = t.discordErrorEmpty;
          discordNotice.style.color = "#f87171";
          discordNotice.style.display = "block";
        }
        return;
      }
      if (!/^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\//i.test(url)) {
        if (discordNotice) {
          discordNotice.textContent = t.discordErrorInvalid;
          discordNotice.style.color = "#f87171";
          discordNotice.style.display = "block";
        }
        return;
      }

      saveSettings();
      btnTestDiscord.disabled = true;
      btnTestDiscord.textContent = t.btnTestingDiscord;

      const isJa = (elDiscordLang ? elDiscordLang.value : "ja") === "ja";
      const customMention = formatDiscordMentions(elDiscordCustomPing ? elDiscordCustomPing.value : "", "");
      const mentionPrefix = customMention ? `${customMention} ` : "";
      const matchMentionDisplay = formatDiscordMentions(elDiscordCustomPing ? elDiscordCustomPing.value : "", "@everyone");
      const slotsMentionDisplay = formatDiscordMentions(elDiscordCustomPing ? elDiscordCustomPing.value : "", "@here");

      const payload = isJa ? {
        content: `${mentionPrefix}🔔 **Pathfinder Discord Webhook テスト**`,
        embeds: [
          {
            title: "接続成功 / Connected Successfully",
            description: "Pathfinder拡張機能からのテスト通知です。マッチ確定や空きスロット検知の通知がこのチャンネルに送信されます。",
            color: 4901984,
            fields: [
              { name: "メンション対象", value: customMention ? customMention : "@everyone / @here (デフォルト)", inline: false },
              { name: "マッチ確定通知", value: elDiscordNotifyMatch && elDiscordNotifyMatch.checked ? `有効 (${matchMentionDisplay || "メンションなし"})` : "無効", inline: true },
              { name: "部屋作成通知", value: elDiscordNotifyRoom && elDiscordNotifyRoom.checked ? "有効" : "無効", inline: true },
              { name: "サーバーIP通知", value: elDiscordNotifyServerIp && elDiscordNotifyServerIp.checked ? "有効" : "無効 (デフォルト)", inline: true },
              { name: "空き枠通知", value: elDiscordNotifySlots && elDiscordNotifySlots.checked ? `有効 (${slotsMentionDisplay || "メンションなし"})` : "無効", inline: true },
              { name: "チャット転送", value: elDiscordRelayRoomChat && elDiscordRelayRoomChat.checked ? "有効" : "無効 (デフォルト)", inline: true },
              { name: "言語自動発言", value: elAutoSendLanguageNotice && elAutoSendLanguageNotice.checked ? "有効" : "無効 (デフォルト)", inline: true }
            ],
            footer: {
              text: "Pathfinder Discord連携",
              icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
            },
            timestamp: new Date().toISOString()
          }
        ]
      } : {
        content: `${mentionPrefix}🔔 **Pathfinder Discord Webhook Test**`,
        embeds: [
          {
            title: "Connected Successfully",
            description: "Test alert from Pathfinder extension. Match ready and slot free alerts will be delivered to this channel.",
            color: 4901984,
            fields: [
              { name: "Mention Target", value: customMention ? customMention : "@everyone / @here (Default)", inline: false },
              { name: "Match Alerts", value: elDiscordNotifyMatch && elDiscordNotifyMatch.checked ? `Enabled (${matchMentionDisplay || "No mention"})` : "Disabled", inline: true },
              { name: "Room Link Alerts", value: elDiscordNotifyRoom && elDiscordNotifyRoom.checked ? "Enabled" : "Disabled", inline: true },
              { name: "Server IP Alerts", value: elDiscordNotifyServerIp && elDiscordNotifyServerIp.checked ? "Enabled" : "Disabled (Default)", inline: true },
              { name: "Slot Free Alerts", value: elDiscordNotifySlots && elDiscordNotifySlots.checked ? `Enabled (${slotsMentionDisplay || "No mention"})` : "Disabled", inline: true },
              { name: "Chat Relay", value: elDiscordRelayRoomChat && elDiscordRelayRoomChat.checked ? "Enabled" : "Disabled (Default)", inline: true },
              { name: "Auto Language Call", value: elAutoSendLanguageNotice && elAutoSendLanguageNotice.checked ? "Enabled" : "Disabled (Default)", inline: true }
            ],
            footer: {
              text: "Pathfinder Discord Integration",
              icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      chrome.runtime.sendMessage({ type: "SEND_DISCORD_WEBHOOK", url, payload }, (res) => {
        btnTestDiscord.disabled = false;
        btnTestDiscord.textContent = t.btnTestDiscord;
        if (discordNotice) {
          if (res?.ok) {
            discordNotice.textContent = t.discordSuccess;
            discordNotice.style.color = "#4ade80";
            discordNotice.style.display = "block";
            setTimeout(() => { discordNotice.style.display = "none"; }, 5000);
          } else {
            discordNotice.textContent = `${t.discordErrorFailed} (${res?.error || "Error"})`;
            discordNotice.style.color = "#f87171";
            discordNotice.style.display = "block";
          }
        }
      });
    });
  }

  // Discord Sequential Demo Test for all Active Alerts
  if (btnDemoDiscord) {
    btnDemoDiscord.addEventListener("click", async () => {
      const t = I18N[currentLang] || I18N.ja;
      const url = elDiscordWebhookUrl ? elDiscordWebhookUrl.value.trim() : "";
      if (!url) {
        if (discordNotice) {
          discordNotice.textContent = t.discordErrorEmpty;
          discordNotice.style.color = "#f87171";
          discordNotice.style.display = "block";
        }
        return;
      }
      if (!/^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\//i.test(url)) {
        if (discordNotice) {
          discordNotice.textContent = t.discordErrorInvalid;
          discordNotice.style.color = "#f87171";
          discordNotice.style.display = "block";
        }
        return;
      }

      saveSettings();

      const isJa = (elDiscordLang ? elDiscordLang.value : "ja") === "ja";
      const customMention = elDiscordCustomPing ? elDiscordCustomPing.value.trim() : "";
      const matchMention = formatDiscordMentions(customMention, "@everyone");
      const matchPrefix = matchMention ? `${matchMention} ` : "";
      const roomMention = formatDiscordMentions(customMention, "@here");
      const roomPrefix = roomMention ? `${roomMention} ` : "";

      const tasks = [];

      // 1. Match Ready Alert (if enabled)
      if (elDiscordNotifyMatch && elDiscordNotifyMatch.checked) {
        tasks.push({
          name: isJa ? "マッチ確定通知" : "Match Ready Alert",
          payload: isJa ? {
            content: `${matchPrefix}🎮 **[DEMO] FACEIT — マッチング成立！**`,
            embeds: [
              {
                title: "[DEMO] FACEIT マッチング — チェックイン受付中 (30秒)",
                description: "(テスト送信用サンプル) マッチが成立しました！30秒以内にチェックイン（Accept）を完了してください。",
                color: 16744192,
                fields: [
                  { name: "対象地域", value: "Vladivostok (EU)", inline: true },
                  { name: "状態", value: "チェックイン受付中 (30s)", inline: true }
                ],
                footer: {
                  text: "Pathfinder Discord Alerts [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          } : {
            content: `${matchPrefix}🎮 **[DEMO] FACEIT — Match Ready!**`,
            embeds: [
              {
                title: "[DEMO] FACEIT Match Ready — Check-in (30s)",
                description: "(Test Demo Sample) Match is ready! Please check in (Accept) within 30 seconds.",
                color: 16744192,
                fields: [
                  { name: "Target Region", value: "Vladivostok (EU)", inline: true },
                  { name: "Status", value: "CHECK-IN OPEN (30s)", inline: true }
                ],
                footer: {
                  text: "Pathfinder Discord Alerts [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          }
        });
      }

      // 2. Match Room Intel (if enabled)
      if (elDiscordNotifyRoom && elDiscordNotifyRoom.checked) {
        const demoRoomUrl = "https://www.faceit.com/en/cs2/room/demo-1-491f692e";
        tasks.push({
          name: isJa ? "マッチルーム開設通知" : "Match Room Intel Alert",
          payload: isJa ? {
            content: `${roomPrefix}⚔️ **[DEMO] FACEIT マッチルーム開設！ [team_clat1ss vs team_Dubyan]**\n🔗 <${demoRoomUrl}>`,
            embeds: [
              {
                title: `[DEMO] FACEIT マッチルーム — 投票中 (Veto)`,
                description: `(テスト送信用サンプル) マッチルームが生成されました！\n👉 [**マッチルームへ移動 (投票参加)**](${demoRoomUrl})`,
                color: 16737792,
                fields: [
                  {
                    name: "🔵 team_clat1ss (1,230 Avg ELO • 47% Win)",
                    value: "🇷🇺 👉 **clat1ss** • 1,456 ELO [Lvl 7] 👥\n🇷🇺 **HOWDY19** • 908 ELO [Lvl 4] 👥\n🇷🇺 **Smsk1n** • 1,337 ELO [Lvl 6]\n🇷🇺 **kadesai666** • 1,270 ELO [Lvl 6]\n🇷🇺 **n4n4** • 1,178 ELO [Lvl 5]",
                    inline: false
                  },
                  {
                    name: "🔴 team_Dubyan (1,289 Avg ELO • 53% Win)",
                    value: "🇷🇺 **Dubyan** • 1,433 ELO [Lvl 7] 👥\n🇷🇺 **turbonaggets** • 1,310 ELO [Lvl 6] 👥\n🇷🇺 **y0ur_tr0uble** • 1,193 ELO [Lvl 5]\n🇷🇺 **yynngg** • 1,217 ELO [Lvl 6]\n🇷🇺 **Gifka** • 1,291 ELO [Lvl 6]",
                    inline: false
                  },
                  { name: "📍 サーバー", value: "🟢 Vladivostok", inline: true },
                  { name: "🗺️ マップ", value: "🗺️ MIRAGE", inline: true },
                  { name: "⚖️ ELO差", value: "±59 ELO", inline: true },
                  { name: "🆔 Match ID", value: "`demo-1-491f692e`", inline: true }
                ],
                footer: {
                  text: "Pathfinder Match Intel [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          } : {
            content: `${roomPrefix}⚔️ **[DEMO] FACEIT Live Match Room! [team_clat1ss vs team_Dubyan]**\n🔗 <${demoRoomUrl}>`,
            embeds: [
              {
                title: `[DEMO] FACEIT Match Room — Veto Stage`,
                description: `(Test Demo Sample) Match room is ready!\n👉 [**Click to Join Match Room**](${demoRoomUrl})`,
                color: 16737792,
                fields: [
                  {
                    name: "🔵 team_clat1ss (1,230 Avg ELO • 47% Win)",
                    value: "🇷🇺 👉 **clat1ss** • 1,456 ELO [Lvl 7] 👥\n🇷🇺 **HOWDY19** • 908 ELO [Lvl 4] 👥\n🇷🇺 **Smsk1n** • 1,337 ELO [Lvl 6]\n🇷🇺 **kadesai666** • 1,270 ELO [Lvl 6]\n🇷🇺 **n4n4** • 1,178 ELO [Lvl 5]",
                    inline: false
                  },
                  {
                    name: "🔴 team_Dubyan (1,289 Avg ELO • 53% Win)",
                    value: "🇷🇺 **Dubyan** • 1,433 ELO [Lvl 7] 👥\n🇷🇺 **turbonaggets** • 1,310 ELO [Lvl 6] 👥\n🇷🇺 **y0ur_tr0uble** • 1,193 ELO [Lvl 5]\n🇷🇺 **yynngg** • 1,217 ELO [Lvl 6]\n🇷🇺 **Gifka** • 1,291 ELO [Lvl 6]",
                    inline: false
                  },
                  { name: "📍 Server", value: "🟢 Vladivostok", inline: true },
                  { name: "🗺️ Map", value: "🗺️ MIRAGE", inline: true },
                  { name: "⚖️ ELO Diff", value: "±59 ELO", inline: true },
                  { name: "🆔 Match ID", value: "`demo-1-491f692e`", inline: true }
                ],
                footer: {
                  text: "Pathfinder Match Intel [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          }
        });
      }

      // 3. Server Connect IP (if enabled)
      if (elDiscordNotifyServerIp && elDiscordNotifyServerIp.checked) {
        const demoConnect = "connect 185.25.182.12:27015";
        const demoSteam = "steam://connect/185.25.182.12:27015";
        const demoRoomUrl = "https://www.faceit.com/en/cs2/room/demo-1-491f692e";
        tasks.push({
          name: isJa ? "サーバーIP (Connect) 通知" : "Server Connect IP Alert",
          payload: isJa ? {
            content: `${roomPrefix}🚀 **[DEMO] CS2 サーバー準備完了！接続コマンドが発行されました**`,
            embeds: [
              {
                title: "[DEMO] FACEIT CS2 — サーバー接続準備完了 (Connect IP)",
                description: `(テスト送信用サンプル) サーバーの準備が完了しました。コンソールを開いて接続してください。\n👉 [**マッチルームへ移動**](${demoRoomUrl})`,
                color: 4402688,
                fields: [
                  {
                    name: "💻 CS2 コンソール接続コマンド (Copy & Paste)",
                    value: `\`\`\`bat\n${demoConnect}\n\`\`\``,
                    inline: false
                  },
                  { name: "📍 サーバー", value: "🟢 Vladivostok", inline: true },
                  { name: "🗺️ マップ", value: "🗺️ MIRAGE", inline: true },
                  { name: "🚀 Steam 直接起動", value: `[**CS2を起動して接続**](${demoSteam})`, inline: true },
                  { name: "🔗 Room Link", value: `[**ルームを開く**](${demoRoomUrl})`, inline: true }
                ],
                footer: {
                  text: "Pathfinder Server Connect [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          } : {
            content: `${roomPrefix}🚀 **[DEMO] CS2 Server Ready! Connect command is ready**`,
            embeds: [
              {
                title: "[DEMO] FACEIT CS2 — Dedicated Server Ready (Connect IP)",
                description: `(Test Demo Sample) Server has been configured. Open your CS2 console and connect.\n👉 [**Open Match Room**](${demoRoomUrl})`,
                color: 4402688,
                fields: [
                  {
                    name: "💻 CS2 Console Connect Command (Copy & Paste)",
                    value: `\`\`\`bat\n${demoConnect}\n\`\`\``,
                    inline: false
                  },
                  { name: "📍 Server", value: "🟢 Vladivostok", inline: true },
                  { name: "🗺️ Map", value: "🗺️ MIRAGE", inline: true },
                  { name: "🚀 1-Click Steam Launch", value: `[**Launch & Connect**](${demoSteam})`, inline: true },
                  { name: "🔗 Room Link", value: `[**Open Room**](${demoRoomUrl})`, inline: true }
                ],
                footer: {
                  text: "Pathfinder Server Connect [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          }
        });
      }

      // 4. Slots Free Alert (if enabled)
      if (elDiscordNotifySlots && elDiscordNotifySlots.checked) {
        tasks.push({
          name: isJa ? "空きスロット検知通知" : "Slot Free Alert",
          payload: isJa ? {
            content: `${roomPrefix}🟢 **[DEMO] FACEIT — ウラジオストクの空きスロットを検知！**`,
            embeds: [
              {
                title: "[DEMO] Vladivostok: スロット空き発生 / Slots Available",
                description: "(テスト送信用サンプル) ウラジオストクサーバーの空きスロットを検知しました。今すぐキューを開始してください！",
                color: 4901984,
                fields: [
                  { name: "対象サーバー", value: "Vladivostok (EU)", inline: true },
                  { name: "サーバー状態", value: "AVAILABLE (空きあり)", inline: true }
                ],
                footer: {
                  text: "Pathfinder Slot Free [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          } : {
            content: `${roomPrefix}🟢 **[DEMO] FACEIT — Vladivostok Slots Available!**`,
            embeds: [
              {
                title: "[DEMO] Vladivostok: Slots Available",
                description: "(Test Demo Sample) Vladivostok server slot became available. Queue now!",
                color: 4901984,
                fields: [
                  { name: "Server", value: "Vladivostok (EU)", inline: true },
                  { name: "Status", value: "AVAILABLE", inline: true }
                ],
                footer: {
                  text: "Pathfinder Slot Free [DEMO]",
                  icon_url: "https://raw.githubusercontent.com/zloybik/Only-Vladivostok-Server-Faceit/main/pathfinder-upper.png"
                },
                timestamp: new Date().toISOString()
              }
            ]
          }
        });
      }

      // 5. Chat Relay Alert (if enabled)
      if (elDiscordRelayRoomChat && elDiscordRelayRoomChat.checked) {
        tasks.push({
          name: isJa ? "チャット転送通知" : "Chat Relay Alert",
          payload: {
            username: "Pathfinder • Team Chat",
            content: `💬 **[FACEIT Team Chat] clat1ss:** rush B no stop! (Demo message)`,
            allowed_mentions: { parse: [] }
          }
        });
      }

      if (tasks.length === 0) {
        if (discordNotice) {
          discordNotice.textContent = t.demoNoneActive;
          discordNotice.style.color = "#facc15";
          discordNotice.style.display = "block";
        }
        return;
      }

      btnDemoDiscord.disabled = true;
      btnDemoDiscord.textContent = t.btnDemoTesting;
      if (discordNotice) {
        discordNotice.style.color = "#d8b4fe";
        discordNotice.style.display = "block";
      }

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      let successCount = 0;
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (discordNotice) {
          discordNotice.textContent = t.demoNoticeProgress(i + 1, tasks.length, task.name);
        }

        try {
          await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "SEND_DISCORD_WEBHOOK", url, payload: task.payload }, (res) => {
              if (res?.ok) successCount++;
              resolve();
            });
          });
        } catch {}

        if (i < tasks.length - 1) {
          await sleep(900); // delay between test messages
        }
      }

      btnDemoDiscord.disabled = false;
      btnDemoDiscord.textContent = t.btnDemoDiscord;
      if (discordNotice) {
        discordNotice.textContent = t.demoNoticeDone(successCount);
        discordNotice.style.color = "#4ade80";
        setTimeout(() => { discordNotice.style.display = "none"; }, 6000);
      }
    });
  }
})();
