# Osm dní zdarma — publikační plán (20.–28. 9. 2026)

Louka Run je od 20. do 28. září na Google Play **zdarma** (jinak 239,99 Kč).
Tenhle soubor je plán kolem toho; **popisek k reelu a jeho obálka už existují**
a nekopírují se sem:

| Co | Kde |
|---|---|
| Popisek k hlavnímu reelu + A/B první řádek + úprava po akci | [`../video/reel-skutecna-zvirata-popisek.md`](../video/reel-skutecna-zvirata-popisek.md) |
| Video | `../video/loukarun-reel-skutecna-zvirata-9x16.mp4` |
| Obálka po dobu akce / po akci | `../video/loukarun-reel-cover-akce.png` / `loukarun-reel-cover.png` |
| Šablona na další grafiku ve stejném stylu | [`sablona/render.js`](sablona/) |
| Hlas | `.claude/skills/karel/SKILL.md` |

---

## 0. Než cokoli pustíš: odkaz v biu

**Po celou dobu akce musí odkaz v biu vést přímo na Google Play.**

Ne na `nechmerust.org/loukarun` — tam je webová verze pořád za pozvánkovým kódem
a reel s dosahem v desítkách tisíc poslaný na formulář s kódem je promarněný
dosah, ne test trhu. Adresa vypálená ve videu tím nevadí: `/loukarun` po dobu
akce sama nese nahoře **terracottový pruh „Osm dní zdarma" s tlačítkem na Play**
(vypne se 29. 9. sám, `lib/loukarun-akce.ts` na webu).

Zkontroluj před prvním příspěvkem: v Play Console je akce opravdu nastavená a
stránka aplikace ukazuje cenu 0 Kč. Slíbit zdarma a poslat lidi na 239,99 Kč je
jediná chyba, ze které se tahle kampaň nevzpamatuje.

---

## 1. Plán den po dni

Feed 3–4× za akci, Stories každý den. Poměr drž **2 díly zábava : 1 díl výzva**.

| Den | Feed | Stories |
|---|---|---|
| **D−1** (19. 9.) | — | Teaser: zavřená pusa, countdown-sticker na zítřek. „Zítra o mně uslyšíte něco, co se mi neříká lehko." |
| **D1** (20. 9.) | **Hlavní reel** + popisek z `../video/…popisek.md`, obálka `-akce`. Ráno 8–9 h. | Link-sticker na Play. Screenshot ceny 0 Kč. Anketa „Stáhnuto? ANO / Zítra, Karle" |
| **D2** | — | Přepošli první komentáře s Karlovou odpovědí (kuchařka níž) |
| **D3** | Čtverec z `post-ctverec-3-zadarmo.png` (už hotový) | Zlatá mrkev + „Chytneš ji?" |
| **D4** | — | **Screenshot Karlova razítka z `/zazitky`** — cross-promo zdarma, viz níž |
| **D5** | **Post „půlka pryč"** — text níž | Připomínka odkazu, countdown na 28. 9. |
| **D6** | — | UGC: rekordy a screenshoty od lidí, Karel je komentuje |
| **D7** | — | „Zítra naposled" + countdown |
| **D8** (28. 9.) | **Post poslední den** — text níž | Poslední výzva ráno, poděkování večer |
| **D+1** (29. 9.) | — | Nic. **Uprav popisek hlavního reelu** a vyměň obálku za `loukarun-reel-cover.png` |

**Nejtišší den je D4** a je to normální — akce tou dobou už není novinka a ještě
netlačí konec. Proto tam patří cross-promo, ne další výzva ke stažení.

---

## 2. Post doprostřed akce (D5)

Uprostřed akce nefunguje odpočet, ale **fakt**. Karel počítá, ne pobízí.

> **Polovina pryč. Zbylé čtyři dny mám v kalendáři zakroužkované kopytem.**
>
> Kdo mě má staženého, ten to má z krku. Kdo ne, má ještě čas rozmyslet si to
> a stejně to nakonec udělat na poslední chvíli. Znám to, taky tak chodím na
> krmení.
>
> Louka Run: běhám v ní já a pět dalších odsud. Reklamy žádné, data o vás
> nesbíráme. Co se vydělá, jde na seno.
>
> ▶️ Odkaz v biu. Do 28. září za nula korun.

## 3. Post poslední den (D8)

> **Dnes naposled. Zítra si zase začnu říkat o peníze.**
>
> Osm dní jsem byl zadarmo a nic zvláštního se nestalo — svět se nezbořil,
> seno se nerozmnožilo. Jen si mě pár tisíc lidí pustilo do telefonu, což
> beru jako slušnou bilanci.
>
> Kdo to má v plánu, má dneska. Kdo to v plánu nemá, taky dobře — aspoň se
> nebudeme tísnit.
>
> ▶️ Odkaz v biu. Zítra ráno se cena vrací.

**Večer už nic neprodávej**, jen poděkuj. Poslední slovo akce má být vděk,
ne výzva.

## 4. Až akce skončí (D+1)

Hlavní reel **nemaž — přepiš**. Zůstává na profilu a od 29. 9. tvrdí nepravdu.
Přesný postup je v `../video/reel-skutecna-zvirata-popisek.md`, oddíl
*Až akce skončí*. Plus vyměň obálku zpátky na `loukarun-reel-cover.png`.

Na webu se nemusí dělat nic: pruh na `/loukarun` i Karlova hláška o akci
zhasnou samy 29. 9. v 00:00.

---

## 5. Cross-promo: Karel teď šéfuje i webu

Od září stojí Karel i na `nechmerust.org/zazitky` — vylézá z okraje obrazovky,
hlásí, že se stránka teprve staví, a orazítkuje to. **Nosí u toho ozdoby ze
šatníku ve hře** (klobouk, motýlek, korunku, brýle), takže kdo hru zná, pozná
je; kdo ji nezná, si jich všimne, až je uvidí v obchodě.

Je to story zdarma a v duchu celé kampaně: nahraj krátký záznam obrazovky,
jak Karel vyjde z portálu a bouchne razítko, a popisek nech na něm.

> „Dali mi vlastní stránku. Zatím je prázdná, ale razítko už na ní je."

Nesnaž se z toho udělat druhou výzvu ke stažení — jedna věta o hře v Stories
za den stačí, a tu den nese něco jiného.

---

## 6. Kuchařka odpovědí do komentářů

Odpovídej **první den na každý komentář**; algoritmus to miluje a Karel má na
drzou odpověď vždycky materiál. Pointa na konec, nikdy neprosit.

| Komentář | Karel |
|---|---|
| „Stahuju!" | „Dobrá volba. Uvidíme se za chvíli, běžím vepředu." |
| „Je to fakt zdarma?" | „Osm dní. Pak si zase začnu říkat o peníze. Tohle je celý trik." |
| „Škoda, že to není na iPhone" | „Já vím. Řešíme to. Zatím to běhá i v prohlížeči — na to kopyta stačí." |
| „Jak se ti daří?" | „Kopyta v pořádku, děkuji za optání. Když jsem sem přišel, byla katastrofa. Čtyři měsíce a spousta trpělivosti." |
| „Jste skvělí!" | „Já vím. …Teda oni. Já jenom běhám." |
| „Kolik z toho jde zvířatům?" | „Teď nic, je to zadarmo. Jindy víc než polovina. Jde to na seno a na péči." |
| „Můžu přijet?" | „Můžeš. Pořádáme brigády a procházky, termíny jsou na webu. Půjdu vepředu, to je moje pozice." |
| „HÝKÁM" | „Slyším. Přes dva výběhy. To není chlubení, to je diagnóza." |
| Někdo pošle svůj rekord | „Slušné. Já mám víc, ale mám náskok — bydlím tady." |
| Něco nefunguje | „Napiš nám na info@nechmerust.org, vážně to čteme. Děláme hru mezi krmením a úklidem výběhů, tak se nezlob." |

**Na vyloženě zlý komentář Karel neodpovídá** a odpovídá spolek, věcně a jednou.
Karlův hlas je na vtip, ne na hádku — ironie v konfliktu vypadá jako posměch
a nese ji celá organizace.

---

## 7. Co po akci změřit

Bez čísel to příště nezopakuješ ani nezahodíš vědomě:

- instalace za osm dní (Play Console → Statistiky, srovnej s osmi dny předtím),
- kolik jich zůstalo po týdnu (odinstalace v Play Console),
- dosah a dokoukání reelu (Instagram → Přehledy),
- kolik lidí došlo z bia na Play (Play Console → Zdroje akvizice, `utm_source`),
- **a hlavně: prodalo se po akci víc, nebo míň než předtím?** To je jediná
  otázka, kvůli které se akce dělá.

Čísla zapiš sem, až budou. Dohad, jak to dopadlo, je za půl roku k ničemu.
