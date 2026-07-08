#!/usr/bin/env bash
# Stage the game into www/ for the Capacitor Android build.
# No sw.js: a service worker inside the Capacitor webview causes double-caching
# and stale-content bugs; assets are local anyway.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf www
mkdir -p www
cp style.css manifest.webmanifest soukromi.html www/
cp -r js assets www/

sed "s/if ('serviceWorker' in navigator) {/if ('serviceWorker' in navigator \&\& !window.Capacitor) {/" index.html > www/index.html
grep -q '!window.Capacitor' www/index.html || { echo 'ERROR: SW guard not applied — index.html changed?'; exit 1; }

echo "www/ ready ($(du -sh www | cut -f1))"
