# CLAUDE.md

Pokyny pro Claude Code v repozitáři hry **Louka Run**.

## Co teď čeká na uživatele

> **Hra 1.9.14 překreslila zvířata.** Postavy se dosud kreslily plochými
> elipsami a nohy vypadaly jako čtyři tmavé chůdy postavené pod trup; teď mají
> kyčle, přechody, odlesk na hřbetě, špičatá ouška a hřebeny na rohu —
> podrobně v *Na co si dát pozor*, odstavec o zdobných tazích. Je to
> **jen na webu** (cache `loukarun-v63`); do Google Play se to dostane až
> s dalším AAB.
>
> **Hra 1.9.13 opravuje spouštění nainstalované PWA z plochy** (ikona po
> ťuknutí neotevřela nic, na Xiaomi i po desítkách pokusů). Příčina byla
> v service workeru — podrobně v *Na co si dát pozor*, odstavce o pozvánkové
> bráně a o aktivaci nové verze. Je to **jen na webu**; aplikace z Google Play
> service worker nepoužívá, takže se jí to netýká a AAB se kvůli tomu stavět
> nemusí. Číslo cache je `loukarun-v62`.
>
> Pozor na 1.9.12: ta měla instalaci, která schválně selhala bez souborů ze
> `VITAL` — a hráče s vypršeným kódem tím zamkla v rozbitém stavu napořád.
> Verze 1.9.13 to obrací a přidává záchrannou stránku `/loukarun/oprava`.

> **AAB v1.0.15 (versionCode 16, hra 1.9.11) je sestavený, podepsaný a leží
> v `googleplay/app-release.aab`. Zbývá ho ručně nahrát do Play Console**
> (Louka Run → Production → Create new release). V produkci je zatím v1.0.14.
> **Pozor: ten AAB nese hru 1.9.11**, takže v něm není ani oprava PWA (té se
> aplikace z Play netýká), ani nová kresba zvířat z 1.9.14. Nová kresba je
> důvod postavit další AAB, až bude 1.9.14 odzkoušená na webu.
>
> Hra 1.9.11 je na webu (nechmerust.org/loukarun) nasazená a odzkoušená —
> proto se AAB stavěl. **Pořadí platí i příště: nejdřív web, teprve po
> „odzkoušeno, můžeš stavět" AAB.** Web se opraví dalším pushem za pár minut,
> kdežto verze v Play Console se stahuje zpátky blbě.
>
> **Co je v AAB nového proti v1.0.14 (hra 1.9.8):**
> - **Pohodlné nastavení** (1.9.9) — osm nových voleb: hlasitost hudby, efektů
>   a zvířecích hlasů zvlášť, vibrace, klidné efekty, větší text v deníčku,
>   rychlý návrat bez znělky a tlačítka skoku a skluzu. Všechny **výchozí
>   vypnuté**, takže se hra po aktualizaci chová přesně jako dosud.
> - **Deníček ukazuje, že stránka pokračuje** (1.9.10) — nad spodním okrajem se
>   papír vytrácí a poskakuje v něm šipka dolů; zhasne po dorolování. Červená
>   stužka (jen nakřivo posazená dekorace) pryč.
> - **Fullscreen se po instalaci na plochu vrací** (1.9.10) — `fsFails >= 3`
>   býval doživotní vypínač, ale prohlížeč odmítá i dočasně (systémové okno
>   „Nainstalovat aplikaci"). Série se teď po 10 s zapomíná.
> - **Karlovy texty bez pevných dat** (1.9.11) — zastávka o akcích mluví jen
>   o tom, co se opakuje, a aktuálnost nese odkaz na nechmerust.org/udalosti.
>   Přibyly oslice Tonička a Elvíra (povahy opsané z karet na webu), poděkování
>   za Spolu Mezi Lesy. Počet zvířat je „přes stovku" místo pevného čísla.

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

## Karlův hlas

Hlášky osla Karla (`QUIPS`, `CTX`, `GREET` v `js/karel.js`), popisky na sítě,
e-maily i texty promo videí se píšou podle **`.claude/skills/karel/SKILL.md`**.
Je to nejcennější věc, kterou hra má, a špatně napsaná hláška se pozná
okamžitě — zní jako maskot z letáku. Základní pravidlo: **Karel nikdy neprosí
a nikdy nedojímá**, fakta položí na stůl a jde dál.

**Karel od září 2026 vystupuje i na webu mimo stránku o hře** — na
`nechmerust.org/zazitky` vylézá z okraje obrazovky a na `nechmerust.org/loukarun`
dělá průvodce. Kreslí ho `web/components/karel/AnimalSvg.tsx` v repozitáři
`TGeeeeq/NMRStranky1.0` **ze stejných čísel jako `drawCharacter` odsud**
(`js/gfx.js`), včetně `drawWear` a tabulky `WEAR_AT`; web je má opsané
v `web/lib/karel/anatomy.ts`. Kdo tady zvířatům změní barvy nebo stavbu těla,
musí tu tabulku srovnat — jinak se z „jedné postavy napříč platformami" stanou
dva různí osli.

**Spoléhat se na to, že si někdo vzpomene, nejde, a tak na to je test.**
`tests/unit/karel-anatomy.test.ts` v tom repozitáři čte nasynchronizovanou
kopii hry z `public/loukarun/app/js/` a porovnává ji s tabulkou. Ruční překryv
plátna a SVG je pořád nejpřesnější kontrola siluety, ale jako pravidelná
pojistka je k ničemu, protože se na ni zapomene.

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

- **Zdobné tahy na postavách vypíná `setLowFx()`.** Kresba zvířat dostala
  v 1.9.14 objem (kyčle, přechody na nohou, odlesk na hřbetě a na čele, obrys,
  vroubky hřívy, hřebeny na rohu, stín pod čumákem). **Změřeno, ne odhadnuto:**
  jedna postava stoupla z 0,230 ms na 0,405 ms. U jediného běžce je to nic,
  ale ve scéně „shromážděte se" kreslí Karlovo plátno celé stádo naráz — a
  **právě tam hra už jednou sekala** (viz `shadowBlur` v portálu níž). Zdobné
  tahy proto jdou pryč stejným signálem jako ostatní ozdoby, přes
  `GFX.setDetail(false)`; **stavba těla a nohy se nevypínají nikdy**, bez nich
  vypadají nohy jako čtyři chůdy postavené pod elipsu.
- **Stín na zemi postava nemá a nesmí mít.** Kreslil by se v jejích
  souřadnicích, takže by při skoku vylétl s ní do vzduchu. Na webu stín je,
  protože tam postava stojí — je to součást scény, ne postavy.
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
- **Útlum efektů vypíná animaci, ne ovládání.** `lowFx` (a „omezený pohyb"
  v systému) zhasne ozdoby a otáčení listu se přehodí naráz — ale tažení
  prstem v deníčku musí zůstat, jinak se knížka na takovém telefonu dá
  listovat jen šipkami a dlouhá stránka v otočeném rozvržení se nedá odrolovat
  vůbec (`touch-action: none` si rolování bere hra). `lowFx` se navíc zapíná
  i jen kvůli `dprStep > 0`, tedy po jakémkoli propadu snímků za běhu, a už
  se nevypne — plete se to s „občas mi to nefunguje".

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
- **Do fullscreenu se nikdy nevstupuje za běhu.** Chrome na Androidu při
  každém přijatém `requestFullscreen` vypíše systémovou hlášku „Chcete-li
  ukončit režim celé obrazovky…", která leží přes hru, dokud ji hráč nesmázne
  prstem. `reclaimFullscreen()` (vrácení po sdílecím listu nebo přepnutí
  aplikací) proto nic nedělá v režimu `run` ani `paused` — jen na obrazovkách,
  kam se hráč ze sdílení vrací. A `goLandscapeFullscreen()` požadavek
  neposílá, když už ve fullscreenu jsme; jen obnoví zámek na šířku.

- **Obrázek se sdílí sám, bez textu.** Android nese v jednom sdílení jediný
  typ obsahu; text přiložený k obrázku dojde jako `EXTRA_TEXT` a příjemce si
  vybere, co vezme. Instagram text neumí a smíšené sdílení u něj skončí tím,
  že se appka jen otevře a obrázek zmizí — proto `PLATFORM.share()` posílá
  s obrázkem **jen obrázek** (adresa hry i odznak Google Play jsou vypálené
  přímo v kartičce) a text jde jen tam, kde se obrázek sdílet nedá. Kartička
  je JPEG q0,92 (~150 kB místo megabajtového PNG): čím dýl se soubor předává,
  tím spíš ho appka na druhé straně nestihne přečíst.

- **Do cache nesmí nic, co přišlo od pozvánkové brány.** Na webu je hra za
  pozvánkovým kódem a `/loukarun/app/*` bez cookie odpovídalo přesměrováním na
  stránku s kódem. `cache.add()` přesměrování mlčky dojde a výsledek uloží pod
  PŮVODNÍM klíčem — pod `js/game.js` i `style.css` se tak octlo HTML brány.
  Uložená odpověď si navíc nese příznak `redirected`, a tu Chrome u navigace
  odmítne (`ERR_FAILED`): z okna nainstalované hry zbude prázdná chybová
  stránka, takže to vypadá, že ťuknutí na ikonu neudělalo vůbec nic. Cache se
  sama nepřepisuje, takže to **nespraví ani restart telefonu** — jen nové číslo
  v `CACHE`. Proto `install` ukládá přes `seed()` s kontrolou `storable()`,
  čtení jede přes `usable()`, `activate` pouští `scrub()` (vyhodí otrávené
  položky ze všech cache) a brána na straně webu odpovídá na skript a styl
  stavem **403**, ne přesměrováním.
- **Nová verze service workeru se aktivuje VŽDYCKY, i když se jí nepovedlo nic
  stáhnout.** Opravená obsluha požadavků je to nejcennější, co nese, a dokud běží
  ta stará, hráč se z rozbitého stavu nedostane. Pokus nechat instalaci selhat,
  aby se nepustila ke slovu poloprázdná cache, dopadl mnohem hůř: komu vypršel
  pozvánkový kód, tomu `seed()` dostal od brány odmítnutí, instalace selhala
  pokaždé — a on zůstal navždy na staré verzi i s rozbitou cache. Podle úplnosti
  cache se rozhoduje jen úklid té předchozí (`complete()` v `activate`), a než
  je nová hotová, čte se přes `cached()` i z té staré. Doplní ji `topUp()` na
  pozadí při startu hry; teprve až je kompletní, předchozí se smaže.
- **Značky hlídače spuštění v `sessionStorage` platí jen 90 s.** V nainstalované
  hře `sessionStorage` přežívá, dokud Android drží úlohu, takže natrvalo
  nastavená značka po jednom nepovedeném startu poslala každé další ťuknutí
  rovnou na chybovou stránku — místo aby zkusila opravu, která by zabrala.

- **Z prázdného okna musí vést cesta ven, a ta nesmí být uvnitř hry.** Když se
  stránka hry nenačte, nespustí se ani nic, co by si uklidilo — hráč je zamčený.
  Proto obě náhradní stránky v `sw.js` i hlídač spuštění v `index.html` odkazují
  na **`/loukarun/oprava`**: ta leží mimo scope service workeru, takže se načte
  vždycky, vypíše stav cache a umí ji smazat. Landing `/loukarun` totéž dělá
  potichu sám, ale **jen když najde otrávenou položku** — nekompletní cache je
  po vydání běžný mezistav, ne porucha, a mazat podle ní by každému hráči
  zbytečně zabilo offline hru.

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
