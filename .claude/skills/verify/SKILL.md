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
