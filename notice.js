(() => {
  "use strict";

  const HEALTH_EVENT = "pathfinder:vladivostok-health";
  const ROOT_ID = "pathfinder-ui-root";
  const GITHUB_REPO = "zloybik/Only-Vladivostok-Server-Faceit";
  const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const shadow = root.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .stack {
      position:fixed; right:20px; bottom:20px;
      display:flex; flex-direction:column; gap:10px;
      pointer-events:none;
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
    @media(max-width:480px) { .stack { right:10px; bottom:10px; } .panel img { width:52px; height:72px; flex-basis:52px; } }
    @media(prefers-reduced-motion:reduce) { .panel { animation:none; } }
  `;
  const stack = document.createElement("div");
  stack.className = "stack";
  shadow.append(style, stack);

  function makePanel({ title, message, sub = "", kind = "notice", buttonLabel = "OK", linkUrl = "", linkLabel = "" }) {
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
    ok.addEventListener("click", dismiss);
    actions.append(ok);

    copy.append(actions);
    panel.append(img, copy, close);
    stack.append(panel);
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
    } catch {
      // Ignore network/rate-limit errors silently
    }
  }

  // One-time install reminder. chrome.storage.local survives page reloads and browser restarts.
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
  (document.documentElement || document.body).append(root);
  checkForUpdates();
})();
