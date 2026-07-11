/* =========================================================
   LOUKA RUN – render promo grafik „Karel převzal účet“
   Před spuštěním pusť v kořeni repa lokální server:
       python3 -m http.server 8777
   Pak:  NODE_PATH=<cesta k node_modules s playwrightem> node render.js
   Výstup: PNG do promo/karel-kampan/
   ========================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;                       // …/promo/karel-kampan/sablona
const OUT = path.join(DIR, '..');            // …/promo/karel-kampan
const BASE = 'http://127.0.0.1:8777/promo/karel-kampan/sablona/';
const AVATAR = '../../../assets/icon-512.png';
const zaber = (f) => '../zabery/' + f;

/* ---------- stavební dílky ---------- */
const bg = `
  <div class="sun" style="right:8%;top:5%"></div>
  <div class="cloud" style="width:260px;height:80px;left:6%;top:6%"></div>
  <div class="cloud" style="width:200px;height:64px;right:20%;top:14%"></div>
  <div class="cloud" style="width:170px;height:56px;left:24%;top:22%"></div>
  <div class="hills"><div class="hill h1"></div><div class="hill h2"></div><div class="ground"></div></div>`;

const header = `
  <div class="badge">HRA AZYLU NECH MĚ RŮST 💚</div>
  <div class="wordmark">LOUKA<span>RUN</span></div>`;

const footer = `<div class="url">nechmerust.org/loukarun 🥕</div>`;

const karelRow = (h1, p, kdo) => `
  <div class="karel-row">
    <div class="avatar"><img src="${AVATAR}" alt=""></div>
    <div class="bubble">
      <h1>${h1}</h1>
      ${p ? `<p>${p}</p>` : ''}
      ${kdo ? `<span class="kdo">${kdo}</span>` : ''}
    </div>
  </div>`;

const shot = (file, tilt = '') => `
  <div class="shot ${tilt}"><img src="${zaber(file)}" alt=""></div>`;

/* ořezaný záběr: h = výška rámu v px, pos = ohnisko, zoom = přiblížení */
const shotCrop = (file, tilt, h, pos, zoom = 1) => `
  <div class="shot crop ${tilt}" style="height:${h}px;--pos:${pos};--zoom:${zoom}">
    <img src="${zaber(file)}" alt="">
  </div>`;

/* ---------- varianty ---------- */
const VARIANTS = [
  {
    file: 'story-1-karel-na-instagramu.png', w: 1080, h: 1920, cls: 'story',
    html: `
      ${header}
      <div class="spacer"></div>
      <div class="avatar" style="width:300px;height:300px"><img src="${AVATAR}" alt=""></div>
      <div class="bubble center no-tail" style="margin-top:48px">
        <h1>Postavil jsem se na Instagram. Jů. Hupít.</h1>
        <p>Tak tady zahýkáme a sdělíme vám novinku: udělal jsem hru. Teda — lidi „pomáhali“. Jmenuje se LOUKA RUN a hlavní hvězda jsem já.</p>
        <span class="kdo">— Karel, osel a ředitel všeho</span>
      </div>
      <div class="spacer"></div>
      <div class="cta">Sleduj. Hned. 🥕</div>
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'story-2-zlata-mrkev.png', w: 1080, h: 1920, cls: 'story',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-04-zlata-mrkev.png', 'tilt-l', 700, '5% 60%', 1.25)}
      ${karelRow(
        'Když ji mineš, budu se smát. Nahlas.',
        'Zlatá mrkev. Legenda. A já sliby plním.',
        '— Karel, osel slova'
      )}
      <div class="spacer"></div>
      <div class="cta">Zkus ji chytit 🥕</div>
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'story-3-daruj-a-hraj.png', w: 1080, h: 1920, cls: 'story',
    html: `
      ${header}
      <div class="spacer"></div>
      ${karelRow(
        'Daruj 200 Kč azylu. Dostaneš kód. Hraješ.',
        'Ty máš hru. Zvířata mají seno. Já mám pocit důležitosti. Všichni vyhráváme. Hlavně já.',
        '— Karel, osel a ekonom'
      )}
      ${shotCrop('zaber-02-mrkev-palivo.png', 'tilt-r', 660, '25% 82%', 1.3)}
      <div class="spacer"></div>
      <div class="cta green">💚 Daruj a hraj</div>
      <div class="podcta">Kód přijde hned. Seno taky.</div>
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'story-4-google-play.png', w: 1080, h: 1920, cls: 'story',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shot('zaber-08-hvezdna-noc.png', 'tilt-r')}
      ${karelRow(
        'Už brzy na Google Play.',
        'Ano. Pustili tam osla. Teď už s tím nikdo nic neudělá.',
        '— Karel, osel v obchodě s aplikacemi'
      )}
      <div class="spacer"></div>
      <div class="cta">Zatím běhám na webu →</div>
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'post-ctverec-1-hykam-tedy-jsem.png', w: 1080, h: 1080, cls: 'square',
    html: `
      ${header}
      <div class="spacer"></div>
      <div class="avatar" style="width:230px;height:230px"><img src="${AVATAR}" alt=""></div>
      <div class="bubble center no-tail" style="margin-top:36px">
        <h1>„Hýkám, tedy jsem.“</h1>
        <span class="kdo">— Karel, filozof z azylu Nech mě růst</span>
      </div>
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'post-ctverec-2-historky.png', w: 1080, h: 1080, cls: 'square',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-09-konec-behu.png', 'tilt-l', 540, '50% 50%', 1.65)}
      ${karelRow(
        'Každý běh končí mojí historkou.',
        'Všechny jsou pravdivé. Zdroj: já.'
      )}
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'post-ctverec-3-zadarmo.png', w: 1080, h: 1080, cls: 'square',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-11-obchod.png', 'tilt-r', 500, '50% 44%', 1.7)}
      ${karelRow(
        'Mě už máš zadarmo. Gratuluju — lepší už to nebude.',
        'Kamarádi se kupují za mince. Mince se sbírají během. Neprůstřelná logika.'
      )}
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'post-portret-1-launch.png', w: 1080, h: 1350, cls: 'portrait',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-01-vitej-na-louce.png', 'tilt-l', 600, '10% 65%', 1.35)}
      ${karelRow(
        'Vítej na mojí louce, nováčku.',
        'Běhačka ze skutečného azylu. Každé zvíře ve hře u nás doopravdy žije. Včetně mě. Hlavně mě.'
      )}
      <div class="spacer"></div>
      <div class="cta green">💚 Daruj 200 Kč → hraj hned</div>
      <div class="podcta">Brzy i na Google Play</div>
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'post-portret-2-nasi-lidi.png', w: 1080, h: 1350, cls: 'portrait',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-07-nasi-lidi.png', 'tilt-r', 580, '50% 85%', 1.15)}
      ${karelRow(
        'Zaměstnávám i lidi.',
        'Tomáš pořád něco staví a na hlavě mu bydlí slepice. Tony programuje beranům chytrý ohradník. Maruška zpívá bylinkám. Všechny jsem zaučil osobně.'
      )}
      <div class="spacer"></div>
      ${footer}`,
  },
];

/* ---------- render ---------- */
const page4 = (v) => `<!doctype html>
<html lang="cs"><head><meta charset="utf-8">
<link rel="stylesheet" href="styl.css">
</head><body class="${v.cls}">
${bg}
<div class="content">${v.html}</div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  for (const v of VARIANTS) {
    const tmp = 'tmp-' + v.file.replace(/\.png$/, '.html');
    fs.writeFileSync(path.join(DIR, tmp), page4(v));
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
    await page.goto(BASE + tmp, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.body.scrollHeight - document.documentElement.clientHeight
    );
    if (overflow > 0) console.warn(`⚠ ${v.file}: obsah přetéká o ${overflow}px`);
    await page.screenshot({ path: path.join(OUT, v.file) });
    console.log('✓', v.file);
    await page.close();
    fs.unlinkSync(path.join(DIR, tmp));
  }
  await browser.close();
})();
