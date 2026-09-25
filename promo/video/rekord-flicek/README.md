# Reel „Rekord 16 957 m"

| Soubor | Co to je |
|---|---|
| `loukarun-reel-rekord-16957-9x16.mp4` | hotový reel, 1080×1920, 30 fps, 29,7 s, H.264 + AAC, hlasitost −14 LUFS |
| `obalka-rekord-16957.png` | obálka 1080×1920; vše nosné je uvnitř ořezu mřížky 3:4 |
| `karta-rekord-16957.png` | sdílecí kartička rekordu 1080×1080, vykreslená funkcí hry `buildShareCard` |
| `popisek.md` | popisek, hashtagy, úprava po akci, odpovědi do komentářů |
| `sablona/` | skripty, kterými se to celé vyrábí |

**Všechno v obraze je ze hry, nic není screenshot z telefonu.** Kartička
rekordu je vykreslená přímo herní funkcí se skutečnými čísly (16 957 m,
4 750 mincí, 2 206 mrkví, řetěz ×167 a Flíčkova hláška), herní záběry jsou
skutečný běh s Flíčkem kolem 16,6–17 km a kreslené scény používají herní
`GFX.drawCharacter`, takže prasátko vypadá všude stejně.

## Stavba

| Čas | Scéna | Obsah |
|---|---|---|
| 0:00–0:03 | hook | „NOVÝ REKORD NA LOUCE", počítadlo 0 → 16 957 m nad běžícím Flíčkem |
| 0:03–0:07 | důkaz | „Není to překlep." + kartička rekordu s přejezdem světla |
| 0:07–0:15 | vtip | „Skutečný Flíček by tolik neuběhl ani za celý život." Trasa seník → miska → seník, pak bříško nahoru a „drb, drb…" |
| 0:15–0:22 | výzva | skutečný běh s živým počítadlem, zamrzne na **16 956 m**: „Chybí jeden metr. Doběhneš ho?" |
| 0:22–0:27 | CTA | ZDARMA na Google Play, jen do 28. září · Máš iPhone? webová verze přes info@nechmerust.org |
| 0:27–0:30 | konec | logo, „Zdarma na Google Play do 28. 9.", „Odkaz najdeš v biu" |

Titulky leží v bezpečné zóně Reels (y 250–1480): dole je popisek a jméno
účtu, vpravo ikony.

## Jak to vyrobit znovu

```bash
pip install imageio-ffmpeg
export NODE_PATH=/opt/node22/lib/node_modules   # playwright
WORK=/tmp/rekord                                 # pracovní složka, do repa nepatří

node   promo/video/rekord-flicek/sablona/natoc-hru.js $WORK   # záběry + kartička (~4 min)
node   promo/video/rekord-flicek/sablona/render.js    $WORK   # 891 snímků střihu + obálka (~2,5 min)
python3 promo/video/rekord-flicek/sablona/sestav.py   $WORK   # zvuk a MP4
```

Kontrola jednotlivých snímků bez celého renderu:
`node …/render.js $WORK 90 300 620` → `$WORK/nahled/`.

- **texty** → konstanta `TEXT` v `sablona/strih.js`
- **časy scén** → pole `SCENY` tamtéž; po změně srovnej časy zvuků
  (`FLOP`, `ZAMRZ`, `MNAM`) v `sestav.py`
- **jiný rekord** → `REKORD` v `natoc-hru.js` i ve `strih.js`. Záběr musí
  běžet v prostředí, kde rekord leží (úsek po 550 m, `index mod 6`), a klip
  musí rekord přeběhnout — `strih.js` si z `metry.json` najde poslední snímek
  před ním a jinak spadne s hláškou.

## Jak se natáčí

`natoc-hru.js` si udělá pracovní kopii hry a vloží do ní most `window.__LR`
(start běhu, přesun na metr, autopilot, `buildShareCard`). Čas se **krokuje**
(`requestAnimationFrame` a `performance.now` jsou podvržené), takže každý
snímek je přesně 1/30 s hry bez ohledu na to, jak dlouho trvá screenshot.

- Svislý záběr je výřez 337,5×600 CSS px kolem postavy snímaný s hustotou
  3,2 → rovnou 1080×1920. Hra si normálně bere nejvýš 2×, v kopii se strop
  zvedá (`DPR_STEPS`).
- Přesun na metr **nesmí sahat na `S.particles`** — je to pevný zásobník
  (`initParticlePool`), a když se vyprázdní, herní smyčka spadne na
  `reading 'life'` a přestane se volat. Klipy pak vyjdou jako jeden
  zamrzlý snímek a nic nehlásí chybu.
- Nesmrtelnost (`DEV_FLAGS.god`) je zapnutá, aby běh na 16 km neskončil
  únavou; autopilot přesto skáče a podbíhá, takže to v záběru vypadá jako hra.
