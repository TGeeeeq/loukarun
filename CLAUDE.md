# CLAUDE.md

Pokyny pro Claude Code v repozitáři hry **Louka Run**.

## Co teď čeká na uživatele

> **Hra 1.8.7 (tři skladby na prostředí, o 18 kulis živější scény) je hotová a nasazená na webu. Všechno je připravené na sestavení nového AAB pro Google Play — jen se ještě nestavěl.**
>
> **Nejdřív si to Tomáš odzkouší na webu** (nechmerust.org/loukarun) a **teprve až to odkýve, vytvoří se tady na počítači nový AAB** podle `RELEASE.md`. To pořadí je schválně: web se dá opravit dalším pushem za pár minut, kdežto verze v Play Console se stahuje zpátky blbě — do Play tedy jde až otestovaná hra.
>
> Nestav AAB sám od sebe, ani když je všechno zelené. Čeká se na „odzkoušeno, můžeš stavět".
>
> **Co je pro AAB hotové:** kód i grafika jsou v `main`, `GAME_VERSION` je 1.8.7,
> `sw.js` má cache `loukarun-v48`, nová hudba leží v `assets/music/` (a schválně
> se nepředkešuje) a web má sesynchronizovanou kopii. Zbývá jen krok 1 z
> `RELEASE.md` — zvednout `versionCode` (14 → 15) a `versionName` v
> `android/app/build.gradle` — a sestavit.
>
> `googleplay/app-release.aab` v repozitáři je pořád **v1.0.13 (versionCode 14, hra 1.8.5)** — tedy o dvě verze starší než kód.

## Vydání nové verze

Celý postup krok za krokem je v **[RELEASE.md](RELEASE.md)**, podklady pro Play v **[googleplay/](googleplay/)**, cesta do obchodů v **[VYDANI_APLIKACE.md](VYDANI_APLIKACE.md)**. Zkratka: `claude` v tomhle repozitáři + „Vydej novou verzi podle RELEASE.md".

Sestavit AAB jde **jen na počítači** — chce Android SDK a upload klíč
`~/.android-keys/loukarun-upload.jks` s `android/keystore.properties`, které
v gitu nejsou. V sessioně v prohlížeči to nejde.

## Git

**Všechno patří do `main`.** Když práci vynutí session v prohlížeči na větev
`claude/*`, ber tu větev jako jednorázovou: po dokončení ji slouč do `main`,
`main` pushni a větev smaž lokálně i na GitHubu. Cílový stav je vždycky
jediný `main` s nejnovějším kódem.

Tahle past už jednou zabolela: verze 1.0.5–1.0.13 skončily na větvích
`claude/*` a `main` zůstal roky pozadu, takže `git pull origin main` stáhl
starý kód a sestavil starý AAB (viz varování v `RELEASE.md`).

## Čím se hra ověřuje

Hra je **statická, bez buildu** — stačí HTTP server a prohlížeč. Jak ji
proklikat v headless Chromiu (emulace iPhonu, otočené rozvržení, čtení
z canvasu) je v **`.claude/skills/verify/SKILL.md`**.

**Rozvržení se měří strojově, ne od oka.** `.claude/skills/verify/audit-rozvrzeni.js`
projde 19 rozlišení × velikost systémového písma 100 a 130 % × 9 obrazovek
a hlásí, co je nedostupné, useknuté nebo přes sebe:

```bash
python3 -m http.server 8125 --directory . &
SCALES=100,130 OUT=./out.json node .claude/skills/verify/audit-rozvrzeni.js 2>&1 | grep hotovo
node .claude/skills/verify/audit-report.js < out.json
```

Po každé úpravě rozvržení ho pusť. **Systémové zvětšení písma na Androidu je
hlavní spouštěč rozbitého rozvržení**, takže v `SCALES` musí zůstat aspoň
jedna hodnota nad 100. Nejcitlivější je obchod: karusel se nesmí dát jen
dorolovat, tlačítko koupit musí být vidět.

## Kde co je

Veškerá grafika se kreslí procedurálně do canvasu, zvuky generuje WebAudio.

| Soubor | Co v něm je |
| --- | --- |
| `js/game.js` | herní smyčka, obrazovky, save, obchod, deníček, šatník, odznaky, denní mise |
| `js/gfx.js` | kreslení světa a postav; `PROPS` = kulisy scény, `drawWear` + tabulka `WEAR_AT` = ozdoby ze šatníku |
| `js/data.js` | zvířátka, jejich úkoly a ozdoby, tabulka `ITEMS`, prostředí, překážky, tutoriál |
| `js/karel.js` | uvítací scéna s Karlem (vlastní canvas, hlášky, portál) |
| `js/i18n.js` | čeština a angličtina; oba jazyky musí mít stejné klíče |
| `js/audio.js`, `js/platform.js` | zvuk; nativní vrstva (haptika, tlačítko Zpět, záloha savu) |
| `sw.js` | service worker — **při vydání zvedni číslo v `CACHE`** a doplň nové soubory do `CORE` |

Verze hry je na jednom místě: `GAME_VERSION` v `js/game.js`.

## Na co si dát pozor

- **Save je jeden JSON** pod `loukarun_save_v1` a nemá schéma. Nová pole se
  lazy-inicializují u prvního použití (`if (!save.x) save.x = {}`), migrace
  se nepíšou. Nikdy nesmí přestat fungovat starý save bez nových polí.
- **Ozdoby vs odznaky.** `charTrophy()` znamená „zvířátko si ozdobu
  vysloužilo úkoly", `wornKind()` „má ji na sobě". Nesmí se to slít: na
  `charTrophy` visí odznaky 🎩 a 🧣, které by pak šly koupit za mince.
- **Ozdoby jsou čistě na parádu** a nesčítají se s perky zvířátek.
- **Nová kulisa se dopisuje na čtyři místa**: funkce do `PROPS` v `js/gfx.js`,
  jméno do `props` prostředí v `js/data.js`, a když je to postava nebo zvíře,
  ještě do `FIGURE_PROPS` (aby se nezdvojila v jednom záběru) a do
  `DECOR_ALPHA` (ztlumení) v `js/game.js`. Kulisa se kreslí každý snímek:
  nesmí alokovat, používat `Math.random()`, gradienty ani obrázky a musí
  vrátit `ctx` do stavu, v jakém ho dostala.
- **Hustota kulis se řídí výkonem.** `decorGap()` v `js/game.js` dává na
  zdravém zařízení menší rozestupy; jak hra začne škubat (`dprStep > 0`),
  vrací se na původní. Nikdy z toho nedělej pevnou hodnotu.
- **Uvnitř stránek deníčku žádná `id`.** `turnBook()` kopíruje `innerHTML`
  do otáčeného listu, takže na 640 ms existují dvě sady stejných prvků.
  A ťuknutí v šatníku nesmí volat `drawSpread()` — restartovalo by
  nástupovou animaci, shodilo odrolování a u sousední stránky se
  zajímavostí znovu zapsalo `save.factsRead`.
- **Kopie hry na webu.** Do `nechmerust.org` se hra dostává skriptem
  `web/scripts/sync-loukarun.sh` v repozitáři `TGeeeeq/NMRStranky1.0`.
  `sw.js` a `manifest.webmanifest` tam mají **schválně jiný obsah** (start_url
  a předkeš) — skript je nepřepisuje, jen ohlásí rozdíl. Číslo cache tam
  zvedni ručně.

## Hudba a obrázky

Skladby jsou MP3 v `assets/music/`. **Každé prostředí má seznam skladeb**
(`louka.mp3`, `louka2.mp3`, `louka3.mp3` …) v `MUSIC_TRACKS` v `js/audio.js`
a hra je hraje za sebou v zamíchaném pořadí; navázání používá stejné prolnutí
jako smyčka, takže hudba nikde neutne. Menu má schválně jedinou dlouhou
skladbu. Nové se generují AI podle promptů v **[HUDBA_PROMPTY.md](HUDBA_PROMPTY.md)**.

Hudba se **nepředkešuje** (7 MB), stahuje se teprve, až na ni v běhu přijde
řada. V aplikaci je dekódovaná vždycky jen hrající skladba; následující se
dekóduje ~5 s předem a hned po prolnutí se uklidí — kdyby se tohle porušilo,
WebView na slabších telefonech spadne na OOM (viz komentář u `WA` v `js/audio.js`).
