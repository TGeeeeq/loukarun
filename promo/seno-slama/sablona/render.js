/* =========================================================
   NECH MĚ RŮST – render promo grafik „Karel vybírá na seno“
   Před spuštěním pusť v kořeni repa lokální server:
       python3 -m http.server 8777
   Pak:  node sablona/render.js
   (Playwright: npm install --no-save playwright, Chromium je
    předinstalovaný v /opt/pw-browsers/chromium-1194/chrome-linux/chrome)
   Výstup: PNG do promo/seno-slama/
   ========================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;                      // …/promo/seno-slama/sablona
const OUT = path.join(DIR, '..');           // …/promo/seno-slama
const BASE = 'http://127.0.0.1:8777/promo/seno-slama/sablona/';
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const AVATAR = '../../../assets/icon-512.png';
const zaber = (f) => '../zabery/' + f;

/* ---------- stavební dílky ---------- */
const bg = `
  <div class="sun" style="right:9%;top:6%"></div>
  <div class="cloud" style="width:260px;height:80px;left:6%;top:7%"></div>
  <div class="cloud" style="width:200px;height:64px;right:22%;top:15%"></div>
  <div class="cloud" style="width:170px;height:56px;left:26%;top:23%"></div>
  <div class="hills"><div class="hill h1"></div><div class="hill h2"></div><div class="ground"></div></div>`;

const header = `
  <div class="badge">AZYL NECH MĚ RŮST 💚</div>
  <div class="wordmark">SENO A<span> SLÁMA</span></div>`;

const footer = `<div class="url">nechmerust.org/seno 🌾</div>`;

const karelRow = (h1, p, kdo) => `
  <div class="karel-row">
    <div class="avatar"><img src="${AVATAR}" alt=""></div>
    <div class="bubble">
      <h1>${h1}</h1>
      ${p ? `<p>${p}</p>` : ''}
      ${kdo ? `<span class="kdo">${kdo}</span>` : ''}
    </div>
  </div>`;

/* ořezaný záběr: h = výška rámu v px, pos = ohnisko, zoom = přiblížení */
const shotCrop = (file, tilt, h, pos, zoom = 1) => `
  <div class="shot crop ${tilt}" style="height:${h}px;--pos:${pos};--zoom:${zoom}">
    <img src="${zaber(file)}" alt="">
  </div>`;

const fakty = `
  <div class="fakty">
    <div class="fakt"><b>95</b><span>balíků sena</span></div>
    <div class="fakt"><b>30</b><span>balíků slámy</span></div>
    <div class="fakt"><b>93</b><span>hladových zvířat</span></div>
  </div>`;

const kroky = `
  <div class="kroky">
    <div class="krok"><div class="cislo">1</div><p>Přispěj přes <em>Darujme.cz</em> → nechmerust.org/seno</p></div>
    <div class="krok"><div class="cislo">2</div><p>Nebo si mě kup jako hru — <em>Louka Run</em> na Google Play</p></div>
    <div class="krok"><div class="cislo">3</div><p>Dal jsi přes <em>200 Kč</em>? Napiš si o kód ke hře na info@nechmerust.org</p></div>
  </div>`;

/* ---------- varianty ---------- */
const VARIANTS = [
  /* ===== karusel do feedu (1080×1350) ===== */
  {
    file: 'post-1-hook.png', w: 1080, h: 1350, cls: 'portrait seno',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-seno-blizko.png', 'tilt-l', 560, '4% 74%', 3.0)}
      ${karelRow(
        'Celý rok ve svý hře skáču přes balíky sena.',
        'Poprvé v životě vás prosím, abyste mi jeden hodili rovnou do seníku. Vyhlašuju sbírku na zimu.',
        '— Karel, osel a ředitel všeho'
      )}
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'post-2-cisla.png', w: 1080, h: 1350, cls: 'portrait seno',
    html: `
      ${header}
      <div class="spacer"></div>
      ${karelRow(
        'Zima má 93 hladových důvodů.',
        'Jeden balík sena u nás zmizí za čtyři dny. Balík slámy vydrží týden. A seno letos stojí dvakrát tolik. Matematika mě nebaví, ale tohle jsem si spočítal.',
        '— Karel, osel a ekonom'
      )}
      ${fakty}
      <div class="spacer"></div>
      <div class="cta green">💚 Cíl: 100 000 Kč</div>
      <div class="podcta">Sbírka na seno a slámu, zima 2026/2027</div>
      <div class="spacer"></div>
      ${footer}`,
  },
  {
    file: 'post-3-jak-prispet.png', w: 1080, h: 1350, cls: 'portrait seno',
    html: `
      ${header}
      <div class="spacer"></div>
      ${karelRow(
        'Tři způsoby, jak nakrmit osla.',
        'Vyber si jeden. Já beru všechny.'
      )}
      ${kroky}
      <div class="spacer"></div>
      <div class="cta">🌾 nechmerust.org/seno</div>
      <div class="podcta">Nemáš Android? Napiš nám, domluvíme se.</div>
      <div class="spacer"></div>
      ${footer}`,
  },

  /* ===== samostatný čtvercový post (1080×1080) ===== */
  {
    file: 'post-ctverec-seno.png', w: 1080, h: 1080, cls: 'square seno',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-seno-blizko.png', 'tilt-r', 300, '4% 74%', 2.0)}
      ${karelRow(
        'Ve hře je seno překážka. V zimě je to večeře.',
        '95 balíků sena, 30 slámy, 93 zvířat. Sbírka běží.'
      )}
      <div class="spacer"></div>
      <div class="cta green">💚 Daruj na seno a slámu</div>
      <div class="spacer"></div>
      ${footer}`,
  },

  /* ===== Reels: úvodní/coverová karta (1080×1920) ===== */
  {
    file: 'reels-cover.png', w: 1080, h: 1920, cls: 'story seno',
    html: `
      ${header}
      <div class="spacer"></div>
      <div class="avatar" style="width:300px;height:300px"><img src="${AVATAR}" alt=""></div>
      <div class="bubble center no-tail" style="margin-top:48px">
        <h1>Prosím vás poprvé v životě o seno.</h1>
        <p>Ve hře přes něj skáču. V zimě ho žeru. A letos stojí dvakrát tolik než loni.</p>
        <span class="kdo">— Karel, osel a ředitel všeho</span>
      </div>
      <div class="spacer"></div>
      <div class="cta">Sbírka je spuštěná 🌾</div>
      <div class="spacer"></div>
      ${footer}`,
  },

  /* ===== Reels: závěrečná karta s CTA (1080×1920) ===== */
  {
    file: 'reels-endcard.png', w: 1080, h: 1920, cls: 'story seno',
    html: `
      ${header}
      <div class="spacer"></div>
      <div class="velke-cislo">100 000 Kč</div>
      <div class="podcta" style="margin-top:18px">na seno a slámu pro 93 zvířat</div>
      ${kroky}
      <div class="spacer"></div>
      <div class="cta green">💚 Daruj přes Darujme.cz</div>
      <div class="podcta">Nad 200 Kč ti pošleme kód ke hře</div>
      <div class="spacer"></div>
      ${footer}`,
  },

  /* ===== Stories s místem na link sticker (1080×1920) ===== */
  {
    file: 'story-seno.png', w: 1080, h: 1920, cls: 'story seno',
    html: `
      ${header}
      <div class="spacer"></div>
      ${shotCrop('zaber-seno-blizko.png', 'tilt-l', 620, '4% 74%', 2.9)}
      ${karelRow(
        'Balík sena: ve hře zeď, v zimě večeře.',
        'Potřebujeme jich 95. A ještě 30 slámy, ať se má kdo válet.',
        '— Karel, osel a ředitel všeho'
      )}
      <div class="spacer"></div>
      <div class="mail">info@nechmerust.org → kód ke hře nad 200 Kč</div>
      <div class="spacer"></div>
      ${footer}`,
  },
];

/* ---------- render ---------- */
const page4 = (v) => `<!doctype html>
<html lang="cs"><head><meta charset="utf-8">
<link rel="stylesheet" href="styl-seno.css">
</head><body class="${v.cls}">
${bg}
<div class="content">${v.html}</div>
</body></html>`;

(async () => {
  const browser = await chromium.launch(fs.existsSync(EXE) ? { executablePath: EXE } : {});
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
