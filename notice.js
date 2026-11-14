(() => {
  "use strict";

  // Avoid duplicate notices if FACEIT reinjects or reinitializes page content.
  if (document.getElementById("pathfinder-notice-host")) return;

  const host = document.createElement("div");
  host.id = "pathfinder-notice-host";
  host.style.cssText = "position:fixed;inset:0 0 auto 0;z-index:2147483647;pointer-events:none;";

  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .notice {
      box-sizing: border-box;
      pointer-events: auto;
      position: relative;
      display: flex;
      align-items: center;
      gap: 18px;
      width: min(590px, calc(100vw - 28px));
      margin: 18px auto 0;
      padding: 18px 48px 18px 16px;
      color: #f5f5f5;
      background: #111315;
      border: 1px solid #373b40;
      border-top: 3px solid #d12629;
      border-radius: 10px;
      box-shadow: 0 14px 44px rgba(0,0,0,.48);
      font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      animation: pf-enter .28s ease-out both;
    }
    .art {
      flex: 0 0 116px;
      width: 116px;
      height: 170px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      overflow: hidden;
    }
    .art img { display:block; width:100%; height:100%; object-fit:contain; object-position:center bottom; }
    .copy { min-width: 0; flex: 1; }
    .eyebrow {
      margin: 0 0 9px;
      color: #ff5558;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .13em;
    }
    h2 { margin: 0 0 11px; color:#fff; font-size:17px; line-height:1.2; font-weight:800; }
    .language { margin: 0 0 10px; }
    .language strong { display:block; margin-bottom:3px; color:#e5e7eb; font-size:12px; }
    .language p { margin:0; color:#c6c9ce; font-size:13px; }
    .actions { display:flex; justify-content:flex-end; margin-top:13px; }
    button {
      appearance:none; border:0; border-radius:6px; padding:8px 16px;
      background:#d12629; color:white; font:inherit; font-size:12px; line-height:1.2; font-weight:700; cursor:pointer;
    }
    button:hover { background:#e5383b; }
    button:focus-visible, .close:focus-visible { outline:2px solid white; outline-offset:3px; }
    .close {
      position:absolute; top:9px; right:11px; width:28px; height:28px;
      display:grid; place-items:center; padding:0; border:0; border-radius:5px;
      color:#aeb3ba; background:transparent; font:22px/1 sans-serif; cursor:pointer;
    }
    .close:hover { color:#fff; background:#292d31; }
    @keyframes pf-enter { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
    @media (max-width: 520px) {
      .notice { gap:10px; padding:15px 40px 14px 10px; }
      .art { flex-basis:82px; width:82px; height:132px; }
      h2 { font-size:15px; }
      .language p { font-size:12px; }
    }
    @media (prefers-reduced-motion: reduce) { .notice { animation:none; } }
  `;

  const card = document.createElement("section");
  card.className = "notice";
  card.setAttribute("role", "alertdialog");
  card.setAttribute("aria-labelledby", "pf-title");
  card.setAttribute("aria-describedby", "pf-en pf-ja");

  const image = document.createElement("img");
  image.src = chrome.runtime.getURL("pathfinder-upper.png");
  image.alt = "Pathfinder robot";

  const art = document.createElement("div");
  art.className = "art";
  art.append(image);

  const copy = document.createElement("div");
  copy.className = "copy";
  copy.innerHTML = `
    <p class="eyebrow">PATHFINDER // IMPORTANT NOTICE</p>
    <h2 id="pf-title">IMPORTANT! Queue reminder</h2>
    <div class="language">
      <strong>日本語</strong>
      <p id="pf-ja">重要！1分ごとにキューをキャンセルして、検索をやり直してください。そうしないと、ノヴォシビルスクのサーバーに割り当てられる可能性が高くなります！</p>
    </div>
    <div class="language">
      <strong>ENGLISH</strong>
      <p id="pf-en">IMPORTANT! Cancel and restart your queue every minute. Otherwise, you have a high chance of being assigned to a Novosibirsk server!</p>
    </div>
    <div class="actions"><button type="button" id="pf-ack">Got it! / 了解！</button></div>
  `;

  const close = document.createElement("button");
  close.className = "close";
  close.type = "button";
  close.setAttribute("aria-label", "Close notice");
  close.textContent = "×";

  const dismiss = () => {
    card.style.animation = "none";
    host.remove();
  };
  close.addEventListener("click", dismiss);
  copy.querySelector("#pf-ack").addEventListener("click", dismiss);

  card.append(art, copy, close);
  shadow.append(style, card);
  (document.documentElement || document.body).append(host);
})();
