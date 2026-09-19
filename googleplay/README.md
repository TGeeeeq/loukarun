# Google Play — vše pro nahrání

Kompletní balíček pro publikaci Louka Run na Google Play.
Aktuální kód hry: **v1.0.3 (versionCode 4)** — pozor, `app-release.aab` je ještě
starší build v1.0.2; pro vydání v1.0.3 je potřeba AAB znovu sestavit a podepsat
upload klíčem (viz „Nový build“ níže).

## Co je ve složce

| Soubor | K čemu |
|---|---|
| `app-release.aab` | Podepsaný release bundle **v1.0.2** — tohle se nahrává do Play Console |
| `loukarun-v1.0.3-test.apk` | Instalovatelný APK pro testování na telefonu (viz níže) |
| `test-signing.keystore` | Testovací podpisový klíč (heslo+alias níže) — **nikdy nepoužívat pro Play!** |
| `listing.md` | Texty záznamu v obchodě (CZ + EN popisy, dotazníky, distribuce) |
| `icon-512.png` | Ikona aplikace 512×512 |
| `feature-graphic-1024x500.png` | Hlavní grafika 1024×500 |
| `screenshots/` | 7 snímků 1920×1080 — menu + všech 6 prostředí |

## Postup nahrání (Play Console)

1. **Vytvořit aplikaci** — play.google.com/console → Create app → název „Louka Run", jazyk čeština, Hra, Placená.
2. **Store listing** (Grow → Store presence → Main store listing) — zkopírovat texty z `listing.md`, nahrát `icon-512.png`, `feature-graphic-1024x500.png` a snímky ze `screenshots/`.
3. **Dotazníky** (Policy → App content) — hodnocení obsahu, bezpečnost dat, cílová skupina, přístup k aplikaci; odpovědi jsou připravené v `listing.md`.
4. **Cena a distribuce** — 239,99 Kč, země dle `listing.md`.
5. **Nahrát AAB** — Release → Production → Create new release → nahrát `app-release.aab`. Při prvním nahrání potvrdit **Play App Signing**.
6. Odeslat ke kontrole.

## Testovací APK na telefon

`loukarun-v1.0.3-test.apk` je release build podepsaný **testovacím klíčem**
`test-signing.keystore` (heslo `loukarun`, alias `test`, heslo klíče `loukarun`),
takže:

- instaluje se ručně („instalace z neznámých zdrojů"), ne přes Play,
- **nejde nainstalovat přes verzi staženou z Google Play** (jiný podpis) —
  tu je nutné nejdřív odinstalovat, a naopak,
- přes starší testovací APK (stejný klíč) se nainstaluje normálně jako update,
- nikam se nenahrává, slouží jen k testování.

Nový testovací APK (po `gradlew assembleRelease` bez keystore.properties):

```bash
BT=$ANDROID_HOME/build-tools/36.0.0
$BT/zipalign -f -p 4 app-release-unsigned.apk aligned.apk
$BT/apksigner sign --ks googleplay/test-signing.keystore --ks-pass pass:loukarun \
  --ks-key-alias test --key-pass pass:loukarun --out loukarun-test.apk aligned.apk
```

## Nový build (další verze)

```bash
# 1. zvednout versionCode (+1) a versionName v android/app/build.gradle
# 2. sestavit web vrstvu a bundle:
bash build-app.sh
npx cap sync android
cd android && ./gradlew bundleRelease
# výsledek: android/app/build/outputs/bundle/release/app-release.aab
# 3. zkopírovat sem: cp android/app/build/outputs/bundle/release/app-release.aab googleplay/
```

Podepisování řeší `android/keystore.properties` → upload klíč `~/.android-keys/loukarun-upload.jks` (není v gitu, zálohovat!).

## Nové screenshoty

Snímky se dají vygenerovat automaticky: hra běží na `python3 -m http.server`, Playwright otevře 1920×1080, přeskočí intro a spustí běh. Vývojářské menu (warp mezi prostředími) bylo ze hry odstraněno — do cílového prostředí se teď prostě doběhne (každé má 550 m), případně jde pro focení dočasně lokálně zmenšit `ENV_LEN_M` v js/game.js. Do localStorage (`loukarun_save_v1`) je potřeba předem vložit save s `tutorialDone: true` a vyplněným `seenObstacles`, jinak snímky kazí tutoriál a představovací bubliny překážek.
