# Textový audit Louka Run přes MiniMax M3

*Návrh, 27. 8. 2026*

## Problém

Hra má přes 600 kusů psaného textu ve dvou jazycích — zajímavosti
o zvířátkách, zápisky z deníčku, Karlovy hlášky, popisky úkolů, texty
rozhraní. Nikdo je nikdy nepřečetl celé v jednom sedu. Existující audit
(`audit-rozvrzeni.js`) měří rozvržení, ne obsah, a na obsah žádný linter
neexistuje: že „Do {nextName} ti chybí…" dosadí *Ovečka* místo *Ovečky*,
pozná jen čtenář.

Do 6. 9. 2026 je na GMI zdarma **MiniMaxAI/MiniMax-M3** (1M kontextu,
OpenAI-kompatibilní API). Celý text hry má ~35k tokenů, takže se vejde
do jednoho requestu s velkou rezervou. Tohle okno je příležitost projít
obsah čtyřma průchody, na které jinak není čas ani rozpočet.

## Cíl

Jednorázově spustitelný nástroj, který vrátí **seznam ověřených nálezů
v textech hry** — soubor, řádek, citace, problém, návrh. Nálezy schvaluje
člověk, opravy dělá Claude Code ručně.

## Mimo rozsah

- **Model nesmí sáhnout na žádný soubor hry.** Výstup je report, nic víc.
- Žádné generování nových textů. Audit, ne copywriting.
- Žádné audio. Speech 2.8 a Music 3 nejsou tímhle klíčem dosažitelné —
  endpointy `/v1/audio/speech` a `/v1/music/generations` na GMI existují,
  ale klíč se scope `ie_model` nemá k jedinému audio modelu cestu
  (`No matching target server found`). Kdyby se produkt v konzoli
  odemkl, je to samostatné zadání.
- Žádná trvalá infrastruktura závislá na M3. Po 6. 9. model zdraží
  (0,6 $/M vstup); nástroj musí být použitelný i tak, ale nic v repozitáři
  na něm nesmí viset.

## Zásady

1. **Nález bez ověřitelné citace není nález.** Model halucinuje čísla
   řádků a věty. Každý nález se strojově dohledá ve zdroji, jinak padá.
2. **Co jde spočítat, se nepočítá modelem.** Parita klíčů, délky polí
   a chybějící placeholdery jsou práce pro `node`, ne pro LLM.
3. **Model dostane text, ne kód.** Ze 197k tokenů zdrojáků je text menšina;
   posílat celé soubory zvyšuje šum i halucinace.
4. **Hlasuje se jen tam, kde existuje správná odpověď.** U faktů
   a skloňování ano, u stylu ne.

## Omezení

- Klíč se čte z `GMI_API_KEY` (prostředí nebo `~/.config/gmi.env`).
  Nikdy v repozitáři, nikdy v příkazové řádce v historii shellu.
- `qa-out/` patří do `.gitignore`.
- Endpoint `https://api.gmi-serving.com/v1/chat/completions`, model
  `MiniMaxAI/MiniMax-M3`. Přepnout na `MiniMaxAI/MiniMax-M2.7` (taky zdarma,
  196k kontextu) jde jedině ručně přes `GMI_MODEL` — nástroj model
  nepřepíná sám, aby se nálezy z různých modelů nemíchaly v jednom reportu.
- Jen `node` a `curl`/`fetch`. Žádné nové npm závislosti — hra je bez buildu
  a zůstane bez buildu.

## Kritéria hotovosti

1. `node .claude/skills/verify/extract-texty.js` vypíše JSONL se **všemi**
   dvojicemi `{cs, en}` z `data.js`, `i18n.js` a `karel.js`; u každé je
   `file`, `line`, `path`, `kind`.
2. Číslo řádku u náhodně vybraných 10 záznamů odpovídá skutečnosti
   (`sed -n '<line>p'` obsahuje citovaný text).
3. `node .claude/skills/verify/qa-texty.js` projde všechny čtyři průchody
   a vypíše `qa-out/report.md` + `qa-out/nalezy.json` + `qa-out/zahozeno.json`.
4. Mechanické kontroly hlásí nesrovnalosti nezávisle na modelu a běží,
   i když `GMI_API_KEY` chybí.
5. Report obsahuje u každého nálezu citaci, která se v uvedeném souboru
   na uvedeném řádku skutečně nachází.
6. Nic v `js/`, `sw.js` ani `index.html` se auditem nemění.

## Architektura

Tři oddělené kusy, každý použitelný samostatně:

### `extract-texty.js` — text ze zdrojáků do JSONL

`data.js` je `const DATA = (() => {…})()` bez závislosti na DOM: načte se
přes `new Function('window','I18N', src + '; return DATA;')` se dvěma
atrapami a projde se rekurzivně. Uzel s klíči `cs` i `en` je záznam.

`i18n.js` má všech 244 řetězců na jednom řádku (`'klic': 'text',`) —
extrahuje se řádkovým regexem, zvlášť blok `cs` a `en`, párování podle klíče.

`karel.js` má DOM v inicializaci, takže se nenačítá celý. Ze zdroje se
vykrojí bloky `QUIPS`, `QUIPS_EN`, `CTX` a `GREET` (počítání složených
závorek od `const X = ` po odpovídající uzávěrku) a každý se vyhodnotí
samostatně jako objektový literál. `QUIPS`/`QUIPS_EN` se spárují indexem,
`CTX`/`GREET` mají `{cs, en}` uvnitř.

`line` se dohledá `indexOf` prvních ~40 znaků `cs` v souboru. Nedohledaný
řádek je `null` a hlásí se jako varování — ne jako tichá nula.

`kind` se odvodí z `path`: `fact`, `diary`, `quip`, `ctx`, `greet`, `task`,
`tutorial`, `item`, `ui`, `other`.

### `qa-texty.js` — čtyři průchody nad JSONL

| Průchod | Vstup (`kind`) | Opakování | Hledá |
| --- | --- | --- | --- |
| `sklonovani` | jen záznamy s `{name}`, `{nextName}`, `{wornName}`, `{item}`, `{prize}` + tabulka skutečných jmen | 3× | věty, do kterých 1. pád nesedí |
| `preklad` | vše | 1× | posunutý význam, chybějící informace, nepřirozená angličtina |
| `fakta` | `fact` | 3× | přehnaná čísla, chybná tvrzení |
| `deti` | `quip`, `ctx`, `greet`, `task`, `tutorial`, `ui` | 1× | dlouhá věta, slovo mimo slovník sedmiletého, tautologie |

Prompty žijí jako soubory v `.claude/skills/verify/qa-prompty/*.md`, aby se
daly upravit bez zásahu do kódu. Odpověď se vynucuje jako JSON pole
`{id, severity, problem, quote, suggestion}`; `severity` je `chyba` /
`drobnost` / `nápad`.

Průchod `sklonovani` dostane navíc **skutečná jména** z `data.js`
(`Osel Karel`, `Kšiltovka`, …), aby model posuzoval reálné dosazení,
ne abstraktní placeholder.

### `filtr` — ověření nálezů (uvnitř `qa-texty.js`)

1. `id` musí existovat v JSONL. Jinak zahodit.
2. `quote` se musí najít v souboru daného záznamu (`indexOf`, po normalizaci
   bílých znaků a typografických apostrofů). Jinak zahodit.
3. U tříkolových průchodů projde jen `id`, které označily aspoň dva průběhy.
4. Zahozené jdou do `qa-out/zahozeno.json` s důvodem — počet zahozených je
   měřítko toho, jak moc model plácal, a musí být vidět.

### Mechanické kontroly (bez modelu)

Běží vždycky, i bez klíče:

- klíče v `i18n.js`: `cs` a `en` musí mít stejnou množinu (CLAUDE.md to
  vyžaduje, ale nikdo to nekontroluje),
- `QUIPS[g].length === QUIPS_EN[g].length` pro každou grupu — rozejití
  znamená tiché propadnutí angličtiny na fallback,
- placeholdery: každý `{x}` v `cs` musí být i v `en` a naopak,
- prázdné řetězce a duplicitní `cs` texty.

## Tok dat

```
js/data.js ─┐
js/i18n.js ─┼─> extract-texty.js ─> qa-out/texty.jsonl ─┬─> qa-texty.js ─> M3 (4 průchody, 8 requestů)
js/karel.js ┘                                           │                        │
                                                        │                        v
                                                        └──> mechanické     filtr citací + hlasování
                                                             kontroly              │
                                                                                   v
                                                                    qa-out/report.md, nalezy.json, zahozeno.json
```

## Chyby

- **Chybí `GMI_API_KEY`** → mechanické kontroly proběhnou, průchody se
  přeskočí s hláškou. Ne pád.
- **HTTP chyba nebo timeout** → tři pokusy s prodlevou, pak se ten jeden
  průchod označí v reportu jako neproběhlý. Ostatní pokračují.
- **Odpověď není platný JSON** → jeden pokus o opravu (JSON se vykrojí mezi
  první `[` a poslední `]`), pak průchod padá jako neproběhlý; surová
  odpověď se uloží do `qa-out/surove/<pruchod>-<n>.txt`.
- **Nedohledaný řádek při extrakci** → záznam zůstane s `line: null`
  a počet takových se vypíše. Nález na něm se nefiltruje podle řádku,
  jen podle citace.

## Ověření

- Extrakci: `sed -n '<line>p'` u 10 vzorků, součet záznamů proti
  `grep -c "cs:"` v jednotlivých souborech.
- Filtr: podstrčit ručně vyrobenou odpověď s vymyšlenou citací a ověřit,
  že spadne do `zahozeno.json`.
- Mechanické kontroly: dočasně smazat jeden klíč v `en` a ověřit, že se
  ozve (změna se vrátí).
- Celý běh proti skutečnému API a přečtení reportu člověkem.
