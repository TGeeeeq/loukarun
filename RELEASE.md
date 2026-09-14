# 🚀 Vydání nové verze

## ⏳ Čeká na vydání

- **v1.0.15 (versionCode 16, hra 1.9.11) — AAB je sestavený a podepsaný,
  čeká na nahrání do Play Console (`googleplay/app-release.aab`).**
  V produkci je v1.0.14, takže tenhle release nese změny hry 1.9.9–1.9.11:
  - **Pohodlné nastavení** (1.9.9): hlasitost hudby, efektů a zvířecích hlasů
    zvlášť, vibrace, klidné efekty, větší text v panelech deníčku, rychlý
    návrat bez znělky a tlačítka skoku a skluzu. **Všechny výchozí vypnuté** —
    po aktualizaci se hra chová přesně jako dosud. Vibrace jsou podmíněné
    přepínačem vibrací A hlavním vypínačem zvuků (bránu drží
    `COMFORT.setHapticsGate`). Panel je složený přes atribut `hidden`, ne přes
    `<details>`: zavřené `<details>` v Chromiu obsah neskrylo.
  - **Deníček ukazuje, že stránka pokračuje** (1.9.10): nad spodním okrajem se
    papír vytrácí a poskakuje v něm šipka dolů, obojí zhasne po dorolování.
    Ukazatel je SOUROZENEC stránky, ne dítě — uvnitř by roloval s obsahem pryč
    a zamíchal pořadí `.book-page > *`, na kterém visí nástupová animace.
    Červená stužka pryč (byla to jen nakřivo posazená dekorace).
  - **Fullscreen se po instalaci na plochu vrací** (1.9.10): `fsFails >= 3` byl
    doživotní vypínač postavený na předpokladu, že třetí zamítnutí znamená
    „nikdy". Prohlížeč ale odmítá i dočasně — dokud přes stránku leží systémové
    okno, a nabídka „Nainstalovat aplikaci" je přesně takové. Série se teď po
    10 s zapomíná a hned při `visibilitychange`/`appinstalled`. Trvalý případ
    se pozná z `fullscreenEnabled === false`. `requestFullscreen` je v
    try/catch — synchronní výjimka by nechala `fsPending` natrvalo zvednuté.
  - **Karlovy texty bez pevných dat** (1.9.11): den po festivalu v uvítání
    pořád stálo „11.–13. září je festival". Zastávka o akcích proto mluví jen
    o tom, co se opakuje (brigády, Loukáda, procházky), a aktuálnost nese
    tlačítko s odkazem na nechmerust.org/udalosti. Přibyly oslice Tonička
    a Elvíra — povahy schválně opsané z `lib/animals.ts` v TGeeeeq/NMRStranky1.0,
    ať karta na webu neříká něco jiného. Počet zvířat je „přes stovku" místo
    „třiadevadesát" (obě místa, česky i anglicky).

- **hra 1.9.7 — fullscreen naskočí hned a iPhone se přestal zvětšovat.**
  Na webu nasazená, do Play jde ve stejném AAB jako zbytek 1.9.x.
  - **Android: celá obrazovka už je od startovní obrazovky.** Fullscreen se
    říkal z `pointerdown`, jenže u doteku prstem uživatelské gesto vzniká až
    při zvednutí prstu (`pointerdown` je jeho spouštěčem jen u myši). Požadavek
    tedy vždycky skončil zamítnutím — a to dorazilo až *po* `click`, takže po
    sobě nechal zvednuté `fsPending` i čerstvé `lastFsTry` a umlčel i ten
    pokus, který by prošel. Hra běžela v okně s adresním řádkem až do prvního
    tlačítka v menu. Nově se žádá z `pointerup`, zamítnutý pokus už neblokuje
    ten další a po vyhození z fullscreenu (`fullscreenchange`) je hra
    připravená vzít si ho na prvním dalším tlačítku.
  - **iPhone: hru už nejde omylem roztáhnout dvěma prsty.** Safari na iPhonu
    ignoruje `user-scalable=no` a `window.innerWidth/innerHeight` tam měří
    *zvětšený* výřez — po štípnutí přišel `resize` s menšími rozměry, obraz
    „naskočil“ blíž a doteky přestaly sedět s DOM. Ruší se proto `gesturestart`
    (událost WebKitu, jinde se nespustí) a `resize()` navíc zvětšený výřez
    přečká, dokud se hráč nevrátí na 100 %.
  - **iPhone: startovní obrazovka už neslibuje nemožné.** Safari na iPhonu
    Fullscreen API na prvcích vůbec nemá (umí ho jen `<video>`), takže hra
    tam poběží v pásu mezi lištami. Místo „spustí se na celou obrazovku“ se
    tam ukáže cesta ven — Sdílet → Přidat na plochu; spuštění z plochy už
    lišty schová (`apple-mobile-web-app-capable`). Z plochy (`navigator.
    standalone`) se hláška neukazuje.

- **hra 1.8.7 — hudba na sebe navazuje a scény žijí.** Součást AAB v1.0.14.
  - **Každé prostředí má tři skladby** místo jedné třicetisekundové smyčky
    (`MUSIC_TRACKS` v `js/audio.js`). Hrají za sebou v zamíchaném pořadí
    a navázání používá stejné prolnutí jako dřív smyčka, takže hudba nikde
    neutne ani necvakne. Menu zůstalo na své dlouhé skladbě.
  - **Paměť to nezvedlo**: nová hudba se nepředkešuje a v aplikaci je
    dekódovaná vždycky jen hrající skladba (následující ~5 s předem, pak se
    uklidí). Když se další skladba nestihne stáhnout, prolne se ta hrající
    do svého začátku jako dřív.
  - **18 nových kulis** (trh, studna, děti s míčem, cyklista, lavička,
    kočka na zídce, piknik, včelař, kachní rodinka, kobyla s hříbětem, sběr
    jablek, veverka, liška, datel, houbař, vůz se senem, dítě u dalekohledu,
    netopýři) — každá se hýbe. Vesnice je schválně nejrušnější (`dense`).
  - **Hustota kulis ustupuje výkonu**: `decorGap()` v `js/game.js` zmenšuje
    rozestupy jen dokud hra stíhá; při `dprStep > 0` je zpátky na původních.

- **hra 1.8.6 — šatník, krámek s ozdobami a osobnější Karel.** Na webu
  nasazená, do Play nešla samostatně — jde do stejného AAB jako 1.8.7.
  - **Karel se už nepředstavuje pokaždé znovu.** Kdo si zapne „ukazuj se
    pokaždé“, dostane po portálu jednu krátkou hlášku místo celé sedmidílné
    řeči o azylu (`QUIPS.hello` + milníky `hello_at` v `js/karel.js`, počítadlo
    `save.karelHellos`). Odkazy na Louku i tlačítko na seno jsou v liště scény
    natrvalo, takže se obsah řeči neztrácí. Hlášky se opírají o postup hráče
    (mince, rekord, vybrané zvířátko) a Karel nosí ozdobu ze šatníku.
  - **V deníčku se listuje jen šipkami.** Tažení prstem otáčelo list i tehdy,
    když hráč chtěl jen posunout dlouhý text — zrušeno.
  - **Šatník** je nová dvoustrana deníčku (zrcadlo + mřížka ozdob) a **krámek
    s ozdobami** druhá záložka obchodu. Dvanáct ozdob je společných pro celou
    partičku: šest se vysluhuje osobními úkoly, šest se kupuje za mince
    (200–1800). Jsou **čistě na parádu**, na hraní nemají vliv.
  - **Odznaky 🎩 a 🧣 se dál vážou na splněné úkoly, ne na koupené ozdoby** —
    jinak by se daly koupit. Hlídá to `charTrophy()` vs `wornKind()` v
    `js/game.js`; nepřepisovat jedno na druhé.
  - **Starý save se nezmění**: dokud si hráč v šatníku nic nevybere, nosí
    zvířátko svou vlastní vyslouženou trofej jako dřív.
  - Drobnost, která je vidět: vložením dvou stránek šatníku se posunulo
    číslování stránek deníčku, a podle něj se deterministicky vybírají vlepené
    fotky a čmáranice. Každému hráči se proto rozložení těch drobností jednou
    přeskládá. Text ani odemčené zápisky to nijak nemění.

- **v1.0.13 (versionCode 14, hra 1.8.5) — vydáno.**
  Hra si sama bere zpátky celou obrazovku. Prohlížeč z fullscreenu vyhazuje,
  kdykoli přes hru položí systémové okno — nejvíc to bilo do očí po
  „Pochlubit se“: sdílecí list Androidu fullscreen zrušil a hra se vrátila do
  okna s adresním řádkem. Vyžádat si ho zpátky nejde, `requestFullscreen`
  chce uživatelské gesto a návrat ze sdílení jím není, takže se bere při
  prvním dalším ťuknutí nebo klávese (`reclaimFullscreen` v `js/game.js`).
  **Appky se to netýká** — tam immersive mód vrací nativně
  `MainActivity.onWindowFocusChanged`, a to funguje i bez ťuknutí.

- **v1.0.12 (versionCode 13, hra 1.8.4)** — vydáno spolu s 1.0.13.
  Přidaná startovní obrazovka (`#start-gate`) je **jen pro web**: prohlížeč
  nepustí fullscreen ani zvuk bez uživatelského gesta, takže hra na webu do
  prvního ťuknutí běžela v okně s adresním řádkem. V appce je fullscreen
  nativní (`MainActivity.hideSystemBars`) a Capacitor zvuk bez gesta povoluje,
  proto ji `js/game.js` v nativním běhu zahodí (`PLATFORM.native`) a spustí
  znělku hned. V AAB tedy nesmí být vidět — ověřit po instalaci: po spuštění
  jde rovnou černá znělka „AF“, žádné „▶ Spustit hru“.

- **v1.0.11 (versionCode 12, hra 1.8.3) — vydáno spolu s 1.0.12.**
  Co v 1.0.11 přibylo:
  - **systémové zvětšení písma už hru nerozhodí.** Bez explicitní velikosti
    na `<html>` je 1rem „výchozí velikost písma prohlížeče“ a tu Android
    podle Nastavení → Displej → Velikost písma přenásobí. Text narostl o
    15–30 %, obálky v px zůstaly a spodní tlačítka („Zvířátka & obchod“,
    koupit zvířátko) skončila pod okrajem displeje — přesně to bylo na
    snímcích od hráčů. Teď je 1rem pevně 16 px (`style.css`),
    `setTextZoom(100)` je nativní pojistka (`MainActivity.java`) a
    `index.html` navíc změří, jestli prohlížeč písmo nezvětšil jinou cestou.
  - **obchod se vejde, místo aby se dal dorolovat.** Výška karty zvířátka se
    dřív řídila skoky v `@media`, takže karta byla nejvyšší vždy těsně NAD
    zlomem: 932×430 přetékalo o 110 px, zatímco 800×360 o 1 px. Portrét teď
    škáluje spojitě podle herní výšky a na nejnižších displejích je karta
    širší (méně řádků popisu = nižší karta).

- **v1.0.10 (versionCode 11, hra 1.8.2)** — do Play se nikdy nenahrálo.
  V produkci je pořád v1.0.4 (versionCode 5); verze 1.0.5–1.0.10 se do Play
  nedostaly, takže nejbližší release nese jejich změny dohromady:
  - žádné náhodné hlášky zvířátek za běhu (zůstal jen Karlův tutoriál)
  - nové kulisy do pozadí (krtek, ježek, čáp na hnízdě, světlušky)
  - Karel se zjevuje portálem a má uvítací řeč o Louce, deníček
  - řetěz sběrů (combo), plovoucí skok, hloubka scény, nativní vrstva
    (haptika, tlačítko Zpět, zálohování postupu do Preferences)
  - **zvuk**: kroky přestaly znít jako střelba, vyrovnané hlasy zvířátek,
    kompresor na efektech a výstupní pojistka
  - **viditelnost na malých displejích a při systémově zvětšeném písmu**:
    nic se už neusekne ani nepřekryje (viz níž „Jak se to hlídá“)

## Jak se hlídá viditelnost

Rozvržení se měří strojově, ne od oka: headless Chromium projde 19 rozlišení
(telefon na výšku i na šířku, tablet, počítač) × velikost písma 100 % a 130 %
× 9 obrazovek (od 1.8.6 i záložka s ozdobami a šatník v deníčku — ten je až na
druhé dvoustraně, takže si ho auditor musí odlistovat) a hlásí pět věcí — prvek mimo obrazovku, ke kterému nejde
dorolovat; prvek useknutý předkem, který se v té ose nedá odrolovat; text
přetékající ze schránky s pozadím; dva texty přes sebe; a obsah, který se na
obrazovku nevejde a jde k němu jen dorolovat.

Skript i postup jsou v `.claude/skills/verify/`. **Pozor na čtyři pasti**:
telefon na výšku má hru otočenou o 90°, takže `getBoundingClientRect` vrací
fyzické osy, ale `scrollHeight`/`overflow-y` patří k herním — bez přemapování
os detektor hlásí jako nedostupné i to, k čemu se dá pohodlně dorolovat.
Překryv se musí počítat z viditelné části prvku (průnik se všemi
ořezávajícími předky), jinak „překrývá“ i text schovaný za okrajem stránky.

Ty dvě zbývající stály jedno zbytečné kolečko:
- **„dá se k tomu dorolovat“ není v herním menu totéž jako „je to vidět“.**
  Audit kdysi prošel na zelenou na 224 kombinacích, a hráč přesto poslal
  snímek s useknutými tlačítky: obsah byl formálně dosažitelný, jen o dvě
  obrazovky níž — což v menu hry nikdo nezkouší. Od té doby je tu kontrola
  „nevejde se, jen dorolovat“ pro obrazovky, které se vejít musí.
- **zvětšené písmo se simuluje přes CDP `Page.setFontSizes`.** WebView ho
  promítne do *výchozí* velikosti písma stránky; dřívější náhražka
  (`documentElement.style.fontSize = '130%'`) navíc přepíše
  `html { font-size: 16px }` — tedy přímo tu obranu, kterou má ověřit.


Rychlý tahák: co říct **Claude Code na počítači**, aby vydal novou verzi.
Stačí otevřít terminál v kořeni tohoto repozitáře, spustit `claude` a zadat:

> „Vydej novou verzi podle RELEASE.md — sestav AAB a řekni mi, co nahrát do Play Console."

## Co musí být na počítači (jednorázově)

- Node.js LTS a Android Studio (nebo samotné Android SDK: platforma 36 + build-tools)
- upload klíč `~/.android-keys/loukarun-upload.jks` a k němu `android/keystore.properties`
  (nejsou v gitu — bez nich vznikne jen nepodepsaný AAB, který Play nevezme)

## Postup (kroky pro Claude Code)

> **`googleplay/app-release.aab` v repozitáři je v1.0.15 (versionCode 16,
> hra 1.9.11).** Je podepsaný upload klíčem — do Play Console jde nahrát
> rovnou. Pro další verzi se začíná krokem 1 (zvednout versionCode
> i versionName; v Play je po nahrání tohohle bundlu versionCode 16).

> **`main` UŽ JE nejnovější — past je zavřená.** Verze 1.0.5–1.0.13 kdysi
> skončily na vývojových větvích `claude/*` (vynutila je session v prohlížeči)
> a `main` zůstal roky pozadu, takže `git pull origin main` stáhl starý kód
> a sestavil starý AAB. Od hry 1.8.6 je všechno sloučené do `main` a další
> práce tam patří taky. Ověřit se to dá podle `GAME_VERSION` v `js/game.js`
> (má být 1.9.11 nebo novější) proti `versionName` v
> `android/app/build.gradle` (1.0.15 = hra 1.9.11).

```bash
git fetch origin
git checkout main
git pull
# plné npm install, ne --omit=dev: `cap` je devDependency, a hlavně bez
# nainstalovaných pluginů je `cap sync` mlčky vyhodí z gradle souborů
# a vznikne AAB bez haptiky, tlačítka Zpět i zálohy postupu
npm install
npx cap ls android   # musí vypsat všech 5 pluginů (app, filesystem, haptics, preferences, share)
# 1. zvednout versionCode (+1) a versionName v android/app/build.gradle,
#    POKUD se nezvedly už během vývoje (zkontrolovat proti verzi v Play Console!)
# 2. připravit webovou vrstvu a nativní projekt:
bash build-app.sh
npx cap sync android
# 3. sestavit podepsaný bundle:
cd android && ./gradlew bundleRelease && cd ..
# 4. uložit výsledek do repa:
cp android/app/build/outputs/bundle/release/app-release.aab googleplay/
git add googleplay/app-release.aab android/app/build.gradle
git commit -m "chore: rebuild Play AAB vX.Y.Z (versionCode N)"
git push origin HEAD          # tedy do větve, na které stojíš (viz varování výš)
```

Ověřit, že v AAB je oprava zvětšeného písma (jinak nemá smysl ho nahrávat):

```bash
grep -c 'font-size: 16px' www/style.css        # ≥ 1  (pevný základ pro rem)
grep -c 'setTextZoom' android/app/src/main/java/org/nechmerust/loukarun/MainActivity.java
grep -c 'PLATFORM.native' www/js/game.js       # ≥ 1  (startovní obrazovka se v appce zahodí)
```

Pak ručně: **play.google.com/console → Louka Run → Production → Create new
release** → nahrát `googleplay/app-release.aab` → Submit.

Testovací APK na telefon (bez upload klíče) — postup v `googleplay/README.md`.

## Web na nechmerust.org/loukarun

Webová (pozvánková) kopie hry žije v repozitáři **TGeeeeq/NMRStranky1.0**
ve složce `web/public/loukarun/app/`. Aktualizace:

```bash
W=../nmrstranky1.0/web/public/loukarun/app
cp js/audio.js js/data.js js/game.js js/gfx.js js/i18n.js js/karel.js js/platform.js $W/js/
cp style.css index.html $W/
cp assets/start.png $W/assets/
# sw.js se NEKOPÍRUJE — webová kopie schválně nemá v CORE adresu „./“ (na
# nechmerust.org/loukarun/app/ končí přesměrováním pozvánkové brány, takže by
# se uložila pod klíčem, na který se žádné načtení hry netrefí). Přenes ručně
# jen číslo cache: sed -i "s/loukarun-v[0-9]*/loukarun-vNN/" $W/sw.js
# a pokud přibyl nový soubor v assets, dopiš ho do CORE v obou sw.js.
# Pak v nmrstranky1.0: commit + push do main → GitHub Actions nasadí na Azure.
```

Po syncu se vyplatí porovnat, že se nezrušila žádná webová odchylka:
`diff <(cat $W/index.html) index.html` má vyjít prázdný, `diff $W/sw.js sw.js`
smí ukázat jedině tu adresu „./“.

Nezapomenout: při každé změně js/css/html **zvednout verzi cache v `sw.js`**
(`loukarun-vNN`), jinak hráči na webu uvidí starou verzi.

## Kde co je

| Co | Kde |
|---|---|
| verze aplikace | `android/app/build.gradle` (versionCode/versionName) |
| verze web cache | `sw.js` (`CACHE = 'loukarun-vNN'`) |
| ceny zvířátek | `js/data.js` (`unlock: { type: 'coins', price: … }`) |
| obtížnost | `js/game.js` — `difficultyLevel()` a okolí (vše komentované) |
| podklady pro Play | `googleplay/` (listing, grafika, testovací APK + klíč) |
