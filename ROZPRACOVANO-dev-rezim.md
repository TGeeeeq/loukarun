# ROZPRACOVÁNO: vývojářský režim ve hře

> Předávací poznámka pro dalšího, kdo na tom bude pracovat. **Práce není
> dokončená a není odeslaná.** Až bude hotovo, tenhle soubor se smaže a jeho
> podstatné body se přepíšou do `CLAUDE.md`.

Stav k 22. 9. 2026. Větev `main` v `TGeeeeq/loukarun`, **necommitnuto**.

---

## 1. Co se dělá a proč

Zadavatel (vývojář hry) potřebuje dvě věci, které hra dosud neuměla:

1. **Vrátit se do kůže nového hráče** — smazat postup tak, aby se znovu spustil
   tutoriál a první setkání s Karlem. Má to fungovat **na webu i v aplikaci
   z Google Play**.
2. **Vývojářský režim** — přeskakovat obsah a zkoušet věci rychle (mince,
   odemknutá zvířátka, nesmrtelnost, skok na vzdálený kilometr). „Jenom pro
   mě", tedy ne na očích hráčům.

### Past, kvůli které to není triviální

„Vymazat cache" a „být novým hráčem" jsou **tři různé věci** a na Androidu ta
nejdůležitější není cache:

| co | kde leží | v aplikaci z Play |
| --- | --- | --- |
| postup (mince, zvířátka, Karel, tutoriál) | `loukarun_save_v1` | **+ záloha v nativních Preferences** |
| nastavení, jazyk | `loukarun_comfort_v1`, `loukarun_lang_v1` | dtto |
| kód hry | cache service workeru | **service worker se v appce neregistruje** |

`STORE.recover()` (`js/platform.js`) při startu obnoví save z nativních
Preferences, když je localStorage prázdný. **Kdo smaže jen localStorage,
uvidí po načtení přesně ten postup, kterého se chtěl zbavit** — a bude to
považovat za chybu resetu. Proto musí mazání jít vždy přes `STORE.remove()`.

---

## 2. Co zadavatel rozhodl (nepředělávat bez jeho svolení)

- **Vývojářský režim je ve všech buildech**, i na ostrém webu a v AAB pro Play,
  schovaný za tajným gestem. Zadavatel to volil vědomě proti variantě
  „vystřihnout z produkce", protože chce zkoušet přímo na ostrém webu a na
  appce z Play, ne jen z debug APK.
  - **Není to ochrana a nesmí se za ni vydávat.** Hra běží v prohlížeči, takže
    kdokoli s konzolí si příznak nastaví ručně. Gesto brání jen náhodnému
    objevení. Proto za režimem nesmí nikdy přibýt nic než vlastní postup
    hráče — žádná cizí data, žádné klíče.
- **Rozsah panelu:** reset postupu (v ceně), mince a odemykání, zásahy do běhu.
  Karla/deníček a denní mise zadavatel **nechtěl** — část z toho tam nakonec je
  jako vedlejší produkt resetu (viz níž), ale rozšiřovat to dál bez zeptání ne.

---

## 3. Co je hotové

### `js/dev.js` (NOVÝ, ~410 řádků) — celý vývojářský režim

`window.DEVTOOLS` s jediným veřejným vstupem `attach(most)`. Obsahuje gesto,
panel, styl (vlastní `<style>`, do `style.css` se nesahalo) i všechny akce.

**Odemyká se 7 ťuknutími na číslo verze v Nastavení** (do 3 s mezi ťuknutími),
na počítači i `Ctrl+Shift+D`. Zkratky: `?dev=1` zapne, `?dev=0` vypne.

Příznak leží pod **vlastním klíčem `loukarun_dev_v1`** — schválně mimo
`loukarun_save_v1`, protože „úplně nový hráč" maže právě ten save a režim by
si tím pokaždé vypnul sám sebe. (Ověřeno testem, viz § 4.)

Panel umí:

| sekce | tlačítka |
| --- | --- |
| Začít znovu | úplně nový hráč (wipe `save` + `comfort`), znovu potkat Karla, znovu školu běhu, zapomenout deníček |
| Mince a odemknutí | +1 000, nastavit počet, odemknout vše, zamknout vše (Karel zůstává — bez postavy by hra neměla za koho běžet) |
| Za běhu | nesmrtelnost, skok na metr, doplnit energii, ukončit běh |
| Kopie hry a režim | smazat cache + odregistrovat SW, vypnout režim |

### `js/game.js` — most a nesmrtelnost (4 zásahy)

- `const DEV_FLAGS = { god: false }` u `fxPinned`. Objekt existuje vždycky,
  i když se `dev.js` vůbec nenačte.
- `collide()`: `if (S.invuln > 0 || DEV_FLAGS.god) return;`
- úbytek energie obalený `if (!DEV_FLAGS.god) { … }` — **nesmrtelnost musí
  zastavit i odčerpávání**, jinak běh po pár minutách stejně skončí.
- na konci inicializace (za `showScreen('intro')`) `if (window.DEVTOOLS)
  DEVTOOLS.attach({…})`. Ven jde `save`, `persist`, `S`, `CHARACTERS`,
  `ITEMS`, `flags` a čtyři funkce, které umí jen hra: `refreshMenu`,
  `refill`, `finish`, `teleport`.
- `GAME_VERSION` zvednuta na **1.9.16**.

`teleport(m)` je jediná netriviální část mostu: přenastaví `S.worldX`, zahodí
svět vygenerovaný pro původní vzdálenost, posadí znovu spawn body, nechá
`speedAnchorX = 0` (po skoku na 5 km má hra běžet jako po odběhnutých 5 km)
a **posune `S.lastMilestone` a `S.lastSpecial`** — bez toho se hned po
dosednutí spustí lavina milníků a na každém 2,5 km rovnou Zvířecí koncert.

### `js/platform.js` — `STORE.remove(key)`

Maže localStorage **i nativní Preferences** a shazuje značku `lr_recovered`.
Vrací slib, protože Preferences mažou asynchronně a volající musí počkat,
než načte stránku znovu. Bez téhle funkce reset na Androidu nefunguje (viz § 1).

### `index.html`, `sw.js`

- `<script src="js/dev.js">` **před** `game.js` (ten si na konci sáhne po
  `window.DEVTOOLS`).
- `CACHE` → `loukarun-v65`, `js/dev.js` přidán do `CORE`, **záměrně NE do
  `VITAL`** — chybějící vývojářský panel nesmí bránit tomu, aby se nová verze
  hry pustila ke slovu (poučení z 1.9.12).

---

## 4. Co je ověřené (headless Chromium, emulace telefonu)

Prošlo **26 z 27** kontrol; ten jeden neúspěch byla chyba testu, ne kódu, a je
doměřený zvlášť (save je při startu po resetu opravdu `null`).

Ověřeno mimo jiné: hra naběhne bez chyb v konzoli; 6 ťuknutí panel neotevře
a 7. ano; +1 000 mincí se zapíše do savu a promítne do menu; odemknutí dá
6/6 zvířat a 12/12 ozdob; příznak režimu přežije reload **i „úplně nový
hráč"**; nesmrtelný běh s teleportem na 4 000 m po 2,5 s neskončil a energie
zůstala plná; po resetu má hráč 0 mincí, 0 běhů, jen Karla a čekající tutoriál;
`?dev=1` i `?dev=0` fungují. Testy repa (`npm test`) 15/15.

Opravená chyba nalezená měřením: `#dev-close` (křížek) se bez
`position: relative` na kartě pozicoval vůči celému oknu a na širokém displeji
odletěl do rohu obrazovky.

---

## 5. KDE TO VÁZNE — jediná otevřená věc

**Kam posadit plovoucí tlačítko 🛠, aby nepřekrývalo nic klikatelného.**

Hra na telefonu na výšku otáčí `<body>` o 90° (`html.force-landscape`), takže
DOM souřadnice neodpovídají tomu, co vidí hráč, a překryv se **musí měřit**,
ne odhadovat. Zatím vyšlo:

- `right:6px;top:6px` (současný stav v kódu) **překrývá `btn-pause` za během**
  (624 px² z tlačítka) a na některých rozlišeních `lang-btn` v menu.
- Levý dolní roh překrývá `btn-daily` (denní mise).
- Horní rohy překrývají `btn-shop-back` v obchodě a `btn-settings-back`
  v nastavení — to už je vyřešené tím, že se tlačítko na těchto obrazovkách
  schovává (viz níž).

**Dvě měření si ale odporují** a to je přesně to, co je potřeba rozseknout:

| měření | `left:6px;bottom:6px` v menu |
| --- | --- |
| `t7.js` (mřížka rohů) | překryv 64 px² s `btn-daily` |
| `t10.js` (mřížka 5×2 pozic) | **0 px², čisté všude** |

Celý levý sloupec (`left:6px` v pěti svislých polohách) vyšel v `t10.js` čistý
v menu i za běhu na všech pěti rozlišeních. **Než se podle toho něco nastaví,
musí se ten rozpor vysvětlit** — jedno z těch měření lže a stavět na špatném
znamená vrátit se sem potřetí. Podezření: `t10.js` měří prvek, který je
v tu chvíli `hidden`, a dostává nulový rect; v `t10.js` se sice `o.hidden`
shazuje před měřením, ale nebylo ověřeno, že rect je pak nenulový. **První
krok: vypsat surový `getBoundingClientRect()` tlačítka i `#btn-daily`
v témže měření a podívat se, jestli nejsou nuly.**

Mezitím je v `dev.js` už hotové omezení viditelnosti, které stojí a platí:
tlačítko svítí **jen v menu a za běhu**, na ostatních obrazovkách se schová
(`watchScreens()`, `MutationObserver` na `class` u `.screen` a `#hud`).
Z obchodu se panel otevře ťuknutím na verzi v Nastavení. Tahle část je
ověřená a funguje na všech pěti rozlišeních.

---

## 6. Co zbývá udělat

1. **Rozseknout rozpor v měření** (§ 5) a podle výsledku posadit `#dev-open`.
   Kritérium: nulový překryv v menu i za běhu na 320×568, 360×640, 390×844,
   412×915 a 1280×800. Pozor na `?perf` overlay — ten sedí na `left:6px;top:6px`.
2. **Pustit audit rozvržení** podle `CLAUDE.md` (`.claude/skills/verify/`),
   se `SCALES=100,130`. Panel je overlay a rozvržení hry nemění, ale sahalo se
   do `index.html`, tak ať je to potvrzené, ne předpokládané.
3. **Vyzkoušet na skutečném telefonu**, hlavně reset v aplikaci s Capacitorem —
   to je jediná věc, kterou headless prohlížeč ověřit **nemůže** (nativní
   Preferences tam nejsou). Bez toho se nesmí tvrdit, že reset na Androidu
   funguje; zatím je ověřená jen webová větev a to, že se `STORE.remove()`
   nativní větve dovolá.
4. **Zapsat to do `CLAUDE.md`** hry (sekce *Kde co je* + *Na co si dát pozor*:
   past s `recover()`, proč `dev.js` nepatří do `VITAL`, proč příznak nebydlí
   v savu) a **smazat tenhle soubor**.
5. **Přenést na web** (`TGeeeeq/NMRStranky1.0`):
   - `bash web/scripts/sync-loukarun.sh /home/user/loukarun`
   - `web/public/loukarun/app/sw.js` — číslo cache **ručně** na `loukarun-v65`
     a `js/dev.js` do `CORE` (skript `sw.js` a manifest schválně nepřepisuje)
   - `LOUKARUN.version` v `web/lib/site.ts` → `1.9.16`, jinak spadne
     `tests/unit/loukarun-verze.test.ts`
   - `npm test` a `npx tsc --noEmit` ve `web/`
6. **Commit a push** v obou repozitářích. V repu hry patří všechno do `main`;
   na webu se pracuje na `claude/dev-mode-cache-reset-0hcqdl` a pak sloučit
   do `main` (push do `main` = deploy na produkci).
7. **AAB se kvůli tomu stavět nemusí hned** — a když se stavět bude, platí
   pořadí z `CLAUDE.md`: nejdřív web, teprve po „odzkoušeno" AAB.

---

## 7. Jak to rozjet a zkoušet

```bash
python3 -m http.server 8123 --directory /home/user/loukarun &
# Playwright: npm install playwright-core mimo repo,
# Chromium je v /opt/pw-browsers/chromium-1194/chrome-linux/chrome
```

Testovací skripty z tohohle kola leží ve scratchpadu session
(`…/scratchpad/pw/t*.js`) — **ve scratchpadu, ne v repu, a se session
zaniknou**. `t.js` je hlavní sada 27 kontrol, `t9.js` ověřuje pravidlo
viditelnosti tlačítka, `t10.js` je mřížka pozic. Kdo v tom bude pokračovat,
ať si je buď obnoví, nebo si napíše vlastní — a **ať je přidá do `tests/`**,
pokud se má na tuhle funkci dát spolehnout i příště.

Ve hře pomáhá `?fx=full` (vypne útlum efektů, jinak v headless prohlížeči
snímky vždycky padají a ozdoby zhasnou) a `?dev=1` (přeskočí gesto).

---

## 8. Pasti, o které se tu už zakoplo

- **Zpětný apostrof v komentáři uvnitř CSS template literalu** v `dev.js`
  ukončí řetězec a soubor přestane jít načíst. `node --check js/dev.js`
  po každé úpravě.
- **Překryv se v otočeném rozvržení nedá odhadnout od oka** ani odvodit
  z toho, co je „vlevo dole". Měří se plocha průniku obdélníků, a měří se
  na víc rozlišeních.
- **`getBoundingClientRect()` skrytého prvku vrací nuly** a tiše z toho udělá
  „žádný překryv". Pravděpodobná příčina rozporu v § 5.
- **Nesmrtelnost bez zastavení úbytku energie není nesmrtelnost.**
- **Save nemá schéma a migrace se nepíšou** (`CLAUDE.md`). Nová pole se
  lazy-inicializují; reset proto řádek maže, nepřepisuje.
