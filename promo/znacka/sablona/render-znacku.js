/* =========================================================
   LOUKA RUN – render značky

   1) SVG loga → PNG (průhledné pozadí)
   2) maskoti: postavy ze hry vykreslené přes GFX.drawCharacter
      do průhledného PNG (autentické, kreslí je sama hra)
   3) přehled palety

   Před spuštěním pusť v kořeni repa lokální server:
       python3 -m http.server 8777
   Pak:
       NODE_PATH=<cesta k node_modules> node promo/znacka/sablona/render-znacku.js

   Výstup: PNG do promo/znacka/
   ========================================================= */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;                 // …/promo/znacka/sablona
const OUT = path.join(DIR, '..');      // …/promo/znacka
const ROOT = path.join(DIR, '..', '..', '..');
const BASE = process.env.LOUKA_BASE || 'http://127.0.0.1:8777/';
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* logo → PNG (šířka v px, výška dopočítá poměr) */
const LOGA = [
  ['loukarun-logo.svg', 1600],
  ['loukarun-logo-cisty.svg', 1600],
  ['loukarun-logo-vodorovne.svg', 2000],
  ['loukarun-znak.svg', 1024],
  ['loukarun-logo-mono.svg', 2000],
];

/* maskoti ze hry: id postavy + póza */
const MASKOTI = [
  ['karel', 'skok', { airborne: true, jumps: 1, squash: -0.25 }],
  ['karel', 'beh', { runPhase: 1.1 }],
  ['pogo', 'skok', { airborne: true, jumps: 1 }],
  ['avala', 'beh', { runPhase: 2.2 }],
  ['flicek', 'beh', { runPhase: 0.6 }],
  ['yakul', 'skok', { airborne: true, jumps: 1 }],
  ['kveta', 'beh', { runPhase: 3.4 }],
];

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });

  /* ---------- 1) loga ---------- */
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [file, w] of LOGA) {
    const svg = fs.readFileSync(path.join(OUT, file), 'utf8');
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const h = Math.round(w * (+vb[2] / +vb[1]));
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`,
      { waitUntil: 'load' });
    const dest = path.join(OUT, file.replace('.svg', '.png'));
    await page.screenshot({ path: dest, omitBackground: true });
    console.log('→', path.relative(ROOT, dest), `${w}×${h}`);
  }

  /* ---------- 2) maskoti ze hry ---------- */
  const mp = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await mp.goto(BASE + 'promo/znacka/sablona/maskot.html', { waitUntil: 'networkidle' });
  for (const [id, poza, pose] of MASKOTI) {
    const b = await mp.evaluate(([id, pose]) => window.kresliMaskota(id, pose), [id, pose]);
    const dest = path.join(OUT, 'maskoti', `${id}-${poza}.png`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // ořez těsně kolem postavy, ať se maskot dá sázet bez počítání okrajů
    const m = 6;
    await mp.screenshot({
      path: dest, omitBackground: true,
      clip: { x: b.x0 - m, y: b.y0 - m, width: b.w + 2 * m, height: b.h + 2 * m },
    });
    console.log('→', path.relative(ROOT, dest), (b.w + 2 * m) + '×' + (b.h + 2 * m));
  }

  /* ---------- 3) paleta ---------- */
  const pp = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await pp.goto(BASE + 'promo/znacka/sablona/paleta.html', { waitUntil: 'networkidle' });
  const ph = await pp.evaluate(() => document.body.scrollHeight);
  await pp.setViewportSize({ width: 1600, height: ph });
  await pp.screenshot({ path: path.join(OUT, 'paleta.png') });
  console.log('→', 'promo/znacka/paleta.png', `1600×${ph}`);

  await browser.close();
})();
