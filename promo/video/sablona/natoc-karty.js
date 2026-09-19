/* =========================================================
   LOUKA RUN – karty a titulky promo videa

   Vyrenderuje do PNG všechno, co se ve videu překrývá přes
   herní záběry: titulní kartu, popisky jednotlivých scén,
   závěrečnou kartu a rámeček pro svislou (9:16) verzi.

   Před spuštěním pusť v kořeni repa lokální server:
       python3 -m http.server 8777
   Pak:
       NODE_PATH=<node_modules s playwright-core> \
       node promo/video/sablona/natoc-karty.js [pracovní-složka]

   Výstup: <pracovní-složka>/karty/*.png
   ========================================================= */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..', '..');
const WORK = process.argv[2] || path.join(ROOT, '.promo-work');
const OUT = path.join(WORK, 'karty');
const BASE = process.env.LOUKA_BASE || 'http://127.0.0.1:8777/';
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* ---------- texty scén (sdílí je vodorovná i svislá verze) ---------- */
const POPISKY = [
  { id: 1, text: 'Zvířátka z azylu vyrazila na trať' },
  { id: 2, text: 'Mrkev je palivo. Zlatá je jackpot.' },
  { id: 3, text: 'Skoč, podběhni, sbírej' },
  { id: 4, text: 'Šest světů: louka, sad, les, vesnice, západ, noc' },
  { id: 5, text: 'Šest zvířátek, každé se svým trikem' },
  { id: 6, text: 'Každý běh končí vtipným příběhem' },
];

/* ---------- společné kusy HTML ---------- */
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
  .slunce { position: absolute; border-radius: 50%;
    background: radial-gradient(circle, #fff3b0 0%, #ffe08a 55%, rgba(255,224,138,0) 72%); }
  .mrak { position: absolute; background: rgba(255,255,255,.92); border-radius: 50%; }
  .mrak::after { content:""; position:absolute; left:18%; top:-38%; width:60%; height:90%;
    background: inherit; border-radius: 50%; }
  .kopce { position: absolute; left: 0; right: 0; bottom: 0; overflow: hidden; }
  .kopec { position: absolute; border-radius: 50%; }
  .zem { position: absolute; left: 0; right: 0; bottom: 0; background: var(--lr-green); }
  img { display: block; }
</style>`;

const obloha = (h) => `
  <div class="plocha obloha"></div>
  <div class="slunce" style="right:9%;top:6%;width:${h * 0.22}px;height:${h * 0.22}px"></div>
  <div class="mrak" style="width:${h * 0.26}px;height:${h * 0.08}px;left:7%;top:11%"></div>
  <div class="mrak" style="width:${h * 0.20}px;height:${h * 0.065}px;right:24%;top:20%"></div>
  <div class="mrak" style="width:${h * 0.17}px;height:${h * 0.055}px;left:27%;top:26%"></div>`;

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

/* =========================================================
   KARTY
   ========================================================= */
function titul(w, h, svisle) {
  const logoW = svisle ? w * 0.88 : w * 0.62;
  return `${HLAVA}
  ${obloha(h)}
  ${kopce(h)}
  <img src="${LOGO}" style="position:absolute;left:50%;top:${svisle ? 38 : 39}%;
       transform:translate(-50%,-50%);width:${logoW}px">
  <img src="${KAREL}" style="position:absolute;left:${svisle ? 50 : 50}%;
       bottom:${h * 0.055}px;transform:translateX(-50%);height:${h * (svisle ? 0.19 : 0.26)}px">`;
}

function popisek(w, h, text, svisle) {
  const fs_ = svisle ? w * 0.058 : w * 0.030;
  const pad = svisle ? '0.62em 1.05em' : '0.55em 1.05em';
  const misto = svisle
    ? `left:50%;transform:translateX(-50%);bottom:${h * 0.175}px;max-width:${w * 0.84}px;text-align:center`
    : `left:${w * 0.055}px;bottom:${h * 0.085}px;max-width:${w * 0.62}px`;
  return `${HLAVA}
  <div style="position:absolute;${misto};
       font-size:${fs_}px;font-weight:800;line-height:1.18;color:var(--lr-cream);
       background:rgba(44,79,36,.92);border-radius:${svisle ? 34 : 26}px;padding:${pad};
       box-shadow:0 14px 34px rgba(20,45,18,.35)">${text}</div>`;
}

function konec(w, h, svisle) {
  // svislý formát unese velké logo, na širokém se musí vejít i pod ně tři bloky
  const logoW = svisle ? w * 0.86 : w * 0.34;
  const velke = svisle ? w * 0.058 : w * 0.030;
  const male = svisle ? w * 0.040 : w * 0.023;
  const drobne = svisle ? w * 0.031 : w * 0.018;
  return `${HLAVA}
  ${obloha(h)}
  ${kopce(h)}
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;
       align-items:center;justify-content:center;gap:${h * (svisle ? 0.024 : 0.028)}px;
       padding-bottom:${h * 0.04}px">
    <img src="${LOGO}" style="width:${logoW}px">
    <div style="font-size:${velke}px;font-weight:800;color:var(--lr-green-deep);text-align:center;
         line-height:1.2">Hraj a nakrm opravdové zvíře.</div>
    <!-- cena v obchodě: kolik hra stojí a kolik z toho dostane azyl -->
    <div style="display:flex;align-items:center;gap:${w * 0.02}px;
         background:#fff;border-radius:${svisle ? 40 : 32}px;
         padding:${h * 0.020}px ${w * 0.030}px;box-shadow:var(--lr-stin-karta)">
      <img src="${LOGO_AZYL}" style="height:${h * (svisle ? 0.080 : 0.125)}px">
      <div style="font-size:${male}px;font-weight:700;color:var(--lr-ink);line-height:1.25">
        Na Google Play za <span style="font-weight:800">239,99 Kč</span>
        <br><span style="color:var(--lr-green-deep);font-weight:800">
        z toho 149 Kč jde azylu</span>
      </div>
    </div>
    <!-- druhá cesta ke hře: příspěvek nad 200 Kč → webová verze -->
    <div style="max-width:${svisle ? w * 0.86 : w * 0.54}px;text-align:center;
         font-size:${drobne}px;font-weight:700;line-height:1.36;color:var(--lr-ink);
         background:rgba(255,246,228,.9);border:${svisle ? 4 : 3}px solid rgba(44,79,36,.18);
         border-radius:${svisle ? 30 : 24}px;padding:${h * 0.016}px ${w * 0.026}px">
      Za příspěvek vyšší než <span style="font-weight:800">200 Kč</span>
      si o hru můžete požádat<br>
      <span style="color:var(--lr-green-deep);font-weight:800">ve webové verzi</span>,
      která jde hrát na každém zařízení.
    </div>
    <div style="font-size:${male}px;font-weight:800;letter-spacing:.04em;
         color:var(--lr-cream);background:var(--lr-green-dark);
         border-radius:var(--lr-radius-pill);padding:${h * 0.015}px ${w * 0.03}px">
      nechmerust.org/loukarun 🥕</div>
  </div>`;
}

/* Svislý rámeček: nahoře logo, dole pruh na popisek a odkaz, uprostřed
   PRŮHLEDNÉ okno, kterým prosvítá herní záběr. Pozadí se proto kreslí
   dvěma pruhy – jedna plocha přes celý formát by okno zakryla. */
const OKNO = { y: 400, h: 729 };   // musí sedět se sestav-video.py

function ramecek(w, h) {
  const dol = OKNO.y + OKNO.h;
  return `${HLAVA}
  <div style="position:absolute;left:0;right:0;top:0;height:${OKNO.y}px;
       background:var(--lr-grad-sky)"></div>
  <div style="position:absolute;left:0;right:0;top:${dol}px;bottom:0;
       background:linear-gradient(180deg,#8ed4f7 0%,#cdeafd 18%,#a8d8a0 52%,#5aa84f 100%)"></div>
  <div style="position:absolute;left:0;right:0;top:${OKNO.y - 7}px;height:7px;background:rgba(44,79,36,.45)"></div>
  <div style="position:absolute;left:0;right:0;top:${dol}px;height:7px;background:rgba(44,79,36,.45)"></div>
  <img src="${LOGO_RADEK}" style="position:absolute;left:50%;top:${OKNO.y / 2}px;
       transform:translate(-50%,-50%);width:${w * 0.88}px">
  <div style="position:absolute;left:50%;transform:translateX(-50%);bottom:${h * 0.045}px;
       font-size:${w * 0.042}px;font-weight:800;letter-spacing:.03em;color:var(--lr-cream);
       background:var(--lr-green-dark);border-radius:var(--lr-radius-pill);
       padding:${h * 0.012}px ${w * 0.05}px;white-space:nowrap">nechmerust.org/loukarun 🥕</div>`;
}

/* =========================================================
   render
   ========================================================= */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  // stránku napřed načteme z http – při setContent na about:blank by prohlížeč
  // kvůli CORS odmítl herní písmo Baloo 2 a karty by vyšly v systémovém fontu
  await page.goto(BASE + 'promo/video/sablona/prazdna.html', { waitUntil: 'load' });

  async function karta(jmeno, w, h, html, pruhledne = false) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.load('800 100px "Baloo 2"').then(() => document.fonts.ready));
    await page.waitForTimeout(220);
    const dest = path.join(OUT, jmeno + '.png');
    await page.screenshot({ path: dest, omitBackground: pruhledne });
    console.log('→ karty/' + jmeno + '.png', `${w}×${h}`);
  }

  /* ---------- vodorovně 1920×1080 ---------- */
  await karta('titul', 1920, 1080, titul(1920, 1080, false));
  await karta('konec', 1920, 1080, konec(1920, 1080, false));
  for (const p of POPISKY) {
    await karta('popisek-' + p.id, 1920, 1080, popisek(1920, 1080, p.text, false), true);
  }

  /* ---------- svisle 1080×1920 ---------- */
  await karta('titul-9x16', 1080, 1920, titul(1080, 1920, true));
  await karta('konec-9x16', 1080, 1920, konec(1080, 1920, true));
  await karta('ramecek-9x16', 1080, 1920, ramecek(1080, 1920), true);
  for (const p of POPISKY) {
    await karta('popisek-9x16-' + p.id, 1080, 1920, popisek(1080, 1920, p.text, true), true);
  }

  await browser.close();
})();
