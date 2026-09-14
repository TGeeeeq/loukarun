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

# The source already disables service workers on native platforms.
# Validate that contract instead of rewriting an obsolete HTML fragment.
cp index.html www/index.html
grep -Fq "if ('serviceWorker' in navigator && !(window.PLATFORM && PLATFORM.native)) {" www/index.html || { echo 'ERROR: native SW guard missing'; exit 1; }
test ! -e www/sw.js || { echo 'ERROR: service worker must not ship in the native app'; exit 1; }

# tester guide is a web-testing thing; the file isn't shipped, so drop its menu link
sed -i 's|<a class="privacy-link" href="jak-testovat.html"[^>]*>[^<]*</a> \&nbsp;·\&nbsp; ||' www/index.html
grep -q 'jak-testovat' www/index.html && { echo 'ERROR: tester link still present — index.html changed?'; exit 1; }

echo "www/ ready ($(du -sh www | cut -f1))"
