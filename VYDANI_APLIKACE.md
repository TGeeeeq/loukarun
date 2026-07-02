# 📱 Louka Run – přesný postup vydání na Google Play a App Store

Návod krok za krokem: z webové hry (tento repozitář) až po publikovanou aplikaci.
Hra je schválně bez build kroku a bez závislostí, takže konverze je přímočará.

---

## Přehled celé cesty

| Fáze | Co | Kde | Cena |
|---|---|---|---|
| 1 | Konverze na aplikaci (Capacitor) | tvůj počítač | zdarma |
| 2 | Ikona, splash, hudba, IAP | tvůj počítač | zdarma (RevenueCat má free tarif) |
| 3 | Android build (AAB) | Android Studio | zdarma |
| 4 | Google Play | play.google.com/console | 25 USD jednorázově |
| 5 | iOS build | Xcode (nutný Mac) | – |
| 6 | App Store | appstoreconnect.apple.com | 99 USD / rok |

---

## FÁZE 1 – Konverze na aplikaci (Capacitor)

Potřebuješ počítač s nainstalovaným **Node.js** (nodejs.org, verze LTS).

```bash
# ve složce s hrou (kořen tohoto repozitáře)
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Louka Run" org.nechmerust.loukarun --web-dir .
npx cap add android
npx cap add ios        # jde přidat jen na Macu; na Windows/Linuxu přeskoč
npx cap sync
```

Tím vzniknou složky `android/` a `ios/` – plnohodnotné nativní projekty,
které mají uvnitř zabalenou celou hru.

### 1a. Zamknout orientaci na šířku

Do `capacitor.config.json` (vznikl při `cap init`) přidej:

```json
{
  "appId": "org.nechmerust.loukarun",
  "appName": "Louka Run",
  "webDir": ".",
  "server": { "androidScheme": "https" },
  "plugins": {
    "ScreenOrientation": { "orientation": "landscape" }
  }
}
```

A natvrdo v nativních projektech (spolehlivější):

- **Android:** v `android/app/src/main/AndroidManifest.xml` přidej do `<activity>`
  atribut `android:screenOrientation="sensorLandscape"`.
- **iOS:** v Xcode → target Louka Run → General → Deployment Info →
  zaškrtni jen *Landscape Left* a *Landscape Right*.

V aplikaci pak není potřeba překryv „Otoč telefon" – ale nevadí, nikdy se nezobrazí.

### 1b. Celá obrazovka (bez systémových lišt)

```bash
npm install @capacitor/status-bar
```

a v Androidu jde nejjednodušeji přes `android/app/src/main/res/values/styles.xml` –
u tématu aplikace nastav `Theme.AppCompat.NoActionBar` + fullscreen flag.
(Webové API fullscreen, které hra používá, funguje i uvnitř aplikace,
takže i bez tohoto kroku se hra roztáhne po prvním ťuknutí.)

### 1c. Každá změna hry → do aplikace

Po každé úpravě webových souborů (js/css/html) stačí:

```bash
npx cap sync
```

---

## FÁZE 2 – Co dodělat před vydáním

### 2a. Ikona a splash screen

1. Vyrob jeden PNG **1024×1024** (ikona – doporučuji hlavu Karla na zeleném
   pozadí) a jeden **2732×2732** (splash – logo LOUKA RUN uprostřed).
2. ```bash
   npm install @capacitor/assets --save-dev
   # soubory pojmenuj assets/icon.png a assets/splash.png
   npx capacitor-assets generate
   ```
   Vygeneruje všechny velikosti pro Android i iOS najednou.

### 2b. Hudba

Vygeneruj skladby podle **HUDBA_PROMPTY.md** (Suno – placený tarif kvůli
komerční licenci!) a nahraj MP3 do `assets/music/`. Hra je automaticky
upřednostní před generovanou hudbou. Pak `npx cap sync`.

### 2c. Monetizace – žádné nákupy v aplikaci

Hra nemá žádné IAP: **všechna zvířátka se odemykají za mince nasbírané ve hře**
a prodává se hra samotná za jednotnou cenu (nejdřív na **itch.io**, později
případně jako placená aplikace v obchodech). To celé vydání výrazně
zjednodušuje – odpadá RevenueCat, produkty v konzolích i review nákupů.

### 2d. Zásady ochrany soukromí (privacy policy)

Oba obchody vyžadují veřejnou URL. Hra neukládá nic než lokální postup
(localStorage) a nesbírá žádná data – stačí jedna stránka na nechmerust.org,
např. `nechmerust.org/loukarun-soukromi`, s textem: aplikace nesbírá, neukládá
ani nesdílí žádné osobní údaje; postup hry se ukládá pouze v zařízení.

---

## FÁZE 3 – Android build

1. Nainstaluj **Android Studio** (developer.android.com/studio).
2. `npx cap open android` – otevře projekt.
3. **Podpisový klíč** (jednorázově): Build → Generate Signed Bundle/APK →
   Create new keystore. Soubor `.jks` a hesla si **bezpečně zálohuj** –
   bez něj už nikdy nevydáš aktualizaci!
4. Build → **Generate Signed Bundle** → zvol **AAB** (Android App Bundle) →
   release. Výsledek: `app-release.aab`.
5. Otestuj na svém telefonu: Run ▶ v Android Studiu (telefon připojený USB,
   zapnuté vývojářské režim + ladění USB).

## FÁZE 4 – Google Play

1. **Účet:** play.google.com/console → registrace vývojáře (25 USD jednorázově).
   Pro azyl zvaž registraci jako organizace (potřebuje D-U-N-S nebo IČO doklady).
2. **Vytvoř aplikaci:** Create app → „Louka Run", hra, zdarma, čeština.
3. **Store listing (záložka Grow):**
   - krátký popis (80 znaků), dlouhý popis – zmiň azyl Nech mě růst,
   - ikona 512×512, feature graphic 1024×500,
   - min. 2 screenshoty na šířku (vezmi přímo ze hry, ideálně z telefonu).
4. **Dotazníky (záložka Policy):** obsah (content rating – vyjde PEGI 3),
   cílová skupina, **Data safety** – „No data collected", privacy policy URL.
5. **Cena aplikace:** Monetize → App pricing → nastav jednotnou cenu
   (hra nemá žádné in-app nákupy).
6. **Testování:** Release → Testing → **Internal testing** → nahraj AAB →
   přidej svůj e-mail jako testera → nainstaluj přes odkaz a projeď hru.
   > Google od r. 2024 u osobních účtů vyžaduje před produkcí uzavřené
   > testování s ~12 testery po dobu 14 dní – počítej s tím, sežeň kamarády
   > a příznivce azylu.
7. **Vydání:** Release → Production → nahraj AAB → Submit. První kontrola
   trvá typicky 1–7 dní.

## FÁZE 5 – iOS build (nutný Mac)

Bez Macu to nejde lokálně – alternativy: půjčený Mac, cloudový Mac
(MacStadium, Scaleway), nebo CI služba (Codemagic má free tarif a umí
Capacitor). Postup na Macu:

1. Nainstaluj **Xcode** z Mac App Store.
2. `npx cap add ios && npx cap open ios`.
3. V Xcode: Signing & Capabilities → přihlaš svůj Apple Developer účet,
   Team → automatické podepisování.
4. Orientace jen landscape (viz fáze 1a).
5. Otestuj v simulátoru (▶) a na svém iPhonu.
6. Product → **Archive** → Distribute App → App Store Connect → Upload.

## FÁZE 6 – App Store

1. **Účet:** developer.apple.com → Apple Developer Program (99 USD/rok).
   Pro neziskovku jde požádat o prominutí poplatku (Apple fee waiver) –
   platí pro organizace s ověřeným neziskovým statusem, zkus to.
2. **App Store Connect** (appstoreconnect.apple.com) → My Apps → ＋ →
   „Louka Run", bundle ID `org.nechmerust.loukarun`.
3. **Metadata:** popis, klíčová slova, kategorie Hry → Arkády,
   screenshoty na šířku (6,7" a 6,5" iPhone – stačí z největšího simulátoru),
   privacy policy URL, App Privacy dotazník („Data Not Collected").
4. **Cena aplikace:** Pricing and Availability → nastav jednotnou cenu
   (hra nemá žádné in-app nákupy).
5. **TestFlight:** nahraný build se objeví v TestFlight – otestuj na iPhonu.
6. **Odeslat k recenzi:** vyber build, Submit for Review. Kontrola 1–3 dny.

---

## ✅ Checklist – co všechno musíš udělat TY

**Jednorázově založit/zaplatit:**
- [ ] Google Play Console účet (25 USD)
- [ ] Apple Developer Program (99 USD/rok; zkus neziskový waiver)
- [ ] Suno placený tarif na hudbu s komerční licencí (volitelné – hra má vestavěnou hudbu)

**Vyrobit/napsat:**
- [ ] ikona 1024×1024 + splash 2732×2732
- [ ] screenshoty ze hry (na šířku) pro oba obchody
- [ ] texty popisů (CZ + ideálně EN)
- [ ] privacy policy stránka na nechmerust.org

**Technické (můžu udělat já, až budeš chtít):**
- [ ] Capacitor projekt + orientace + fullscreen (fáze 1)
- [ ] vygenerování ikon/splashů z tvých podkladů

**Sehnat:**
- [ ] počítač s Android Studiem (Android)
- [ ] přístup k Macu s Xcode, nebo Codemagic CI (iOS)
- [ ] ~12 testerů na 14 dní (požadavek Google Play pro nové osobní účty)

---

*Až budeš mít založené účty, ozvi se – fáze 1 (Capacitor) jde připravit
rovnou v tomhle repozitáři.*
