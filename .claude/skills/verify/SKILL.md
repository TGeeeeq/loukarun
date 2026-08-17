---
name: verify
description: Jak ověřit změny ve hře Louka Run naživo (statická stránka + canvas, emulace iPhonu v headless Chromiu přes Playwright).
---

# Ověřování Louka Run

Hra je čistě statická (žádný build) – stačí HTTP server a prohlížeč.

## Spuštění

```bash
python3 -m http.server 8123 --directory /cesta/k/repu &
```

Playwright: `npm install playwright-core` (mimo repo, např. do scratchpadu) a
Chromium je předinstalovaný v `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
(`chromium.launch({ executablePath: ... })`).

## Emulace iPhonu (vynucená rotace)

Režim `force-landscape` (telefon na výšku, hra otočená o 90° přes CSS transform
na `<body>`) se aktivuje media query `(orientation: portrait) and (pointer: coarse)`:

```js
browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
```

Po načtení ověř `document.documentElement.classList.contains('force-landscape')`.
V tomto režimu je výška hry `window.innerWidth` (390) a šířka `window.innerHeight` (844);
DOM souřadnice (getBoundingClientRect) jsou v NEOTOČENÉM viewportu – herní
souřadnice = prohozené osy (viz `gameRect()` v js/game.js).

## Užitečné flow

- `?tutorial=1` vynutí Karlovu školu běhu i s hotovým savem.
- AF znělka na startu: přeskočí se ťuknutím (`page.tap('body')`), pak počkat
  na `#screen-menu.visible` a ťuknout `#btn-play`.
- Zastavená lekce = `#btn-tut-continue:not([hidden])`. Tlačítko pulzuje
  (CSS animace) → `page.tap('#btn-tut-continue', { force: true })`, jinak
  Playwright věčně čeká na stabilitu. Na skryté tlačítko čekej přes
  `waitForSelector('#btn-tut-continue[hidden]', { state: 'attached' })`.

## Co se kreslí na canvas

Text/tvary na plátně nejsou v DOM – instrumentuj před načtením stránky
(`page.addInitScript`) např. `CanvasRenderingContext2D.prototype.fillText`
a sbírej `{text, x, y}`; pak lze assertovat, že se text kreslí uvnitř plátna
(0 < y < výška hry). Globál `GFX` (js/gfx.js) je dosažitelný z `page.evaluate`,
`GFX.rr` jde obalit pro záznam zaoblených obdélníků. Screenshot celé stránky
ukáže hru otočenou (na výšku) – to je správně.

## Audit viditelnosti (rozvržení na všech displejích)

`audit-rozvrzeni.js` projde matici rozlišení × velikost systémového písma ×
obrazovky a nahlásí, co je nedostupné, useknuté nebo přes sebe.

```bash
python3 -m http.server 8125 --directory . &
npm install playwright-core   # mimo repo, např. do scratchpadu
SCALES=100,130 OUT=./out.json node .claude/skills/verify/audit-rozvrzeni.js 2>&1 | grep hotovo
node .claude/skills/verify/audit-report.js < out.json
```

Proměnné: `SCALES` (velikost písma v %, výchozí `100,130`), `ONLY` (názvy
zařízení oddělené čárkou), `SCREENS`, `SHOOT=1` (snímky nálezů), `BASE`
(adresa serveru), `PW_DIR` (cesta k playwright-core), `EXE` (cesta k Chromiu –
playwright-core z npm chce svou revizi a v `/opt/pw-browsers` bývá jiná).

**Systémové zvětšení písma na Androidu je hlavní spouštěč rozbitého
rozvržení** — v `SCALES` musí zůstat aspoň jedna hodnota nad 100.

Čtyři pasti, na kterých detektor dřív lhal:
- telefon na výšku má hru otočenou o 90°, takže `getBoundingClientRect` vrací
  fyzické osy, ale `scrollHeight`/`overflow-y` herní → osy se musí přemapovat
  (`gameAxis()`), jinak se jako nedostupné hlásí i to, k čemu jde dorolovat
- překryv se počítá z viditelné části prvku (průnik se všemi ořezávajícími
  předky), jinak „překrývá“ i text schovaný za okrajem stránky deníčku
- **„dá se k tomu dorolovat" není v herním menu totéž jako „je to vidět".**
  Kvůli tomu audit kdysi prošel na zelenou, zatímco hráč posílal snímky s
  useknutými tlačítky: obsah byl formálně dosažitelný, jen o dvě obrazovky
  níž. Proto je tu kontrola E (`nevejde se, jen dorolovat`) a platí pro
  obrazovky `menu, shop, over, pause, settings`; odznaky a deníček rolovat
  smí, ty jsou ze zásady dlouhé.
- **zvětšené písmo se simuluje přes CDP `Page.setFontSizes`, ne zápisem
  `documentElement.style.fontSize`.** WebView systémové nastavení promítne do
  *výchozí* velikosti písma stránky; inline styl na `<html>` navíc přepíše
  `html { font-size: 16px }` ze `style.css`, tedy přímo tu obranu, kterou
  chceme ověřit — audit by pak hlásil poruchu i na opravené hře.
