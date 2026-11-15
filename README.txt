FACEIT Ping Override — Pathfinder 1.3.0

Features
- Adds an artificial 1000 ms to browser-side FACEIT ping measurements for hosts ending in .ping.faceit.com.
- Exempts vladivostok.eu.ping.faceit.com.
- Shows a monochrome Pathfinder queue reminder once per browser profile installation; it is not repeated on reloads or browser restarts.
- Monitors ONLY Vladivostok in FACEIT CS2/EU matchmaking responses.
- Shows a bottom-right warning when Vladivostok is HIGH_TRAFFIC, missing from the server list, or has an unrecognized status. AVAILABLE is treated as healthy.
- A health warning is shown again only when Vladivostok's status changes.

Install in Chrome
1. Extract this ZIP.
2. Open chrome://extensions
3. Enable Developer mode.
4. Click Load unpacked and select the faceit-ping-override folder.

Install in Edge
1. Extract this ZIP.
2. Open edge://extensions
3. Enable Developer mode.
4. Click Load unpacked and select the faceit-ping-override folder.

After updating, reload the FACEIT page (Ctrl+Shift+R).

Important
The ping override changes browser-side measurements only. It does not change real network routing, packet latency, or ping inside an already-running game. Queue cancellation/restarting remains a manual action.
