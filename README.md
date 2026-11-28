# 🚀 FACEIT Ping Override — Pathfinder (v1.9.5)

<p align="center">
  <img src="pathfinder-upper.png" alt="Pathfinder Upper" width="128" />
</p>

<p align="center">
  <b>The Ultimate FACEIT Matchmaking Assistant for the Japanese & Far East CS2 Community</b><br>
  低Ping（15ms〜35ms）のウラジオストクサーバー固定、キュー保護、チームVC言語分析、Discord連携を統合したオールインワン拡張機能。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.9.5-brightgreen.svg" alt="Version 1.9.5" />
  <img src="https://img.shields.io/badge/manifest-MV3-blue.svg" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/community-CS2JP-red.svg" alt="CS2JP" />
  <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status Active" />
</p>

---

## 📖 概要 (Overview)

日本および極東アジアからFACEITをプレイする際、デフォルトでは遠方のシンガポール（SEA）やヨーロッパ中央サーバーに割り当てられ、高Ping（80ms〜150ms）に悩まされることがあります。

**Pathfinder** は、ブラウザ側でウラジオストクサーバー（Vladivostok）へのルーティングを最優先化し、日本から **Ping 15ms〜35ms** の超低遅延で快適にプレイできるように設計されたオープンソース拡張機能です。

---

## 📥 クイックインストール & 使い方 (Quick Setup)

たったの3ステップで導入完了！誰でも1分で使い始められます。

### ステップ 1: ダウンロード
1. [Releases ページ](https://github.com/zloybik/Only-Vladivostok-Server-Faceit/releases) から最新の `faceit-ping-override.zip` をダウンロードします。
2. ダウンロードした ZIP ファイルを解凍します。

### ステップ 2: ブラウザに拡張機能を読み込む
Chrome、Microsoft Edge、Brave など Chromium 系ブラウザに対応しています：
1. ブラウザのアドレスバーに以下を入力して開きます：
   * **Chrome**: `chrome://extensions`
   * **Edge**: `edge://extensions`
   * **Brave**: `brave://extensions`
2. 画面右上（またはメニュー内）の **「デベロッパー モード (Developer mode)」** をオンにします。
3. **「パッケージ化されていない拡張機能を読み込む (Load unpacked)」** をクリックし、解凍した `faceit-ping-override` フォルダを選択します。

### ステップ 3: FACEITを開いてプレイ！
1. ブラウザで FACEIT のページを開き、`Ctrl + Shift + R`（Macは `Cmd + Shift + R`）で再読み込みします。
2. FACEITのマッチメイキング設定で、リージョンが **EU** になっていることを確認します。
3. 通常通りキューを開始すると、画面右上に **Queue Guard HUD** が表示され、ウラジオストクサーバーが最優先でマッチングされます！

> ⚠️ **重要: EUリージョンにウラジオストク（ロシア）サーバーが表示されない場合**  
> FACEITのアカウントや地域設定によっては、EUリージョンのサーバー一覧にウラジオストクやノヴォシビルスクが表示されないことがあります。その場合は以下のいずれかを試してください：  
> - **方法 A（推奨・無料VPN）:** 一時的に **ロシア（Russia）** または **カザフスタン（Kazakhstan）** のVPNに接続してFACEITを開き、サーバーリストを更新します（無料の [VPN Obratno](https://vpnobratno.info/en/) や [VPNGate](https://www.vpngate.net/ja/) 等で接続可能）。一度認識されればVPNを切断してもサーバーは維持されます。  
> - **方法 B（カスタムプロキシ）:** ご自身でお持ちのロシアSOCKS5/HTTPプロキシがある場合は、Pathfinderの **「🌐 RU プロキシ」** タブに設定して有効化することで、FACEITの通信のみをプロキシ経由にルーティングできます。

> **💡 パーティでプレイする場合:**  
> ロビー内のメンバー全員が同じ設定で検索できるよう、拡張機能の **「パーティ同期」** タブからコード（`PF1-...`）を共有して設定を同期することを推奨します。

---

## 🌟 主な機能 (Key Features)

### 1. 🛡️ ウラジオストク固定 & ピン最適化 (Server Override)
* **自動1000msピンペナルティ**: 他リージョンの測定値に疑似ペナルティを付与し、ウラジオストク（VVO）サーバーを最優先選出。
* **ノヴォシビルスク / カザフスタン個別許可**: 必要に応じて近隣サーバーのホワイトリスト化が可能。
* **ピークタイム（Peak Hours）追跡**: JST（日本標準時）およびVLAT（ウラジオストク時間）の稼働時計を常時表示。
* **VVO 稼働動向レーダー**: 進行中マッチの終了タイミングや最適な再キュー開始ウィンドウをパッシブ予測。
* **空きスロット検知通知**: 満員状態から空き枠が出た際にポップアップおよびDiscordで自動通知。

### 2. ⏱️ キュー保護 HUD & 自動再キュー (Queue Guard)
* **60秒拡張防止タイマー**: FACEITが検索範囲を広げる前にチャイム音とHUDアラートで警告。
* **自動キャンセル (Auto-Cancel)**: 設定した秒数（デフォルト58秒）で自動的に検索を停止。
* **自動再キュー (Auto-Requeue)**: サーバー拡張を起こさず、ウラジオストク限定で検索を自動ループ。
* **アンチスナイプ遅延**: 配信者向けにマッチ検索開始を2〜7秒ランダムに遅延させる保護機能。
* **満員時緊急キャンセル**: 検索中にウラジオストクが満員になった場合、自動で安全に離脱。

### 3. 🗣️ チーム言語レーダー & VCアドバイザー (Team Comms Radar)
* **公式バッチAPI & DOM国旗解析**: 味方プレイヤーの国籍・国旗を瞬時に検出（🇯🇵 日本、🇷🇺 ロシア、🇰🇿 カザフスタン、🇲🇳 モンゴル等）。
* **VC推奨言語アドバイザー**: ロスター構成から最適なコール方針を提案（`🇯🇵 日本語VC推奨` / `🇯🇵🇬🇧 日英併用` / `🌐 RU/EN Calls` / `🇬🇧 英語コール`）。
* **リアルタイム同期**: ルームを開いた瞬間にポップアップおよびDiscordへ国旗サマリー（例: `🇷🇺 RU (2) • 🇯🇵 JP (1)`）を表示。

### 4. 🌊 海底ケーブル直通判定 & 回線診断 (Subsea Route Detector)
* **直通海底ケーブル診断**: プロバイダーのVVO向けルーティング品質をミリ秒単位で判定。
  * `🌊 直通海底ケーブル (< 48ms)`: RJCN/HSCS等の直通海底ケーブル接続。
  * `🟡 アジア経由 (48-110ms)`: 香港・シンガポール等を経由した中継ループ。
  * `🔴 迂回ループ (> 110ms)`: 大幅な迂回ルーティングを検知。
* **ジッター（遅延ブレ）測定**: 各サーバーへの実測Pingとジッター変動幅を同時計測。

### 5. 👥 パーティ同期 & 誤発進防止ガード (Party Sync & Guard)
* **パーティリーダーガード**: ロビー内の権限（Leader / Member / Solo）を自動判別し、非リーダーによる誤キューや設定ズレを防止。
* **1クリック設定コード（PF1-...）**: ワンクリックで設定を文字列化して共有、メンバー全員の設定を瞬時に同期。

### 6. 🗺️ Discord リモート VETO & チャット中継 (Discord Remote Veto)
* **Discord インタラクティブボタン**: キャプテンのBAN順が回ってきた際、Discordチャンネルに赤色のBANボタンが自動送信。スマホや別画面から1タップでBAN可能！
* **フルフェーズ対応**: サーバー投票から最終マップピックまでリアルタイム追従。
* **双方向チャットリレー**: Discordから入力したメッセージをFACEITのチームチャットへ即座に転送（ナイフラウンド開始まで有効）。
* **自動マッチ通知**: マッチ成立時に `@everyone` メンション、ロスター情報、CS2接続コマンド（`connect ip:port`）を自動送信。

### 7. 🌐 カスタム RU プロキシ機能 (Custom RU Proxy)
* **外部プロキシ設定**: ご自身でお持ちのロシアSOCKS5/HTTPプロキシを設定可能。
* **PACスクリプト完全分離**: `*.faceit.com` のトラフィックのみを安全にルーティング（一般ブラウジングには一切影響しません）。
* **自動フェイルオーバー**: プロキシ接続に不具合が発生した際は、即座に通常接続（Direct）へ自動復帰。

---

## ❓ よくある質問 (FAQ)

<details>
<summary><b>Q. EUリージョンを選択してもウラジオストクサーバーが表示されません。</b></summary>
A. FACEIT側の地域判定により非表示になっている場合があります。一時的にロシアまたはカザフスタンのVPN（無料の [VPN Obratno](https://vpnobratno.info/en/) や [VPNGate](https://www.vpngate.net/ja/) など）に接続してFACEITを再読み込みしてください。一度認識されればサーバーリストに表示されるようになり、その後はVPNをオフにしてプレイ可能です。ご自身でロシアプロキシをお持ちの場合は、拡張機能の **「🌐 RU プロキシ」** タブに登録して利用することもできます。
</details>

<details>
<summary><b>Q. CS2のゲーム本体の動作やチート対策（FACEIT AC）に影響はありますか？</b></summary>
A. 一切影響ありません。本拡張機能はブラウザ（Web UI）のピン測定APIのみを補助するものであり、ゲームプロセスやメモリへの干渉は一切行いません。また、ゲームサーバー接続は通常通りUDP直接接続で行われます。
</details>

<details>
<summary><b>Q. メンバー全員が拡張機能を入れる必要がありますか？</b></summary>
A. はい、パーティを組んでプレイする場合は、マッチメイキング設定の不一致を防ぐため、ロビー内の全員が拡張機能を導入することを強く推奨します。
</details>

<details>
<summary><b>Q. シンガポール（SEA）や他サーバーで遊びたくなったら？</b></summary>
A. 拡張機能のポップアップからワンクリックで一時停止するか、ブラウザの拡張機能管理画面でトグルをOFFにするだけで通常状態に戻ります。
</details>

---

## 🔒 セキュリティとプライバシー (Security & Safe Design)

* **完全クライアントサイド動作**: 外部の独自収集サーバーを介さず、ブラウザローカル（`chrome.storage.local`）のみで完結。
* **安全なトークン保護**: Discord Webhook URLやBot Tokenは画面上で伏字（••••••••）表示され、漏洩を防止。
* **オープンソース**: 全コードが検証可能であり、不正な通信は一切含まれていません。

---

## 📜 ライセンス (License)

This project is licensed under the MIT License - see the LICENSE file for details.

*Disclaimer: This project is an independent community enhancement tool for CS2 players in Japan and the Far East, and is not officially affiliated with or endorsed by FACEIT.*
