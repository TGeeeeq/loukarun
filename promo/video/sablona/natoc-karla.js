/* =========================================================
   LOUKA RUN – Karel s průhledným pozadím

   Natočí Karlovu uvítací scénu (js/karel.js) tak, že z ní zbude
   JEN Karel a jeho bublina na průhledném pozadí. Ve střihu se pak
   dá položit před herní záběr – Karel stojí v popředí a povídá,
   zatímco za ním běží hra.

   Jak to funguje:
   - v pracovní kopii se plátnu scény zapne alfa a `render()` místo
     pozadí s vinětou plochu jen vymaže, takže zůstanou postava,
     portál a částice;
   - bublina není na plátně, ale v DOM, takže se snímá screenshotem
     stránky s `omitBackground` – tím se veze i ona;
   - čas se NEODVÍJÍ od reálného, ale krokuje se po 1/30 s
     (`window.__STEP`). Bez toho by pomalý screenshot dělal
     nepravidelné mezery a Karel by v záběru poskakoval.

   Spuštění (z kořene repa):
       NODE_PATH=<node_modules s playwright-core> \
       node promo/video/sablona/natoc-karla.js [pracovní-složka]

   Výstup: <pracovní-složka>/karel/<replika>/NNNN.png  (RGBA)
   ========================================================= */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const WORK = process.argv[2] || path.join(ROOT, '.promo-work');
const HRA = path.join(WORK, 'hra-karel');
const OUT = path.join(WORK, 'karel');
const PORT = 8793;
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const W = 1280, H = 720;   // snímá se na dvojnásobku (deviceScaleFactor 2)
const FPS = 30;
const KROK = Math.round(1000 / FPS);

/* ---------- co Karel říká ----------
   Mluví o tom, co ve hře přibylo, ale po svém: suše, s odstupem
   a nikdy jako leták. Věta se musí vejít do bubliny na tři řádky,
   jinak bublina přeroste záběr.

   `snimku` je délka repliky ve snímcích (30 = 1 s). Text se vypisuje
   po znacích, takže krátká replika s dlouhou větou se nestihne
   dopsat – radši ubrat slova než přidat vteřiny. */
const REPLIKY = [
  {
    id: 'prichod',
    text: 'Osel Karel. Ne jako nadávka, jako druh.',
    odNuly: true,      // včetně příchodu portálem
    snimku: 105,
  },
  {
    id: 'denicek',
    text: 'Přidal jsem do hry deníček.\nO každém z nás je tam stránka.',
    snimku: 120,
  },
  {
    id: 'fakta',
    text: 'Zajímavosti, historky, kdo odkud je.\nČte se to líp než leták.',
    snimku: 120,
  },
];

const SAVE = JSON.stringify({
  coins: 4200, unlocked: ['karel'], selected: 'karel', best: 3120, runs: 24,
  sfx: false, music: false, tutorialDone: true, karelSeen: true, karelGuideSeen: true,
});

/* =========================================================
   1) pracovní kopie s průhledným plátnem
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

  const kp = path.join(HRA, 'js', 'karel.js');
  let k = fs.readFileSync(kp, 'utf8');

  const alfa = "ctx = cv.getContext('2d', { alpha: false });";
  if (!k.includes(alfa)) throw new Error('nenašel jsem getContext scény – uprav kotvu');
  k = k.replace(alfa, "ctx = cv.getContext('2d', { alpha: true });");

  const pozadi = `    const tms = st.t * 1000;
    drawBackdrop();
    drawVignette();`;
  if (!k.includes(pozadi)) throw new Error('nenašel jsem kreslení pozadí scény – uprav kotvu');
  k = k.replace(pozadi, `    const tms = st.t * 1000;
    ctx.clearRect(0, 0, cv.width / dpr + 4, cv.height / dpr + 4);`);

  // most musí být PŘED `return {…}`, jinak se nikdy neprovede
  const ret = k.lastIndexOf('  return { init, open, close,');
  if (ret < 0) throw new Error('nenašel jsem návratovou hodnotu karel.js – uprav kotvu');
  k = k.slice(0, ret) + '  window.__KR = { st, say, open, close, resize };\n' + k.slice(ret);
  fs.writeFileSync(kp, k);

  fs.appendFileSync(path.join(HRA, 'style.css'),
    '\n/* ---- natáčení promo (jen v pracovní kopii) ---- */\n' +
    '/* scéna se snímá na průhledné pozadí */\n' +
    'html,body{background:transparent!important}\n' +
    '#screen-karel{background:transparent!important}\n' +
    '#karel-skip,#karel-bar,#karel-hint,#karel-next{display:none!important}\n' +
    '/* Bublina je ve hře sázená na čtení z ruky. Ve svislém videu z ní\n' +
    '   zbude pruh přes třetinu šířky, takže se text musí zvětšit tady –\n' +
    '   zvětšovat až hotový záběr by ho rozmazalo. */\n' +
    '.karel-bubble{max-width:560px!important;padding:26px 32px 24px!important;' +
    'border-radius:34px!important;border-width:5px!important}\n' +
    '.karel-bubble p{font-size:34px!important;line-height:1.3!important}\n');
}

/* =========================================================
   2) snímání
   ========================================================= */
async function natoc(page, replika) {
  const dir = path.join(OUT, replika.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  await page.evaluate((r) => {
    // znovu od začátku scény
    if (window.__KR.st.open) window.__KR.close();
    window.__KR.open({});
    if (!r.odNuly) {
      // Přeskočit příchod portálem. Musí to být s rezervou: ještě chvíli po
      // dosednutí je Karel poloprůhledný (`arrival` v js/karel.js klesá přes
      // 1,2 s), takže po osmdesáti krocích stál v záběru jako duch.
      for (let i = 0; i < 140; i++) window.__STEP(33);
    }
    window.__KR.say(r.text, { instant: false });
  }, replika);

  for (let i = 0; i < replika.snimku; i++) {
    await page.evaluate((k) => window.__STEP(k), KROK);
    await page.screenshot({
      path: path.join(dir, String(i).padStart(4, '0') + '.png'),
      omitBackground: true,
    });
  }
  console.log(`→ karel/${replika.id}/  (${replika.snimku} snímků)`);
}

(async () => {
  pripravKopii();
  fs.mkdirSync(OUT, { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', HRA],
    { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));

  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--mute-audio'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    await page.addInitScript((save) => {
      localStorage.setItem('loukarun_save_v1', save);
      // scéna se krokuje ručně; rAF se sám nevolá
      window.__pend = [];
      window.__now = 0;
      window.requestAnimationFrame = (cb) => { window.__pend.push(cb); return 1; };
      window.__STEP = (ms) => {
        window.__now += ms;
        const q = window.__pend; window.__pend = [];
        for (const cb of q) { try { cb(window.__now); } catch (e) {} }
      };
      performance.now = () => window.__now;
    }, SAVE);

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const gate = page.locator('#start-go');
    if (await gate.count()) await gate.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      // ve snímku má zůstat jen Karel – všechno ostatní pryč
      for (const id of ['af-splash', 'start-gate', 'game', 'hud']) {
        const el = document.getElementById(id); if (el) el.remove();
      }
      document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== 'screen-karel') s.remove();
      });
    });

    for (const r of REPLIKY) await natoc(page, r);
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('· hotovo – snímky v ' + OUT);
})();
