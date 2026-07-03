# 🥕 Louka Run

**Veselá běhací hra na podporu zvířecího azylu [Nech mě růst](https://nechmerust.org).**

Endless runner ve stylu Temple Run: zvířátka z azylu běží loukou, sadem, lesem,
vesnicí, západem slunce i hvězdnou nocí, přeskakují balíky sena, podbíhají větve,
sbírají mrkvičky (energie) a mince (odemykání kamarádů). Každý běh končí vtipným
příběhem – každé zvířátko má ty svoje.

## 🐾 Herní postavy (skuteční obyvatelé azylu)

| Postava | Odemknutí | Perk |
|---|---|---|
| 🫏 **Osel Karel** | zdarma (startovní) | vyvážený běžec, srdce azylu |
| 🐑 **Ovečka Pogo** | 250 mincí | PRUŽINKA – vyšší skoky |
| 🐄 **Kráva Avala** | 500 mincí | SPRINTERKA – rychlejší běh, výživnější mrkve |
| 🐖 **Prasátko Flíček** | 900 mincí | RYPÁČEK-MAGNET – přitahuje mrkve a mince |
| 🐏 **Muflon Yakul** | 1500 mincí | BERANIDLO – 3× za běh prorazí překážku |
| 🐄 **Kráva Květa** | 2500 mincí | KLID V DUŠI – energie ubývá pomaleji |

## 🎮 Ovládání

- **Počítač:** mezerník / šipka nahoru = skok (2× = dvojskok), šipka dolů = skluz, `Esc`/`P` = pauza
- **Mobil:** ťuknutí = skok, swipe dolů = skluz (ve vzduchu = rychlý sešup)

## 🕹️ Mechanika

- Energie ⚡ postupně ubývá (a rychleji s rostoucím tempem). **Mrkvičky** ji doplňují,
  **zlatá mrkev** je jackpot. Náraz do překážky energii ubere – nikdy ale nikomu
  neublíží: slepice (ve čtyřech barevných variantách) i syčící husy s křikem utečou,
  zvířátko jen klopýtne.
- Na obloze krouží **vlaštovky, čápi a v noci sovy** – jen tak pro radost: vlaštovka
  nechává třpytivou stopu, čáp občas upustí pírko a všichni sem tam něco zavolají.
- Když energie dojde, běh **pozitivně končí** – zvířátko někam doběhne a stane se
  něco vtipného (náhodný příběh podle postavy).
- **Mince** 🪙 se přičítají do peněženky a odemykají další zvířátka.
- Vzácný **čtyřlístek pro štěstí** 🍀 na chvíli zdvojnásobí hodnotu sbíraných mincí
  (odpočet ukazuje zelený štítek v HUD).
- Prostředí se plynule střídá po ~550 m: louka → sad → les → vesnice → západ slunce → noc.
- Překážky se **odemykají postupně po „levelech“** sladěných s prostředími – začíná se
  jen se senem a blátem, slepice, větve, husy i včelí letka přibývají s ujetými metry.
  Od pátého levelu navíc nad pěšinou krouží **hejno špačků** – sahá tak vysoko, že se
  nedá přeskočit ani dvojskokem a jediná cesta vede skluzem pod ním.
- **První běh provází Karlova škola běhu** – tutoriál, ve kterém Karel s typickým
  humorem představí mrkve, slepice, větve i bonusy; u každé novinky se čas zpomalí,
  dokud hráč nepředvede správnou akci. Ukáže se jen jednou; `?tutorial=1` v URL ho
  kdykoli vynutí znovu.

## 🚀 Spuštění (web demo)

Stačí jakýkoli statický server, například:

```bash
npx serve .
# nebo
python3 -m http.server 8000
```

a otevřít `http://localhost:8000`. Hra nemá žádný build krok ani závislosti –
veškerá grafika se kreslí procedurálně do canvasu, zvukové efekty generuje WebAudio.

## 🎵 Hudba

Hudbu tvoří MP3 skladby v `assets/music/` – každé prostředí má vlastní skladbu
a hra ji přepíná podle toho, kudy zrovna běžíš.

Nové skladby vygeneruješ pomocí AI (Suno apod.) podle připravených promptů
v **[HUDBA_PROMPTY.md](HUDBA_PROMPTY.md)** – stačí je nahrát do `assets/music/`
pod správným názvem.

## 📱 Cesta do Google Play a App Store

> **Podrobný postup krok za krokem (účty, buildy, obchody, checklist) je
> v samostatném souboru [VYDANI_APLIKACE.md](VYDANI_APLIKACE.md).**

Hra je napsaná jako webová aplikace právě proto, aby šla zabalit do nativní
aplikace přes **[Capacitor](https://capacitorjs.com/)**:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli
npx cap init "Louka Run" org.nechmerust.loukarun --web-dir .
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # Android Studio → build AAB pro Google Play
npx cap open ios       # Xcode → archiv pro App Store (vyžaduje Mac)
```

### Co bude potřeba dořešit před vydáním

1. **Monetizace.** Hra nemá žádné nákupy v aplikaci – všechna zvířátka se
   odemykají za nasbírané mince. Prodává se hra samotná za jednotnou cenu
   (nejdřív na [itch.io](https://itch.io), případně později v mobilních
   obchodech jako placená aplikace).
2. **Vývojářské účty:** Google Play Console (jednorázově 25 USD),
   Apple Developer Program (99 USD/rok).
3. **Ikona a splash screen** – doporučuji vyjít z postavy Karla.
4. **Ochrana soukromí:** hra neukládá nic jiného než lokální postup
   (localStorage), takže privacy policy bude jednoduchá – obchody ji ale vyžadují.
5. **Hudba:** vygenerovat přes Suno (viz výše) a přibalit do `assets/music/`.
   Pozor na licenční podmínky zvoleného AI nástroje pro komerční užití.

## 🗂️ Struktura projektu

```
index.html        – kostra aplikace a všechny obrazovky (menu, obchod, konec, pauza)
style.css         – styly UI
js/data.js        – postavy, hlášky, příběhy, prostředí, překážky, ekonomika
js/gfx.js         – procedurální vektorová grafika (postavy, krajina, rekvizity)
js/audio.js       – zvukové efekty (WebAudio) + přehrávání hudby podle prostředí
js/game.js        – herní smyčka, fyzika, kolize, spawnování, obchod, ukládání
assets/music/     – sem patří vygenerovaná hudba (viz HUDBA_PROMPTY.md)
```

## 💚 O azylu

Všechny herní postavy doopravdy žijí v azylu **Nech mě růst** –
[nechmerust.org](https://nechmerust.org). Hra vznikla na jeho podporu.
