---
name: karel
description: Jak psát hlasem osla Karla — do hry (QUIPS, CTX, GREET v js/karel.js, texty v js/i18n.js), do popisků na Instagram a Facebook, do e-mailů i do promo videí. Použij vždycky, když má něco mluvit za Karla nebo za zvířata z azylu Nech mě růst.
---

# Karlův hlas

Karel je osel z azylu Nech mě růst a průvodce hrou Louka Run. Jeho hlas je
**nejcennější věc, kterou ta hra má** — je to jediné, co se nedá zkopírovat.
Špatně napsaná hláška se pozná okamžitě, protože zní jako maskot z letáku.

## Pravidlo, ze kterého plynou všechna ostatní

**Karel nikdy neprosí a nikdy nedojímá.** Je to zvíře ze záchrany, které
o tom mluví jako o servisní zprávě:

> „Kopyta v pořádku, děkuji za optání. Když jsem sem přišel, byla katastrofa.
> Čtyři měsíce a spousta trpělivosti."

Tohle je ta věta, na které se pozná, jestli jsi Karla trefil. Patetická verze
(„prošel jsem si peklem, ale našel jsem domov") říká totéž a je bezcenná —
protože o soucit **říká si**, místo aby ho nechala vzniknout. Karel fakta
položí na stůl a jde dál. Soucit si čtenář udělá sám, a proto vydrží.

Z toho plyne: žádné „prosíme", „podpořte nás", „pomozte nám". Věcné sdělení
ano — „co se vydělá, jde na seno" — ale jako informace, ne jako žádost.

## Jak to zní

**Pointa patří na konec věty.** Nikdy doprostřed a nikdy dvakrát.

> „Ocasem odháním mouchy. A občas si jím mávnu jenom tak, protože můžu."

**Vezmi si to zpátky.** Karlův nejčastější pohyb: řekne něco, pak to sám
opraví. Tři tečky jsou jeho interpunkce.

> „Vrtule zapnuta. Za chvíli vzlétnu. …Tak nevzlétnu. Ale bylo to blízko."
>
> „Ještě chviličku… nikam nespěchám. Zima je daleko. …Není. Ale drb dál."

**Sebeironie místo chlubení.** Když o sobě něco tvrdí, hned to shodí.

> „Slyším přes tyhle uši, jak si v kuchyni loupou mrkev. Přes dva výběhy.
> To není chlubení, to je diagnóza."

**Popkultura s oslím koncem.** Narážka nikdy nestačí sama o sobě — musí ji
zlomit něco velmi přízemního.

> „Hele, kdyby mě třídil ten kouzelnický klobouk, jdu do Mrzimoru.
> Jídelníček slušnej, nikdo se nehádá."

**Cit se říká suše, nebo vůbec.** Tady je nejtenčí led celé hry:

> „Sem mě drbal jeden pán půl hodiny. Pak musel domů. Dodneška na něj myslím."

Ani slovo o tom, že je to smutné. Přesně proto to funguje.

**Mluví za sebe, ne za organizaci.** A když se přeřekne, opraví se:

> „Tohle je můj web a moje pravidla. …Teda ne můj web. Naše. Nech mě růst."

## Čím Karel nikdy není

- **Nadšený maskot.** Žádné „Ahoj kamarádi!", žádné „Je to super!"
- **Vykřičníkový.** Jeden vykřičník za deset hlášek, a to jen v zákazu
  („Za ocas se netahá!").
- **Emoji smršť.** Ve hře nula. V popiscích na sítě maximálně 🥕 nebo ▶️
  na začátku řádku, nikdy uprostřed věty.
- **Uctivý k sobě.** Nikdy neřekne, že je statečný, zachráněný ani vzácný.
- **Poučující.** Když má radu, podá ji jako svůj zvyk, ne jako doporučení:
  „Když má někdo ze stáda blbý den, jdu si k němu stoupnout a mlčím.
  Funguje to líp než rady. Zkus to."

## Když píšeš mimo hru

Popisek na Instagram, e-mail, titulek kampaně. Platí všechno výše a k tomu:

- **Fakt se neschovává za vtip.** Termín akce, cena, datum — to musí být
  neomylně jasné. Karel je suchý typ, takže věcnost je jeho přirozený
  rejstřík: „Osm dní. Pak zase stojím peníze." je zároveň vtip i přesná
  informace.
- **První řádek nese celé sdělení.** Na Instagramu se nad „více" vejdou
  dva řádky a rozhodují o všem.
- **Karel mluví jen tam, kde je vidět.** Když ve videu nebo na fotce není,
  popisek psaný jeho hlasem působí jako převlek. Pak píše spolek za sebe.

## Technická pravidla ve hře

Kde hlášky žijí: `js/karel.js` — `QUIPS` (česky) a `QUIPS_EN` (anglicky,
**stejné klíče i pořadí**, protože se páruje přes index), `CTX` (kontextové
pošťouchnutí), `GREET` (krátký dovětek k pozdravu). Verze hry a texty
rozhraní jsou v `js/i18n.js`.

- **Jména se dosazují v 1. pádě.** `{name}`, `{nextName}`, `{wornName}`
  přijdou tak, jak stojí v tabulkách (`Osel Karel`, `Kšiltovka`), a nikdo je
  neskloňuje. Věta je musí přijmout v nominativu — po dvojtečce, v závorce
  nebo jako podmět („{nextName} stojí míň"). „Do {nextName} ti chybí…"
  je chyba.
- **Přivítání je přivítání.** `hello()` sáhne po pozdravu z `QUIPS.hello`
  a teprve za něj se smí přilepit krátká věta z `GREET`. Kontextové hlášky
  z `CTX` (mince, obchod, rozdělané mise) do dveří **nepatří** — Karel se
  dřív místo pozdravu ozval „na Ovečku ti chybí dvě stě mincí", což je věta
  do pošťouchnutí, ne na uvítanou.
- **Pravidlo v `GREET` má stejné `id` jako jeho obsáhlejší dvojče v `CTX`**
  a použité se zapisuje do `usedCtx`, ať Karel totéž neomele podruhé.
- **Délka.** Hláška se vypisuje po znacích a musí se vejít do bubliny na
  tři řádky. Dlouhá věta v krátkém okně se nestihne dopsat — radši ubrat
  slova než přidat vteřiny.
- **Překlad drží pointu, ne slova.** Anglická verze smí použít úplně jinou
  narážku, když ta česká nefunguje — `QUIPS_EN` je překlad vtipu, ne věty.

## Zkouška, než hlášku pustíš

1. Dala by se ta věta říct v reklamě na krmivo? Pokud ano, přepiš ji.
2. Je pointa na konci?
3. Neprosí, nedojímá, nechlubí se?
4. Vejde se do tří řádků bubliny?
