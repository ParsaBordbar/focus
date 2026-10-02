# Focus Privacy Policy

_Last updated: October 2, 2026_

Focus does not collect, sell, or share any data. Nothing leaves your browser.

## What Focus reads, and why

- **The address of the page you're opening** (`tabs`, `webNavigation`): checked against your block list so a distracting site can be redirected. URLs are never stored or sent anywhere.
- **Two bookmark folders** (`bookmarks`): Focus reads only the folders named "Dopamine Sites" and "Good Sources" to build your block and redirect lists. Other bookmarks are ignored.
- **YouTube pages** (content script on `youtube.com`): used only to hide Shorts and redirect the home feed to Subscriptions.

## What Focus stores

- **Settings** (on/off switches, your blocked sites and good sources) in `chrome.storage.sync`. If you're signed in to your browser with sync turned on, your browser syncs them between your own devices. Focus has no server of its own.
- **Timed sessions** (the running session, the last session name, and the list of finished sessions) in `chrome.storage.local`, on your device only.

Removing the extension deletes all of this.

## Other permissions

- `alarms`: ends timed sessions on time.
- `notifications`: tells you when a session is done.

## No tracking

No analytics, no ads, no remote code, no network requests. The font is bundled with the extension.

## Contact

Questions: open an issue at https://github.com/ParsaBordbar/focus/issues
