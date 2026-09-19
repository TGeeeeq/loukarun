# Kampaň „Karel převzal účet“

Kompletní promo balíček pro sociální sítě k vydání Louka Run. Celý koncept
mluví v první osobě za osla Karla — drze, kousavě, se srdcem.

## Co tu je

| Soubor / složka | Obsah |
|-----------------|-------|
| `story-*.png` | 4 grafiky pro Instagram Stories (1080×1920) |
| `post-ctverec-*.png` | 3 čtvercové posty (1080×1080) |
| `post-portret-*.png` | 2 portrétové feed posty (1080×1350) |
| `popisky.md` | popisky ke každé grafice ve 4 stylech + hashtagy + launch-day post + kuchařka odpovědí do komentářů |
| `video-scenare.md` | 5 scénářů na Reels/TikTok, záběr po záběru |
| `strategie.md` | publikační plán (před vydáním → launch → týden po) + nástroje zdarma |
| `osmidenni-akce.md` | plán osmidenní akce „hra zdarma" (20.–28. 9. 2026): den po dni, post doprostřed a na konec akce, kuchařka odpovědí, co změřit |
| `zabery/` | čerstvé screenshoty z gameplaye (1920×1080), surovina pro další tvorbu |
| `sablona/` | HTML šablona + render skript — další grafiky ve stejném stylu |

## Jak vyrobit další grafiku

1. V kořeni repa spusť lokální server: `python3 -m http.server 8777`
2. Přidej variantu do `sablona/render.js` (pole `VARIANTS` — texty, záběr, formát).
3. Spusť `node sablona/render.js` (vyžaduje nainstalovaný Playwright
   a Chromium; případně `NODE_PATH` nasměruj na globální node_modules).
4. Hotové PNG přistane v této složce.

Nové záběry ze hry: hru spusť lokálně, na PC otevře klávesa `` ` `` vývojářské
menu (skok mezi světy, tempo hry), `?tutorial=1` vynutí Karlovu školu běhu.
