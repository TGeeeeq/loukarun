# 🚀 Vydání nové verze

## ⏳ Čeká na vydání

- v1.0.6 (versionCode 7) — AAB přestavěn a podepsán, čeká jen na nahrání
  do Play Console (Production → Create new release). Předchozí v1.0.4
  (versionCode 5) je v produkci; v1.0.5 (vc6) se do Play nikdy nenahrálo.
  Změny v 1.0.6: odstraněny náhodné hlášky zvířátek za běhu (zůstal jen
  Karlův tutoriál), přidány kulisy do pozadí (krtek, ježek, čáp na hnízdě,
  světlušky), audio optimalizace (cache noise bufferů, předehřátí hlasů),
  a diagnostický FPS overlay (?perf=1).


Rychlý tahák: co říct **Claude Code na počítači**, aby vydal novou verzi.
Stačí otevřít terminál v kořeni tohoto repozitáře, spustit `claude` a zadat:

> „Vydej novou verzi podle RELEASE.md — sestav AAB a řekni mi, co nahrát do Play Console."

## Co musí být na počítači (jednorázově)

- Node.js LTS a Android Studio (nebo samotné Android SDK: platforma 36 + build-tools)
- upload klíč `~/.android-keys/loukarun-upload.jks` a k němu `android/keystore.properties`
  (nejsou v gitu — bez nich vznikne jen nepodepsaný AAB, který Play nevezme)

## Postup (kroky pro Claude Code)

```bash
git pull origin main
npm install --omit=dev
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
git push origin main
```

Pak ručně: **play.google.com/console → Louka Run → Production → Create new
release** → nahrát `googleplay/app-release.aab` → Submit.

Testovací APK na telefon (bez upload klíče) — postup v `googleplay/README.md`.

## Web na nechmerust.org/loukarun

Webová (pozvánková) kopie hry žije v repozitáři **TGeeeeq/NMRStranky1.0**
ve složce `web/public/loukarun/app/`. Aktualizace:

```bash
cp js/audio.js js/data.js js/game.js js/gfx.js js/i18n.js ../nmrstranky1.0/web/public/loukarun/app/js/
cp sw.js style.css ../nmrstranky1.0/web/public/loukarun/app/
# index.html se NEkopíruje slepě — webová kopie nemá odkaz „Návod pro testery“;
# při změně index.html přenést úpravy ručně.
# pak v nmrstranky1.0: commit + push do main → Vercel nasadí sám
```

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
