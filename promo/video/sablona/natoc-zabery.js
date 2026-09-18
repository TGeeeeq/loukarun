/* =========================================================
   LOUKA RUN – natočení reálných herních záběrů

   Pustí hru v headless Chromiu, převezme řízení autopilotem
   (skáče a podbíhá podle typu překážky) a nahraje surové klipy
   ze všech šesti prostředí + znělku a intro s logem azylu.

   Hra se kvůli tomu nemění: kopie repa se v pracovní složce
   doplní o řádek `window.__LR = …`, který zpřístupní herní stav.

   Spuštění (z kořene repa):
       NODE_PATH=<node_modules s playwright-core> \
       node promo/video/sablona/natoc-zabery.js [pracovní-složka]

   Výstup: <pracovní-složka>/klipy/*.webm
   ========================================================= */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const WORK = process.argv[2] || path.join(ROOT, '.promo-work');
const HRA = path.join(WORK, 'hra');
const KLIPY = path.join(WORK, 'klipy');
const PORT = 8791;
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// Hra kreslí v CSS pixelech, takže na širokém desktopu vypadá zvířátko
// jako mravenec. Točíme proto v „telefonním“ výřezu 960×540 se dvojnásobnou
// hustotou pixelů – kompozice je jako na mobilu, výstup pořád ostré 1080p.
const W = 1280, H = 720;        // výřez stránky (CSS px) – kompozice jako na mobilu
const DSF = 1;                  // sestavovací skript pak zvětší na 1920×1080

/* ---------- co všechno natočit ----------
   metry = kam se běh „přesune“, aby se natáčelo v daném prostředí
   (prostředí se střídají po 550 m: louka, sad, les, vesnice, západ, noc) */
const ZABERY = [
  { id: 'louka',   metry: 120,  sekund: 13 },
  { id: 'sad',     metry: 700,  sekund: 12 },
  { id: 'les',     metry: 1250, sekund: 12 },
  { id: 'vesnice', metry: 1800, sekund: 12 },
  { id: 'zapad',   metry: 2350, sekund: 12 },
  { id: 'noc',     metry: 2900, sekund: 13 },
];

/* =========================================================
   1) pracovní kopie hry s přístupem k hernímu stavu
   ========================================================= */
function pripravKopii() {
  fs.rmSync(HRA, { recursive: true, force: true });
  fs.mkdirSync(HRA, { recursive: true });
  for (const f of ['index.html', 'style.css', 'manifest.webmanifest']) {
    fs.copyFileSync(path.join(ROOT, f), path.join(HRA, f));
  }
  for (const d of ['js', 'assets']) {
    fs.cpSync(path.join(ROOT, d), path.join(HRA, d), { recursive: true });
  }

  const most = `
  /* ---- most pro natáčení propagačního videa (jen v pracovní kopii) ---- */
  window.__LR = {
    S, jump, slide, skipIntro, showScreen, turnBook,
    px: () => playerX(),
    sirka: () => W,
    /* přesune běh na daný metr, ať se točí v konkrétním prostředí */
    presun(metry) {
      const x = metry * PX_PER_M;
      S.worldX = x;
      S.speedAnchorX = x;
      S.lastSpecial = 1e9;          // koncert do propagačního záběru nepatří
      S.obstacles.length = 0; S.pickups.length = 0; S.decor.length = 0;
      S.particles.length = 0; S.floaters.length = 0; S.flyers.length = 0;
      S.nextObstacleX = x + W + 500;
      S.nextPickupX = x + W + 260;
      S.nextDecorX = x;
      S.nextFlyerX = x + 400;
      S.energy = 100;
      S.bubble = null; S.bubbleT = 0; S.milestone = null;
      S.enc = null; S.tut = null;
    },
    /* autopilot: skáče přes pozemní překážky, podbíhá létající */
    pilot(zapnout) {
      if (!zapnout) { this._pilot = false; return; }
      this._pilot = true;
      const krok = () => {
        if (!this._pilot) return;
        if (S.mode === 'run') {
          const px = playerX();
          const v = Math.max(200, S.speed);
          for (const o of S.obstacles) {
            if (o.broken) continue;
            const d = (o.x - S.worldX + px) - px;
            if (d <= 0) continue;
            const cas = d / v;                       // za jak dlouho doběhneme
            if (o.type === 'duck') {
              if (cas < 0.34 && S.sliding <= 0.1) slide();
            } else if (cas < 0.30 && cas > 0.14 && !S.airborne) {
              jump();
            }
          }
        }
        requestAnimationFrame(krok);
      };
      requestAnimationFrame(krok);
    },
  };
`;
  const gp = path.join(HRA, 'js', 'game.js');
  let src = fs.readFileSync(gp, 'utf8');
  // Most musí skončit UVNITŘ hlavního IIFE, jinak nevidí S, jump ani playerX.
  // Kotvíme se proto na jeho závorku na konci souboru, ne na konkrétní řádek
  // herní smyčky – ten se při každé větší úpravě hry posune a natáčení pak
  // spadlo na „nenašel jsem konec game.js“.
  const kotva = '\n})();';
  const konec = src.lastIndexOf(kotva);
  if (konec < 0) throw new Error('nenašel jsem konec hlavního IIFE v game.js – uprav kotvu');
  src = src.slice(0, konec) + '\n' + most + src.slice(konec);
  fs.writeFileSync(gp, src);
  console.log('· pracovní kopie hry připravena');
}

/* =========================================================
   2) natáčení
   ========================================================= */
const ARGS = [
  '--autoplay-policy=no-user-gesture-required',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-lcd-text',
];

async function novyKontext(browser, jmeno) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DSF,
    recordVideo: { dir: path.join(KLIPY, jmeno), size: { width: W * DSF, height: H * DSF } },
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function ulozKlip(ctx, page, jmeno) {
  const video = page.video();
  await ctx.close();                       // teprve teď se video dopíše
  const src = await video.path();
  const cil = path.join(KLIPY, jmeno + '.webm');
  fs.renameSync(src, cil);
  fs.rmSync(path.join(KLIPY, jmeno), { recursive: true, force: true });
  const kb = Math.round(fs.statSync(cil).size / 1024);
  console.log(`→ klipy/${jmeno}.webm  (${kb} kB)`);
}

/* hotové sejvy: hra rovnou v menu, bez školy běhu, se všemi zvířaty */
const SAVE = JSON.stringify({
  coins: 4200, unlocked: ['karel', 'pogo', 'avala', 'flicek', 'yakul', 'kveta'],
  selected: 'karel', best: 3120, runs: 24, sfx: true, music: true, tutorialDone: true,
  // všechny překážky už „viděné“ – jinak by se běh zastavil na představení novinky
  seenObstacles: ['hay', 'fence', 'mud', 'rock', 'branch', 'chicken', 'goose', 'barrow', 'beeline', 'flock'],
  // Karlova uvítací scéna se sama otevře nad menu a do té doby hra polyká
  // klávesy (js/game.js: `if (KAREL.isOpen()) return`). Bez těchhle dvou
  // příznaků se natočila jen ona – osel s bublinou a prázdná louka místo
  // gameplaye, ve všech šesti prostředích stejně.
  karelSeen: true, karelGuideSeen: true,
  // zápisky v deníčku se odemykají po DIARY_STEP bězích s danou postavou
  // (diaryUnlocked v js/game.js) – bez tohohle je knížka v záběru prázdná
  charRuns: { karel: 60, pogo: 60, avala: 60, flicek: 60, yakul: 60, kveta: 60 },
});

async function pripravStranku(page, { save = true } = {}) {
  if (save) {
    await page.addInitScript((s) => {
      localStorage.setItem('loukarun_save_v1', s);
    }, SAVE);
  }
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  // Od verze 1.9.x stojí před znělkou startovní brána (#start-gate) – teprve
  // ťuknutí na ni pustí fullscreen, zvuk i intro. Bez ní hra zůstane stát na
  // úvodním obrázku a natáčení dřív skončilo čekáním na #screen-menu.
  const gate = page.locator('#start-go');
  if (await gate.count()) {
    await gate.click({ force: true, timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

/* znělka autora → intro s logem → menu */
async function doMenu(page) {
  await page.keyboard.press('Space');            // odpíchne znělku autora
  await page.waitForTimeout(1100);               // znělka odchází prolnutím
  await page.evaluate(() => __LR.skipIntro());   // intro s logem azylu
  await page.waitForSelector('#screen-menu.visible', { timeout: 10000 });
  // pojistka, kdyby se Karel přesto otevřel – jinak by klávesa Space
  // nespustila běh a natočila by se jeho scéna
  await page.evaluate(() => {
    if (typeof KAREL !== 'undefined' && KAREL.isOpen()) KAREL.close && KAREL.close();
  }).catch(() => {});
  await page.waitForTimeout(400);
}

async function main() {
  fs.rmSync(KLIPY, { recursive: true, force: true });
  fs.mkdirSync(KLIPY, { recursive: true });
  pripravKopii();

  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', HRA],
    { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));

  const browser = await chromium.launch({ executablePath: EXE, args: ARGS });

  try {
    /* ---------- A) znělka autora + intro s logem azylu ---------- */
    {
      const { ctx, page } = await novyKontext(browser, 'intro');
      await pripravStranku(page);
      await page.waitForTimeout(12500);   // AF znělka (~5 s) + intro s logem (~7 s)
      await ulozKlip(ctx, page, 'intro');
    }

    /* ---------- B) obrazovka menu ---------- */
    {
      const { ctx, page } = await novyKontext(browser, 'menu');
      await pripravStranku(page);
      await doMenu(page);
      await page.waitForTimeout(4200);
      await ulozKlip(ctx, page, 'menu');
    }

    /* ---------- B2) obchod: karusel zvířátek ----------
       Menu ukazuje jen vybranou postavu, takže věta „šest zvířat z azylu“
       nad ním nemá co doložit. Tohle je jediný záběr, kde jsou vidět
       všechna naráz. */
    {
      const { ctx, page } = await novyKontext(browser, 'zviratka');
      await pripravStranku(page);
      await doMenu(page);
      await page.click('#btn-shop', { force: true });
      await page.waitForTimeout(900);
      // pomalu prolistovat karusel, ať se v záběru vystřídá víc zvířátek
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(1200);
      }
      await ulozKlip(ctx, page, 'zviratka');
    }

    /* ---------- B3) deníček z azylu ----------
       Nejnovější věc ve hře, kterou jde ukázat: o každém zvířeti je v něm
       stránka se zajímavostmi. Otevírá se přes můstek, ne klikáním – cesta
       k němu vede přes obchod a ta se při každé úpravě menu mění. */
    {
      const { ctx, page } = await novyKontext(browser, 'denicek');
      await pripravStranku(page);
      await doMenu(page);
      // deníček se otevírá kliknutím na kartu v obchodě; showScreen('diary')
      // sám obsah nevykreslí (dělá to openDiary) a knížka by zůstala prázdná
      await page.click('#btn-shop', { force: true });
      await page.waitForTimeout(700);
      await page.click('.diary', { force: true });
      await page.waitForTimeout(1600);
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => __LR.turnBook(1));
        await page.waitForTimeout(1800);
      }
      await ulozKlip(ctx, page, 'denicek');
    }

    /* ---------- C) záběry ze všech prostředí ---------- */
    for (const z of ZABERY) {
      const { ctx, page } = await novyKontext(browser, z.id);
      await pripravStranku(page);
      // znělku i intro přeskočíme – tady chceme čistý gameplay
      await doMenu(page);
      await page.keyboard.press('Space');            // start běhu
      await page.waitForTimeout(500);
      await page.evaluate((m) => { __LR.presun(m); __LR.pilot(true); }, z.metry);
      await page.waitForTimeout(z.sekund * 1000);
      await page.evaluate(() => __LR.pilot(false));
      await ulozKlip(ctx, page, z.id);
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('· hotovo – klipy v ' + path.relative(ROOT, KLIPY));
}

main().catch((e) => { console.error(e); process.exit(1); });
