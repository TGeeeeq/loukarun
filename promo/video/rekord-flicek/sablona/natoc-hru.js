/* =========================================================
   REEL „Rekord 16 957 m" – herní záběry a kartička rekordu

   1) Natočí skutečný běh s Prasátkem Flíčkem po snímcích
      (čas se krokuje, ne měří), rovnou ve svislém výřezu
      1080×1920 kolem postavy.
   2) Vyrenderuje sdílecí kartičku rekordu přímo funkcí hry
      buildShareCard – ostrý originál místo screenshotu z telefonu.

   Spuštění (z kořene repa):
     NODE_PATH=/opt/node22/lib/node_modules \
     node promo/video/rekord-flicek/sablona/natoc-hru.js <pracovní-složka>
   ========================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const WORK = process.argv[2] || path.join(ROOT, '.promo-work');
const HRA = path.join(WORK, 'hra');
const PORT = 8795;
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const REKORD = { dist: 16957, coins: 4750, carrots: 2206, combo: 167, char: 'flicek' };

/* Hra kreslí na šířku 1280×720 CSS px. Svislý záběr je výřez 337,5×600
   kolem postavy (x 260, zem na y 562), snímaný s hustotou 3,2 → přesně
   1080×1920. Postava stojí zhruba uprostřed šířky, takže plovoucí texty
   „+7 ⚡" nad ní nelezou za levý okraj, a horní šestina prázdné oblohy
   se do záběru nevejde – prasátko je tak ve svislém formátu co největší. */
const VW = 1280, VH = 720, DSF = 3.2;
const CROP = { x: 95, y: 120, width: 337.5, height: 600 };
const FPS = 30;

const KLIPY = [
  { id: 'louka', metry: 16520, snimku: 17 * FPS },  // 16 957 m leží v louce: úsek 16 500–17 050 m (30. po 550 m, 30 mod 6 = 0)
  { id: 'vesnice', metry: 17050 + 2 * 550 + 20, snimku: 8 * FPS },  // 33. úsek = vesnice
];

const SAVE = JSON.stringify({
  coins: 4750, unlocked: ['karel', 'pogo', 'avala', 'flicek', 'yakul', 'kveta'],
  selected: 'flicek', best: 16957, runs: 80, sfx: false, music: false, tutorialDone: true,
  seenObstacles: ['hay', 'fence', 'mud', 'rock', 'branch', 'chicken', 'goose', 'barrow', 'beeline', 'flock'],
  karelSeen: true, karelGuideSeen: true, karelWelcomed: true,
  charRuns: { karel: 60, pogo: 60, avala: 60, flicek: 60, yakul: 60, kveta: 60 },
});

function pripravKopii() {
  fs.rmSync(HRA, { recursive: true, force: true });
  fs.mkdirSync(HRA, { recursive: true });
  for (const f of ['index.html', 'style.css', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(HRA, f));
  for (const d of ['js', 'assets']) fs.cpSync(path.join(ROOT, d), path.join(HRA, d), { recursive: true });

  const gp = path.join(HRA, 'js', 'game.js');
  let src = fs.readFileSync(gp, 'utf8');
  // strop hustoty pixelů: hra si bere nejvýš 2×, svislý výřez potřebuje 2,67×
  src = src.replace('const DPR_STEPS = [2, 1.5, 1.15];', 'const DPR_STEPS = [3.2, 3.2, 3.2];');
  const most = `
  window.__LR = {
    S, jump, slide, startRun, showScreen, DEV_FLAGS,
    karta(d, c, id, k, m) {
      return buildShareCard(d, c, charById(id), k, m, true).toDataURL('image/png');
    },
    presun(metry) {
      const to = metry * PX_PER_M;
      S.worldX = to;
      S.obstacles = []; S.pickups = []; S.decor = []; S.fg = []; S.flyers = [];
      S.nextObstacleX = to + W + 300; S.nextPickupX = to + 400;
      S.nextDecorX = to; S.nextFgX = to; S.nextFlyerX = to + 400;
      S.speedAnchorX = 0;
      S.lastMilestone = Math.floor(metry / 500) * 500;
      S.lastSpecial = 1e9;
      S.milestone = null; S.bubble = null; S.enc = null; S.tut = null;
      S.cleanFrom = to; S.cleanDist = 0; S.energy = 100;
    },
    pilot() {
      if (S.mode !== 'run') return;
      const px = playerX();
      const v = Math.max(200, S.speed);
      for (const o of S.obstacles) {
        if (o.broken) continue;
        const d = o.x - S.worldX;
        if (d <= 0) continue;
        const cas = d / v;
        if (o.type === 'duck') { if (cas < 0.34 && S.sliding <= 0.1) slide(); }
        else if (cas < 0.30 && cas > 0.12 && !S.airborne) jump();
      }
    },
  };
`;
  const konec = src.lastIndexOf('\n})();');
  if (konec < 0) throw new Error('nenašel jsem konec hlavního IIFE v game.js');
  src = src.slice(0, konec) + '\n' + most + src.slice(konec);
  fs.writeFileSync(gp, src);
  // ve svislém výřezu nemá být herní HUD – popisky nese střih
  fs.appendFileSync(path.join(HRA, 'style.css'),
    '\n#hud,#btn-dev,.dev-fab,#toast,.toast{display:none!important}\n');
}

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  pripravKopii();
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', HRA], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const browser = await chromium.launch({ executablePath: EXE, args: ['--hide-scrollbars', '--mute-audio', '--disable-lcd-text'] });
  try {
    const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF });
    await page.addInitScript((save) => {
      localStorage.setItem('loukarun_save_v1', save);
      window.__pend = []; window.__now = 1000;
      window.requestAnimationFrame = (cb) => { window.__pend.push(cb); return 1; };
      performance.now = () => window.__now;
      window.__STEP = (ms) => {
        window.__now += ms;
        const q = window.__pend; window.__pend = [];
        for (const cb of q) { try { cb(window.__now); } catch (e) { console.error(e); } }
      };
    }, SAVE);
    page.on('pageerror', e => console.error('pageerror', e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html?fx=full`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const gate = page.locator('#start-go');
    if (await gate.count()) await gate.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.evaluate(() => { for (let i = 0; i < 60; i++) window.__STEP(16.67); });

    /* ---------- kartička rekordu ---------- */
    const url = await page.evaluate((r) => __LR.karta(r.dist, r.coins, r.char, r.combo, r.carrots), REKORD);
    fs.writeFileSync(path.join(WORK, 'karta-rekord.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('→ karta-rekord.png');

    /* ---------- běh ---------- */
    for (const k of KLIPY) {
      const dir = path.join(WORK, 'klip-' + k.id);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      await page.evaluate((m) => {
        if (typeof KAREL !== 'undefined' && KAREL.isOpen && KAREL.isOpen()) KAREL.close();
        __LR.DEV_FLAGS.god = true;
        __LR.startRun();
        for (let i = 0; i < 30; i++) window.__STEP(16.67);
        __LR.presun(m);
        // rozjezd, ať je rychlost a scéna ustálená
        for (let i = 0; i < 150; i++) { __LR.pilot(); window.__STEP(16.67); }
      }, k.metry);
      // metráž každého snímku – střih podle ní ví, kdy běh míjí 16 957 m
      const metry = [];
      for (let f = 0; f < k.snimku; f++) {
        metry.push(await page.evaluate(() => { for (let i = 0; i < 2; i++) { __LR.pilot(); window.__STEP(1000 / 60); } return __LR.S.worldX / 42; }));
        await page.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 90, clip: CROP });
      }
      fs.writeFileSync(path.join(dir, 'metry.json'), JSON.stringify(metry.map(m => +m.toFixed(2))));
      console.log(`→ klip-${k.id}/ ${k.snimku} snímků, ${Math.floor(metry[0])}–${Math.floor(metry[metry.length - 1])} m`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
