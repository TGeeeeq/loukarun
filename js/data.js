/* =========================================================
   LOUKA RUN – data hry
   Postavy, hlášky, příběhy, prostředí
   Hra na podporu azylu Nech mě růst (nechmerust.org)

   Texty jsou dvojjazyčné: { cs: '…', en: '…' }.
   Aktuální jazyk vybírá I18N.pick() (js/i18n.js).
   ========================================================= */

const DATA = (() => {

  /* ---------- POSTAVY ---------- */
  const CHARACTERS = [
    {
      id: 'karel',
      name: { cs: 'Osel Karel', en: 'Karel the Donkey' },
      species: 'osel',
      tagline: {
        cs: 'Hravý osel s velkým srdcem a lehce kousavou povahou.',
        en: 'A playful donkey with a big heart and a slightly bitey sense of humor.',
      },
      unlock: { type: 'free' },
      perk: {
        cs: 'Vyvážený běžec. Srdce azylu.',
        en: 'A balanced runner. The heart of the sanctuary.',
      },
      stats: { speed: 1.0, jump: 1.0, drain: 1.0 },
      // černý osel s bílým čumákem a světlými kroužky kolem očí
      colors: { body: '#45403c', belly: '#93887f', mane: '#211d1a', muzzle: '#efe7da', ear: '#45403c', earIn: '#b5a89a', eyeRing: '#c6bab0', hoof: '#26221e' },
      quotes: [
        { cs: 'Hýkám, tedy jsem!', en: 'I bray, therefore I am!' },
        { cs: 'Tuhle mrkev si zasloužím. A tamtu taky.', en: 'I deserve this carrot. And that one too.' },
        { cs: 'Kousavý humor? To bude po mně.', en: 'Biting humor? Yeah, they get that from me.' },
        { cs: 'Kdo běží poslední, hlídá seno!', en: 'Last one there guards the hay!' },
        { cs: 'Tvrdohlavý? Já tomu říkám cílevědomý.', en: 'Stubborn? I call it goal-oriented.' },
        { cs: 'Pozor, jedu! Teda… běžím!', en: 'Coming through! I mean… running through!' },
        { cs: 'Ušima kormidluju, ocasem brzdím.', en: 'Ears for steering, tail for braking.' },
      ],
      hitQuotes: [
        { cs: 'Íáá! To bylo naschvál!', en: 'Hee-haw! That was on purpose!' },
        { cs: 'Kdo to tam postavil?!', en: 'Who put that there?!' },
        { cs: 'Tak to jsem nevymyslel já.', en: 'Well, that wasn’t my idea.' },
      ],
      stories: [
        {
          cs: 'Karel doběhl až k ceduli „Vstup zakázán“. Chvíli si ji prohlížel… a pak ji celou okousal. Teď je tam cedule „Vst_p z_k_zán“ a nikdo neví, co znamená.',
          en: 'Karel ran all the way to a “No Entry” sign. He studied it for a while… then nibbled the whole thing. Now the sign reads “N_ Entr_” and nobody knows what it means.',
        },
        {
          cs: 'Karel doběhl na trh s mrkvemi. Prodavač mu dal jednu zdarma. Karel z vděčnosti zahýkal tak nahlas, že se seběhla celá vesnice. Prodal se veškerý sortiment.',
          en: 'Karel ran to the carrot market. The vendor gave him one for free. Karel brayed his thanks so loudly the whole village came running. Everything sold out.',
        },
        {
          cs: 'Karel doběhl k zrcadlu opřenému o stodolu. Hodinu se zdravil s „tím druhým fešákem“, než mu došlo, kdo to je. Nikomu to neříkejte.',
          en: 'Karel ran up to a mirror leaning against the barn. He spent an hour greeting “that other handsome fellow” before realizing who it was. Don’t tell anyone.',
        },
        {
          cs: 'Karel doběhl na louku plnou pampelišek, lehl si na záda a válel se tak dlouho, až vypadal jako obří žlutý knedlík. Prohlásil to za nejlepší den svého života.',
          en: 'Karel ran to a meadow full of dandelions, flopped onto his back and rolled around until he looked like a giant yellow dumpling. He declared it the best day of his life.',
        },
      ],
    },
    {
      id: 'pogo',
      name: { cs: 'Ovečka Pogo', en: 'Pogo the Sheep' },
      species: 'ovce',
      tagline: {
        cs: 'Energická ovčí kamarádka, která skáče jako na pružině.',
        en: 'An energetic sheep friend who jumps like she’s on springs.',
      },
      unlock: { type: 'coins', price: 250 },
      perk: {
        cs: 'Perk: VLNĚNÝ POLŠTÁŘ – náraz ubere jen půlku energie a skáče o kousek výš.',
        en: 'Perk: WOOLLY CUSHION – takes only half the energy from a hit and jumps a little higher.',
      },
      stats: { speed: 1.0, jump: 1.10, drain: 1.0, hitFactor: 0.5 },
      // krémová vlna, hnědá tvářička a tmavé nožky
      colors: { body: '#f2ede2', belly: '#ffffff', mane: '#e2d8c6', muzzle: '#9a8268', ear: '#9a8268', earIn: '#c2a888', legs: '#8a7460', hoof: '#463c32' },
      quotes: [
        { cs: 'Bééžím jako o závod!', en: 'Baaa-cing like it’s race day!' },
        { cs: 'Pogo! Pogo! Pogo! …to je moje jméno i sport.', en: 'Pogo! Pogo! Pogo! …that’s my name and my sport.' },
        { cs: 'Vlna? Ta je teď v módě!', en: 'Wool? It’s so in right now!' },
        { cs: 'Skáču, tedy jsem. A jsem hodně.', en: 'I jump, therefore I am. A lot.' },
        { cs: 'Počítat ovce? Zkuste mě chytit!', en: 'Counting sheep? Try catching one!' },
        { cs: 'Kudrnatá a hrdá na to!', en: 'Curly and proud of it!' },
      ],
      hitQuotes: [
        { cs: 'Béé! To nebylo fér!', en: 'Baaa! That was not fair!' },
        { cs: 'Naštěstí mám vlastní polstrování.', en: 'Good thing I bring my own padding.' },
        { cs: 'Odraz se ode mě, světe!', en: 'Bounce off me, world!' },
      ],
      stories: [
        {
          cs: 'Pogo doběhla na trampolínovou show. Porotci jí dali samé desítky, i když se jen snažila dostat přes plot za kamarádkami.',
          en: 'Pogo ran into a trampoline show. The judges gave her straight tens, even though she was just trying to get over the fence to her friends.',
        },
        {
          cs: 'Pogo doběhla k obrovské hromadě čerstvě posekané trávy, skočila do ní šipku a vylezla až za tři hodiny. Voněla tak krásně, že ji všichni chtěli objímat.',
          en: 'Pogo ran to a huge pile of freshly cut grass, dove straight in and didn’t come out for three hours. She smelled so lovely that everyone wanted to hug her.',
        },
        {
          cs: 'Pogo doběhla na louku, kde spal pes Riky. Přeskočila ho tam a zpět čtyřicetkrát. Riky se ani nevzbudil, ale ve snu prý počítal ovce.',
          en: 'Pogo ran to the meadow where Riky the dog was napping. She jumped over him back and forth forty times. Riky never woke up, but they say he counted sheep in his dream.',
        },
        {
          cs: 'Pogo doběhla až k fotografovi, který fotil západ slunce. Všechny fotky teď mají uprostřed nadšenou skákající ovci. Staly se virálními.',
          en: 'Pogo ran up to a photographer shooting the sunset. Every photo now has an enthusiastic jumping sheep in the middle. They went viral.',
        },
      ],
    },
    {
      id: 'avala',
      name: { cs: 'Kráva Avala', en: 'Avala the Cow' },
      species: 'kráva',
      tagline: {
        cs: 'Mazlivá kravička, která nejvíc ze všeho miluje běhání po louce.',
        en: 'A cuddly cow who loves nothing more than running across the meadow.',
      },
      unlock: { type: 'coins', price: 500 },
      perk: {
        cs: 'Perk: ŠŤASTNÁ KOPYTA – sbírá o polovinu víc mincí a zlaté mrkve jí dají dvakrát tolik energie.',
        en: 'Perk: LUCKY HOOVES – collects 50% more coins and golden carrots give her twice the energy.',
      },
      stats: { speed: 1.06, jump: 1.0, drain: 1.0, coinMult: 1.5, goldenBonus: 2.0 },
      // tmavě hnědo-oranžová kravka s bílými flíčky a malými růžky (podle skutečné Avaly)
      colors: { body: '#9a5226', belly: '#f2e7d4', mane: '#5e3418', muzzle: '#efb9a2', ear: '#9a5226', earIn: '#d3a284', spots: '#f2ead9', pattern: 'patches', hoof: '#3d3128' },
      quotes: [
        { cs: 'Búúrned kalorie? Já je předběhla!', en: 'Moo-ved past those calories before they knew it!' },
        { cs: 'Louka je moje běžecká dráha!', en: 'The meadow is my running track!' },
        { cs: 'Mazlení až v cíli. Teď se běží!', en: 'Cuddles at the finish line. Now we run!' },
        { cs: 'Tráva zelená, kopyta rychlá!', en: 'Green the grass, swift the hooves!' },
        { cs: 'Říkají mi blesková Avala. Teda… říkám si tak sama.', en: 'They call me Lightning Avala. Well… I call myself that.' },
        { cs: 'Květo, dohoň mě! …Květo?', en: 'Květa, catch me! …Květa?' },
      ],
      hitQuotes: [
        { cs: 'Búú! Kdo to sem dal?', en: 'Moo! Who put that here?' },
        { cs: 'To mě jen tak nerozhodí. Skoro.', en: 'Takes more than that to rattle me. Almost.' },
        { cs: 'Příště to oběhnu. Možná.', en: 'Next time I’ll go around it. Maybe.' },
      ],
      stories: [
        {
          cs: 'Avala doběhla na vesnický maraton a omylem ho vyhrála. Pořadatelé jí předali pohár plný jetele. Slíbila, že příští rok přijde obhajovat.',
          en: 'Avala ran into the village marathon and accidentally won it. The organizers handed her a trophy full of clover. She promised to come back next year to defend her title.',
        },
        {
          cs: 'Avala doběhla až k rybníku, uviděla svůj odraz a zamávala si. Odraz zamával taky. Kamarádky jsou všude, stačí se dívat!',
          en: 'Avala ran all the way to the pond, saw her reflection and waved at it. The reflection waved back. Friends are everywhere, you just have to look!',
        },
        {
          cs: 'Avala doběhla za Květou, aby jí vyprávěla, co všechno viděla. Vyprávěla tři hodiny. Květa u toho dvakrát usnula a Avale to vůbec nevadilo.',
          en: 'Avala ran to Květa to tell her everything she had seen. She talked for three hours. Květa fell asleep twice, and Avala didn’t mind one bit.',
        },
        {
          cs: 'Avala doběhla na kopec, odkud je vidět celý azyl. Zabučela tak radostně, že jí odpověděla všechna zvířata. Byl to nejkrásnější sbor široko daleko.',
          en: 'Avala ran up the hill overlooking the whole sanctuary. She mooed so joyfully that every animal answered back. It was the loveliest choir for miles around.',
        },
      ],
    },
    {
      id: 'flicek',
      name: { cs: 'Prasátko Flíček', en: 'Flíček the Piglet' },
      species: 'prase',
      tagline: {
        cs: 'Prasátko, které si nejvíc užívá drbání na bříšku.',
        en: 'A piglet who enjoys belly rubs more than anything.',
      },
      unlock: { type: 'coins', price: 900 },
      perk: {
        cs: 'Perk: RYPÁČEK-MAGNET – přitahuje mrkve a mince z dálky.',
        en: 'Perk: SNOUT MAGNET – pulls in carrots and coins from afar.',
      },
      stats: { speed: 0.96, jump: 0.95, drain: 0.95, magnet: 105 },
      // šedivé prasátko s černými fleky a růžovošedým rypáčkem
      colors: { body: '#b3aaa1', belly: '#cec5bc', mane: '#8a817a', muzzle: '#d9a9a0', ear: '#9a908a', earIn: '#756c66', spots: '#38342f', pattern: 'blotch', hoof: '#46403a' },
      quotes: [
        { cs: 'Chro chro! Kdo běží, ten si zaslouží drbání!', en: 'Oink oink! Runners earn belly rubs!' },
        { cs: 'Bláto není špína, bláto je wellness!', en: 'Mud isn’t dirt, mud is wellness!' },
        { cs: 'Rypáček navigace zapnuta!', en: 'Snout navigation: ON!' },
        { cs: 'Já neběžím za jídlem. Jídlo běží ke mně!', en: 'I don’t run after food. Food runs to me!' },
        { cs: 'Bříško napřed!', en: 'Belly first!' },
        { cs: 'Kvík! Tohle je lepší než dieta!', en: 'Squee! Better than any diet!' },
      ],
      hitQuotes: [
        { cs: 'Kvíík! Moje bříško!', en: 'Squeee! My belly!' },
        { cs: 'To si vypiju… teda vyválím!', en: 'I’ll pay for that… with a mud roll!' },
        { cs: 'Naštěstí jsem dobře odpružený.', en: 'Luckily I come with built-in suspension.' },
      ],
      stories: [
        {
          cs: 'Flíček doběhl do lázní pro prasátka. Teda… do velké louže. Ale choval se tam jako v lázních a odmítal vylézt, dokud nedostal drbání na bříšku.',
          en: 'Flíček ran to the piglet spa. Well… a big puddle. But he acted like it was a spa and refused to come out until he got a belly rub.',
        },
        {
          cs: 'Flíček doběhl na farmářské trhy a vyhrál soutěž „Nejspokojenější zvíře kraje“. Porota se shodla jednohlasně, hned jak si lehl na záda.',
          en: 'Flíček ran to the farmers’ market and won the “Most Content Animal in the County” contest. The jury voted unanimously the moment he rolled onto his back.',
        },
        {
          cs: 'Flíček doběhl k záhonu s jahodami. Nesnědl ani jednu — jen si k nim lehl a hlídal je. Za odměnu dostal největší jahodu a hodinu drbání.',
          en: 'Flíček ran to the strawberry patch. He didn’t eat a single one — he just lay down next to them and stood guard. As a reward he got the biggest strawberry and an hour of belly rubs.',
        },
        {
          cs: 'Flíček doběhl tak daleko, že objevil novou louži, kterou nikdo nikdy neviděl. Pojmenoval ji Flíčkovo moře. Na mapách azylu už je zakreslená.',
          en: 'Flíček ran so far he discovered a brand-new puddle nobody had ever seen. He named it Flíček’s Sea. It’s already marked on the sanctuary maps.',
        },
      ],
    },
    {
      id: 'yakul',
      name: { cs: 'Muflon Yakul', en: 'Yakul the Mouflon' },
      species: 'muflon',
      tagline: {
        cs: 'Rozverný mladík, který právě zjišťuje, k čemu má rohy.',
        en: 'A playful youngster still figuring out what his horns are for.',
      },
      unlock: { type: 'coins', price: 1500 },
      perk: {
        cs: 'Perk: BERANIDLO – 5× za běh prorazí překážku bez ztráty energie.',
        en: 'Perk: BATTERING RAM – smashes through 5 obstacles per run without losing energy.',
      },
      stats: { speed: 1.04, jump: 1.05, drain: 1.0, ram: 5 },
      // tmavohnědý muflon se světlým sedlem, bílým čumákem a rohy
      colors: { body: '#6b4830', belly: '#e6dac6', mane: '#4c3120', muzzle: '#e9dfcd', ear: '#6b4830', earIn: '#c2996f', horns: '#c7ad85', spots: '#cbb896', pattern: 'saddle', legs: '#5a3c28', hoof: '#31261e' },
      quotes: [
        { cs: 'Rohy! Já mám rohy! K čemu asi jsou?', en: 'Horns! I have horns! Wonder what they’re for?' },
        { cs: 'Tak schválně, co tohle vydrží!', en: 'Let’s see what this thing can take!' },
        { cs: 'Z kopce, do kopce, mně je to jedno!', en: 'Uphill, downhill, all the same to me!' },
        { cs: 'Frajer? Já? …No jasně!', en: 'Cool guy? Me? …Obviously!' },
        { cs: 'Ten balík sena se na mě díval divně.', en: 'That hay bale was looking at me funny.' },
        { cs: 'Jednou budu mít rohy jako věšák!', en: 'One day my horns will make a fine coat rack!' },
      ],
      hitQuotes: [
        { cs: 'Mek! To mělo uhnout!', en: 'Baa! That was supposed to move!' },
        { cs: 'Zapomněl jsem nakl-ONIT hlavu!', en: 'Forgot to lower my he-e-ead!' },
        { cs: 'Tak tohle rohy nevyřešily.', en: 'Okay, horns did not solve that one.' },
      ],
      stories: [
        {
          cs: 'Yakul doběhl k obrovské dýni a konečně zjistil, k čemu má rohy: perfektně se s nimi kutálí dýně. Přikutálel ji do azylu a byla z ní hostina pro všechny.',
          en: 'Yakul ran up to a giant pumpkin and finally found out what horns are for: they’re perfect for rolling pumpkins. He rolled it to the sanctuary and it became a feast for everyone.',
        },
        {
          cs: 'Yakul doběhl na kopec, postavil se na skálu jako v pohádce a zapózoval. Vydržel to celé čtyři vteřiny, pak uviděl motýla a běžel za ním.',
          en: 'Yakul ran up a hill, stood on a rock like in a fairy tale and struck a pose. He held it for a whole four seconds, then spotted a butterfly and chased after it.',
        },
        {
          cs: 'Yakul doběhl k vrbě a zamotal si rohy do větví. Než ho vymotali, tvářil se, že je to nový druh klobouku. Skoro mu to všichni uvěřili.',
          en: 'Yakul ran into a willow tree and tangled his horns in the branches. While being untangled, he insisted it was a new kind of hat. Almost everyone believed him.',
        },
        {
          cs: 'Yakul doběhl závod s vlastním stínem. Tvrdí, že vyhrál o rohy. Stín se k výsledku odmítl vyjádřit.',
          en: 'Yakul ran a race against his own shadow. He claims he won by a horn. The shadow declined to comment.',
        },
      ],
    },
    {
      id: 'kveta',
      name: { cs: 'Kráva Květa', en: 'Květa the Cow' },
      species: 'kráva',
      tagline: {
        cs: 'Klidná a tichá duše, věrná parťačka Avaly.',
        en: 'A calm and quiet soul, Avala’s faithful companion.',
      },
      unlock: { type: 'coins', price: 2500 },
      perk: {
        cs: 'Perk: KLID V DUŠI – energie ubývá o čtvrtinu pomaleji.',
        en: 'Perk: INNER PEACE – energy drains a quarter slower.',
      },
      stats: { speed: 0.94, jump: 0.95, drain: 0.75 },
      // stejná tmavě hnědo-oranžová jako Avala – liší se maskou přes oči, bílou ofinkou a chybějícími rohy
      colors: { body: '#9a5226', belly: '#f2e7d4', mane: '#5e3418', muzzle: '#efb9a2', ear: '#9a5226', earIn: '#d3a284', spots: '#f2ead9', pattern: 'patches', noHorns: true, eyePatch: '#552a12', forelock: '#f7f2e6', hoof: '#3d3128' },
      quotes: [
        { cs: 'Spěchám. Pomalu, ale spěchám.', en: 'I’m hurrying. Slowly, but hurrying.' },
        { cs: 'Klid je taky rychlost. Jen jiná.', en: 'Calm is a kind of speed too. Just a different one.' },
        { cs: 'Búú… to bylo na dlouhé vyprávění. Tak jindy.', en: 'Moo… that’s a long story. Some other time.' },
        { cs: 'Avalo, počkej… ale v klidu.', en: 'Avala, wait up… but calmly.' },
        { cs: 'Dýchej. Přežvykuj. Běž.', en: 'Breathe. Chew. Run.' },
        { cs: 'Kdo nikam nespěchá, všechno stihne.', en: 'Those who never rush are never late.' },
      ],
      hitQuotes: [
        { cs: 'Hm. Tak to tu minule nebylo.', en: 'Hm. That wasn’t here last time.' },
        { cs: 'Búú. No nic, běžíme dál.', en: 'Moo. Oh well, on we go.' },
        { cs: 'Klid, Květo. Klid.', en: 'Easy, Květa. Easy.' },
      ],
      stories: [
        {
          cs: 'Květa doběhla na louku, kde kvetly kopretiny. Sedla si mezi ně a hodinu se nehýbala. Včely ji prohlásily za největší květinu roku. Jmenuje se ostatně Květa.',
          en: 'Květa ran to a meadow of blooming daisies. She sat down among them and didn’t move for an hour. The bees declared her Flower of the Year. Her name does mean Blossom, after all.',
        },
        {
          cs: 'Květa doběhla k medituijícímu turistovi. Sedla si vedle něj a přežvykovala tak klidně, že dosáhl osvícení. Poděkoval jí a ona jen pomalu mrkla.',
          en: 'Květa ran up to a meditating hiker. She sat down beside him and chewed so calmly that he reached enlightenment. He thanked her, and she just blinked. Slowly.',
        },
        {
          cs: 'Květa doběhla do cíle jako poslední, ale s nejkrásnějším výhledem, třemi novými kamarády a jednou sedmikráskou za uchem. Kdo je tady vlastně vítěz?',
          en: 'Květa crossed the finish line last — but with the prettiest view, three new friends and a daisy behind her ear. So who’s the real winner here?',
        },
        {
          cs: 'Květa doběhla za Avalou, položila jí hlavu na hřbet a obě koukaly na západ slunce. Nikdo nic neříkal. Bylo to dokonalé.',
          en: 'Květa ran to Avala, rested her head on her back, and they watched the sunset together. Nobody said a word. It was perfect.',
        },
      ],
    },
  ];

  /* ---------- PROSTŘEDÍ ---------- */
  // Postupně se střídají a plynule prolínají.
  const ENVS = [
    {
      id: 'louka', name: { cs: 'Rozkvetlá louka', en: 'Blooming Meadow' },
      skyTop: '#8ed4f7', skyBottom: '#dff3e8',
      hillFar: '#a8d8a0', hillNear: '#7cc276',
      ground: '#5aa84f', groundDark: '#4a9440', path: '#c9b485',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['sunflower', 'flower', 'beehive', 'signpost', 'butterflyZone', 'catnap', 'frogpond', 'cowboy', 'grazingcow', 'grazingsheep', 'geese', 'cheersquad'],
      particles: 'petals',
    },
    {
      id: 'sad', name: { cs: 'Ovocný sad', en: 'Orchard' },
      skyTop: '#9fd9f2', skyBottom: '#f4e9d0',
      hillFar: '#b5d49a', hillNear: '#8cbf72',
      ground: '#6aab52', groundDark: '#589644', path: '#cdb489',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['appletree', 'ladder', 'basket', 'scarecrow', 'snail', 'cowboy', 'grazingsheep', 'geese', 'cheersquad'],
      particles: 'leaves',
    },
    {
      id: 'les', name: { cs: 'Pohádkový les', en: 'Fairy-tale Forest' },
      skyTop: '#7cc4b8', skyBottom: '#d9ecc8',
      hillFar: '#5d9c72', hillNear: '#417d56',
      ground: '#3f7a4a', groundDark: '#356a3f', path: '#a8926b',
      sun: '#f5f0c0', clouds: '#eef7ee',
      props: ['tree', 'mushroom', 'gnome', 'stump', 'owlbox', 'frogpond', 'snail', 'deer', 'cheersquad'],
      particles: 'fireflies',
    },
    {
      id: 'vesnice', name: { cs: 'Veselá vesnice', en: 'Merry Village' },
      skyTop: '#93c9ef', skyBottom: '#f7e8cf',
      hillFar: '#c2b7a0', hillNear: '#a8c684',
      ground: '#79a85e', groundDark: '#679250', path: '#d3bd93',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['cottage', 'fencebg', 'tractor', 'laundry', 'dovecote', 'catnap', 'chickens', 'cheersquad'],
      particles: 'none',
    },
    {
      id: 'zapad', name: { cs: 'Zlatá hodinka', en: 'Golden Hour' },
      skyTop: '#f7a26b', skyBottom: '#ffd9a0',
      hillFar: '#c77b5a', hillNear: '#9c5f46',
      ground: '#8a6a45', groundDark: '#79593a', path: '#c9a06b',
      sun: '#ffce7a', clouds: '#ffd9b8',
      props: ['haystack', 'sunflower', 'signpost', 'windmill', 'catnap', 'cowboy', 'grazingcow', 'grazingsheep', 'farmhouse', 'cheersquad'],
      particles: 'petals',
    },
    {
      id: 'noc', name: { cs: 'Hvězdná noc', en: 'Starry Night' },
      skyTop: '#1d2b53', skyBottom: '#4a5a8a',
      hillFar: '#2e3c63', hillNear: '#26334f',
      ground: '#2c4038', groundDark: '#24352e', path: '#5a5f6e',
      sun: '#f5f2d0', clouds: '#39466b',
      props: ['tree', 'tent', 'campfire', 'owlbox', 'frogpond', 'deer', 'farmhouse'],
      particles: 'stars',
      night: true,
    },
  ];

  /* ---------- PŘEKÁŽKY ----------
     minM = od kolikátého metru se překážka objevuje. Odemykání je
     sladěné s přechody prostředí (~550 m), takže každý nový „level“
     přinese něco nového a začátek zůstane přívětivý.
     intro = hláška prvního setkání: když daný druh potká hráč úplně
     poprvé, čas se zpomalí jako ve škole běhu a běžec novinku
     představí (viz „novinky na trase“ v game.js). */
  const OBSTACLES = [
    {
      id: 'hay', w: 62, h: 52, type: 'jump', minM: 0, label: { cs: 'balík sena', en: 'hay bale' },
      intro: {
        cs: 'Balík sena! Vypadá měkce, ale věř mi — je to zamaskovaná zeď. Skoč!',
        en: 'A hay bale! Looks soft, but trust me — it’s a wall in disguise. Jump!',
      },
    },
    {
      id: 'fence', w: 56, h: 58, type: 'jump', minM: 250, label: { cs: 'plůtek', en: 'fence' },
      intro: {
        cs: 'Plůtek! Prý má držet zvířata na místě. Cha! Hop přes něj!',
        en: 'A fence! Supposedly it keeps animals in place. Ha! Hop right over!',
      },
    },
    {
      id: 'mud', w: 92, h: 18, type: 'jump', minM: 0, label: { cs: 'kaluž bláta', en: 'mud puddle' }, soft: true,
      intro: {
        cs: 'Bláto! Flíček by se do něj vrhl šipkou. Ty ho radši přeskoč — wellness až po běhu.',
        en: 'Mud! Flíček would dive straight in. Better jump it — spa time is after the run.',
      },
    },
    {
      id: 'rock', w: 50, h: 44, type: 'jump', minM: 550, label: { cs: 'šutr', en: 'rock' },
      intro: {
        cs: 'Šutr! Leží tu tisíc let a uhýbat se nenaučil. Přeskoč ho, on se neurazí.',
        en: 'A rock! It’s been lying here for a thousand years and never learned to move. Jump over — it won’t take offense.',
      },
    },
    {
      id: 'branch', w: 120, h: 30, type: 'duck', minM: 550, label: { cs: 'větev', en: 'branch' }, flying: true, clearance: 62,
      intro: {
        cs: 'Nízká větev! Hlavu dolů a proklouzni pod ní — účes si opravíš v cíli.',
        en: 'A low branch! Head down and slide under — you can fix your hairdo at the finish line.',
      },
    },
    {
      id: 'chicken', w: 40, h: 40, type: 'jump', minM: 250, label: { cs: 'slepice', en: 'chicken' }, moving: true,
      intro: {
        cs: 'Slepice na trase! Nejezdi jí peřím, přeskoč ji. Stížnost stejně podá.',
        en: 'A chicken on the track! Don’t plow through her feathers, jump over. She’ll file a complaint anyway.',
      },
    },
    {
      id: 'goose', w: 56, h: 58, type: 'jump', minM: 1100, label: { cs: 'husa', en: 'goose' }, moving: true,
      intro: {
        cs: 'Pozor, husa! Šéfová celé louky. Přeskoč ji s úctou — vynadá ti tak jako tak.',
        en: 'Watch out, a goose! Boss of the whole meadow. Jump over her with respect — she’ll tell you off either way.',
      },
    },
    {
      id: 'barrow', w: 66, h: 48, type: 'jump', minM: 1100, label: { cs: 'trakař', en: 'wheelbarrow' },
      intro: {
        cs: 'Trakař! Tomáš ho tu zase nechal. Skoč — a dělej, že jsi nic neviděl.',
        en: 'A wheelbarrow! Tomáš left it here again. Jump — and pretend you saw nothing.',
      },
    },
    {
      id: 'beeline', w: 110, h: 26, type: 'duck', minM: 1650, label: { cs: 'včelí letka', en: 'bee squadron' }, flying: true, clearance: 66,
      intro: {
        cs: 'Hele, včely! Letí nízko a přesně ve formaci. Skrč se — med ti nedají, žihadlo klidně.',
        en: 'Look, bees! Flying low in perfect formation. Duck — they won’t share honey, but they’ll happily share stings.',
      },
    },
    {
      // vír špačků od 5. levelu: sahá tak vysoko, že ho nepřeskočí ani
      // Pogo dvojskokem (max ~304 px, vršek hejna je ve 334 px) – jediná
      // cesta je skluz, takže věčné skákání přestává být univerzální trik
      id: 'flock', w: 120, h: 280, type: 'duck', minM: 2200, label: { cs: 'hejno špačků', en: 'starling flock' }, flying: true, clearance: 64,
      intro: {
        cs: 'Hejno špačků! Zkoušejí velkolepou show přes celé nebe — tohle nepřeskočíš, ani kdyby ses přede mnou chtěl vytáhnout. Skrč se a podběhni, vstupenka zadarmo.',
        en: 'A starling flock! Rehearsing their grand show across the whole sky — you won’t jump over this one, no matter how much you want to impress me. Duck and slip underneath, admission is free.',
      },
    },
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
  /* Každý člověk má obecné hlášky (any) a hlášky trefné pro dané prostředí
     (klíč = id prostředí: louka, sad, les, vesnice, zapad, noc). V noci mají
     ospalé hlášky a při kreslení i ospalou pózu. */
  const HUMANS = {
    tomas: {
      any: [
        { cs: 'Neruš, stavíme!', en: 'Don’t disturb us, we’re building!' },
        { cs: 'Ta slepice je můj stavební dozor.', en: 'That hen is my building inspector.' },
        { cs: 'Ještě prkno a je z toho palác!', en: 'One more plank and it’s a palace!' },
        { cs: 'Změřeno dvakrát, uříznuto třikrát…', en: 'Measured twice, cut three times…' },
        { cs: 'Hnízdo na hlavě? Aspoň mám vejce čerstvá!', en: 'A nest on my head? At least the eggs are fresh!' },
        { cs: 'Kdo maká, ten se nenudí!', en: 'Busy hands are never bored!' },
        { cs: 'Běžíš skvěle! Postavím ti tribunu!', en: 'You’re running great! I’ll build you a grandstand!' },
        { cs: 'Z tebe by byl skvělej tesař!', en: 'You’d make a great carpenter!' },
      ],
      louka: [
        { cs: 'Na louce tluču ptačí budku – nájemník už čeká!', en: 'Building a birdhouse in the meadow – the tenant’s already waiting!' },
        { cs: 'Tady bude altán! Teda… až to doměřím.', en: 'A gazebo goes here! Well… once I finish measuring.' },
      ],
      sad: [
        { cs: 'Spravuju žebřík k jabkám. Slepice hlídá výšku.', en: 'Fixing the ladder to the apples. The hen checks the height.' },
        { cs: 'Bedýnky na jablka? Hotové! Skoro.', en: 'Crates for the apples? Done! Almost.' },
      ],
      les: [
        { cs: 'V lese tesám lavičku pro unavené běžce.', en: 'Carving a bench in the forest for tired runners.' },
        { cs: 'Ta borovice by chtěla domeček. Vyřezávám!', en: 'That pine could use a little house. I’m carving away!' },
      ],
      vesnice: [
        { cs: 'Vezu vejce na trh – slepice trvá, že jsou její!', en: 'Taking eggs to market – the hen insists they’re hers!' },
        { cs: 'Naložím prkna na vůz a hurá na jarmark!', en: 'Loading planks on the cart and off to the fair!' },
      ],
      zapad: [
        { cs: 'Za soumraku dotloukám poslední hřebík.', en: 'At dusk I’m hammering in the very last nail.' },
        { cs: 'Sluníčko zapadá, plot skoro stojí.', en: 'The sun is setting, the fence is almost standing.' },
      ],
      noc: [
        { cs: 'Pššt… kladivo spí, slepice taky.', en: 'Shhh… the hammer’s asleep, and so is the hen.' },
        { cs: 'Ještě jeden hřebík… ten dám zítra. Dobrou.', en: 'Just one more nail… I’ll do that one tomorrow. Night.' },
      ],
    },
    tony: {
      any: [
        { cs: 'Beran podrbán, appka nasazena.', en: 'Ram scratched, app deployed.' },
        { cs: 'Mám 5G i v kurníku!', en: 'I’ve got 5G even in the henhouse!' },
        { cs: 'AI tvrdí, že jsi nejrychlejší v okolí!', en: 'The AI says you’re the fastest around!' },
        { cs: 'Beránek právě dostal svůj první token.', en: 'The ram just got his first token.' },
        { cs: 'Ovce spočítány. Digitálně!', en: 'Sheep counted. Digitally!' },
        { cs: 'Tvůj běh právě trenduje!', en: 'Your run is trending right now!' },
        { cs: 'Podle mé appky máš skvělé tempo!', en: 'According to my app, your pace is great!' },
      ],
      louka: [
        { cs: 'Na louce měřím signál – ovcím jede stream skvěle!', en: 'Measuring signal in the meadow – the sheep stream great!' },
        { cs: 'Beran na louce lajkuje každou mrkev.', en: 'Out here the ram likes every single carrot.' },
      ],
      sad: [
        { cs: 'Natáčím berana, jak česá jabka. Virál jistý!', en: 'Filming the ram picking apples. Viral for sure!' },
        { cs: 'Wi-fi dosáhne až do koruny jabloně!', en: 'The wi-fi reaches all the way up the apple tree!' },
      ],
      les: [
        { cs: 'V lese slabší signál, zato beran je onlinovej.', en: 'Weaker signal in the forest, but the ram’s still online.' },
        { cs: 'Houby počítám appkou. Beran asistuje.', en: 'Counting mushrooms with an app. The ram assists.' },
      ],
      vesnice: [
        { cs: 'Vezu berana na trh – bere selfie s každým!', en: 'Taking the ram to market – he takes selfies with everyone!' },
        { cs: 'Na návsi je 5G i pro kozy!', en: 'The village square’s got 5G even for the goats!' },
      ],
      zapad: [
        { cs: 'Zlatá hodinka – ideál na fotku berana!', en: 'Golden hour – perfect light for a ram photo!' },
        { cs: 'Západ streamuju živě, srdíčka jen lítají.', en: 'Streaming the sunset live, hearts are flying!' },
      ],
      noc: [
        { cs: 'Beran usnul na příjmu. Dobrou noc, appko.', en: 'The ram fell asleep on reception. Night night, app.' },
        { cs: 'Nabíječka běží, oči padají… chrr.', en: 'Charger’s on, eyelids are dropping… zzz.' },
      ],
    },
    maruska: {
      any: [
        { cs: 'Běž, běž! Zpívám ti do kroku! ♪', en: 'Run, run! I’m singing to your stride! ♪' },
        { cs: 'Miminko fandí kopáním!', en: 'The baby cheers by kicking!' },
        { cs: 'Meduňka na klid, mrkev na běh!', en: 'Lemon balm for calm, carrots for running!' },
        { cs: 'Namaluju tě, až doběhneš!', en: 'I’ll paint you when you finish!' },
        { cs: 'My s bříškem fandíme oba!', en: 'The belly and I are both cheering!' },
        { cs: 'Zpívám ti fanfáru! Tádadá! ♪', en: 'I’m singing you a fanfare! Ta-da-dah! ♪' },
        { cs: 'Miminku vyprávím, jak běháš. Kope radostí!', en: 'I’m telling the baby how you run. It kicks with joy!' },
      ],
      louka: [
        { cs: 'Na louce sbírám heřmánek a zpívám k tomu.', en: 'Picking chamomile in the meadow and singing along.' },
        { cs: 'Miminko sbírá kopretiny se mnou!', en: 'The baby picks daisies right along with me!' },
      ],
      sad: [
        { cs: 'Maluju rozkvetlou jabloň. Voní až sem!', en: 'Painting the apple blossom. I can smell it from here!' },
        { cs: 'Z jablek uvařím kompot pro celý azyl.', en: 'I’ll make apple compote for the whole sanctuary.' },
      ],
      les: [
        { cs: 'Les mi šeptá melodii. Zpívám ji dál.', en: 'The forest whispers me a melody. I sing it on.' },
        { cs: 'Sbírám lesní bylinky – na klid i na běh.', en: 'Gathering forest herbs – for calm and for running.' },
      ],
      vesnice: [
        { cs: 'Nesu bylinky na trh – levandule voní na dálku!', en: 'Taking herbs to market – the lavender smells for miles!' },
        { cs: 'Na jarmark vezu obrázky louky. Přijď!', en: 'I’m bringing meadow paintings to the fair. Come by!' },
      ],
      zapad: [
        { cs: 'Za soumraku maluju nebe. Takhle růžové!', en: 'At dusk I paint the sky. This pink!' },
        { cs: 'Zpívám ukolébavku slunci i bříšku.', en: 'Singing a lullaby to the sun and to my belly.' },
      ],
      noc: [
        { cs: 'Ššš… zpívám miminku ukolébavku.', en: 'Shhh… singing the baby a lullaby.' },
        { cs: 'Hvězdy svítí, bylinky spí… dobrou.', en: 'Stars are out, the herbs are asleep… good night.' },
      ],
    },
  };

  /* ---------- CEDULE (vtipné nápisy na rozcestnících) ---------- */
  const SIGNS = [
    { cs: 'Mrkvov 2 km', en: 'Carrotville 2 km' },
    { cs: 'Senné Lázně 5 km', en: 'Hay Spa 5 km' },
    { cs: 'Pozor, zvěř! (my)', en: 'Beware of animals! (us)' },
    { cs: 'Azyl Nech mě růst ❤', en: 'Nech mě růst sanctuary ❤' },
    { cs: 'Bláto → tudy', en: 'Mud → this way' },
    { cs: 'Drbání zdarma', en: 'Free belly rubs' },
    { cs: 'Louka Wellness', en: 'Meadow Wellness' },
    { cs: 'Kopyto City 12 km', en: 'Hoof City 12 km' },
    { cs: 'Nekrmit! (Krmit!)', en: 'Do not feed! (Feed!)' },
    { cs: 'Pomalu, spí tu kočky', en: 'Slow down, cats asleep' },
  ];

  /* ---------- OBECNÉ HLÁŠKY BĚHEM HRY ---------- */
  const EVENTS = {
    milestone: [ // co ~500 m
      { cs: 'Páni, to je dálka!', en: 'Wow, what a distance!' },
      { cs: 'Azyl už je za obzorem!', en: 'The sanctuary is beyond the horizon!' },
      { cs: 'Ještě kousek… nebo dva!', en: 'Just a bit more… or two!' },
      { cs: 'Tohle by měl vidět celý azyl!', en: 'The whole sanctuary should see this!' },
      { cs: 'Nová osobní louka… teda osobák!', en: 'A new personal meadow… I mean, personal best!' },
    ],
    lowEnergy: [
      { cs: 'Kručí mi v břiše…', en: 'My tummy is rumbling…' },
      { cs: 'Mrkev! Potřebuju mrkev!', en: 'Carrot! I need a carrot!' },
      { cs: 'Docházej mi baterky…', en: 'My batteries are running low…' },
      { cs: 'Někde tu musí být svačina!', en: 'There must be a snack around here!' },
    ],
    goldenCarrot: [
      { cs: 'ZLATÁ MRKEV! To je legenda!', en: 'GOLDEN CARROT! The legend is real!' },
      { cs: 'Ta chutná jako tisíc mrkví!', en: 'It tastes like a thousand carrots!' },
      { cs: 'Dneska mám svátek!', en: 'This is my lucky day!' },
    ],
    clover: [
      { cs: 'ČTYŘLÍSTEK! Dneska mi štěstí přeje!', en: 'FOUR-LEAF CLOVER! Luck is on my side!' },
      { cs: 'Mince se najednou lesknou dvakrát tolik!', en: 'Coins suddenly shine twice as bright!' },
      { cs: 'Šťastná tlapka, plná peněženka!', en: 'Lucky paw, full wallet!' },
    ],
    // Zvířecí koncert Louky – rytmická minihra, co se objeví každých 2,5 km
    concertIntro: {
      cs: 'Pódium Louky! 🎤 Za chvíli začne koncert. Po liště jezdí puntík — pokaždé, když je v ZELENÉ, ťukni (mezerník nebo klepni na obrazovku). Trefíš dost not a je vyprodáno! 🎶',
      en: 'The Meadow stage! 🎤 The show starts in a moment. A dot slides along the bar — each time it’s in the GREEN, tap (space or tap the screen). Hit enough notes and it’s sold out! 🎶',
    },
    concertWin: [ // pochvala po vyprodaném koncertu (popíše i odměnu)
      { cs: 'VYPRODÁNO! 🎶 Publikum šílí, energie po okraj a hrst mincí navrch. Popadnu dech a rozjedu se zas od začátku — ty jseš hvězda!', en: 'SOLD OUT! 🎶 The crowd’s going wild, energy to the brim and a fistful of coins on top. I’ll catch my breath and start fresh — you’re a star!' },
      { cs: 'To byl koncert! Ovace vestoje. Naberu druhý dech, rozběhnu se nanovo — a ty sklízíš potlesk!', en: 'What a show! A standing ovation. I’ll catch my second wind and start over — and you take the applause!' },
      { cs: 'Bomba! Trefil jsi rytmus jako profík. Plná energie, těžší měšec a já nabírám tempo od nuly. Přídavek!', en: 'Smash hit! You hit every beat like a pro. Full energy, a heavier purse, and I’m building my pace from zero. Encore!' },
    ],
    concertMiss: [ // když koncert nevyjde (+ smích)
      { cs: 'Ejhle, falešná nota! 🙉 Publikum je milé, ale přídavek nebude. Aspoň mě to trochu zbrzdilo — za chvíli zkusíme další koncert!', en: 'Ouch, a flat note! 🙉 The crowd’s kind, but no encore. At least it slowed me down a touch — another gig is coming soon!' },
      { cs: 'No… koncert to nebyl úplně čistý. Nevadí, aspoň popadnu trochu dech. Příště to roztleskáš!', en: 'Well… that gig wasn’t exactly pitch-perfect. No worries, at least I caught a bit of breath. You’ll bring the house down next time!' },
      { cs: 'Trošku mimo rytmus, co? 🎵 Hlavu vzhůru — a lehce jsem zvolnil. Další pódium tě čeká už brzy!', en: 'A bit off the beat, huh? 🎵 Chin up — and I eased off a little. The next stage is just around the corner!' },
    ],
    chicken: [ // co zakřičí slepice, když do ní zvířátko vrazí
      { cs: 'Kokodák!!', en: 'Bawk-bawk!!' },
      { cs: 'Ko-ko-KATASTROFA!', en: 'Cluck-cluck-CATASTROPHE!' },
      { cs: 'Moje vajíčko!!', en: 'My egg!!' },
      { cs: 'To řeknu kohoutovi!', en: 'I’m telling the rooster!' },
      { cs: 'Slepičí poplach!!', en: 'Chicken alarm!!' },
      { cs: 'Kdák! Koukej, kudy běžíš!', en: 'Cluck! Watch where you’re running!' },
    ],
    flock: [ // co zašvitoří hejno špačků, když do něj běžec vletí
      { cs: 'Švit-švit! Tohle v nácviku NEBYLO!', en: 'Tweet-tweet! That was NOT in rehearsal!' },
      { cs: 'Rozbils nám osmičku! Teď je to šestka!', en: 'You broke our figure eight! Now it’s a six!' },
      { cs: 'Choreograf omdlel!!', en: 'The choreographer just fainted!!' },
      { cs: 'Všichni zpátky do formace!', en: 'Everyone back in formation!' },
    ],
    goose: [ // husy jsou drzejší
      { cs: 'Kejhák!!', en: 'HONK!!' },
      { cs: 'Ssss! Tady velím JÁ!', en: 'Hisss! I’m in charge here!' },
      { cs: 'GA-GA-GAUNEŘI!', en: 'HONK-HONK-HOOLIGANS!' },
      { cs: 'Štípanec máš u mě schovaný!', en: 'You’ve got a pinch coming, mark my words!' },
      { cs: 'Tohle si vyříkáme u rybníka!', en: 'We’ll settle this down at the pond!' },
      { cs: 'Pozor! Husa v protisměru!', en: 'Watch out! Goose in the opposite lane!' },
    ],
    flyer: { // hlášky kroužících letců na obloze
      swallow: [
        { cs: 'Píp! Letecká show zdarma!', en: 'Tweet! Free air show!' },
        { cs: 'Vlaštovka dělá looping!', en: 'Swallow doing a loop-the-loop!' },
        { cs: 'Závodíme? Já to vezmu vrchem!', en: 'Racing? I’ll take the high road!' },
      ],
      stork: [
        { cs: 'Kláp kláp! Kontrola louky!', en: 'Clatter clatter! Meadow inspection!' },
        { cs: 'Čáp hlásí: dole vše veselé!', en: 'Stork reporting: all cheerful down below!' },
        { cs: 'Doručuji dobrou náladu!', en: 'Delivering good moods!' },
      ],
      owl: [
        { cs: 'Húú! Kdo to tam běhá?', en: 'Hoo! Who’s running down there?' },
        { cs: 'Noční hlídka na obletu!', en: 'Night watch on patrol!' },
        { cs: 'Húúkám ti do kroku!', en: 'Hoo-ting you a running beat!' },
      ],
    },
    // vtipné hlášky, které zvířátko zahlásí při otevření skrytého
    // vývojářského menu (řekne je právě vybraná postava)
    devMenu: [
      { cs: 'Pssst! Tajná dvířka pro vývojáře. Nikomu ani muk!', en: 'Psst! A secret developer door. Not a word to anyone!' },
      { cs: 'Tak jsme se prokousali až do zákulisí. Klasika.', en: 'Well, we nibbled our way backstage. Classic.' },
      { cs: 'God Mode? Teď mě nechytí ani na svačinu!', en: 'God Mode? Now nobody catches me, not even for a snack!' },
      { cs: 'Neomezeně mincí?! Kupuju celému azylu mrkve!', en: 'Unlimited coins?! I’m buying the whole sanctuary carrots!' },
      { cs: 'Vývojářské menu odemčeno. Teď jsem tu šéfem já.', en: 'Developer menu unlocked. I’m the boss around here now.' },
      { cs: 'Cheaty? Já tomu říkám „kreativní běhání“.', en: 'Cheats? I call it “creative running”.' },
      { cs: 'Zmáčkls tajnou kombinaci. Čekal jsem tě.', en: 'You hit the secret combo. I’ve been expecting you.' },
      { cs: 'Konečně někdo s klíčem od zákulisí! Pojď dál.', en: 'Finally, someone with the backstage key! Come on in.' },
    ],
  };

  /* ---------- OBCHOD / EKONOMIKA ---------- */
  const ECONOMY = {
    coinValue: 1,
    carrotEnergy: 7,
    goldenCarrotEnergy: 26,
    hitPenalty: 18,
    hitRampDist: 5000,    // každých X metrů začnou nárazy bolet víc…
    hitRampStep: 0.05,    // …o tolik (5 %) za každý dokončený úsek
    startEnergy: 100,
    drainPerSecond: 1.8,  // základ, násobí se statistikou postavy, rychlostí a vzdáleností
    drainRampDist: 3400,  // po kolika metrech se odčerpávání zdvojnásobí
    cloverDuration: 12,   // jak dlouho po sebrání čtyřlístku platí bonus (s)
    cloverCoinValue: 2,   // hodnota mince, dokud bonus běží
    concertCoins: 25,     // mince za vyprodaný Zvířecí koncert (každých 2,5 km)
  };

  /* ---------- KARLOVA ŠKOLA BĚHU ----------
     Příběhový tutoriál prvního běhu. U každé lekce se svět ÚPLNĚ
     zastaví (žádné zpomalení, žádný časový limit) – hráč si text
     v klidu přečte a dál se jede až po kliknutí na tlačítko
     Pokračovat. gate jen říká, jaká akce novinku zdolá (nápověda
     ovládání pod bublinou); lekce bez akce mají gate: null.
     Skript jede v normálním režimu 'run', jen místo náhodných
     spawnů vkládá objekty popořadě. */
  const TUTORIAL = {
    easeIn: 5,         // rychlost náběhu zastavení (1/s, reálný čas)
    easeOut: 9,        // rychlost návratu do běhu
    triggerX: 0.62,    // zastaví se, když novinka dojede na 62 % šířky obrazovky
    steps: [
      {
        id: 'welcome', gapM: 6, gate: null,
        text: {
          cs: 'Vítej na mojí louce, nováčku! Já jsem Karel. Pravidlo číslo jedna: všechno tu řídím já. Pravidlo číslo dvě: běžíš ty.',
          en: 'Welcome to my meadow, rookie! I’m Karel. Rule number one: I run this place. Rule number two: you do the running.',
        },
      },
      {
        id: 'carrots', gapM: 30, gate: null,
        spawn: { pickups: [{ kind: 'carrot', dx: 0, h: 26 }, { kind: 'carrot', dx: 46, h: 26 }, { kind: 'carrot', dx: 92, h: 26 }] },
        text: {
          cs: 'Mrkev! To je palivo. Bez mrkve doběhneš tak maximálně k plotu. Prostě do ní vběhni, zvládne to i husa.',
          en: 'Carrots! That’s fuel. Without carrots you’ll make it to the fence, tops. Just run into them — even a goose can do it.',
        },
      },
      {
        id: 'hud', gapM: 18, gate: null, hud: true,
        text: {
          cs: 'Koukni nahoru: ten oranžový proužek je ukazatel mrkvové energie. Běháním ubývá, mrkvemi se doplňuje. Když dojde, lehneš si do trávy a šlus. Vedle měřím metry a počítám mince — já jsem tam nahoře prostě celý úřad.',
          en: 'Look up: that orange bar is your carrot energy meter. Running drains it, carrots refill it. When it hits empty, you flop into the grass and that’s that. Next to it I measure meters and count coins — basically I’m the whole office up there.',
        },
      },
      {
        id: 'chicken', gapM: 45, gate: 'jump',
        spawn: { obstacle: 'chicken' },
        text: {
          cs: 'Bacha, Pepina! Jsme kámoši, ale nemá ráda, když jí někdo běhá peřím. Skoč — a pozdrav ji shora!',
          en: 'Heads up, that’s Pepina! We’re pals, but she hates anyone jogging through her feathers. Jump — and say hi from above!',
        },
      },
      {
        id: 'branch', gapM: 50, gate: 'duck',
        spawn: { obstacle: 'branch' },
        text: {
          cs: 'Větev! O tu jsem si loni… to je fuk. Skrč se, hlavu dolů — i já to zvládnu, a to mám uši jako plachty.',
          en: 'A branch! Last year I… never mind. Duck, head down — even I can do it, and my ears are the size of sails.',
        },
      },
      {
        id: 'flyers', gapM: 35, gate: null,
        spawn: { flyers: ['stork', 'swallow'] },
        text: {
          cs: 'Koukni nahoru — vlaštovky a čápi! Moji kámoši. Ničeho se neboj: neklovou, nepřekáží, jen machrujou, že umí lítat. Já zase umím hýkat. Remíza.',
          en: 'Look up — swallows and storks! My buddies. Don’t worry: no pecking, no blocking, they just show off that they can fly. Well, I can bray. So we’re even.',
        },
      },
      {
        id: 'golden', gapM: 50, gate: 'jump',
        spawn: { pickups: [{ kind: 'golden', dx: 0, h: 180 }] },
        text: {
          cs: 'ZLATÁ MRKEV! Legenda. Visí vysoko — skoč a ve vzduchu ťukni ještě jednou. Když ji mineš, budu se smát. Nahlas.',
          en: 'GOLDEN CARROT! The legend. It hangs high — jump, then tap again mid-air. Miss it and I will laugh. Loudly.',
        },
        // slíbený smích, když hráč legendu mine – Karel sliby plní
        miss: {
          cs: 'PFF… HAHAHÁÁÁ! Promiň. Vlastně nepromiň — slíbil jsem smích a já sliby plním. Legenda letí dál, nováčku!',
          en: 'PFF… HAHAHAAA! Sorry. Actually not sorry — I promised a laugh and I keep my promises. The legend flies on, rookie!',
        },
      },
      {
        id: 'clover', gapM: 45, gate: null,
        spawn: { pickups: [{ kind: 'clover', dx: 0, h: 110 }] },
        text: {
          cs: 'Čtyřlístek! Chvíli po něm platí mince dvojnásob. Já bych ho snědl. Ty ho radši seber, ať z tebe něco mám.',
          en: 'A four-leaf clover! For a while, coins count double. I’d just eat it. You’d better grab it — make yourself useful.',
        },
      },
      {
        id: 'coins', gapM: 40, gate: null,
        spawn: { pickups: [{ kind: 'coin', dx: 0, h: 28 }, { kind: 'coin', dx: 40, h: 28 }, { kind: 'coin', dx: 80, h: 28 }, { kind: 'coin', dx: 120, h: 28 }] },
        text: {
          cs: 'Mince! Za ně si v obchodě pořídíš moje kamarády. Mě už máš zadarmo — gratuluju, lepší už to nebude.',
          en: 'Coins! They buy you my friends in the shop. Me you got for free — congrats, it’s all downhill from here.',
        },
      },
      {
        id: 'humans', gapM: 35, gate: null,
        spawn: { humans: true },
        text: {
          cs: 'A tamhle vzadu — naši lidi! Tomáš pořád něco staví a na hlavě mu bydlí slepice. Tony rozumí zvířatům i technice — zrovna programuje beranům chytrý ohradník. A Maruška zpívá bylinkám i miminku v bříšku. Zamávej jim — kdo mává, dostává mrkev.',
          en: 'And back there — our humans! Tomáš is always building something, with a hen living on his head. Tony speaks both animal and tech — right now he’s coding a smart fence for the rams. And Maruška sings to the herbs and to the baby in her belly. Wave at them — wavers get carrots.',
        },
      },
      {
        id: 'outro', gapM: 25, gate: null,
        text: {
          cs: 'Škola běhu skončila, jednička s hvězdičkou. Teď běž, skákej a nenaraž do husy… vlastně naraz, chci vidět, co ti řekne!',
          en: 'Running school is over — straight A’s. Now go, jump, and don’t crash into a goose… actually do, I want to hear what she says!',
        },
      },
    ],
  };

  /* ---------- DEMO / testovací verze ----------
     Když stránka před načtením skriptů nastaví window.LOUKA_DEMO = true
     (viz demo/index.html), nabídne hra jen prvních pár zvířátek – pro
     rozeslání testerům. Bez toho flagu je plná verze úplně beze změny. */
  const DEMO = (typeof window !== 'undefined') && window.LOUKA_DEMO === true;
  const DEMO_ANIMALS = (typeof window !== 'undefined' && +window.LOUKA_DEMO_ANIMALS) || 3;
  const CHARS = DEMO ? CHARACTERS.slice(0, DEMO_ANIMALS) : CHARACTERS;

  return { CHARACTERS: CHARS, DEMO, ENVS, OBSTACLES, BIRD_VARIANTS, HUMANS, SIGNS, EVENTS, ECONOMY, TUTORIAL };
})();
