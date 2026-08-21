# CLAUDE.md

Pokyny pro Claude Code v repozitáři hry **Louka Run**.

## Co teď čeká na uživatele

> **Hra 1.9.2 (přepracovaný deníček a obchod, chytřejší Karel, plynulá uvítací scéna, divadelní přechod na koncert) je hotová a nasazená na webu. Všechno je připravené na sestavení nového AAB pro Google Play — jen se ještě nestavěl.**
>
> **Nejdřív si to Tomáš odzkouší na webu** (nechmerust.org/loukarun) a **teprve až to odkýve, vytvoří se tady na počítači nový AAB** podle `RELEASE.md`. To pořadí je schválně: web se dá opravit dalším pushem za pár minut, kdežto verze v Play Console se stahuje zpátky blbě — do Play tedy jde až otestovaná hra.
>
> Nestav AAB sám od sebe, ani když je všechno zelené. Čeká se na „odzkoušeno, můžeš stavět".
>
> **Co je pro AAB hotové:** kód i grafika jsou v `main`, `GAME_VERSION` je 1.9.2,
> `sw.js` má cache `loukarun-v51` a web má sesynchronizovanou kopii. Zbývá jen
> krok 1 z `RELEASE.md` — zvednout `versionCode` (14 → 15) a `versionName`
> v `android/app/build.gradle` — a sestavit.
>
> `googleplay/app-release.aab` v repozitáři je pořád **v1.0.13 (versionCode 14, hra 1.8.5)** — tedy o pět verzí starší než kód.
>
> **Co je v 1.9.x nového:** deníček listuje jako opravdová kniha (rub listu
> nese obsah cílové stránky, obsah se mění až v půlce otočky, dá se listovat
> tažením prstu); karta v obchodě se na telefonu naležato překlopí do dvou
> sloupců, takže se nic neskrývá; Karel reaguje na skutečný postup hráče
> a jeho hlášky se dají v klidu dočíst; uvítací scéna má pečené pozadí
> a portál bez `shadowBlur` — na „shromážděte se" spadl čas snímku
> z ~50 ms na ~22 ms. V 1.9.1 navíc **Karel vždycky nejdřív pozdraví**
> (obchod si nechá na pošťouchnutí) a **přechod na Zvířecí koncert je
> divadlo**: světla v sále dolů, opona, reflektor — a hlavně se scéna uklidí,
> takže přes lištu koncertu už neleží zmrazené texty z běhu. V 1.9.2 se
> opravilo **listování deníčku prstem** — na telefonu na výšku si tah bral
> prohlížeč a listování umřelo hned po nadzvednutí listu.

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
- **Otáčení listu v deníčku má tři nepřekročitelná pravidla.** (1) RUB listu
  nese obsah stránky, na kterou list dosedne — kreslí se `renderPage(…, {ghost:
  true})`, což je režim, který NESMÍ nic zapisovat do savu (`factsRead`) ani
  věšet posluchače (šatník). (2) Stránka pod listem se vymění až v polovině
  otočky (`setLanded`) a vykreslí se s `{noInk: true}`, tedy bez nástupové
  animace — musí být přesným dvojčetem rubu, jinak text v okamžiku dosednutí
  poskočí. (3) Za běhu se zapisuje jen `transform` a `opacity` na pět pevných
  prvků; nic, co by nutilo přepočítat rozvržení. Ťuknutí i tažení prstem jedou
  přes stejnou funkci `leafApply(p)` — proto vypadají stejně.
- **`touch-action` se počítá v osách VIEWPORTU, ne v osách otočené hry.**
  Na telefonu na výšku je `<body>` otočené o 90°, takže tah „do strany"
  (listování) je pro prohlížeč tah svisle. `.book { touch-action: pan-y }`
  si ho proto vzal jako rolování, poslal `pointercancel` a listování umřelo
  hned po tom, co se list nadzvedl — hráč viděl „chvilkové seknutí" a musel
  použít šipky. V otočeném režimu proto `.book` i `.book-page` mají
  `touch-action: none` a **obě osy si obslouží `onBookMove()` sám**, včetně
  rolování dlouhé stránky (`bookDrag.scroll`). Naležato a na počítači roluje
  dál prohlížeč. Pozor při ověřování: syntetické `page.mouse` události
  gesta prohlížeče vůbec nespustí — tohle se pozná jedině skutečným dotykem
  (`Input.dispatchTouchEvent` přes CDP), a pozná se podle `pointercancel`.
- **Karta v obchodě se na nízkém displeji překlápí naležato.** Text karty žije
  v `.card-body`; naležato mu musí zůstat `min-width: 0` a `flex-shrink: 1`
  (`.char-card > .card-body`), jinak se nezalomí a vyteče na sousední kartu.
  Obecné pravidlo `.char-card > * { flex-shrink: 0 }` chrání svislou kartu, ale
  naležato míří na vodorovnou osu, takže by přesně tohle způsobilo.
- **Karlova scéna má pečené pozadí.** Obloha, slunce, kopce, keře a tráva se
  jednou nakreslí do dvou plátek (`bakeBackdrop()` v `js/karel.js`) a pak už se
  jen přenášejí. Dynamické zůstávají mraky, stíny a světlušky. Kdo přidá do
  pozadí něco, co se hýbe, musí to dát mezi ně — ne do pečené vrstvy. A do
  portálu nikdy nevracej `shadowBlur`: byla to jediná příčina sekání při
  „shromážděte se" (přes tisíc rozmazaných tahů na snímek).
- **Karlova hláška má zámek na dočtení** (`st.readUntil`, `speechLocked()`).
  Ťuknutí na Karla během něj text nepřepíše, jen ho rozhýbe. Tlačítka ve spodní
  liště a ťuknutí na bublinu zámek ruší — jsou to vědomé požadavky. Kdyby zámek
  platil i na ně, tlačítko by chvílemi nedělalo nic, a to je horší.
- **Přivítání je přivítání.** `hello()` vždycky sáhne po pozdravu z pytlíku
  `QUIPS.hello` (nebo po milníku návštěv) a teprve za něj se může přilepit
  jedna krátká věta z tabulky `GREET`. Kontextové hlášky z `CTX` — mince,
  obchod, rozdělané mise — do přivítání **nesmí**: Karel se dřív místo
  pozdravu ozval „na Ovečku ti chybí dvě stě mincí", a to je věta do
  pošťouchnutí, ne do dveří. Pravidlo v `GREET` má stejné `id` jako jeho
  obsáhlejší dvojče v `CTX` a použité se zapisuje do `usedCtx`, ať Karel
  totéž neomele podruhé.
- **Jména se do hlášek dosazují v 1. pádě.** `{name}`, `{nextName}`,
  `{wornName}` přijdou tak, jak stojí v tabulkách (`Osel Karel`, `Kšiltovka`),
  a nikdo je neskloňuje. Věta je proto musí přijmout v nominativu — po
  dvojtečce, v závorce, nebo jako podmět („{nextName} stojí míň"). „Do
  {nextName} ti chybí…" je chyba.
- **Zmrazený svět nesmí zmrazit dohasínání.** Při Zvířecím koncertu (a jen
  při něm) se částice a plovoucí texty posouvají **reálným** dt — `fxDt`
  v `update()`. Dokud to tak nebylo, poslední výplata řetězu i každá notička
  z minihry zůstaly viset přes lištu koncertu až do jeho konce (přesně to
  bylo na hráčově snímku). K tomu se scéna v okamžiku, kdy pódium dosedne,
  ještě uklidí (`stageClear()`), a řetěz se vyplácí už při příjezdu pódia,
  aby výplata stihla odplout za běžícího světa.
- **Lišta koncertu se kreslí nad všechno ostatní.** `drawStage()` (potemnělý
  sál, opona, reflektor, prach) jde pod částice, `drawConcertBar()` až za ně.
  Nic, co se kreslí dřív, tak nemůže lištu překrýt. Prach v kuželu je jediné,
  co se ve zmrazené scéně hýbe — počítá se z `S.t` (ten tiká reálným časem)
  a nic nealokuje.
- **`#hud.stage` ztlumí jen ukazatele.** Divadelní režim (`setStageMode()`)
  sráží opacitu `.hud-left/.hud-center/.hud-right`. Tlačítko `#btn-tut-continue`
  je uvnitř `#hud` taky a **musí zůstat plné** — je to jediná cesta z popisu
  koncertu dál.
- **`?fx=full` v adrese vypne útlum efektů.** V headless prohlížeči (audit
  rozvržení, snímky) snímky vždycky padají a útlum by se zapnul do vteřiny,
  takže by nešlo vyfotit ani otáčení listu. Pro ověřování ho používej, pro
  měření výkonu taky (měří se tak nejhorší případ).
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
