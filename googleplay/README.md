# Google Play — vše pro nahrání

Kompletní balíček pro publikaci Louka Run na Google Play. Aktuální build: v1.0.2 (versionCode 3).

## Co je ve složce

| Soubor | K čemu |
|---|---|
| `app-release.aab` | Podepsaný release bundle — tohle se nahrává do Play Console |
| `listing.md` | Texty záznamu v obchodě (CZ + EN popisy, dotazníky, distribuce) |
| `icon-512.png` | Ikona aplikace 512×512 |
| `feature-graphic-1024x500.png` | Hlavní grafika 1024×500 |
| `screenshots/` | 7 snímků 1920×1080 — menu + všech 6 prostředí |

## Postup nahrání (Play Console)

1. **Vytvořit aplikaci** — play.google.com/console → Create app → název „Louka Run", jazyk čeština, Hra, Placená.
2. **Store listing** (Grow → Store presence → Main store listing) — zkopírovat texty z `listing.md`, nahrát `icon-512.png`, `feature-graphic-1024x500.png` a snímky ze `screenshots/`.
3. **Dotazníky** (Policy → App content) — hodnocení obsahu, bezpečnost dat, cílová skupina, přístup k aplikaci; odpovědi jsou připravené v `listing.md`.
4. **Cena a distribuce** — 200 Kč, země dle `listing.md`.
5. **Nahrát AAB** — Release → Production → Create new release → nahrát `app-release.aab`. Při prvním nahrání potvrdit **Play App Signing**.
6. Odeslat ke kontrole.

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

Snímky se dají vygenerovat automaticky: hra běží na `python3 -m http.server`, Playwright otevře 1920×1080, přeskočí intro, spustí běh a přes dev menu (klávesa `` ` ``) warpuje mezi prostředími. Do localStorage (`loukarun_save_v1`) je potřeba předem vložit save s `tutorialDone: true` a vyplněným `seenObstacles`, jinak snímky kazí tutoriál a představovací bubliny překážek.
