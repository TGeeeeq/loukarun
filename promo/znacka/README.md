# Značka Louka Run

Vizuální styl hry — logo, barvy, písmo a maskoti. Všechno se dá znovu
vygenerovat ze zdrojů v repu, nic není „nakreslené jednou a hotovo“.

Značka stojí na třech věcech, které už hra má: **kulatém písmu Baloo 2**,
**barvách herní louky** a **okru z loga azylu Nech mě růst**. Logo hry proto
nevypadá jako cizí těleso vedle loga azylu — dá se sázet hned pod něj.

## Co tu je

| Soubor | Formát | Použití |
|--------|--------|---------|
| `loukarun-logo.svg/.png` | 1400×840 | **hlavní logo** — plakáty, titulky videa, obal |
| `loukarun-logo-cisty.svg/.png` | 1400×840 | totéž bez slunce a kopce v pozadí — na vlastní podklad |
| `loukarun-logo-vodorovne.svg/.png` | 1740×470 | do řádku — hlavičky, pruhy, patičky, úzké prostory |
| `loukarun-znak.svg/.png` | 1024×1024 | čtvercový znak — avatar, favicon, dlaždice |
| `loukarun-logo-mono.svg/.png` | 1740×470 | jednobarevně (tmavě) — tisk, razítko, jednobarevný podklad |
| `loukarun-logo-mono-bila.svg` | 1740×470 | jednobarevně bíle — na fotku nebo tmavou plochu |
| `paleta.png` | 1600×1616 | přehled barev a písma na jednu stránku |
| `tokeny.css` | — | barvy, písmo, stíny a rádiusy jako CSS proměnné |
| `maskoti/*.png` | ~700×600 | výřezy zvířátek s průhledným pozadím |
| `sablona/` | — | skripty, kterými se tohle všechno vyrábí |

## Logo

Nápis je vysázený z herního písma **Baloo 2** v tučnosti 800 a převedený
na křivky — SVG tedy nepotřebuje mít písmo po ruce a nikde se nerozsype.

- **LOUKA** je smetanová s tmavě zeleným obtahem, **RUN** zlatá. Tenhle
  poměr se nemění; zlatá je odměna (mince, zlatá mrkev), smetanová je klid.
- **Mrkev** vpravo má tři špičaté lístky — stejný tvar, jaký má znak
  v logu azylu. To je ta spojka mezi hrou a azylem, nesahat na ni.
- **Čáry rychlosti** vlevo drží nápis v pohybu. Bez nich je logo mrtvé.
- Nápis je natočený o **−2°**. Ne víc, jinak to vypadá jako chyba.

### Ochranná zóna a nejmenší velikost

- Kolem loga nech volno aspoň **na výšku písmene „L“** z nápisu LOUKA.
- Nejmenší šířka: **240 px** (hlavní), **320 px** (vodorovné), **48 px** (znak).
  Pod tím zmizí štítek „hra azylu Nech mě růst“ — použij radši znak.

### Co s logem nedělat

- nepřebarvovat (jediné povolené varianty jsou mono a mono-bílá),
- nedávat na barevnou plochu bez kontrastu — na fotku patří mono-bílá,
- nedeformovat, neroztahovat, nepřidávat stín ani obrys navíc,
- nepsat „LoukaRun“ ani „LOUKA-RUN“; značka se píše **Louka Run**.

## Barvy

Vytažené přímo z herní grafiky (`js/data.js`, `js/gfx.js`) a z loga azylu.
Kompletní přehled je v `paleta.png`, strojově čitelné v `tokeny.css`.

| Role | Barva | Kde vzniká |
|------|-------|------------|
| Obloha | `#8ed4f7` | obloha první louky, splash screen aplikace |
| Tráva | `#5aa84f` | pěšina a tráva prvního prostředí |
| Tráva tmavá | `#3a682f` | obtahy písma, štítky, tmavé plochy |
| Text | `#2c4f24` / `#4a3220` | nadpisy na světlém / běžný text |
| Mrkev | `#ff9d3a` | mrkev ve hře = energie |
| Zlatá | `#ffc23c` | mince, zlatá mrkev, tlačítka |
| Okr azylu | `#b78547` | logo Nech mě růst — pojítko s azylem |
| Smetanová | `#fff6e4` | text na tmavém, výplň nápisu |

Pravidlo: **zelená nese značku, zlatá zve k akci, okr patří azylu.**
Oranžová mrkev je koření, ne plocha.

## Písmo

**Baloo 2** (hostované v `assets/fonts/`, tučnosti 400–800).

- 800 — nadpisy, nápis, čísla, tlačítka
- 700 — mezititulky a popisky ve videu
- 400 — souvislý text

Verzálky prokládej `letter-spacing: .14em`, jinak se slepí.
Náhradní řada: `system-ui, -apple-system, "Segoe UI", sans-serif`.

## Maskoti

`maskoti/` obsahuje výřezy zvířátek s průhledným pozadím. **Nekreslí je nikdo
ručně** — vykresluje je přímo herní `GFX.drawCharacter()`, takže maskot na
plakátu je na pixel stejný jako postava ve hře. Když se změní hra, stačí
skript pustit znovu.

Karel se v propagaci používá nejčastěji; ostatní zvířátka ber, když je řeč
o výběru postav nebo o jejich tricích.

## Jak to znovu vyrobit

```bash
# 1) loga (SVG z písma na křivky)
pip install fonttools brotli
python3 promo/znacka/sablona/make-logo.py

# 2) PNG exporty, maskoti a paleta (potřebují běžící server a Playwright)
python3 -m http.server 8777 &
NODE_PATH=<cesta k node_modules s playwright-core> \
  node promo/znacka/sablona/render-znacku.js
```

Barvu, tvar mrkve nebo rozvržení uprav v `sablona/make-logo.py`;
`tokeny.css` drž s ním v souladu, protože z něj čerpají všechny šablony
propagace (`promo/*/sablona/`).
