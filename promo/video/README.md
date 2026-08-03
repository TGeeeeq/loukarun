# Promo video Louka Run

Hotové promo ve dvou formátech. **Všechny herní záběry jsou skutečné** —
nahrané ze hry běžící v prohlížeči, žádná animace „jak by to mohlo vypadat“.

| Soubor | Formát | Délka | Kam s tím |
|--------|--------|-------|-----------|
| `loukarun-promo-16x9.mp4` | 1920×1080, 30 fps | 48 s | YouTube, Google Play, web, prezentace |
| `loukarun-promo-9x16.mp4` | 1080×1920, 30 fps | 48 s | Reels, Stories, TikTok, YouTube Shorts |

Hudba: `assets/music/menu.mp3` — vlastní znělka hry.

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
| 0:43–0:48 | konec | CTA: Google Play za 200 Kč, celá částka azylu, nechmerust.org/loukarun |

Přesné hodnoty jsou v poli `SCENAR` v `sablona/sestav-video.py` — to je
scénář i střihový soupis v jednom.

## Jak video vyrobit znovu

Celý řetěz je skriptovaný, hra se kvůli němu nijak nemění.

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

## Poznámka k faktům v CTA

Závěrečná karta tvrdí: **Google Play, 200 Kč, celá částka jde azylu,
nechmerust.org/loukarun**. Kdyby se cena nebo způsob prodeje změnil,
uprav `konec()` — jinak bude video slibovat něco, co neplatí.
