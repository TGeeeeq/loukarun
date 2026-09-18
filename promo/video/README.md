# Promo video Louka Run

Hotové promo ve dvou formátech. **Všechny herní záběry jsou skutečné** —
nahrané ze hry běžící v prohlížeči, žádná animace „jak by to mohlo vypadat“.

| Soubor | Formát | Délka | Kam s tím |
|--------|--------|-------|-----------|
| `loukarun-promo-16x9.mp4` | 1920×1080, 30 fps | 50 s | YouTube, Google Play, web, prezentace |
| `loukarun-promo-9x16.mp4` | 1080×1920, 30 fps | 50 s | Reels, Stories, TikTok, YouTube Shorts |
| `loukarun-reel-skutecna-zvirata-9x16.mp4` | 1080×1920, 30 fps | 20,5 s | Reels a TikTok pro lidi, kteří hru **neznají** |
| `loukarun-reel-cover-akce.png` | 1080×1920 | — | obálka reelu po dobu akce zdarma |
| `loukarun-reel-cover.png` | 1080×1920 | — | obálka reelu po skončení akce |

Hudba: `assets/music/menu.mp3` — vlastní znělka hry.

## Dvě videa, dva úkoly

**Promo (50 s)** je vizitka: projde celou hru, končí cenou a odkazem. Patří
tam, kde už si někdo řekl, že ho hra zajímá — na stránku v Google Play, na web,
do prezentace pro dárce.

**Reel „Tohle zvíře je skutečné" (22 s)** je návnada pro lidi, kteří o hře
nikdy neslyšeli. Proto se od promo videa liší ve třech věcech, a žádná z nich
není náhoda:

1. **Začíná rovnou hrou**, ne znělkou ani logem. Na Reels rozhoduje první
   vteřina; logo v ní je promarněné místo.
2. **Záběr vyplňuje celou plochu** — pozadí je tentýž záběr zvětšený
   a rozostřený, ne prázdný rámeček. Letterbox působí na svislém formátu
   jako přeposlaná reklama.
3. **Je o polovinu kratší a neuvádí cenu.** Dokoukání je to, podle čeho
   Instagram video dál ukazuje — a cena se dá opravit jedině přetočením.

Texty, popisek k příspěvku a hashtagy jsou v
[`reel-skutecna-zvirata-popisek.md`](reel-skutecna-zvirata-popisek.md).

## Stavba videa

| Čas | Záběr | Obsah |
|-----|-------|-------|
| 0:00–0:04 | znělka | podpis autora (AF) — přímo z úvodu hry |
| 0:04–0:10 | intro | zvířátka na louce, kreslí se logo **Nech mě růst** + web |
| 0:10–0:12 | titul | logo **Louka Run** |
| 0:12–0:17 | louka | „Zvířátka z azylu vyrazila na trať“ |
| 0:17–0:22 | sad | „Mrkev je palivo. Zlatá je jackpot.“ |
| 0:22–0:26 | les | „Skoč, podběhni, sbírej“ |
| 0:26–0:31 | vesnice | „Šest světů: louka, sad, les, vesnice, západ, noc“ |
| 0:31–0:35 | západ | „Šest zvířátek, každé se svým trikem“ |
| 0:35–0:40 | noc | „Každý běh končí vtipným příběhem“ |
| 0:40–0:43 | menu | výběr postavy |
| 0:43–0:50 | konec | CTA: Google Play za 269 Kč (149 Kč azylu), webová verze za příspěvek nad 200 Kč, nechmerust.org/loukarun |

Přesné hodnoty jsou v poli `SCENAR` v `sablona/sestav-video.py` — to je
scénář i střihový soupis v jednom.

## Jak video vyrobit znovu

Celý řetěz je skriptovaný, hra se kvůli němu nijak nemění.

### Reel (20 s, jen svisle)

```bash
NODE_PATH=$PW node promo/video/sablona/natoc-zabery.js $WORK   # sdílí klipy s promem
NODE_PATH=$PW node promo/video/sablona/natoc-karla.js $WORK    # Karel s alfou
python3 -m http.server 8777 &
NODE_PATH=$PW node promo/video/sablona/natoc-karty-reel.js $WORK
python3 promo/video/sablona/sestav-reel.py $WORK
```

**`natoc-karla.js` je na tom reelu to nejzajímavější.** Natočí Karlovu scénu
ze hry tak, že z ní zbude jen on a jeho bublina na průhledném pozadí — ve
střihu pak stojí v popředí a hra mu běží za zády. Dělá to tím, že v pracovní
kopii zapne plátnu alfa a `render()` místo pozadí plochu jen vymaže; bublina
je v DOM, takže se veze se screenshotem stránky (`omitBackground`).

Čas se přitom **nekrokuje reálný, ale po 1/30 s** (`window.__STEP`). Bez toho
by pomalý screenshot dělal nepravidelné mezery a Karel by v záběru poskakoval.
Snímá se na dvojnásobném rozlišení, aby snesl zvětšení na svislý formát.

- **co Karel říká** → pole `REPLIKY` v `natoc-karla.js` (`snimku` je délka
  ve snímcích; text se vypisuje po znacích, takže dlouhá věta v krátké
  replice se nestihne dopsat)
- **jak velký a kde stojí** → `KAREL_W` / `KAREL_X` / `KAREL_Y` v `sestav-reel.py`
- **texty na obrazovce** → pole `POPISKY` v `natoc-karty-reel.js`
- **pořadí a délky záběrů** → pole `SCENAR` v `sestav-reel.py`
- **přiblížení jednoho záběru** → klíč `zoom` v `SCENAR` (výchozí 1,45×;
  u obrazovek s obsahem až u krajů, jako je karusel zvířátek nebo deníček,
  musí být 1,0)


### Promo (50 s, obě verze)

```bash
# 0) závislosti (jednou)
pip install imageio-ffmpeg           # ffmpeg s libx264
npm install playwright-core          # klidně mimo repo, pak nastav NODE_PATH

PW=<cesta k node_modules s playwright-core>
WORK=/tmp/loukarun-promo             # pracovní složka, do repa nepatří

# 1) herní záběry (headless Chromium + autopilot)
NODE_PATH=$PW node promo/video/sablona/natoc-zabery.js $WORK

# 2) karty a titulky (potřebují běžící server kvůli písmu)
python3 -m http.server 8777 &
NODE_PATH=$PW node promo/video/sablona/natoc-karty.js $WORK

# 3) střih a export
python3 promo/video/sablona/sestav-video.py $WORK
```

### Co dělá který skript

- **`sablona/natoc-zabery.js`** — udělá si stranou kopii hry, doplní do ní
  můstek `window.__LR` (přesun běhu na daný metr a autopilot, který skáče
  přes seno a podbíhá větve) a nahraje klipy ze všech šesti prostředí,
  ze znělky i z menu. Točí se ve výřezu 1280×720, protože na širokém
  desktopu je zvířátko na obrazovce příliš malé.
- **`sablona/natoc-karty.js`** — vyrenderuje titulní kartu, popisky scén,
  závěrečnou kartu a svislý rámeček. Bere logo a barvy z `promo/znacka/`.
- **`sablona/sestav-video.py`** — nastříhá, přidá popisky, podloží hudbou
  a vyexportuje obě verze.

## Změny, které budeš chtít nejčastěji

- **jiné texty popisků** → pole `POPISKY` v `natoc-karty.js`
- **jiná délka nebo pořadí scén** → pole `SCENAR` v `sestav-video.py`
- **jiná cena / CTA** → funkce `konec()` v `natoc-karty.js`
- **jiná hudba** → konstanta `HUDBA` v `sestav-video.py`

Po změně textů pusť znovu krok 2 a 3; herní záběry se přetáčet nemusí.

## Obálka reelu

Nahrává se jako **1080×1920 (9:16)**, ale v profilové mřížce z ní Instagram
ořízne **střed na 3:4** a v menších náhledech ještě víc. Všechno nosné proto
leží uvnitř centrálního čtverce (y 420–1500) a mimo něj je jen adresa, kterou
není škoda ztratit.

**Obálka jde vyměnit i po publikaci** (Upravit → obálka), takže časově omezený
text na ní není past — proto jsou dvě: `-akce` s pruhem „8 DNÍ ZDARMA" na dobu
akce a bez pruhu na potom. Po skončení akce se vymění a příspěvek v mřížce
přestane slibovat něco, co neplatí.

Generuje je `natoc-karty-reel.js` (funkce `cover()`), takže se překreslí
společně se zbytkem karet. **Prvků je schválně málo** — pruh, značka, Karel,
adresa. Podtitulek „Běh se zvířaty z azylu" tam nepatří, značka ho nese sama
a na dlaždici se dvakrát totéž slilo do nečitelné kaše.

Než obálku pustíš do světa, zkontroluj ji ve všech třech ořezech:

```bash
ffmpeg -i promo/video/loukarun-reel-cover-akce.png -vf "crop=1080:1440:0:240" /tmp/mrizka.png
ffmpeg -i promo/video/loukarun-reel-cover-akce.png -vf "crop=1080:1080:0:420" /tmp/ctverec.png
```

## Když natáčení přestane fungovat

`natoc-zabery.js` si dělá pracovní kopii hry a vstřikuje do ní můstek
`window.__LR`. Dvakrát se kvůli změnám ve hře stalo, že klipy vyšly prázdné —
a pokaždé to **proběhlo bez chyby**, takže se to pozná jedině tím, že se na
záběry podíváš:

- **„nenašel jsem konec game.js"** — most se kotví na závěrečnou závorku
  hlavního IIFE. Dřív se kotvil na řádek herní smyčky a ten se posunul.
- **ve všech šesti prostředích běží stejná louka s bublinou** — Karlova
  uvítací scéna se otevře nad menu a do té doby hra polyká klávesy, takže se
  natočila jen ona. Řeší to `karelSeen: true, karelGuideSeen: true`
  v konstantě `SAVE`; kdyby přibyla další obrazovka před menu, projeví se to
  stejně.
- **hra stojí na úvodním obrázku** — přibyla startovní brána (`#start-go`),
  kterou je potřeba odkliknout.
- **deníček v záběru je prázdný** — zápisky se odemykají po třech bězích
  s danou postavou (`diaryUnlocked`), takže save potřebuje `charRuns`.
  A otevírá se přes kartu v obchodě, ne přes `showScreen('diary')` —
  obsah kreslí až `openDiary()`.
- **Karel stojí v záběru jako duch** — po dosednutí je ještě 1,2 s
  poloprůhledný, takže se příchod musí přeskočit s rezervou.

Než z klipů stříháš, projdi si je kontaktním listem:

```bash
ffmpeg -i $WORK/klipy/noc.webm -vf "fps=1/1.5,scale=320:-1,tile=5x2" -frames:v 1 /tmp/kontakt.png
```

## Poznámka k faktům v CTA

Závěrečná karta tvrdí:

- **Google Play, 269 Kč**, z toho **149 Kč jde azylu**
- za **příspěvek vyšší než 200 Kč** si jde o hru požádat ve **webové verzi**,
  která běží na každém zařízení
- **nechmerust.org/loukarun**

Kdyby se cena, rozdělení částky nebo způsob prodeje změnil, uprav `konec()`
v `natoc-karty.js` — jinak bude video slibovat něco, co neplatí. Cena musí
sedět s `googleplay/listing.md`.

> **Pozor, tohle si zkontroluj:** `listing.md` i tohle video uvádějí **269 Kč**,
> ale v Google Play je cena jiná. Dokud se to nesrovná, promo video slibuje
> částku, která neplatí. Kratší reel cenu neuvádí schválně — právě proto.
