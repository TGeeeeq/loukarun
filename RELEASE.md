# 🚀 Vydání nové verze

## ⏳ Čeká na vydání

- **v1.0.12 (versionCode 13, hra 1.8.4) — AAB JE POTŘEBA PŘESTAVĚT.**
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
× 7 obrazovek a hlásí pět věcí — prvek mimo obrazovku, ke kterému nejde
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

> **`googleplay/app-release.aab` v repozitáři je stará v1.0.10 — NENAHRÁVEJ HO.**
> Nemá ani opravu zvětšeného písma, ani startovní obrazovku. Musí se
> přestavět; verze v `android/app/build.gradle` už zvednuté jsou
> (versionCode 13 / 1.0.12), takže postup níž začíná krokem 2.

> **`main` NENÍ nejnovější.** Vývoj posledních verzí (1.0.5–1.0.11) skončil na
> vývojových větvích `claude/*`, protože je vynutila session v prohlížeči.
> `git pull origin main` by tedy stáhl starý kód a sestavil starý AAB. Nejnovější
> je větev **`claude/google-play-display-issue-0m9evj`**; ověř si to podle
> `versionName` v `android/app/build.gradle` (má být 1.0.12) a podle
> `GAME_VERSION` v `js/game.js` (1.8.4). Až bude vydáno, stojí za to větev
> sloučit do `main` a zbytečné `claude/*` větve na GitHubu smazat, aby tahle
> past nečíhala i příště.

```bash
git fetch origin
git checkout claude/google-play-display-issue-0m9evj
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
