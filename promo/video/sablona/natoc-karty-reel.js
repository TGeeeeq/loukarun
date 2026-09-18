/* =========================================================
   LOUKA RUN – karty pro krátký reel (9:16)

   Vyrobí průhledné vrstvy, které se ve střihu překládají přes
   herní záběr: rámeček (logo nahoře, adresa dole), popisky scén
   a plnou závěrečnou kartu.

   Liší se od natoc-karty.js záměrně: tenhle reel míří na lidi,
   kteří hru NEZNAJÍ, takže herní záběr vyplňuje celou plochu
   (rozostřené pozadí místo letterboxu) a text sedí v bezpečné
   zóně mimo ovládání Instagramu.

   Před spuštěním pusť v kořeni repa lokální server:
       python3 -m http.server 8777
   Pak:
       NODE_PATH=<node_modules s playwright-core> \
       node promo/video/sablona/natoc-karty-reel.js [pracovní-složka]

   Výstup: <pracovní-složka>/karty/reel-*.png
   ========================================================= */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..', '..');
const WORK = process.argv[2] || path.join(ROOT, '.promo-work');
const OUT = path.join(WORK, 'karty');
const BASE = process.env.LOUKA_BASE || 'http://127.0.0.1:8777/';
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const W = 1080, H = 1920;

/* ---------- bezpečná zóna Instagramu ----------
   Reels překrývá spodních ~340 px (popisek, tlačítka) a horních ~180 px
   (jméno účtu, zvuk). Všechno čitelné musí ležet mezi tím. */
const ZONA = { top: 200, bottom: 1600 };
const OKNO = { y: 430, h: 880 };   // musí sedět se sestav-reel.py

/* ---------- texty ----------
   Věta na záběr, max dva řádky. Čte se bez zvuku a za pochodu,
   takže první musí dávat smysl sama o sobě. */
const POPISKY = [
  { id: 1, text: 'Tohle zvíře je&nbsp;skutečné.' },
  { id: 2, text: 'Osel Karel žije v azylu u&nbsp;Čáslavi.' },
  { id: 3, text: 'Sbírá mrkev, aby jeho kamarádi měli&nbsp;seno.' },
  { id: 4, text: 'Šest zvířat z azylu.<br>Každé se svým trikem.' },
  { id: 5, text: 'Šest světů — od louky po hvězdnou&nbsp;noc.' },
  { id: 6, text: 'Právě vyšla nová&nbsp;verze.' },
];

const HLAVA = `
<meta charset="utf-8">
<link rel="stylesheet" href="${BASE}promo/znacka/tokeny.css">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden;
               font-family: var(--lr-font); color: var(--lr-ink); }
  body { background: transparent; }
  .plocha { position: absolute; inset: 0; }
  .obloha { background: var(--lr-grad-sky); }
  .kopce { position: absolute; left: 0; right: 0; bottom: 0; overflow: hidden; }
  .kopec { position: absolute; border-radius: 50%; }
  .zem { position: absolute; left: 0; right: 0; bottom: 0; background: var(--lr-green); }
  img { display: block; }
</style>`;

const kopce = (h) => `
  <div class="kopce" style="height:${h * 0.3}px">
    <div class="kopec" style="width:130%;height:190%;left:-35%;top:44%;background:var(--lr-green-soft)"></div>
    <div class="kopec" style="width:120%;height:200%;right:-40%;top:32%;background:#7cc276"></div>
    <div class="zem" style="height:${h * 0.09}px"></div>
  </div>`;

const LOGO = BASE + 'promo/znacka/loukarun-logo-cisty.svg';
const LOGO_RADEK = BASE + 'promo/znacka/loukarun-logo-vodorovne.svg';
const LOGO_AZYL = BASE + 'assets/logo.png';
const KAREL = BASE + 'promo/znacka/maskoti/karel-skok.png';

/* Rámeček: logo a adresa drží POHROMADĚ nahoře. Dolní půlka patří
   celá popisku – adresa u spodního okraje se s ním přetlačovala
   a ve svislém formátu na ni stejně není místo. */
function ramecek() {
  return `${HLAVA}
  <img src="${LOGO_RADEK}" style="position:absolute;left:50%;top:${ZONA.top + 80}px;
       transform:translate(-50%,-50%);width:${W * 0.58}px;
       filter:drop-shadow(0 8px 22px rgba(20,45,18,.55))">
  <div style="position:absolute;left:50%;transform:translateX(-50%);top:${ZONA.top + 150}px;
       font-size:${W * 0.033}px;font-weight:800;letter-spacing:.03em;color:var(--lr-cream);
       background:rgba(28,56,24,.78);border-radius:var(--lr-radius-pill);
       padding:${H * 0.009}px ${W * 0.038}px;white-space:nowrap">nechmerust.org/loukarun 🥕</div>`;
}

/* Popisek sedí pod herním oknem, pořád uvnitř bezpečné zóny. */
function popisek(text) {
  const y = OKNO.y + OKNO.h - 70;
  return `${HLAVA}
  <div style="position:absolute;left:50%;transform:translateX(-50%);top:${y}px;
       width:${W * 0.88}px;text-align:center;
       font-size:${W * 0.066}px;font-weight:800;line-height:1.16;color:var(--lr-cream);
       background:rgba(44,79,36,.94);border-radius:40px;padding:0.62em 0.9em;
       box-shadow:0 18px 40px rgba(20,45,18,.42)">${text}</div>`;
}

/* Závěrečná karta: záměrně BEZ ceny. Cena hry se právě přehodnocuje
   a video, které slibuje částku, se dá opravit jen přetočením. */
function konec() {
  return `${HLAVA}
  <div class="plocha obloha"></div>
  ${kopce(H)}
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;
       align-items:center;justify-content:center;gap:${H * 0.028}px;padding-bottom:${H * 0.06}px">
    <img src="${LOGO}" style="width:${W * 0.84}px">
    <div style="font-size:${W * 0.062}px;font-weight:800;color:var(--lr-green-deep);
         text-align:center;line-height:1.2;max-width:${W * 0.86}px">
      Hraj a nakrm skutečné zvíře.</div>
    <div style="display:flex;align-items:center;gap:${W * 0.028}px;
         background:#fff;border-radius:44px;padding:${H * 0.020}px ${W * 0.045}px;
         box-shadow:var(--lr-stin-karta)">
      <img src="${LOGO_AZYL}" style="height:${H * 0.072}px">
      <div style="font-size:${W * 0.040}px;font-weight:700;color:var(--lr-ink);line-height:1.3">
        Výtěžek jde zvířatům<br>
        <span style="color:var(--lr-green-deep);font-weight:800">azylu Nech mě růst</span>
      </div>
    </div>
    <div style="font-size:${W * 0.046}px;font-weight:800;letter-spacing:.04em;
         color:var(--lr-cream);background:var(--lr-green-dark);
         border-radius:var(--lr-radius-pill);padding:${H * 0.016}px ${W * 0.055}px">
      nechmerust.org/loukarun 🥕</div>
  </div>
  <img src="${KAREL}" style="position:absolute;left:50%;bottom:${H * 0.045}px;
       transform:translateX(-50%);height:${H * 0.15}px">`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE });
  // přes http kvůli písmu Baloo 2 – na about:blank ho CORS nepustí
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto(BASE + 'promo/video/sablona/prazdna.html', { waitUntil: 'load' });

  async function karta(jmeno, html, pruhledne = false) {
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.load('800 100px "Baloo 2"').then(() => document.fonts.ready));
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(OUT, jmeno + '.png'), omitBackground: pruhledne });
    console.log('→ karty/' + jmeno + '.png');
  }

  await karta('reel-ramecek', ramecek(), true);
  await karta('reel-konec', konec());
  for (const p of POPISKY) await karta('reel-popisek-' + p.id, popisek(p.text), true);

  await browser.close();
  console.log('hotovo');
})();
