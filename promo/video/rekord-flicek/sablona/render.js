/* =========================================================
   REEL „Rekord 16 957 m" – vykreslení snímků střihu

   Otevře strih.html nad pracovní složkou (herní záběry, kartička)
   a uloží každý snímek jako JPEG. Bez argumentů celé video, s čísly
   snímků jen ty (na kontrolu: node render.js <work> 40 150 300).

   Spuštění (z kořene repa):
     NODE_PATH=/opt/node22/lib/node_modules \
     node promo/video/rekord-flicek/sablona/render.js <pracovní-složka> [snímky…]
   ========================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const WORK = process.argv[2];
const JEN = process.argv.slice(3).map(Number);
const PORT = 8797;
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
if (!WORK) throw new Error('chybí pracovní složka');

for (const f of ['strih.html', 'strih.js']) fs.copyFileSync(path.join(__dirname, f), path.join(WORK, f));
fs.copyFileSync(path.join(ROOT, 'promo', 'znacka', 'loukarun-logo-cisty.png'), path.join(WORK, 'logo.png'));
const OUT = path.join(WORK, JEN.length ? 'nahled' : 'snimky');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', WORK], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1000));
  const browser = await chromium.launch({ executablePath: EXE, args: ['--hide-scrollbars', '--disable-lcd-text'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.error('pageerror', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/strih.html`, { waitUntil: 'load' });
    const info = await page.evaluate(() => STRIH.init());
    console.log('· střih', info);
    if (!JEN.length) {
      await page.evaluate(() => STRIH.cover());
      const obalka = path.join(ROOT, 'promo', 'video', 'rekord-flicek', 'obalka-rekord-16957.png');
      await page.screenshot({ path: obalka, type: 'png' });
      console.log('→ ' + path.relative(ROOT, obalka));
    }
    const snimky = JEN.length ? JEN : [...Array(info.DELKA).keys()];
    for (const f of snimky) {
      await page.evaluate((f) => STRIH.frame(f), f);
      await page.screenshot({ path: path.join(OUT, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 94 });
      if (!JEN.length && f % 100 === 0) console.log('  snímek', f);
    }
    console.log('→ ' + path.relative(process.cwd(), OUT) + ' (' + snimky.length + ' snímků)');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
