#!/usr/bin/env bash
# =========================================================
# Sestaví soběstačné DEMO hry Louka Run do _site/.
# Kořen _site/ = demo (jen první 3 zvířátka), takže obsah _site/
# jde nasadit na samostatnou doménu (Netlify, GitHub Pages, …).
#
# Použití:  bash build-demo.sh
# Netlify:  build command = "bash build-demo.sh", publish = "_site"
# =========================================================
set -euo pipefail

OUT=_site
rm -rf "$OUT"
mkdir -p "$OUT"

# sdílené soubory hry (jeden zdroj pravdy – nic se needuplikuje v gitu)
cp -r js assets style.css sw.js soukromi.html "$OUT"/

# z kořenového index.html vyrobí demo variantu (+ přepínač, odznak, manifest)
node tools/make-demo.mjs . "$OUT"

echo "Hotovo → $OUT/ (nasaď obsah této složky na doménu)"
