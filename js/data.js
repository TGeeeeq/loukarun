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
        cs: 'Perk: PRUŽINKA – skáče výš a dvojskok má delší.',
        en: 'Perk: SPRING LEGS – jumps higher and gets a longer double jump.',
      },
      stats: { speed: 1.0, jump: 1.18, drain: 1.0 },
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
        cs: 'Perk: SPRINTERKA – běhá rychleji a mrkve jí dají víc energie.',
        en: 'Perk: SPRINTER – runs faster and carrots give her more energy.',
      },
      stats: { speed: 1.08, jump: 1.0, drain: 1.0, carrotBonus: 1.3 },
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
      stats: { speed: 0.96, jump: 0.95, drain: 0.95, magnet: 140 },
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
        cs: 'Perk: BERANIDLO – 3× za běh prorazí překážku bez ztráty energie.',
        en: 'Perk: BATTERING RAM – smashes through 3 obstacles per run without losing energy.',
      },
      stats: { speed: 1.04, jump: 1.05, drain: 1.0, ram: 3 },
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
      props: ['sunflower', 'flower', 'beehive', 'signpost', 'butterflyZone', 'catnap', 'frogpond'],
      particles: 'petals',
    },
    {
      id: 'sad', name: { cs: 'Ovocný sad', en: 'Orchard' },
      skyTop: '#9fd9f2', skyBottom: '#f4e9d0',
      hillFar: '#b5d49a', hillNear: '#8cbf72',
      ground: '#6aab52', groundDark: '#589644', path: '#cdb489',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['appletree', 'ladder', 'basket', 'scarecrow', 'snail'],
      particles: 'leaves',
    },
    {
      id: 'les', name: { cs: 'Pohádkový les', en: 'Fairy-tale Forest' },
      skyTop: '#7cc4b8', skyBottom: '#d9ecc8',
      hillFar: '#5d9c72', hillNear: '#417d56',
      ground: '#3f7a4a', groundDark: '#356a3f', path: '#a8926b',
      sun: '#f5f0c0', clouds: '#eef7ee',
      props: ['tree', 'mushroom', 'gnome', 'stump', 'owlbox', 'frogpond', 'snail'],
      particles: 'fireflies',
    },
    {
      id: 'vesnice', name: { cs: 'Veselá vesnice', en: 'Merry Village' },
      skyTop: '#93c9ef', skyBottom: '#f7e8cf',
      hillFar: '#c2b7a0', hillNear: '#a8c684',
      ground: '#79a85e', groundDark: '#679250', path: '#d3bd93',
      sun: '#fff3b0', clouds: '#ffffff',
      props: ['cottage', 'fencebg', 'tractor', 'laundry', 'dovecote', 'catnap'],
      particles: 'none',
    },
    {
      id: 'zapad', name: { cs: 'Zlatá hodinka', en: 'Golden Hour' },
      skyTop: '#f7a26b', skyBottom: '#ffd9a0',
      hillFar: '#c77b5a', hillNear: '#9c5f46',
      ground: '#8a6a45', groundDark: '#79593a', path: '#c9a06b',
      sun: '#ffce7a', clouds: '#ffd9b8',
      props: ['haystack', 'sunflower', 'signpost', 'windmill', 'catnap'],
      particles: 'petals',
    },
    {
      id: 'noc', name: { cs: 'Hvězdná noc', en: 'Starry Night' },
      skyTop: '#1d2b53', skyBottom: '#4a5a8a',
      hillFar: '#2e3c63', hillNear: '#26334f',
      ground: '#2c4038', groundDark: '#24352e', path: '#5a5f6e',
      sun: '#f5f2d0', clouds: '#39466b',
      props: ['tree', 'tent', 'campfire', 'owlbox', 'frogpond'],
      particles: 'stars',
      night: true,
    },
  ];

  /* ---------- PŘEKÁŽKY ----------
     minM = od kolikátého metru se překážka objevuje. Odemykání je
     sladěné s přechody prostředí (~550 m), takže každý nový „level“
     přinese něco nového a začátek zůstane přívětivý. */
  const OBSTACLES = [
    { id: 'hay',      w: 62,  h: 52,  type: 'jump',  minM: 0,    label: { cs: 'balík sena', en: 'hay bale' } },
    { id: 'fence',    w: 56,  h: 58,  type: 'jump',  minM: 250,  label: { cs: 'plůtek', en: 'fence' } },
    { id: 'mud',      w: 92,  h: 18,  type: 'jump',  minM: 0,    label: { cs: 'kaluž bláta', en: 'mud puddle' }, soft: true },
    { id: 'rock',     w: 50,  h: 44,  type: 'jump',  minM: 550,  label: { cs: 'šutr', en: 'rock' } },
    { id: 'branch',   w: 120, h: 30,  type: 'duck',  minM: 550,  label: { cs: 'větev', en: 'branch' }, flying: true, clearance: 62 },
    { id: 'chicken',  w: 40,  h: 40,  type: 'jump',  minM: 250,  label: { cs: 'slepice', en: 'chicken' }, moving: true },
    { id: 'goose',    w: 56,  h: 58,  type: 'jump',  minM: 1100, label: { cs: 'husa', en: 'goose' }, moving: true },
    { id: 'barrow',   w: 66,  h: 48,  type: 'jump',  minM: 1100, label: { cs: 'trakař', en: 'wheelbarrow' } },
    { id: 'beeline',  w: 110, h: 26,  type: 'duck',  minM: 1650, label: { cs: 'včelí letka', en: 'bee squadron' }, flying: true, clearance: 66 },
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
      { cs: 'Neruš, stavíme!', en: 'Don’t disturb us, we’re building!' },
      { cs: 'Ta slepice je můj stavební dozor.', en: 'That hen is my building inspector.' },
      { cs: 'Ještě prkno a je z toho palác!', en: 'One more plank and it’s a palace!' },
      { cs: 'Změřeno dvakrát, uříznuto třikrát…', en: 'Measured twice, cut three times…' },
      { cs: 'Hnízdo na hlavě? Aspoň mám vejce čerstvá!', en: 'A nest on my head? At least the eggs are fresh!' },
      { cs: 'Kdo maká, ten se nenudí!', en: 'Busy hands are never bored!' },
      { cs: 'Běžíš skvěle! Postavím ti tribunu!', en: 'You’re running great! I’ll build you a grandstand!' },
      { cs: 'Tenhle plot přežije i berana. Snad.', en: 'This fence will survive even the ram. Hopefully.' },
      { cs: 'Pila zpívá líp než já!', en: 'The saw sings better than I do!' },
      { cs: 'Hřebíky mi hlídá slepice. Spolehlivě.', en: 'The hen guards my nails. Reliably.' },
      { cs: 'Z tebe by byl skvělej tesař!', en: 'You’d make a great carpenter!' },
    ],
    tony: [
      { cs: 'Beran podrbán, appka nasazena.', en: 'Ram scratched, app deployed.' },
      { cs: 'Mám 5G i v kurníku!', en: 'I’ve got 5G even in the henhouse!' },
      { cs: 'AI tvrdí, že jsi nejrychlejší v okolí!', en: 'The AI says you’re the fastest around!' },
      { cs: 'Beránek právě dostal svůj první token.', en: 'The ram just got his first token.' },
      { cs: 'Ovce spočítány. Digitálně!', en: 'Sheep counted. Digitally!' },
      { cs: 'Nabíjím telefon i berana.', en: 'Charging my phone and the ram.' },
      { cs: 'Tvůj běh právě trenduje!', en: 'Your run is trending right now!' },
      { cs: 'Streamuju tě naživo! Zamávej!', en: 'I’m streaming you live! Wave!' },
      { cs: 'Beran chce selfie. Zase.', en: 'The ram wants a selfie. Again.' },
      { cs: 'Podle mé appky máš skvělé tempo!', en: 'According to my app, your pace is great!' },
      { cs: 'Kýbl granulí – na to slyší úplně každý.', en: 'A bucket of feed – works on absolutely everyone.' },
    ],
    maruska: [
      { cs: 'Běž, běž! Zpívám ti do kroku! ♪', en: 'Run, run! I’m singing to your stride! ♪' },
      { cs: 'Miminko fandí kopáním!', en: 'The baby cheers by kicking!' },
      { cs: 'Meduňka na klid, mrkev na běh!', en: 'Lemon balm for calm, carrots for running!' },
      { cs: 'Namaluju tě, až doběhneš!', en: 'I’ll paint you when you finish!' },
      { cs: 'My s bříškem fandíme oba!', en: 'The belly and I are both cheering!' },
      { cs: 'Avalo, nech trávu i ostatním!', en: 'Avala, leave some grass for the others!' },
      { cs: 'Tenhle obraz se bude jmenovat „Vítr v uších“!', en: 'This painting will be called “Wind in the Ears”!' },
      { cs: 'Bylinky rostou rychle, ale ty jsi rychlejší!', en: 'Herbs grow fast, but you’re faster!' },
      { cs: 'Zpívám ti fanfáru! Tádadá! ♪', en: 'I’m singing you a fanfare! Ta-da-dah! ♪' },
      { cs: 'Miminku vyprávím, jak běháš. Kope radostí!', en: 'I’m telling the baby how you run. It kicks with joy!' },
      { cs: 'Heřmánek voní a ty přímo letíš!', en: 'The chamomile smells lovely and you’re simply flying!' },
    ],
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
    chicken: [ // co zakřičí slepice, když do ní zvířátko vrazí
      { cs: 'Kokodák!!', en: 'Bawk-bawk!!' },
      { cs: 'Ko-ko-KATASTROFA!', en: 'Cluck-cluck-CATASTROPHE!' },
      { cs: 'Moje vajíčko!!', en: 'My egg!!' },
      { cs: 'To řeknu kohoutovi!', en: 'I’m telling the rooster!' },
      { cs: 'Slepičí poplach!!', en: 'Chicken alarm!!' },
      { cs: 'Kdák! Koukej, kudy běžíš!', en: 'Cluck! Watch where you’re running!' },
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
  };

  /* ---------- OBCHOD / EKONOMIKA ---------- */
  const ECONOMY = {
    coinValue: 1,
    carrotEnergy: 7,
    goldenCarrotEnergy: 26,
    hitPenalty: 18,
    startEnergy: 100,
    drainPerSecond: 1.8,  // základ, násobí se statistikou postavy, rychlostí a vzdáleností
    drainRampDist: 3400,  // po kolika metrech se odčerpávání zdvojnásobí
    cloverDuration: 12,   // jak dlouho po sebrání čtyřlístku platí bonus (s)
    cloverCoinValue: 2,   // hodnota mince, dokud bonus běží
  };

  /* ---------- KARLOVA ŠKOLA BĚHU ----------
     Příběhový tutoriál prvního běhu. Karel novinky komentuje ve
     zpomaleném čase; hra se rozjede hráčovou akcí (gate) nebo po
     pojistce readTime. Skript jede v normálním režimu 'run', jen
     místo náhodných spawnů vkládá objekty popořadě. */
  const TUTORIAL = {
    slowScale: 0.08,   // časová lupa při novince
    easeIn: 5,         // rychlost náběhu zpomalení (1/s, reálný čas)
    easeOut: 9,        // rychlost návratu do běhu
    readTime: 6.5,     // pojistka – po tolika reálných s se čas rozjede sám
    triggerX: 0.62,    // zpomalí se, když novinka dojede na 62 % šířky obrazovky
    steps: [
      {
        id: 'welcome', gapM: 6, gate: 'tap',
        text: {
          cs: 'Vítej na mojí louce, nováčku! Já jsem Karel. Pravidlo číslo jedna: všechno tu řídím já. Pravidlo číslo dvě: běžíš ty.',
          en: 'Welcome to my meadow, rookie! I’m Karel. Rule number one: I run this place. Rule number two: you do the running.',
        },
      },
      {
        id: 'carrots', gapM: 30, gate: 'tap',
        spawn: { pickups: [{ kind: 'carrot', dx: 0, h: 26 }, { kind: 'carrot', dx: 46, h: 26 }, { kind: 'carrot', dx: 92, h: 26 }] },
        text: {
          cs: 'Mrkev! To je palivo. Bez mrkve doběhneš tak maximálně k plotu. Prostě do ní vběhni, zvládne to i husa.',
          en: 'Carrots! That’s fuel. Without carrots you’ll make it to the fence, tops. Just run into them — even a goose can do it.',
        },
      },
      {
        id: 'hud', gapM: 18, gate: 'tap', hud: true,
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
        id: 'golden', gapM: 50, gate: 'jump',
        spawn: { pickups: [{ kind: 'golden', dx: 0, h: 130 }] },
        text: {
          cs: 'ZLATÁ MRKEV! Legenda. Visí vysoko — skoč a ve vzduchu ťukni ještě jednou. Když ji mineš, budu se smát. Nahlas.',
          en: 'GOLDEN CARROT! The legend. It hangs high — jump, then tap again mid-air. Miss it and I will laugh. Loudly.',
        },
      },
      {
        id: 'clover', gapM: 45, gate: 'tap',
        spawn: { pickups: [{ kind: 'clover', dx: 0, h: 110 }] },
        text: {
          cs: 'Čtyřlístek! Chvíli po něm platí mince dvojnásob. Já bych ho snědl. Ty ho radši seber, ať z tebe něco mám.',
          en: 'A four-leaf clover! For a while, coins count double. I’d just eat it. You’d better grab it — make yourself useful.',
        },
      },
      {
        id: 'coins', gapM: 40, gate: 'tap',
        spawn: { pickups: [{ kind: 'coin', dx: 0, h: 28 }, { kind: 'coin', dx: 40, h: 28 }, { kind: 'coin', dx: 80, h: 28 }, { kind: 'coin', dx: 120, h: 28 }] },
        text: {
          cs: 'Mince! Za ně si v obchodě pořídíš moje kamarády. Mě už máš zadarmo — gratuluju, lepší už to nebude.',
          en: 'Coins! They buy you my friends in the shop. Me you got for free — congrats, it’s all downhill from here.',
        },
      },
      {
        id: 'outro', gapM: 25, gate: null, dur: 5.5,
        text: {
          cs: 'Škola běhu skončila, jednička s hvězdičkou. Teď běž, skákej a nenaraž do husy… vlastně naraz, chci vidět, co ti řekne!',
          en: 'Running school is over — straight A’s. Now go, jump, and don’t crash into a goose… actually do, I want to hear what she says!',
        },
      },
    ],
  };

  return { CHARACTERS, ENVS, OBSTACLES, BIRD_VARIANTS, HUMANS, SIGNS, EVENTS, ECONOMY, TUTORIAL };
})();
