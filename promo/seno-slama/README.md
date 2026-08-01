# Kampaň „Seno a sláma“ (zima 2026/2027)

Promo balíček pro Instagram ke sbírce azylu **Nech mě růst** na seno a slámu.
Mluví osel Karel v první osobě — stejný hlas jako kampaň
[`../karel-kampan/`](../karel-kampan/), ze které si tenhle balíček půjčuje šablonu.

**Vtip celé kampaně:** ve hře Louka Run je balík sena překážka („vypadá měkce,
ale je to zamaskovaná zeď — skoč!“). V zimě je to večeře pro 93 zvířat.

## Co tu je

| Soubor | Formát | Použití |
|--------|--------|---------|
| `post-1-hook.png` | 1080×1350 | karusel do feedu, 1. slide (hook) |
| `post-2-cisla.png` | 1080×1350 | 2. slide — čísla sbírky |
| `post-3-jak-prispet.png` | 1080×1350 | 3. slide — tři způsoby, jak přispět |
| `post-ctverec-seno.png` | 1080×1080 | samostatný čtvercový post |
| `reels-cover.png` | 1080×1920 | úvodní/coverová karta Reels |
| `reels-endcard.png` | 1080×1920 | závěrečná karta Reels s CTA |
| `story-seno.png` | 1080×1920 | Stories (nech místo na link sticker) |
| `popisky.md` | — | popisky ve 4 polohách, hashtagy, odpovědi do komentářů, šablona e-mailu s kódem |
| `reels-scenar.md` | — | scénáře na Reels záběr po záběru + publikační plán |
| `zabery/` | 1920×1080 | screenshoty ze hry (lekce o senu, náraz do balíku) |
| `sablona/` | — | CSS + render skript na další grafiky ve stejném stylu |

## Fakta kampaně (drž se jich)

- sbírka na zimu **2026/2027**, cíl **100 000 Kč**, běží přes **Darujme.cz**
- **95 balíků sena**, **30 balíků slámy**, **93 zvířat**
- balík sena zmizí zhruba za **4 dny**, balík slámy vydrží asi **týden**
- seno letos stojí **dvakrát tolik** co dřív
- odkaz **nechmerust.org/seno** přesměruje rovnou na Darujme.cz
- druhá cesta podpory: koupě hry **Louka Run** na Google Play
- kdo daruje **víc než 200 Kč**, může si napsat o kód ke hře na **info@nechmerust.org**

> Čísla „vybráno / zbývá“ se v grafikách záměrně neuvádějí — zastarala by.
> Aktuální stav patří do Stories, kde se dá kdykoli přetočit.

## Jak vyrobit další grafiku

1. V kořeni repa spusť lokální server: `python3 -m http.server 8777`
2. Přidej variantu do `sablona/render.js` (pole `VARIANTS` — texty, záběr, formát).
3. Spusť `node sablona/render.js` (potřebuje Playwright:
   `npm install --no-save playwright`; Chromium je předinstalovaný, cestu lze
   přebít proměnnou `CHROMIUM_PATH`).
4. Hotové PNG přistane v této složce.

Šablona `sablona/styl-seno.css` dědí základ (pozadí, bublina, CTA, velikosti)
ze šablony kampaně „Karel převzal účet“ a přidává senovou oblohu, dlaždice
s čísly (`.fakty`), očíslované kroky (`.kroky`) a velké číslo (`.velke-cislo`).

## Nové záběry ze hry

Hru pusť lokálně a otevři s `?tutorial=1` — Karlova škola běhu obsahuje lekci
o balíku sena, přesně tu scénu z grafik. Tutoriál se u každé lekce zastaví,
takže se dá v klidu screenshotovat.
