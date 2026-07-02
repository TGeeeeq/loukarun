/* =========================================================
   LOUKA RUN – data hry
   Postavy, hlášky, příběhy, prostředí
   Hra na podporu azylu Nech mě růst (nechmerust.org)
   ========================================================= */

const DATA = (() => {

  /* ---------- POSTAVY ---------- */
  const CHARACTERS = [
    {
      id: 'karel',
      name: 'Osel Karel',
      species: 'osel',
      tagline: 'Hravý osel s velkým srdcem a lehce kousavou povahou.',
      unlock: { type: 'free' },
      perk: 'Vyvážený běžec. Srdce azylu.',
      stats: { speed: 1.0, jump: 1.0, drain: 1.0 },
      // černý osel s bílým čumákem a světlými kroužky kolem očí
      colors: { body: '#45403c', belly: '#93887f', mane: '#211d1a', muzzle: '#efe7da', ear: '#45403c', earIn: '#b5a89a', eyeRing: '#c6bab0', hoof: '#26221e' },
      quotes: [
        'Hýkám, tedy jsem!',
        'Tuhle mrkev si zasloužím. A tamtu taky.',
        'Kousavý humor? To bude po mně.',
        'Kdo běží poslední, hlídá seno!',
        'Tvrdohlavý? Já tomu říkám cílevědomý.',
        'Pozor, jedu! Teda… běžím!',
        'Ušima kormidluju, ocasem brzdím.',
      ],
      hitQuotes: ['Íáá! To bylo naschvál!', 'Kdo to tam postavil?!', 'Tak to jsem nevymyslel já.'],
      stories: [
        'Karel doběhl až k ceduli „Vstup zakázán“. Chvíli si ji prohlížel… a pak ji celou okousal. Teď je tam cedule „Vst_p z_k_zán“ a nikdo neví, co znamená.',
        'Karel doběhl na trh s mrkvemi. Prodavač mu dal jednu zdarma. Karel z vděčnosti zahýkal tak nahlas, že se seběhla celá vesnice. Prodal se veškerý sortiment.',
        'Karel doběhl k zrcadlu opřenému o stodolu. Hodinu se zdravil s „tím druhým fešákem“, než mu došlo, kdo to je. Nikomu to neříkejte.',
        'Karel doběhl na louku plnou pampelišek, lehl si na záda a válel se tak dlouho, až vypadal jako obří žlutý knedlík. Prohlásil to za nejlepší den svého života.',
      ],
    },
    {
      id: 'pogo',
      name: 'Ovečka Pogo',
      species: 'ovce',
      tagline: 'Energická ovčí kamarádka, která skáče jako na pružině.',
      unlock: { type: 'coins', price: 250 },
      perk: 'Perk: PRUŽINKA – skáče výš a dvojskok má delší.',
      stats: { speed: 1.0, jump: 1.18, drain: 1.0 },
      // krémová vlna, hnědá tvářička a tmavé nožky
      colors: { body: '#f2ede2', belly: '#ffffff', mane: '#e2d8c6', muzzle: '#9a8268', ear: '#9a8268', earIn: '#c2a888', legs: '#8a7460', hoof: '#463c32' },
      quotes: [
        'Bééžím jako o závod!',
        'Pogo! Pogo! Pogo! …to je moje jméno i sport.',
        'Vlna? Ta je teď v módě!',
        'Skáču, tedy jsem. A jsem hodně.',
        'Počítat ovce? Zkuste mě chytit!',
        'Kudrnatá a hrdá na to!',
      ],
      hitQuotes: ['Béé! To nebylo fér!', 'Naštěstí mám vlastní polstrování.', 'Odraz se ode mě, světe!'],
      stories: [
        'Pogo doběhla na trampolínovou show. Porotci jí dali samé desítky, i když se jen snažila dostat přes plot za kamarádkami.',
        'Pogo doběhla k obrovské hromadě čerstvě posekané trávy, skočila do ní šipku a vylezla až za tři hodiny. Voněla tak krásně, že ji všichni chtěli objímat.',
        'Pogo doběhla na louku, kde spal pes Riky. Přeskočila ho tam a zpět čtyřicetkrát. Riky se ani nevzbudil, ale ve snu prý počítal ovce.',
        'Pogo doběhla až k fotografovi, který fotil západ slunce. Všechny fotky teď mají uprostřed nadšenou skákající ovci. Staly se virálními.',
      ],
    },
    {
      id: 'avala',
      name: 'Kráva Avala',
      species: 'kráva',
      tagline: 'Mazlivá kravička, která nejvíc ze všeho miluje běhání po louce.',
      unlock: { type: 'coins', price: 500 },
      perk: 'Perk: SPRINTERKA – běhá rychleji a mrkve jí dají víc energie.',
      stats: { speed: 1.08, jump: 1.0, drain: 1.0, carrotBonus: 1.3 },
      // tmavě hnědo-oranžová kravka s bílými flíčky a malými růžky (podle skutečné Avaly)
      colors: { body: '#9a5226', belly: '#f2e7d4', mane: '#5e3418', muzzle: '#efb9a2', ear: '#9a5226', earIn: '#d3a284', spots: '#f2ead9', pattern: 'patches', hoof: '#3d3128' },
      quotes: [
        'Búúrned kalorie? Já je předběhla!',
        'Louka je moje běžecká dráha!',
        'Mazlení až v cíli. Teď se běží!',
        'Tráva zelená, kopyta rychlá!',
        'Říkají mi blesková Avala. Teda… říkám si tak sama.',
        'Květo, dohoň mě! …Květo?',
      ],
      hitQuotes: ['Búú! Kdo to sem dal?', 'To mě jen tak nerozhodí. Skoro.', 'Příště to oběhnu. Možná.'],
      stories: [
        'Avala doběhla na vesnický maraton a omylem ho vyhrála. Pořadatelé jí předali pohár plný jetele. Slíbila, že příští rok přijde obhajovat.',
        'Avala doběhla až k rybníku, uviděla svůj odraz a zamávala si. Odraz zamával taky. Kamarádky jsou všude, stačí se dívat!',
        'Avala doběhla za Květou, aby jí vyprávěla, co všechno viděla. Vyprávěla tři hodiny. Květa u toho dvakrát usnula a Avale to vůbec nevadilo.',
        'Avala doběhla na kopec, odkud je vidět celý azyl. Zabučela tak radostně, že jí odpověděla všechna zvířata. Byl to nejkrásnější sbor široko daleko.',
      ],
    },
    {
      id: 'flicek',
      name: 'Prasátko Flíček',
      species: 'prase',
      tagline: 'Prasátko, které si nejvíc užívá drbání na bříšku.',
      unlock: { type: 'coins', price: 900 },
      perk: 'Perk: RYPÁČEK-MAGNET – přitahuje mrkve a mince z dálky.',
      stats: { speed: 0.96, jump: 0.95, drain: 0.95, magnet: 140 },
      // šedivé prasátko s černými fleky a růžovošedým rypáčkem
      colors: { body: '#b3aaa1', belly: '#cec5bc', mane: '#8a817a', muzzle: '#d9a9a0', ear: '#9a908a', earIn: '#756c66', spots: '#38342f', pattern: 'blotch', hoof: '#46403a' },
      quotes: [
        'Chro chro! Kdo běží, ten si zaslouží drbání!',
        'Bláto není špína, bláto je wellness!',
        'Rypáček navigace zapnuta!',
        'Já neběžím za jídlem. Jídlo běží ke mně!',
        'Bříško napřed!',
        'Kvík! Tohle je lepší než dieta!',
      ],
      hitQuotes: ['Kvíík! Moje bříško!', 'To si vypiju… teda vyválím!', 'Naštěstí jsem dobře odpružený.'],
      stories: [
        'Flíček doběhl do lázní pro prasátka. Teda… do velké louže. Ale choval se tam jako v lázních a odmítal vylézt, dokud nedostal drbání na bříšku.',
        'Flíček doběhl na farmářské trhy a vyhrál soutěž „Nejspokojenější zvíře kraje“. Porota se shodla jednohlasně, hned jak si lehl na záda.',
        'Flíček doběhl k záhonu s jahodami. Nesnědl ani jednu — jen si k nim lehl a hlídal je. Za odměnu dostal největší jahodu a hodinu drbání.',
        'Flíček doběhl tak daleko, že objevil novou louži, kterou nikdo nikdy neviděl. Pojmenoval ji Flíčkovo moře. Na mapách azylu už je zakreslená.',
      ],
    },
    {
      id: 'yakul',
      name: 'Muflon Yakul',
      species: 'muflon',
      tagline: 'Rozverný mladík, který právě zjišťuje, k čemu má rohy.',
      unlock: { type: 'premium', price: '49 Kč' },
      perk: 'Perk: BERANIDLO – 3× za běh prorazí překážku bez ztráty energie.',
      stats: { speed: 1.04, jump: 1.05, drain: 1.0, ram: 3 },
      // tmavohnědý muflon se světlým sedlem, bílým čumákem a rohy
      colors: { body: '#6b4830', belly: '#e6dac6', mane: '#4c3120', muzzle: '#e9dfcd', ear: '#6b4830', earIn: '#c2996f', horns: '#c7ad85', spots: '#cbb896', pattern: 'saddle', legs: '#5a3c28', hoof: '#31261e' },
      quotes: [
        'Rohy! Já mám rohy! K čemu asi jsou?',
        'Tak schválně, co tohle vydrží!',
        'Z kopce, do kopce, mně je to jedno!',
        'Frajer? Já? …No jasně!',
        'Ten balík sena se na mě díval divně.',
        'Jednou budu mít rohy jako věšák!',
      ],
      hitQuotes: ['Mek! To mělo uhnout!', 'Zapomněl jsem nakl-ONIT hlavu!', 'Tak tohle rohy nevyřešily.'],
      stories: [
        'Yakul doběhl k obrovské dýni a konečně zjistil, k čemu má rohy: perfektně se s nimi kutálí dýně. Přikutálel ji do azylu a byla z ní hostina pro všechny.',
        'Yakul doběhl na kopec, postavil se na skálu jako v pohádce a zapózoval. Vydržel to celé čtyři vteřiny, pak uviděl motýla a běžel za ním.',
        'Yakul doběhl k vrbě a zamotal si rohy do větví. Než ho vymotali, tvářil se, že je to nový druh klobouku. Skoro mu to všichni uvěřili.',
        'Yakul doběhl závod s vlastním stínem. Tvrdí, že vyhrál o rohy. Stín se k výsledku odmítl vyjádřit.',
      ],
    },
    {
      id: 'kveta',
      name: 'Kráva Květa',
      species: 'kráva',
      tagline: 'Klidná a tichá duše, věrná parťačka Avaly.',
      unlock: { type: 'premium', price: '49 Kč' },
      perk: 'Perk: KLID V DUŠI – energie ubývá o čtvrtinu pomaleji.',
      stats: { speed: 0.94, jump: 0.95, drain: 0.75 },
      // stejná tmavě hnědo-oranžová jako Avala – liší se maskou přes oči, bílou ofinkou a chybějícími rohy
      colors: { body: '#9a5226', belly: '#f2e7d4', mane: '#5e3418', muzzle: '#efb9a2', ear: '#9a5226', earIn: '#d3a284', spots: '#f2ead9', pattern: 'patches', noHorns: true, eyePatch: '#552a12', forelock: '#f7f2e6', hoof: '#3d3128' },
      quotes: [
        'Spěchám. Pomalu, ale spěchám.',
        'Klid je taky rychlost. Jen jiná.',
        'Búú… to bylo na dlouhé vyprávění. Tak jindy.',
        'Avalo, počkej… ale v klidu.',
        'Dýchej. Přežvykuj. Běž.',
        'Kdo nikam nespěchá, všechno stihne.',
      ],
      hitQuotes: ['Hm. Tak to tu minule nebylo.', 'Búú. No nic, běžíme dál.', 'Klid, Květo. Klid.'],
      stories: [
        'Květa doběhla na louku, kde kvetly kopretiny. Sedla si mezi ně a hodinu se nehýbala. Včely ji prohlásily za největší květinu roku. Jmenuje se ostatně Květa.',
        'Květa doběhla k medituijícímu turistovi. Sedla si vedle něj a přežvykovala tak klidně, že dosáhl osvícení. Poděkoval jí a ona jen pomalu mrkla.',
        'Květa doběhla do cíle jako poslední, ale s nejkrásnějším výhledem, třemi novými kamarády a jednou sedmikráskou za uchem. Kdo je tady vlastně vítěz?',
        'Květa doběhla za Avalou, položila jí hlavu na hřbet a obě koukaly na západ slunce. Nikdo nic neříkal. Bylo to dokonalé.',
      ],
    },
  ];

  /* ---------- PROSTŘEDÍ ---------- */
  // Postupně se střídají a plynule prolínají.
  const ENVS = [
    {
      id: 'louka', name: 'Rozkvetlá louka',
      skyTop: '#8ed4f7', skyBottom: '#dff3e8',
      hillFar: '#a8d8a0', hillNear: '#7cc276',
      ground: '#5aa84f', groundDark: '#4a9440', path: '#c9b485',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['sunflower', 'flower', 'beehive', 'signpost', 'butterflyZone', 'catnap', 'frogpond'],
      particles: 'petals',
    },
    {
      id: 'sad', name: 'Ovocný sad',
      skyTop: '#9fd9f2', skyBottom: '#f4e9d0',
      hillFar: '#b5d49a', hillNear: '#8cbf72',
      ground: '#6aab52', groundDark: '#589644', path: '#cdb489',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['appletree', 'ladder', 'basket', 'scarecrow', 'snail'],
      particles: 'leaves',
    },
    {
      id: 'les', name: 'Pohádkový les',
      skyTop: '#7cc4b8', skyBottom: '#d9ecc8',
      hillFar: '#5d9c72', hillNear: '#417d56',
      ground: '#3f7a4a', groundDark: '#356a3f', path: '#a8926b',
      sun: '#f5f0c0', clouds: '#eef7ee',
      props: ['tree', 'mushroom', 'gnome', 'stump', 'owlbox', 'frogpond', 'snail'],
      particles: 'fireflies',
    },
    {
      id: 'vesnice', name: 'Veselá vesnice',
      skyTop: '#93c9ef', skyBottom: '#f7e8cf',
      hillFar: '#c2b7a0', hillNear: '#a8c684',
      ground: '#79a85e', groundDark: '#679250', path: '#d3bd93',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['cottage', 'fencebg', 'tractor', 'laundry', 'dovecote', 'catnap'],
      particles: 'none',
    },
    {
      id: 'zapad', name: 'Zlatá hodinka',
      skyTop: '#f7a26b', skyBottom: '#ffd9a0',
      hillFar: '#c77b5a', hillNear: '#9c5f46',
      ground: '#8a6a45', groundDark: '#79593a', path: '#c9a06b',
      sun: '#ffce7a', clouds: '#ffd9b8',
      props: ['haystack', 'sunflower', 'signpost', 'windmill', 'catnap'],
      particles: 'petals',
    },
    {
      id: 'noc', name: 'Hvězdná noc',
      skyTop: '#1d2b53', skyBottom: '#4a5a8a',
      hillFar: '#2e3c63', hillNear: '#26334f',
      ground: '#2c4038', groundDark: '#24352e', path: '#5a5f6e',
      sun: '#f5f2d0', clouds: '#39466b',
      props: ['tree', 'tent', 'campfire', 'owlbox', 'frogpond'],
      particles: 'stars',
      night: true,
    },
  ];

  /* ---------- PŘEKÁŽKY ---------- */
  const OBSTACLES = [
    { id: 'hay',      w: 62,  h: 52,  type: 'jump',  label: 'balík sena' },
    { id: 'fence',    w: 56,  h: 58,  type: 'jump',  label: 'plůtek' },
    { id: 'mud',      w: 92,  h: 18,  type: 'jump',  label: 'kaluž bláta', soft: true },
    { id: 'rock',     w: 50,  h: 44,  type: 'jump',  label: 'šutr' },
    { id: 'branch',   w: 120, h: 30,  type: 'duck',  label: 'větev', flying: true, clearance: 62 },
    { id: 'chicken',  w: 40,  h: 40,  type: 'jump',  label: 'slepice', moving: true },
    { id: 'goose',    w: 56,  h: 58,  type: 'jump',  label: 'husa', moving: true },
    { id: 'barrow',   w: 66,  h: 48,  type: 'jump',  label: 'trakař' },
    { id: 'beeline',  w: 110, h: 26,  type: 'duck',  label: 'včelí letka', flying: true, clearance: 66 },
  ];

  /* ---------- BAREVNÉ VARIANTY DRŮBEŽE ---------- */
  const BIRD_VARIANTS = {
    chicken: [
      { body: '#f5f0e0', tail: '#e0d8c0' },                  // bílá
      { body: '#c98a4a', tail: '#a86a34' },                  // hnědá
      { body: '#4a4642', tail: '#332f2c' },                  // černá
      { body: '#e8d8c0', tail: '#8a6a4a', speckled: true },  // kropenatá
    ],
    goose: [
      { body: '#f8f6ee', tail: '#e2ded0' },                  // bílá husa
      { body: '#c9c2b4', tail: '#8a8478' },                  // šedá husa
    ],
  };

  /* ---------- LIDÉ Z LOUKY ----------
     Tři lidští obyvatelé azylu fandí z pozadí.
     Tomáš – staví (a na hlavě mu bydlí slepice)
     Tony – pečuje o zvířata a o wi-fi signál
     Maruška – bylinky, zpěv, malování a miminko v bříšku */
  const HUMANS = {
    tomas: [
      'Neruš, stavíme!',
      'Ta slepice je můj stavební dozor.',
      'Ještě prkno a je z toho palác!',
      'Změřeno dvakrát, uříznuto třikrát…',
      'Hnízdo na hlavě? Aspoň mám vejce čerstvá!',
      'Kdo maká, ten se nenudí!',
    ],
    tony: [
      'Beran podrbán, appka nasazena.',
      'Mám 5G i v kurníku!',
      'AI tvrdí, že jsi nejrychlejší v okolí!',
      'Beránek právě dostal svůj první token.',
      'Ovce spočítány. Digitálně!',
      'Nabíjím telefon i berana.',
    ],
    maruska: [
      'Běž, běž! Zpívám ti do kroku! ♪',
      'Miminko fandí kopáním!',
      'Meduňka na klid, mrkev na běh!',
      'Namaluju tě, až doběhneš!',
      'My s bříškem fandíme oba!',
      'Avalo, nech trávu i ostatním!',
    ],
  };

  /* ---------- CEDULE (vtipné nápisy na rozcestnících) ---------- */
  const SIGNS = [
    'Mrkvov 2 km', 'Senné Lázně 5 km', 'Pozor, zvěř! (my)', 'Azyl Nech mě růst ❤',
    'Bláto → tudy', 'Drbání zdarma', 'Louka Wellness', 'Kopyto City 12 km',
    'Nekrmit! (Krmit!)', 'Pomalu, spí tu kočky',
  ];

  /* ---------- OBECNÉ HLÁŠKY BĚHEM HRY ---------- */
  const EVENTS = {
    milestone: [ // co ~500 m
      'Páni, to je dálka!',
      'Azyl už je za obzorem!',
      'Ještě kousek… nebo dva!',
      'Tohle by měl vidět celý azyl!',
      'Nová osobní louka… teda osobák!',
    ],
    lowEnergy: [
      'Kručí mi v břiše…',
      'Mrkev! Potřebuju mrkev!',
      'Docházej mi baterky…',
      'Někde tu musí být svačina!',
    ],
    goldenCarrot: [
      'ZLATÁ MRKEV! To je legenda!',
      'Ta chutná jako tisíc mrkví!',
      'Dneska mám svátek!',
    ],
    chicken: [ // co zakřičí slepice, když do ní zvířátko vrazí
      'Kokodák!!',
      'Ko-ko-KATASTROFA!',
      'Moje vajíčko!!',
      'To řeknu kohoutovi!',
      'Slepičí poplach!!',
      'Kdák! Koukej, kudy běžíš!',
    ],
    goose: [ // husy jsou drzejší
      'Kejhák!!',
      'Ssss! Tady velím JÁ!',
      'GA-GA-GAUNEŘI!',
      'Štípanec máš u mě schovaný!',
      'Tohle si vyříkáme u rybníka!',
      'Pozor! Husa v protisměru!',
    ],
    flyer: { // hlášky kroužících letců na obloze
      swallow: ['Píp! Letecká show zdarma!', 'Vlaštovka dělá looping!', 'Závodíme? Já to vezmu vrchem!'],
      stork: ['Kláp kláp! Kontrola louky!', 'Čáp hlásí: dole vše veselé!', 'Doručuji dobrou náladu!'],
      owl: ['Húú! Kdo to tam běhá?', 'Noční hlídka na obletu!', 'Húúkám ti do kroku!'],
    },
  };

  /* ---------- OBCHOD / EKONOMIKA ---------- */
  const ECONOMY = {
    coinValue: 1,
    carrotEnergy: 7,
    goldenCarrotEnergy: 26,
    hitPenalty: 18,
    startEnergy: 100,
    drainPerSecond: 1.8,  // základ, násobí se statistikou postavy, rychlostí a vzdáleností
    drainRampDist: 1800,  // po kolika metrech se odčerpávání zdvojnásobí
  };

  return { CHARACTERS, ENVS, OBSTACLES, BIRD_VARIANTS, HUMANS, SIGNS, EVENTS, ECONOMY };
})();
