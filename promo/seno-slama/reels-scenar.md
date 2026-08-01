# Reels: „Celý rok přes to skáču“ — scénář záběr po záběru

Formát 1080×1920, ideální stopáž **22–28 s**. Text overlay = Karlův hlas,
titulky vždy (většina lidí kouká bez zvuku). Hook musí sedět do první vteřiny —
proto se začíná rovnou herní bublinou o senu, ne logem.

**Materiál, který je připravený v repu:**

| Co | Kde |
|---|---|
| záběr Karla u balíku sena (s bublinou) | `zabery/zaber-seno-blizko.png` |
| stejná scéna se zastaveným tutoriálem | `zabery/zaber-seno-lekce.png` |
| náraz do balíku (ubere energii, „−18“) | `zabery/zaber-seno-naraz.png` |
| úvodní karta | `reels-cover.png` |
| závěrečná karta s CTA | `reels-endcard.png` |
| hýkání / smích / hlas | `assets/sfx/karel-hykani.mp3`, `karel-smich.mp3`, `voice-karel.mp3` |
| hudba louky | `assets/music/louka.mp3` |

**Gameplay si natoč sám:** hru pusť lokálně (`python3 -m http.server 8000`),
`?tutorial=1` vynutí Karlovu školu běhu i s lekcí o senu — přesně ta scéna,
na které stojí celý vtip. Na mobilu stačí vestavěné nahrávání obrazovky,
na PC OBS.

---

## Hlavní verze (~26 s)

| # | Čas | Záběr | Overlay text | Zvuk |
|---|-----|-------|--------------|------|
| 1 | 0–2 s | Gameplay: Karel běží, bublina **„Balík sena! … je to zamaskovaná zeď. Skoč!“** | **„Celý rok přes tohle skáču.“** | hudba louka, naostro |
| 2 | 2–4 s | Karel skáče přes balík (nebo do něj narazí — `zaber-seno-naraz.png`) | „Ve hře je seno překážka.“ | žuchnutí ze hry |
| 3 | 4–7 s | **Reálný záběr z azylu:** Karel u seníku / prázdná stodola | **„V zimě je to večeře.“** | hudba ztiší, hýkání |
| 4 | 7–11 s | Reálné záběry zvířat u krmelce (rychlejší střih, 3–4 tváře) | „Je nás tu 93. A všichni to myslí vážně.“ | — |
| 5 | 11–15 s | Textová karta / čísla na senovém pozadí | **„95 balíků sena. 30 slámy. Jeden zmizí za 4 dny.“** | ťuknutí u každého čísla |
| 6 | 15–18 s | Detail ceníku / prázdného seníku | „A seno letos stojí dvakrát tolik než loni.“ | hudba nabírá |
| 7 | 18–22 s | `reels-endcard.png` (tři kroky, jak přispět) | „1) Daruj přes Darujme.cz 2) nebo si kup hru 3) nad 200 Kč ti pošleme kód“ | hudba naplno |
| 8 | 22–26 s | Karel v menu hry / reálný Karel do kamery | **„nechmerust.org/seno. Poprvé v životě si říkám o seno slušně.“** | `karel-hykani.mp3` |

**Poznámka ke střihu:** zlom mezi záběrem 2 a 3 (herní → reálný) je celý vtip
i celá emoce. Nech tam čtvrt vteřiny ticha, ať to sedne.

---

## Krátká verze (~12 s, na TikTok / Shorts / opakované nasazení)

| # | Záběr | Overlay text | Zvuk |
|---|-------|--------------|------|
| 1 | Gameplay: bublina o balíku sena | **„Ve hře: překážka.“** | hudba |
| 2 | Střih na reálné seno / krmelec | **„V zimě: večeře.“** | hýkání |
| 3 | Karta s čísly | „95 balíků sena. 30 slámy. 93 zvířat.“ | — |
| 4 | `reels-endcard.png` | **„nechmerust.org/seno 🌾“** | `karel-hykani.mp3` |

---

## Verze „Karel čte komentáře“ (bonus, ~20 s)

Osvědčený formát na druhou vlnu kampaně, když už první video sebralo reakce.

| # | Záběr | Overlay text |
|---|-------|--------------|
| 1 | Karel v menu, zoom na obličej | „Čtu vaše komentáře. Chyba.“ |
| 2 | Screenshot komentáře „proč zrovna seno?“ | „Protože mrkev je dezert a plot je zákaz.“ |
| 3 | Screenshot „kolik toho sníte?“ | „Balík za čtyři dny. Nejsem hrdý, jsem osel.“ |
| 4 | Screenshot „co za to?“ | „Nad 200 Kč kód ke hře. A můj respekt. Ten je zadarmo.“ |
| 5 | `reels-endcard.png` | **„nechmerust.org/seno“** |

---

## Publikační plán (14 dní)

| Den | Co | Formát |
|-----|-----|--------|
| 1 | Hlavní Reels „Celý rok přes to skáču“ + karusel do feedu | Reels + post |
| 1 | Stories: `story-seno.png` s link stickerem, anketa „Přeskočil bys?“ | 3× story |
| 3 | Čtvercový post `post-ctverec-seno.png` s popiskem B (dojemný) | post |
| 5 | Krátká verze Reels (12 s) — jiný hook, stejné CTA | Reels |
| 7 | Průběžný stav sbírky ve Stories („x balíků máme, y chybí“) | story |
| 10 | Reels „Karel čte komentáře“ | Reels |
| 12 | Poděkování dárcům + připomenutí kódu ke hře | post/story |
| 14 | Finiš: „chybí posledních N balíků“ | Reels/story |

**Univerzální pravidla:** odkaz vždy v biu i ve Stories jako link sticker;
v popisku připomeň e-mail `info@nechmerust.org` pro kód ke hře; na komentáře
odpovídej za Karla do hodiny od publikace (viz `popisky.md`).
