/* =========================================================
   LOUKA RUN – KARLOVO UVÍTÁNÍ

   Interaktivní scéna, která se otevře po prvním doběhnutí intra:
   uprostřed louky se roztočí portál a vyjde z něj osel Karel.
   Řekne, co je Louka zač, pozve na akce, ukáže novinky a hlavně
   poprosí o sbírku na seno. Pak zůstane stát a nechá si sáhnout –
   reaguje na ťuknutí do uší, čumáku, břicha, ocasu i kopyt, dá se
   drbat přidržením prstu, nakrmit mrkví a má vlastní zásobu hlášek.

   PROČ VLASTNÍ PLÁTNO A NE HERNÍ SVĚT
   Scéna má svoje pozadí (zlatá hodinka nad loukou), takže herní
   plátno pod ní není vidět a hlavní smyčka si na tu dobu může
   odpočinout (js/game.js přeskakuje update i render, dokud je
   KAREL.isOpen()). Na 0,5 vCPU telefonu se to pozná.

   SOUŘADNICE
   Kreslí se v CSS pixelech plátna (přepočet na fyzické dělá jediné
   ctx.setTransform na začátku snímku). Karel se kreslí přes
   GFX.drawCharacter, takže vypadá úplně stejně jako ve hře; jeho
   „místní" souřadnice (hlava na 38,-63, uši nad ní, kopyta na +8)
   používá i zásah prstem a všechny rekvizity.
   ========================================================= */

const KAREL = (() => {
  'use strict';

  // postavy žijí uvnitř DATA (js/data.js) – ne jako samostatný globál
  const CHARACTERS = DATA.CHARACTERS;

  /* ---------- odkazy na web ----------
     Jediné místo, kde jsou adresy; kdyby se sbírka změnila, mění se tady. */
  const URL = {
    web: 'https://nechmerust.org',
    udalosti: 'https://nechmerust.org/udalosti',
    novinky: 'https://nechmerust.org/novinky',
    zapojit: 'https://nechmerust.org/jak-se-zapojit',
    adopce: 'https://nechmerust.org/virtualni-adopce',
    seno: 'https://www.darujme.cz/vyzva/1205543',
    instagram: 'https://www.instagram.com/nech_me_rust',
  };

  /* =========================================================
     CO KAREL ŘÍKÁ
     ========================================================= */

  /* ---------- úvodní řeč ----------
     Pět zastávek, mezi nimi se ťuká. Poslední je sbírka na seno –
     schválně až nakonec, aby zůstala v hlavě jako poslední věta. */
  const SPEECH = [
    {
      cs: 'Ahoj! Já jsem Karel. Osel. Ne jako nadávka, jako druh.\nA než se rozběhneš — musím ti něco říct.',
      en: 'Hi! I\'m Karel. A donkey. Not as an insult, as a species.\nAnd before you run off — I need to tell you something.',
    },
    {
      cs: 'Díky. Fakt díky. Že tuhle hru hraješ, že o nás víš, že jsi tady.\nJe nás na Louce třiadevadesát a skoro nikdo z nás to jinde neměl lehký. Počítal jsem nás. Dvakrát. Podruhé to vyšlo stejně, což mě překvapilo.',
      en: 'Thank you. Really. For playing this game, for knowing about us, for being here.\nThere are ninety-three of us at the Meadow and hardly any of us had it easy before. I counted us. Twice. The second time it came out the same, which surprised me.',
    },
    {
      cs: 'Tohle není jenom hra. Louka je opravdové místo, kde se opravdu žere opravdové seno.\nMrkni na náš web — jsou tam fotky, na kterých vypadám mimořádně dobře.',
      en: 'This isn\'t just a game. The Meadow is a real place where real hay really gets eaten.\nHave a look at our website — there are photos where I look exceptionally good.',
      link: { href: URL.web, cs: '🌿 nechmerust.org', en: '🌿 nechmerust.org' },
    },
    {
      cs: 'A přijeď za námi! V srpnu a v září je Loukáda — víkend, kdy se společně pracuje, večer se sedí u ohně a spí se pod nebem.\n11.–13. září je festival Spolu Mezi Lesy a 26. září procházka se zvířaty. Půjdu vepředu. To je moje pozice.',
      en: 'And come visit! There\'s Loukáda in August and September — a weekend of working together, evenings by the fire and sleeping under the sky.\nSept 11–13 is the Spolu Mezi Lesy festival, and Sept 26 a walk with the animals. I\'ll be in front. That\'s my position.',
      link: { href: URL.udalosti, cs: '📅 Nadcházející akce', en: '📅 Upcoming events' },
    },
    {
      cs: 'Novinky z Louky? Přijely ovečky Malvína a Rozárka a pořád se všemu diví.\nKobylka Zorka nás opustila a chybí nám každý den. A tahle hra je i na Google Play — jsem oficiálně v obchodě. Máma by byla pyšná.',
      en: 'News from the Meadow? The lambs Malvína and Rozárka arrived and are still amazed by everything.\nZorka the mare left us and we miss her every day. And this game is on Google Play — I\'m officially in a store. Mum would be proud.',
      link: { href: URL.novinky, cs: '📰 Novinky z Louky', en: '📰 News from the Meadow' },
    },
    {
      cs: 'A teď to hlavní, kvůli čemu jsem sem lezl portálem:\nběží sbírka na seno a slámu na zimu. Ceny sena se zdvojnásobily a nás je pořád třiadevadesát. Cíl je sto tisíc.\nVím, prosit o seno není nic okouzlujícího. Ale zima je zima a seníky se samy neplní.',
      en: 'And now the main thing I climbed through a portal for:\nour hay and straw winter fundraiser is running. Hay prices have doubled and there are still ninety-three of us. The goal is 100,000 CZK.\nI know, begging for hay isn\'t glamorous. But winter is winter and haylofts don\'t fill themselves.',
      link: { href: URL.seno, cs: '🌾 Přispět na seno', en: '🌾 Donate for hay' },
      warm: true,
    },
    {
      cs: 'Tak. Poselství předáno, mise splněna, portál zavřený.\nTeď si dělej, co chceš. Můžeš mě pošťouchat, podrbat, nakrmit. Já to vydržím — jsem osel, my jsme na to stavění.',
      en: 'There. Message delivered, mission accomplished, portal closed.\nNow do whatever you like. Poke me, scratch me, feed me. I can take it — I\'m a donkey, we\'re built for this.',
    },
  ];

  /* ---------- hlášky podle toho, kam se ťukne ----------
     Každý koš se míchá zvlášť (viz Bag níž), takže se hláška
     nezopakuje dřív, než dojdou všechny ostatní ze stejného koše. */
  const QUIPS = {
    ears: [
      { cs: 'Uši mi nech! To jsou antény. Chytám s nima signál a taky drby z výběhu.', react: 'ears' },
      { cs: 'Hele, kdyby mě třídil ten kouzelnický klobouk, jdu do Mrzimoru. Jídelníček slušnej, nikdo se nehádá.', react: 'ears', prop: 'hat' },
      { cs: 'Slyším přes tyhle uši, jak si v kuchyni loupou mrkev. Přes dva výběhy. To není chlubení, to je diagnóza.', react: 'ears' },
      { cs: 'Vrtule zapnuta. Za chvíli vzlétnu. …Tak nevzlétnu. Ale bylo to blízko.', react: 'ears' },
      { cs: 'Kdybych měl uši o kousek delší, chytám i rádio. Zatím jenom hlad.', react: 'ears' },
    ],
    nose: [
      { cs: 'Prsty pryč od čumáku! Leda bys v nich měl mrkev. Máš v nich mrkev? Nemáš. Já to poznám.', react: 'no' },
      { cs: 'Hepčí! …promiň. Máš na sobě něco od sena? Já mám na seno nos. Doslova.', react: 'sneeze' },
      { cs: 'Očuchávám tě. Je to náš oslí pozdrav. Ten tvůj s rukou je taky divnej, jenom jsi na něj zvyklý.', react: 'nod' },
      { cs: 'Voníš jako někdo, kdo doma zapomněl mrkev. Nesuď mě, dělám co můžu.', react: 'sneeze' },
    ],
    body: [
      { cs: 'Ó. Jo. Přesně tam. Ne, o kousek výš. Jo. Tam.', react: 'pet' },
      { cs: 'Tohle je moje oblíbené místo. Hned po seníku. A po kuchyni. A po tom stínu u vrby.', react: 'laugh' },
      { cs: 'Šesté GTA vyšlo dřív, než se tady někdo dovtípil, že se mám drbat každý den.', react: 'laugh' },
      { cs: 'Sem mě drbal jeden pán půl hodiny. Pak musel domů. Dodneška na něj myslím.', react: 'pet' },
      { cs: 'Ještě chviličku… nikam nespěchám. Zima je daleko. …Není. Ale drb dál.', react: 'pet' },
    ],
    tail: [
      { cs: 'Za ocas se netahá! To je jediné pravidlo. Zbytek si tady vymýšlíme za pochodu.', react: 'no' },
      { cs: 'Ocasem odháním mouchy. A občas si jím mávnu jenom tak, protože můžu.', react: 'shake' },
      { cs: 'Jsem otočený? Ne, ty jsi otočený. Tohle je můj web a moje pravidla. …Teda ne můj web. Naše. Nech mě růst.', react: 'spin' },
    ],
    hooves: [
      { cs: 'Kopyta v pořádku, děkuji za optání. Když jsem sem přišel, byla katastrofa. Čtyři měsíce a spousta trpělivosti.', react: 'nod' },
      { cs: 'Dupu. Neznamená to nic, jenom mě to baví. Nedělej si z toho hlavu.', react: 'hop' },
      { cs: 'Tyhle nohy mě odnesly hodně daleko. Nejdál ale došly, když se rozhodly zastavit se u správných lidí.', react: 'nod' },
    ],
    generic: [
      { cs: 'Ten portál? Nic zvláštního. Původně jsem mířil na nástupiště devět a tři čtvrtě, ale s kopyty se blbě trefuje do zdi.', react: 'bray', prop: 'hat' },
      { cs: 'Karle, po tvé levici! …promiň, vždycky jsem to chtěl slyšet. Tak jsem si to řekl sám.', react: 'hop' },
      { cs: 'Osli, shromážděte se! …ono nás oslů zas tolik není. Ale sešli jsme se, a to se počítá.', react: 'bray' },
      { cs: 'Na GTA 6 jsem čekal tak dlouho, že jsem mezitím zestárnul o dva oslí roky. To je jako psí roky, jenom tvrdohlavější.', react: 'laugh' },
      { cs: 'Modrá mrkev, nebo červená mrkev? Vyber si. Obě jsou mrkev, nikam tě to nedostane, ale zachutná.', react: 'nod' },
      { cs: 'Neprojdeš! …dobře, projdeš. Ale nejdřív mě podrbej za uchem, to je mýtné.', react: 'no' },
      { cs: 'Koření musí proudit. U nás proudí seno. Není to tak epické, ale sype se to líp.', react: 'laugh' },
      { cs: 'Kdybych byl film, mám tři a půl hodiny a jednu scénu, kde jenom stojím a koukám do dálky. Ta by byla nejlepší.', react: 'nod' },
      { cs: 'Naučil jsem se otevírat závoru. Neutíkám. Jenom chci, aby bylo jasné, kdo tu závoru ovládá.', react: 'laugh' },
      { cs: 'Když má někdo z party špatný den, jdu si k němu stoupnout a mlčím. Funguje to líp než rady. Zkus to někdy.', react: 'pet' },
      { cs: 'Nikdo mě nikam nedotlačí. Když se zastavím, mám důvod. A většinou se ukáže, že jsem měl pravdu já.', react: 'no' },
      { cs: 'Nejradši mám deštivá rána. Stojím pod přístřeškem, koukám do deště a vypadám jako filozof, kterému nikdo neplatí.', react: 'nod' },
      { cs: 'Tvrdohlavý? Já ne. Já mám jenom velmi pevné názory na to, kudy se půjde.', react: 'shake' },
      { cs: 'Občas se otřepu jenom proto, že to dobře vypadá. Nebudu to popírat.', react: 'shake' },
      { cs: 'Víš, co je na azylu nejlepší? Že tady nikdo nikoho nepotřebuje k ničemu. Jsme tu prostě proto, že jsme.', react: 'nod' },
      { cs: 'Zima se blíží. To je citát z něčeho, viď? U nás to není citát, u nás je to rozpočet na seno.', react: 'nod', link: 'seno' },
      { cs: 'Můžeš si nás i adoptovat. Virtuálně. Zůstanu tady, ale budu tvůj. Je to výhodné pro obě strany.', react: 'hop', link: 'adopce' },
      { cs: 'Sledujeme se na Instagramu? Nefotím se sám, nemám palce. Ale vycházím na tom dobře.', react: 'laugh', link: 'instagram' },
      { cs: 'Až se ti hra omrzí, přijeď naživo. Jsem větší, než vypadám, a hlasitější, než čekáš.', react: 'bray', link: 'udalosti' },
      { cs: 'Jestli to čteš celé, jsi lepší člověk než průměr. Nemám na to data, ale mám na to pocit.', react: 'nod' },
    ],
    /* stupňování – po kolikátém pošťouchnutí co */
    pokes: {
      6: { cs: 'Ty seš vytrvalý. To respektuju, sám jsem takový.', react: 'laugh' },
      12: { cs: 'Dobře. Když teda takhle, tak si zavolám posily.', react: 'bray', special: 'assemble' },
      20: { cs: 'Fajn, jdu do toho naplno. Fešák mód zapnut.', react: 'dance', prop: 'shades' },
      30: { cs: 'Ty vážně pořád ještě klikáš. Já vážně pořád ještě nemám seno na zimu. Jeden z nás je vytrvalejší.', react: 'nod', link: 'seno' },
      45: { cs: 'Uznávám, vyhrál jsi. Nikdo nikdy neklikal tak dlouho. Jsi šampion mezi klikači a já to nikde nezveřejním.', react: 'dance' },
      70: { cs: 'Hele. Jestli máš takhle času, tak ho můžeš věnovat i nám. Přijeď na Loukádu. Bude ti tam líp než tady.', react: 'nod', link: 'udalosti' },
    },
    carrot: [
      { cs: 'Mňam. Mrkev. Konečně někdo, kdo rozumí základům.', react: 'munch' },
      { cs: 'Tahle byla vynikající. Předešlá taky. Všechny jsou. Nejsem náročný, jsem důsledný.', react: 'munch' },
      { cs: 'Ještě jednu a začnu ti věřit úplně všechno, co řekneš.', react: 'munch' },
      { cs: 'Víš, že jich sním denně víc, než by měl slušný osel přiznat? Tak to nikomu neříkej.', react: 'munch' },
      { cs: 'Mrkev ve hře je dobrá. Mrkev na Louce je lepší. Přijeď to ověřit.', react: 'munch', link: 'udalosti' },
      { cs: 'Za tuhle bych ti dal odznak, kdybych měl palce a tiskárnu.', react: 'munch' },
    ],
    petting: [
      { cs: 'Ó ano. Tohle je ono. Tady zůstaň.', react: 'pet' },
      { cs: 'Kdybych uměl příst, tak předu. Zkusím to zahýkat, ale vyzní to jinak.', react: 'pet' },
      { cs: 'Trvalo mi čtyři měsíce, než jsem pochopil, že natažená ruka může znamenat i tohle. Stálo to za to.', react: 'pet' },
      { cs: 'Ještě. Prosím. Nebudu se stydět.', react: 'pet' },
    ],
    leave: [
      { cs: 'Tak zatím! A kdyby něco — seník je pořád poloprázdný a já se pořád ptám. 🌾', react: 'nod' },
      { cs: 'Měj se. A běž rychle, ať mi děláš radost.', react: 'hop' },
      { cs: 'Portál mě odsud odveze. Nebo prostě odejdu. Uvidíme, jak se to vyvine.', react: 'nod' },
    ],
    /* PŘIVÍTÁNÍ NA POTKÁNÍ – když už se známe (viz `hello()` níž).
       Kdo si zapne „ukazuj se pokaždé“, nemá chuť slyšet při každém spuštění
       tu samou sedmidílnou řeč o azylu, o akcích a o sbírce na seno. Ta má
       smysl JEDNOU. Pak stačí jedna věta, která rychle řekne, že všechno je
       na svém místě a může se začít dovádět. Odkazy na Louku i tlačítko na
       seno zůstávají v liště pod bublinou natrvalo, takže se nic neztratí.
       {coins}, {best} a {name} doplní stav hráče (viz hooks.getStats). */
    hello: [
      { cs: 'Íáá, jsi tu! Servis nezměněn: nakrmit, podrbat, poklábosit. Do toho.', react: 'hop' },
      { cs: 'Nemusím ti nic vysvětlovat, viď. Mrkev máš pod sebou, odkazy na Louku taky.', react: 'nod' },
      { cs: 'Ty už to tu znáš lépe než já. A já tu žiju.', react: 'laugh' },
      { cs: 'Vidíš? Přišel jsem. Nikdo mi nemusel nic říkat. Jsem spolehlivý.', react: 'nod' },
      { cs: 'Máš {coins} mincí. V obchodě jsou k mání i klobouky, jen tak mimochodem. 👒', react: 'nod' },
      { cs: 'Tvůj rekord je {best} m. Já bych to nedal, ale já jsem osel.', react: 'laugh' },
      // jméno se do hlášky dosazuje v prvním pádě, takže věta musí být
      // postavená tak, aby ho nemusela skloňovat („s Osel Karel“ nejde)
      { cs: 'Tvoje dnešní volba: {name}. Dobrá. Druhá nejlepší, ale dobrá.', react: 'ears' },
      { cs: 'Šťouchej, krm, drbej. Nebo si běž běhat. Já mám čas, seno taky nikam nejde.', react: 'nod' },
    ],
    /* Stupňování podle toho, po kolikáté se takhle vidíme – stejný princip
       jako `pokes`, jen počítadlo přežívá mezi spuštěními (save.karelHellos). */
    hello_at: {
      1: { cs: 'Fešák režim funguje. Jsem tady, jak jsem slíbil. Můžeš mě šťouchat i krmit, jako vždycky.', react: 'dance' },
      3: { cs: 'Tři setkání. To už je v oslích kruzích přátelství.', react: 'nod' },
      10: { cs: 'Desetkrát. Kdybych měl notýsek, měl bys tam svoje jméno a hvězdičku.', react: 'laugh' },
      25: { cs: 'Pětadvacet spuštění. Přijeď na Louku, ať se konečně poznáme i naostro.', react: 'nod', link: 'udalosti' },
      50: { cs: 'Padesát. Jestli tu jsi takhle často, uneseš i ranec sena, ne? 🌾', react: 'nod', link: 'seno' },
    },
  };

  /* anglická znění hlášek – držená stranou, ať se česká verze čte v kuse */
  const QUIPS_EN = {
    ears: [
      'Hands off the ears! Those are antennas. I pick up signal and paddock gossip with them.',
      'If that sorting hat ever got to me, I\'d go Hufflepuff. Decent menu, nobody argues.',
      'I can hear them peeling carrots in the kitchen through these. Two paddocks away. That\'s not bragging, that\'s a diagnosis.',
      'Rotors engaged. Lift-off imminent. …No lift-off. But it was close.',
      'If my ears were a touch longer I\'d get radio too. So far I only get hungry.',
    ],
    nose: [
      'Fingers off the muzzle! Unless there\'s a carrot in them. Is there a carrot? There isn\'t. I can tell.',
      'Achoo! …sorry. Do you have hay on you? I have a nose for hay. Literally.',
      'I\'m sniffing you. It\'s our donkey greeting. Yours with the hand is odd too, you\'re just used to it.',
      'You smell like someone who forgot the carrot at home. Don\'t judge me, I do my best.',
    ],
    body: [
      'Oh. Yes. Right there. No, a bit higher. Yes. There.',
      'This is my favourite spot. Right after the hayloft. And the kitchen. And that shade under the willow.',
      'GTA 6 came out before anyone here worked out I should be scratched daily.',
      'A man scratched me here for half an hour once. Then he had to go home. I still think about him.',
      'Just a little longer… I\'m in no rush. Winter is far away. …It isn\'t. But keep scratching.',
    ],
    tail: [
      'No tail pulling! That\'s the one rule. Everything else we make up as we go.',
      'The tail is for flies. And sometimes I swish it just because I can.',
      'Am I turned around? No, you\'re turned around. My website, my rules. …Not my website. Ours. Nech mě růst.',
    ],
    hooves: [
      'Hooves are fine, thanks for asking. When I arrived they were a disaster. Four months and a lot of patience.',
      'I\'m stomping. It means nothing, I just enjoy it. Don\'t read into it.',
      'These legs carried me a long way. The furthest they ever got was when they decided to stop at the right people.',
    ],
    generic: [
      'The portal? Nothing special. I was aiming for platform nine and three quarters, but hooves are bad at hitting walls.',
      'Karel, on your left! …sorry, always wanted to hear that. So I said it myself.',
      'Donkeys, assemble! …there aren\'t that many of us donkeys. But we assembled, and that counts.',
      'I waited for GTA 6 so long I aged two donkey years. That\'s like dog years, only more stubborn.',
      'Blue carrot or red carrot? Choose. Both are carrots, neither gets you anywhere, but they taste good.',
      'You shall not pass! …fine, you shall. But scratch behind my ear first, that\'s the toll.',
      'The spice must flow. Here the hay must flow. Less epic, easier to shovel.',
      'If I were a film I\'d be three and a half hours with one scene where I just stand and look into the distance. Best scene.',
      'I learned to open the latch. I\'m not escaping. I just want it clear who is in charge of that latch.',
      'When someone in the herd has a bad day I go stand beside them and say nothing. Works better than advice. Try it.',
      'Nobody pushes me anywhere. When I stop, I have a reason. And it usually turns out I was right.',
      'I love rainy mornings. I stand under the shelter watching the rain, looking like a philosopher nobody pays.',
      'Stubborn? Not me. I simply hold very firm views about which way we\'re going.',
      'Sometimes I shake myself off purely because it looks good. I won\'t deny it.',
      'You know the best thing about a sanctuary? Nobody here needs anybody for anything. We\'re just here because we are.',
      'Winter is coming. That\'s a quote from something, right? Here it isn\'t a quote, here it\'s the hay budget.',
      'You can adopt us. Virtually. I stay here, but I\'m yours. Good deal for both sides.',
      'Are we following each other on Instagram? I don\'t take the photos, no thumbs. But I come out well.',
      'When the game gets old, come see us for real. I\'m bigger than I look and louder than you expect.',
      'If you\'re reading all of this, you\'re better than average. No data on that, just a feeling.',
    ],
    pokes: {
      6: 'You\'re persistent. I respect that, I\'m the same.',
      12: 'Fine. If that\'s how it is, I\'m calling for backup.',
      20: 'Right, going all in. Handsome mode engaged.',
      30: 'You are genuinely still clicking. I am genuinely still short of winter hay. One of us is more persistent.',
      45: 'I concede, you win. Nobody has ever clicked this long. You are the champion of clicking and I will tell no one.',
      70: 'Look. If you have this much time, you could give some of it to us. Come to Loukáda. You\'ll have a better time there.',
    },
    carrot: [
      'Mmm. Carrot. Finally someone who understands the basics.',
      'That one was excellent. So was the last. They all are. I\'m not fussy, I\'m consistent.',
      'One more and I\'ll believe absolutely everything you say.',
      'Do you know I eat more of these daily than a decent donkey should admit? Don\'t tell anyone.',
      'Carrots in the game are good. Carrots at the Meadow are better. Come and verify.',
      'I\'d give you a badge for that one if I had thumbs and a printer.',
    ],
    petting: [
      'Oh yes. This is it. Stay right there.',
      'If I could purr I would. I\'ll try braying it, but it comes out differently.',
      'It took me four months to learn an outstretched hand can also mean this. Worth it.',
      'More. Please. I won\'t be shy about it.',
    ],
    leave: [
      'See you! And if anything — the hayloft is still half empty and I\'m still asking. 🌾',
      'Take care. And run fast, it makes me happy.',
      'The portal will take me back. Or I\'ll just walk. We\'ll see how it develops.',
    ],
    hello: [
      'Hee-haw, you\'re here! Service unchanged: feed me, scratch me, chat with me. Go on.',
      'I don\'t have to explain anything to you, do I. Carrot\'s below you, so are the Meadow links.',
      'You know this place better than I do. And I live here.',
      'See? I showed up. Nobody had to tell me. I am reliable.',
      'You have {coins} coins. The shop also sells hats, just saying. 👒',
      'Your record is {best} m. I couldn\'t do it, but then I\'m a donkey.',
      'Today\'s pick: {name}. Good. Second best, but good.',
      'Poke me, feed me, scratch me. Or go for a run. I have time, and so does the hay.',
    ],
    hello_at: {
      1: 'Handsome mode works. I\'m here, just as promised. You can poke and feed me, same as ever.',
      3: 'Three meetings. In donkey circles that counts as friendship.',
      10: 'Ten times. If I kept a notebook, your name would be in it with a little star.',
      25: 'Twenty-five launches. Come to the Meadow, so we finally meet for real.',
      50: 'Fifty. If you\'re around this often, you can carry a bale of hay, right? 🌾',
    },
  };

  /* ---------- koš na míchání ----------
     Hlášky se berou z promíchaného balíčku, ne náhodně: náhoda umí
     třikrát po sobě vytáhnout to samé a hráč si myslí, že jich je pět. */
  function Bag(n) {
    let order = [], i = 0;
    const reshuffle = () => {
      order = Array.from({ length: n }, (_, k) => k);
      for (let k = order.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      i = 0;
    };
    reshuffle();
    return () => {
      if (i >= order.length) reshuffle();
      return order[i++];
    };
  }
  const bags = {};
  function quip(group) {
    const list = QUIPS[group];
    if (!list || !list.length) return null;
    if (!bags[group]) bags[group] = Bag(list.length);
    const idx = bags[group]();
    const q = list[idx];
    const en = (QUIPS_EN[group] || [])[idx];
    return { text: { cs: q.cs, en: en || q.cs }, react: q.react, prop: q.prop, link: q.link, special: q.special };
  }

  /* =========================================================
     CO KAREL VÍ – kontextové hlášky
     =========================================================
     Náhodná hláška z pytlíku je vtipná jednou. Tohle je druhá vrstva:
     pravidla, která se dívají na skutečný stav hry (hooks.getStats) a
     mají PŘEDNOST před náhodou. Karel tak umí komentovat rekord, který
     hráč právě uběhl, mince, které mu chybí na Květu, ozdobu, kterou mu
     hráč nasadil, nebo to, že se týden neukázal.

     Jak to funguje:
       • pole je seřazené od nejzajímavějšího po nejobyčejnější,
       • `when(c)` rozhodne, jestli hláška teď dává smysl,
       • použité se pamatují po dobu jedné návštěvy (`usedCtx`), takže se
         Karel neopakuje, a když dojdou, spadne se zpátky na pytlík.

     Do textů se dosazují {závorky} přes fill(): {coins} {best} {name}
     {chars} {runs} {lastDist} {lack} {nextName} {achDone} {achTotal}
     {items} {itemsTotal} {days} {wornName}.

     Pravidlo pro psaní hlášek: Karel mluví za azyl, ne za hru. Chválí
     hráče, dělá si legraci sám ze sebe a nikdy nekomanduje. */
  const CTX = [
    { id: 'record', when: (c) => c.newBest && c.lastDist > 0,
      react: 'dance',
      cs: 'Počkej… {lastDist} metrů? To je novej rekord! Já bych do třetího kopce ani nedošel.',
      en: 'Hold on… {lastDist} metres? That is a new record! I would not make it past the third hill.' },
    { id: 'lastrun', when: (c) => c.lastDist >= 300 && !c.newBest,
      react: 'nod',
      cs: 'Viděl jsem tě běžet. {lastDist} metrů a ani jednou jsi nešlápl do kopřiv. Slušný.',
      en: 'I watched you run. {lastDist} metres and not once into the nettles. Respectable.' },
    { id: 'shortrun', when: (c) => c.lastDist > 0 && c.lastDist < 300,
      react: 'laugh',
      cs: 'Ten poslední běh byl krátkej i na mě, a to jsem osel. Dej si ještě jeden, počkám tu.',
      en: 'That last run was short even by donkey standards. Have another go, I will wait here.' },
    { id: 'almost', when: (c) => c.nextName && c.lack > 0 && c.lack <= 250,
      react: 'ears',
      cs: 'Do {nextName} ti chybí {lack} mincí. To je jeden slušnej běh. Nebo dva mizerný.',
      en: 'You are {lack} coins short of {nextName}. That is one decent run. Or two bad ones.' },
    { id: 'canbuy', when: (c) => c.nextName && c.lack <= 0 && c.chars < c.charsTotal,
      react: 'hop',
      cs: 'Máš {coins} mincí a {nextName} stojí míň. Neříkám nic. Jenom to říkám nahlas.',
      en: 'You have {coins} coins and {nextName} costs less. I am not saying anything. Just saying it out loud.' },
    { id: 'allchars', when: (c) => c.charsTotal > 1 && c.chars >= c.charsTotal,
      react: 'dance',
      cs: 'Máš nás všechny. Celou partu. To už není hra, to je adopce.',
      en: 'You have got all of us. The whole gang. That is not a game any more, that is adoption.' },
    { id: 'worn', when: (c) => !!c.wornName,
      react: 'spin',
      cs: 'Koukám, žes mi nasadil {wornName}. Chtěl jsem něco říct, ale radši se jdu podívat do kaluže.',
      en: 'I see you put {wornName} on me. I was going to say something, but I will go check a puddle first.' },
    { id: 'away', when: (c) => c.days >= 3,
      react: 'bray', warm: true,
      cs: 'Neviděli jsme se {days} dní. Nic ve zlým, ale seno se samo nesní. Teda… vlastně sní.',
      en: 'It has been {days} days. No hard feelings, but hay does not eat itself. Well… actually it does.' },
    { id: 'daily', when: (c) => c.dailyLeft > 0 && c.runs > 2,
      react: 'nod',
      cs: 'Dneska máš ještě {dailyLeft} rozdělaný mise. Nespěchám. Ale připomínám.',
      en: 'You still have {dailyLeft} missions open today. No rush. Just reminding.' },
    { id: 'dailydone', when: (c) => c.dailyTotal > 0 && c.dailyLeft === 0 && c.runs > 2,
      react: 'dance',
      cs: 'Všechny dnešní mise hotový. Kdybych uměl tleskat, tleskám.',
      en: 'All of today’s missions done. If I could clap, I would be clapping.' },
    { id: 'ach', when: (c) => c.achDone > 0 && c.achDone < c.achTotal,
      react: 'nod',
      cs: 'Odznaků máš {achDone} z {achTotal}. Ty zbylý nejsou schválně těžký. Jenom náhodou.',
      en: 'You have {achDone} of {achTotal} badges. The rest are not hard on purpose. Just by accident.' },
    { id: 'achall', when: (c) => c.achTotal > 0 && c.achDone >= c.achTotal,
      react: 'bray',
      cs: 'Všechny odznaky. Všechny! Já si za celej život vysloužil jenom přezdívku.',
      en: 'Every badge. Every single one! In my whole life I earned nothing but a nickname.' },
    { id: 'rich', when: (c) => c.coins >= 4000,
      react: 'laugh',
      cs: '{coins} mincí. Kdybych já měl {coins} mrkví, spal bych na nich.',
      en: '{coins} coins. If I had {coins} carrots, I would sleep on them.' },
    { id: 'items', when: (c) => c.items > 0 && c.items < c.itemsTotal,
      react: 'ears',
      cs: 'V šatníku máš {items} ozdob z {itemsTotal}. Korunku si schovej na mě, ať to má hlavu a patu.',
      en: 'You own {items} of {itemsTotal} accessories. Save the crown for me, it only makes sense.' },
    { id: 'veteran', when: (c) => c.runs >= 50,
      react: 'nod', warm: true,
      cs: '{runs} běhů. Ty už nejsi návštěva, ty sem patříš.',
      en: '{runs} runs. You are not a visitor any more, you belong here.' },
    { id: 'newbie', when: (c) => c.runs > 0 && c.runs < 3,
      react: 'hop', warm: true,
      cs: 'Teprve začínáš a už jsi tady u mě. To mám rád.',
      en: 'You are just starting out and you already came to see me. I like that.' },
    { id: 'best', when: (c) => c.best >= 1000,
      react: 'nod',
      cs: 'Tvůj rekord je {best} metrů. Já mám osobák na cestu ke krmelci a zpátky.',
      en: 'Your record is {best} metres. Mine is to the feeder and back.' },
    { id: 'morning', when: (c) => c.hour >= 5 && c.hour < 9,
      react: 'ears', warm: true,
      cs: 'Ráno. Nejlepší část dne — je ticho a nikdo po mně nechce, abych něco nesl.',
      en: 'Morning. The best part of the day — quiet, and nobody wants me to carry anything.' },
    { id: 'night', when: (c) => c.hour >= 22 || c.hour < 5,
      react: 'nod', warm: true,
      cs: 'Takhle pozdě? Já v tuhle dobu obvykle přemýšlím o mrkvi. Ale rád tě vidím.',
      en: 'This late? At this hour I am usually thinking about carrots. But good to see you.' },
    { id: 'fed', when: (c) => c.fed >= 12,
      react: 'munch',
      cs: 'Nakrmils mě už {fed}krát. Začínám mít podezření, že si mě chceš koupit. Funguje to.',
      en: 'You have fed me {fed} times. I am starting to suspect you are buying my loyalty. It works.' },
    { id: 'muted', when: (c) => c.musicOff,
      react: 'no',
      cs: 'Máš vypnutou hudbu. Chápu. Ale to já tam zpívám.',
      en: 'You have the music off. Fair enough. But that is me singing in there.' },
    { id: 'diary', when: (c) => c.factsRead >= 8,
      react: 'nod',
      cs: 'Přečetl sis o nás {factsRead} zajímavostí. To je víc, než ví většina lidí, co sem přijedou.',
      en: 'You have read {factsRead} facts about us. That is more than most people who come here know.' },
  ];

  /* =========================================================
     STAV
     ========================================================= */
  const st = {
    open: false,
    t: 0,                 // čas scény (s)
    phase: 'portal',      // portal | speech | play | leaving
    pt: 0,                // čas ve fázi (s)
    step: 0,              // kolikátá věta řeči
    again: false,         // už se známe? pak žádná řeč, jen krátké přivítání
    // Karel
    kx: 0, ky: 0, sc: 1,  // kde stojí a jak je velký (CSS px plátna)
    face: 1,              // 1 = doprava, -1 = doleva
    walkTo: null,         // cíl přechodu, když se rozejde
    react: null,          // { kind, t, dur }
    blink: 0, nextBlink: 2.5,
    props: {},            // { shades: doba do konce (s), hat: … }
    // interakce
    pokes: 0, carrots: 0,
    petT: 0,              // jak dlouho se drží prst na těle
    holding: false, holdZone: null,
    lastTap: 0,
    assembled: false,     // proběhl už „shromážděte se"?
    crowd: [],            // ostatní zvířátka po easter eggu
    // částice a portály
    parts: [],
    portals: [],
    // řeč
    bubble: null,         // { text, link, full, shown, done }
    readUntil: 0,         // do kdy je hláška zamčená, ať se dá dočíst
    typeT: 0,
    // prostředí
    fire: [],             // světlušky
  };

  let cv = null, ctx = null, W = 0, H = 0, dpr = 1;
  let raf = 0, lastT = 0;
  /* Scéna sama do úložiště nesahá – všechno si podá hra přes hooks.
     bumpHello vrátí, po kolikáté se takhle vidíme; getStats dá čísla do
     hlášek; getWorn řekne, jakou ozdobu mu hráč v šatníku vybral. */
  let hooks = {
    onSeen: () => {}, onAuto: () => {},
    bumpHello: () => 0, bumpFed: () => 0, getStats: () => ({}), getWorn: () => null,
  };
  let lowFx = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Karlova definice z data.js – kdyby snad chyběla, scéna se prostě neotevře */
  const CH = () => CHARACTERS.find(c => c.id === 'karel');

  const $ = (id) => document.getElementById(id);
  const L = (o) => (o && typeof o === 'object' && !Array.isArray(o)) ? (o[I18N.lang] || o.cs) : o;

  /* =========================================================
     PLÁTNO
     ========================================================= */
  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    // při otočení o 90° (telefon na výšku) je rámeček prohozený –
    // rozhoduje offsetWidth/Height prvku, ne obdélník na obrazovce
    W = cv.offsetWidth || r.width || window.innerWidth;
    H = cv.offsetHeight || r.height || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, lowFx ? 1.15 : DPR_STEPS[dprStep]);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    bubbleDirty = true; bubLastX = null; bubLastY = null;
    layout();
  }

  /* Kde Karel stojí a jak je velký.

     Na širokém a nízkém pruhu (telefon naležato, 844×390) se bublina
     nad hlavu nevejde – strčila by Karla pod spodní lištu a z hlavní
     postavy scény by koukal jen hřbet. Proto se v tomhle poměru staví
     Karel doleva a mluví do strany jako v komiksu; na vysoké scéně
     zůstává uprostřed a bublina mu visí nad hlavou.

     Postava se kreslí kolem svého hrudníku, ale hlava a čumák sahají
     daleko doprava (místní x až +65), takže opticky sedí až posun
     o −16 jednotek. */
  function layout() {
    st.side = W / H > 1.45;
    // rozvržení UI se řídí skutečnou výškou scény, ne media query:
    // při vynucené rotaci jsou osy viewportu prohozené a `max-height`
    // by měřilo šířku telefonu
    const scr = $('screen-karel');
    if (scr) {
      scr.classList.toggle('compact', H < 470);
      scr.classList.toggle('aside', st.side);
    }
    st.sc = Math.max(0.75, Math.min(H * 0.0052, W * 0.0034, 3.1));
    if (st.walkTo === null) st.kx = (st.side ? W * 0.31 : W * 0.5) - 16 * st.sc * st.face;
    // Karel musí stát nad spodní lištou, ne za ní. Výška se odhaduje
    // (lišta je během řeči schovaná a měřit by se nedala), zato pořád
    // stejně – jinak by po dořečení povyskočil.
    const barH = H < 470 ? 82 : 158;
    st.ky = Math.min(H * 0.86, H - barH - 8);
  }

  /* =========================================================
     ČÁSTICE
     ========================================================= */
  function spawn(x, y, n, opts) {
    if (lowFx) n = Math.ceil(n * 0.45);
    for (let i = 0; i < n; i++) {
      const a = opts.ang !== undefined ? opts.ang + (Math.random() - 0.5) * (opts.spread || 1) : Math.random() * Math.PI * 2;
      const sp = (opts.sp || 90) * (0.5 + Math.random());
      st.parts.push({
        x, y,
        vx: Math.cos(a) * sp + (opts.vx || 0),
        vy: Math.sin(a) * sp + (opts.vy || 0),
        g: opts.g === undefined ? 220 : opts.g,
        life: (opts.life || 0.9) * (0.7 + Math.random() * 0.6),
        t: 0,
        r: (opts.r || 3) * (0.6 + Math.random() * 0.8),
        col: Array.isArray(opts.col) ? opts.col[(Math.random() * opts.col.length) | 0] : (opts.col || '#ffd77a'),
        kind: opts.kind || 'dot',
        spin: (Math.random() - 0.5) * 8,
        rot: Math.random() * 6.28,
      });
    }
    // pojistka proti nekonečnému růstu, kdyby někdo klikal jako o život
    if (st.parts.length > 420) st.parts.splice(0, st.parts.length - 420);
  }

  function updateParts(dt) {
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const p = st.parts[i];
      p.t += dt;
      if (p.t >= p.life) { st.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.g * dt;
      p.vx *= 0.995;
      p.rot += p.spin * dt;
    }
  }

  const NOTE_FONTS = {};
  function noteFont(r) {
    const px = Math.round(r * 3.4);
    return NOTE_FONTS[px] || (NOTE_FONTS[px] = px + 'px "Baloo 2", sans-serif');
  }

  function drawParts() {
    if (!st.parts.length) return;
    for (const p of st.parts) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (p.kind === 'heart') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.rot) * 0.25); ctx.scale(p.r / 5, p.r / 5);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.bezierCurveTo(-5, -2, -3.4, -6, 0, -3.6);
        ctx.bezierCurveTo(3.4, -6, 5, -2, 0, 3);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'note') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.rot) * 0.3);
        ctx.fillStyle = p.col;
        // font jako řetězec se skládal pro každou notu v každém snímku
        // a prohlížeč ho pokaždé znovu rozebíral; teď se velikost zaokrouhlí
        // a hotové řetězce se recyklují z malé tabulky
        ctx.font = noteFont(p.r);
        ctx.textAlign = 'center';
        ctx.fillText(p.r > 3 ? '♪' : '♫', 0, 0);
        ctx.restore();
      } else if (p.kind === 'conf') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
        ctx.restore();
      } else {
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.35 + k * 0.65), 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* =========================================================
     POZADÍ – zlatá hodinka nad loukou
     Kreslí se celé, takže herní plátno pod scénou není vidět
     a hlavní smyčka může na tu dobu vypnout.
     ========================================================= */
  /* ---------- pečené vrstvy pozadí ----------
     Louka, slunce, kopce, keře, tráva ani kvítky se v čase nemění – přesto
     se dřív kreslily každý snímek znovu: dva plnoplošné přechody (obloha,
     slunce), dvě křivkové vrstvy kopců, 18 elips keřů, ~60 oblouků trávy
     a 42 oblouků kvítků. Na 0,5 vCPU a plátně 1688×780 to byl největší
     jednotlivý náklad scény, a to se ani nic nehýbalo.

     Teď se to jednou upeče do dvou plátek a každý snímek se jen složí:
       bgFar  = obloha + slunce + kopce + keře (neprůhledná)
       bgNear = tráva a kvítky v popředí (průhledná nad obzorem)
     Mezi ně patří to, co se hýbe – mraky (nad kopci se nikdy nepotkají,
     letí ve výšce 0,10–0,24 H) a stíny postav.

     Plátky se pečou v ROZLIŠENÍ PLÁTNA (× dpr), takže složení je prostý
     přenos pixelů bez převzorkování. Přepéct je potřeba při resize a při
     změně kvality – jinak nikdy. */
  let bgFar = null, bgNear = null;
  // klíč pečení jako čtyři čísla, ne skládaný řetězec: bakeBackdrop() se volá
  // v každém snímku a i pár set alokací za vteřinu je zbytečných
  const bake = { w: -1, h: -1, dpr: -1, ky: -1, low: false };

  function newLayer() {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr));
    c.height = Math.max(1, Math.round(H * dpr));
    const k = c.getContext('2d');
    k.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, k };
  }

  function bakeBackdrop() {
    if (bgFar && bgNear && bake.w === W && bake.h === H
        && bake.dpr === dpr && bake.ky === st.ky && bake.low === lowFx) return;
    bake.w = W; bake.h = H; bake.dpr = dpr; bake.ky = st.ky; bake.low = lowFx;
    if (W < 2 || H < 2) return;

    /* --- daleká vrstva --- */
    const far = newLayer(); const f = far.k;
    const sky = f.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f7c46a');
    sky.addColorStop(0.42, '#ffd79a');
    sky.addColorStop(0.72, '#ffe9c4');
    sky.addColorStop(1, '#f3d59a');
    f.fillStyle = sky; f.fillRect(0, 0, W, H);

    // slunce nízko nad obzorem
    const sunX = W * 0.78, sunY = H * 0.44;
    const sg = f.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.5);
    sg.addColorStop(0, 'rgba(255,255,225,0.85)');
    sg.addColorStop(0.25, 'rgba(255,224,138,0.35)');
    sg.addColorStop(1, 'rgba(255,224,138,0)');
    f.fillStyle = sg; f.fillRect(0, 0, W, H);

    // kopce – dvě vrstvy, jenom pár oblouků
    const gy = st.ky;
    f.fillStyle = '#9ccf7c';
    f.beginPath();
    f.moveTo(0, gy);
    f.quadraticCurveTo(W * 0.2, gy - H * 0.16, W * 0.46, gy - H * 0.04);
    f.quadraticCurveTo(W * 0.7, gy - H * 0.18, W, gy - H * 0.02);
    f.lineTo(W, H); f.lineTo(0, H); f.fill();
    f.fillStyle = '#7ac95e';
    f.beginPath();
    f.moveTo(0, gy + H * 0.02);
    f.quadraticCurveTo(W * 0.34, gy - H * 0.05, W * 0.68, gy + H * 0.03);
    f.quadraticCurveTo(W * 0.86, gy + H * 0.06, W, gy + H * 0.01);
    f.lineTo(W, H); f.lineTo(0, H); f.fill();

    // keříky na obzoru – jen siluety, dávají scéně hloubku
    f.fillStyle = '#6bb851';
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 0.19 + 0.06) * W) % W;
      const by = gy - H * 0.012 + ((i * 37) % 9) - 4;
      const s = H * (0.028 + (i % 3) * 0.009);
      f.beginPath();
      f.ellipse(bx, by, s * 1.5, s, 0, Math.PI, 0);
      f.ellipse(bx - s, by, s * 0.9, s * 0.7, 0, Math.PI, 0);
      f.ellipse(bx + s, by, s * 0.9, s * 0.7, 0, Math.PI, 0);
      f.fill();
    }
    bgFar = far.c;

    /* --- blízká vrstva --- */
    const near = newLayer(); const n = near.k;
    const gh = Math.max(10, H * 0.035);
    n.fillStyle = '#55a13c';
    n.beginPath();
    n.moveTo(0, H);
    for (let x = 0; x <= W + 30; x += 30) {
      const h = gh * (0.7 + ((x * 7919) % 17) / 56);
      n.quadraticCurveTo(x + 8, H - h * 1.25, x + 15, H - h * 0.95);
      n.quadraticCurveTo(x + 22, H - h * 0.72, x + 30, H - h * 0.88);
    }
    n.lineTo(W, H); n.fill();
    if (!lowFx) {
      for (let i = 0; i < 7; i++) {
        const fx = ((i * 0.143 + 0.05) * W) % W;
        const fy = H - gh * 0.6 - ((i * 23) % 7);
        n.fillStyle = i % 3 === 0 ? '#fffdf5' : i % 3 === 1 ? '#ffe08a' : '#ffb9cd';
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * 6.2832;
          n.beginPath();
          n.arc(fx + Math.cos(a) * 3.2, fy + Math.sin(a) * 3.2, 2.4, 0, 6.2832);
          n.fill();
        }
        n.fillStyle = '#ffc94a';
        n.beginPath(); n.arc(fx, fy, 1.8, 0, 6.2832); n.fill();
      }
    }
    bgNear = near.c;
  }

  function drawBackdrop() {
    bakeBackdrop();
    if (bgFar) ctx.drawImage(bgFar, 0, 0, W, H);

    // mraky – pár chomáčů, ať obloha není prázdná plocha. Kreslí se
    // z překrytých koleček, ne z jedné elipsy: placatý ovál na zlaté
    // obloze vypadá jako šmouha, ne jako mrak.
    ctx.fillStyle = 'rgba(255,253,245,0.5)';
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 0.37 + 0.12) * W + st.t * (4 + i * 1.6)) % (W + 220) - 110;
      const cy = H * (0.1 + i * 0.07);
      const s = H * (0.022 + (i % 2) * 0.005);
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, 6.2832);
      ctx.arc(cx - s * 1.1, cy + s * 0.32, s * 0.68, 0, 6.2832);
      ctx.arc(cx + s * 1.15, cy + s * 0.28, s * 0.74, 0, 6.2832);
      ctx.arc(cx + s * 0.4, cy - s * 0.52, s * 0.66, 0, 6.2832);
      ctx.arc(cx - s * 2, cy + s * 0.5, s * 0.44, 0, 6.2832);
      ctx.fill();
    }

    // stín pod Karlem – ať nestojí ve vzduchu
    ctx.fillStyle = 'rgba(60,90,40,0.2)';
    ctx.beginPath();
    ctx.ellipse(st.kx, st.ky + 8 * st.sc, 46 * st.sc, 9 * st.sc, 0, 0, 6.2832);
    ctx.fill();
    for (const c of st.crowd) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 8 * c.sc, 44 * c.sc, 8 * c.sc, 0, 0, 6.2832);
      ctx.fill();
    }

    if (bgNear) ctx.drawImage(bgNear, 0, 0, W, H);

    // pyl / světlušky ve vzduchu
    if (!lowFx) {
      ctx.fillStyle = '#fff6d0';
      for (const f of st.fire) {
        ctx.globalAlpha = 0.25 + Math.sin(st.t * f.s + f.p) * 0.2;
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(st.t * 0.4 + f.p) * 14, f.y + Math.cos(st.t * 0.3 + f.p) * 10, f.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* Ztlumení okrajů. Během příchodu je nejsilnější – funguje to jako
     „zhasnutí v sále": zlatý portál na zlaté obloze by se jinak ztratil.
     Pak povolí na jemnou vinětaci, která drží oko na Karlovi.

     Přechod se staví jednou a sílu řídí globalAlpha. Dřív se skládal
     každý snímek včetně dvou `toFixed` a dvou skládaných řetězců –
     tedy tři objekty a dvě čísla na text v každém jediném snímku. */
  let vigGrad = null;
  const vig = { w: -1, h: -1, x: -1, y: -1 };
  function drawVignette() {
    const cx = bodyCx(), cy = st.ky - 55 * st.sc;
    if (!vigGrad || vig.w !== W || vig.h !== H || vig.x !== cx || vig.y !== cy) {
      vig.w = W; vig.h = H; vig.x = cx; vig.y = cy;
      vigGrad = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.12, cx, cy, Math.max(W, H) * 0.62);
      vigGrad.addColorStop(0, 'rgba(40,26,12,0)');
      vigGrad.addColorStop(0.55, 'rgba(40,26,12,0.35)');
      vigGrad.addColorStop(1, 'rgba(40,26,12,1)');
    }
    const arrival = st.phase === 'portal' ? 1 : Math.max(0, 1 - st.pt / 1.2);
    ctx.globalAlpha = 0.15 + 0.3 * arrival;
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  function seedFireflies() {
    st.fire = [];
    const n = lowFx ? 8 : 22;
    for (let i = 0; i < n; i++) {
      st.fire.push({ x: Math.random() * W, y: H * (0.2 + Math.random() * 0.6), r: 1.4 + Math.random() * 2.4, s: 0.8 + Math.random() * 1.6, p: Math.random() * 6.28 });
    }
  }

  /* =========================================================
     PORTÁL
     Kruh z rotujících zlatých jisker – zavřený je 0, otevřený 1.
     ========================================================= */
  function addPortal(x, y, r, opts) {
    st.portals.push({ x, y, r, k: 0, t: 0, dir: 1, hold: (opts && opts.hold) || 0.9, spin: Math.random() * 6.28, dead: false });
    return st.portals[st.portals.length - 1];
  }

  function updatePortals(dt) {
    for (let i = st.portals.length - 1; i >= 0; i--) {
      const p = st.portals[i];
      p.t += dt;
      p.spin += dt * 2.4;
      if (p.dir > 0) {
        p.k = Math.min(1, p.k + dt * 3.2);
        if (p.k >= 1 && p.t > p.hold) p.dir = -1;
      } else {
        p.k -= dt * 2.6;
        if (p.k <= 0) { st.portals.splice(i, 1); continue; }
      }
      // jiskry odlétající po tečně
      if (!lowFx && p.k > 0.25 && Math.random() < dt * 34) {
        const a = Math.random() * 6.2832;
        const rr = p.r * p.k;
        spawn(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, 1, {
          ang: a + Math.PI / 2, spread: 1.2, sp: 70, g: 40, life: 0.7, r: 2.2,
          col: ['#ffe08a', '#ffc94a', '#fff4cf'],
        });
      }
    }
  }

  /* Nitro portálu a jeho záře jsou dva pevné obrázky, které se jednou
     nakreslí do malých plátek a pak už jen přenášejí (drawImage se
     zvětšením). Dřív to byl přechod skládaný pro KAŽDÝ portál v KAŽDÉM
     snímku – a při „shromážděte se" jich je na scéně šest naráz.

     Záře se dřív dělala přes shadowBlur na každém tahu prstence. To je
     nejdražší operace, jakou canvas má: 184 rozmazaných tahů na portál,
     tedy přes tisíc na snímek, když Karel svolá partu. Přesně tam se obraz
     sekal. Teď je záře jeden přenesený kotouč a tahy jdou bez stínu. */
  let sprInner = null, sprGlow = null;
  const SPR = 128;
  function bakeSprites() {
    if (sprInner) return;
    const mk = (paint) => {
      const c = document.createElement('canvas');
      c.width = c.height = SPR;
      paint(c.getContext('2d'));
      return c;
    };
    sprInner = mk((k) => {
      const g = k.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
      g.addColorStop(0, 'rgba(255,247,214,0.92)');
      g.addColorStop(0.55, 'rgba(255,201,74,0.42)');
      g.addColorStop(1, 'rgba(216,155,38,0)');
      k.fillStyle = g; k.fillRect(0, 0, SPR, SPR);
    });
    sprGlow = mk((k) => {
      const g = k.createRadialGradient(SPR / 2, SPR / 2, SPR * 0.24, SPR / 2, SPR / 2, SPR / 2);
      g.addColorStop(0, 'rgba(255,214,110,0.55)');
      g.addColorStop(0.52, 'rgba(255,201,74,0.3)');
      g.addColorStop(1, 'rgba(255,201,74,0)');
      k.fillStyle = g; k.fillRect(0, 0, SPR, SPR);
    });
  }

  function drawPortals() {
    if (!st.portals.length) return;
    bakeSprites();
    for (const p of st.portals) {
      const k = Math.max(0, Math.min(1, p.k));
      const R = p.r * (0.3 + 0.7 * k);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = k;

      // záře kolem prstence a teplý průhled „někam jinam"
      if (!lowFx) ctx.drawImage(sprGlow, -R * 1.85, -R * 1.85, R * 3.7, R * 3.7);
      ctx.drawImage(sprInner, -R, -R, R * 2, R * 2);

      /* Prstenec z jisker – čtyři obruče, každá jinou rychlostí a směrem.
         Hustota segmentů se řídí POLOMĚREM: na portálu o poloměru 20 px
         (ty malé, kterými přicházejí kamarádi) je 58 čárek k nerozeznání
         od 14, jen stojí čtyřikrát víc. */
      const dens = Math.max(0.32, Math.min(1, R / 78));
      for (let ring = 0; ring < 4; ring++) {
        const rr = R * (0.8 + ring * 0.075);
        const full = lowFx ? 16 : 34 + ring * 8;
        const seg = Math.max(10, Math.round(full * dens));
        const off = p.spin * (1 + ring * 0.42) * (ring % 2 ? -1 : 1);
        ctx.lineWidth = (3.8 - ring * 0.7) * Math.max(0.7, st.sc * 0.8);
        ctx.lineCap = 'round';
        ctx.strokeStyle = ring === 0 ? 'rgba(255,253,245,0.98)'
          : ring === 1 ? 'rgba(255,224,138,0.92)'
            : ring === 2 ? 'rgba(255,201,74,0.8)' : 'rgba(216,155,38,0.55)';
        // jedna cesta na obruč místo jednoho tahu na čárku
        ctx.beginPath();
        for (let i = 0; i < seg; i++) {
          const a0 = off + (i / seg) * 6.2832;
          const len = (0.45 + Math.sin(i * 2.3 + p.t * 7) * 0.45) * (6.2832 / seg) * 0.8;
          ctx.moveTo(rr * Math.cos(a0), rr * Math.sin(a0));
          ctx.arc(0, 0, rr, a0, a0 + len);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /* =========================================================
     KAREL
     ========================================================= */
  const REACT_DUR = {
    shake: 0.95, hop: 0.72, nod: 0.9, no: 0.9, bray: 1.5, laugh: 1.35,
    spin: 1.0, sneeze: 1.1, ears: 1.25, dance: 2.1, munch: 1.7, pet: 0.01,
    walkin: 1.1,
  };

  function react(kind) {
    if (!kind) return;
    st.react = { kind, t: 0, dur: REACT_DUR[kind] || 1 };
    // zvuk a částice ke každé reakci
    switch (kind) {
      case 'bray': AUDIO.play('bray'); shakeFx(); break;
      case 'laugh': AUDIO.play('laugh'); hearts(2); break;
      case 'hop': AUDIO.play('jump'); break;
      case 'shake': AUDIO.play('land'); dust(); break;
      case 'sneeze': AUDIO.play('slide'); break;
      case 'munch': AUDIO.play('carrot'); hearts(3); break;
      case 'dance': AUDIO.play('clover'); notes(); break;
      case 'spin': AUDIO.play('djump'); break;
      case 'ears': AUDIO.play('quote'); break;
      default: AUDIO.play('quote');
    }
  }

  const bodyCx = () => st.kx + 16 * st.sc * st.face;
  const headPt = () => ({ x: st.kx + 44 * st.sc * st.face, y: st.ky - 69 * st.sc });
  const topPt = () => ({ x: st.kx + 40 * st.sc * st.face, y: st.ky - 112 * st.sc });

  function hearts(n) {
    const h = headPt();
    spawn(h.x, h.y - 14 * st.sc, n, { ang: -1.57, spread: 1.1, sp: 46, g: -26, life: 1.5, r: 5 * Math.max(0.8, st.sc * 0.7), kind: 'heart', col: ['#ff8fa3', '#ff6b81', '#ffd0d8'] });
  }
  function notes() {
    const h = headPt();
    spawn(h.x, h.y - 10 * st.sc, 5, { ang: -1.57, spread: 1.6, sp: 60, g: -14, life: 1.6, r: 3.6 * Math.max(0.8, st.sc * 0.7), kind: 'note', col: ['#fffdf5', '#ffe08a'] });
  }
  function dust() {
    spawn(bodyCx(), st.ky + 6 * st.sc, 12, { ang: -0.5, spread: 3.2, sp: 90, g: 260, life: 0.6, r: 3.4 * st.sc * 0.7, col: ['#e6d7ae', '#cfc09a'] });
  }
  function confetti() {
    for (let i = 0; i < 3; i++) {
      spawn(W * (0.2 + i * 0.3), -10, lowFx ? 10 : 22, { ang: 1.57, spread: 1.4, sp: 120, g: 380, life: 2.2, r: 5, kind: 'conf', col: ['#ffe08a', '#ffc94a', '#b0e89a', '#7ac95e', '#ff8fa3', '#fffdf5'] });
    }
  }
  function shakeFx() { st.shake = 0.35; }

  /* Rekvizity, které Karel občas nosí – kreslí se v jeho místních
     souřadnicích hned po postavě, takže s ním jezdí i při otočení. */
  function drawProps(t) {
    const p = st.props;
    // brýle – přes oko, s nožičkou dozadu (osel se kreslí z profilu)
    if (p.shades > 0) {
      ctx.save();
      ctx.translate(38, -63);
      ctx.rotate(-0.06);
      ctx.fillStyle = '#241f1b';
      ctx.beginPath();
      ctx.moveTo(-6, -14); ctx.lineTo(15, -13.5); ctx.lineTo(15, -6.5);
      ctx.quadraticCurveTo(6, -2.5, -2, -6.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath(); ctx.moveTo(0, -12.5); ctx.lineTo(7, -12.5); ctx.lineTo(1, -7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#241f1b'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, -13); ctx.lineTo(-16, -11); ctx.stroke();
      ctx.restore();
    }
    // kouzelnický klobouk – posazený dopředu, uši koukají vzadu ven
    if (p.hat > 0) {
      ctx.save();
      ctx.translate(30, -86);
      ctx.rotate(-0.32);
      ctx.fillStyle = '#3d2f6b';
      ctx.beginPath();
      ctx.moveTo(-17, 0); ctx.quadraticCurveTo(0, 6, 17, 0);
      ctx.quadraticCurveTo(10, 2, 6, -3); ctx.lineTo(-6, -3);
      ctx.quadraticCurveTo(-10, 2, -17, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-11, -2);
      ctx.quadraticCurveTo(-6, -26, 4, -40);
      ctx.quadraticCurveTo(9, -24, 11, -2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.arc(2, -30, 1.9, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -17, 1.6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#2a2049';
      ctx.fillRect(-11.5, -5, 23, 3.6);
      ctx.restore();
    }
    // mrkev v puse
    if (p.carrot > 0) {
      const bite = 1 - Math.min(1, (0.9 - p.carrot) / 0.9);
      ctx.save();
      ctx.translate(38 + 20, -63 - 1);
      ctx.rotate(0.5 + Math.sin(t * 0.02) * 0.12);
      ctx.fillStyle = '#f08c34';
      ctx.beginPath();
      ctx.moveTo(-3, -2); ctx.lineTo(3, -2); ctx.lineTo(0.6, 16 * bite); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6fae4f'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      [-2.4, 0, 2.4].forEach((dx, i) => {
        ctx.beginPath(); ctx.moveTo(dx * 0.4, -2); ctx.lineTo(dx, -9 - i); ctx.stroke();
      });
      ctx.restore();
    }
  }

  /* Poloha a póza podle právě běžící reakce. Vrací posuny v místních
     jednotkách postavy, které se pak škálují spolu s ní. */
  const POSE = { runPhase: 0, blink: false, sway: 0, wear: null, airborne: false };
  const XF = { pose: POSE, ox: 0, oy: 0, rot: 0, sx: 1, sy: 1 };
  function poseFor(tms) {
    /* Karel nosí to, co mu hráč vybral v šatníku – i tady, ve své vlastní
       scéně. Je to drobnost, ale právě ta dělá uvítání osobním: hráč vidí
       svého Karla, ne obecného osla. Ozdobu si scéna nepamatuje sama, řekne
       jí ji hra (hooks.getWorn). */
    // Pozice i póza se recyklují: byly to dva nové objekty v každém snímku
    // (a poseFor běží 60× za vteřinu po celou dobu, co je scéna otevřená).
    const pose = POSE;
    pose.runPhase = 0; pose.blink = st.blink > 0; pose.sway = 0;
    pose.wear = hooks.getWorn(); pose.airborne = false;
    let ox = 0, oy = 0, rot = 0, sx = 1, sy = 1;

    // klidové dýchání
    const br = Math.sin(st.t * 1.7) * 0.014;
    sx = 1 - br; sy = 1 + br;

    const r = st.react;
    if (r) {
      const k = r.dur > 0 ? Math.min(1, r.t / r.dur) : 0;
      const ease = Math.sin(Math.PI * k);
      switch (r.kind) {
        case 'shake': {
          const f = Math.sin(r.t * 42) * ease;
          rot = f * 0.09; ox = f * 4; pose.sway = f * 0.9;
          break;
        }
        case 'hop': {
          oy = -Math.sin(Math.PI * k) * 46;
          pose.airborne = k > 0.08 && k < 0.92;
          pose.sway = Math.cos(Math.PI * k) * 0.9;
          sy = 1 + Math.sin(Math.PI * k) * 0.06;
          break;
        }
        case 'nod': {
          const f = Math.sin(r.t * 13) * ease;
          rot = f * 0.055; oy = -Math.abs(f) * 6; pose.sway = -f * 0.7;
          break;
        }
        case 'no': {
          const f = Math.sin(r.t * 15) * ease;
          ox = f * 9; pose.sway = f * 0.8; rot = -f * 0.03;
          break;
        }
        case 'bray': {
          // vzepne se na zadní a zahýká
          const up = Math.sin(Math.PI * Math.min(1, k * 1.25));
          rot = -up * 0.5; oy = -up * 12; ox = -up * 10;
          pose.sway = up * 1;
          pose.airborne = up > 0.4;
          break;
        }
        case 'laugh': {
          const f = Math.abs(Math.sin(r.t * 11)) * ease;
          oy = -f * 12; sy = 1 + f * 0.07; sx = 1 - f * 0.05;
          rot = Math.sin(r.t * 22) * 0.03 * ease;
          pose.sway = Math.sin(r.t * 11) * 0.8;
          break;
        }
        case 'spin': {
          rot = k * 6.2832;
          oy = -Math.sin(Math.PI * k) * 26;
          pose.airborne = true;
          break;
        }
        case 'sneeze': {
          if (k < 0.55) { rot = -k * 0.14; oy = -k * 5; }
          else {
            const f = (k - 0.55) / 0.45;
            rot = 0.12 * (1 - f); ox = 10 * (1 - f) * Math.sin(f * 20);
            if (r.t - (r.dur * 0.55) < 0.06 && !r.sneezed) {
              r.sneezed = true;
              const h = headPt();
              spawn(h.x + 26 * st.sc * st.face, h.y + 4 * st.sc, 14, { ang: st.face > 0 ? 0.15 : Math.PI - 0.15, spread: 0.8, sp: 260, g: 300, life: 0.55, r: 3, col: ['#ffffff', '#e8f3ff'] });
            }
          }
          pose.sway = Math.sin(r.t * 18) * 0.5 * ease;
          break;
        }
        case 'ears': {
          // vrtule – uši jedou přes sway, tělo se lehce nadnese
          pose.sway = Math.sin(r.t * 26) * ease;
          oy = -ease * 9;
          rot = Math.sin(r.t * 26) * 0.02 * ease;
          break;
        }
        case 'dance': {
          const f = Math.sin(r.t * 7.5);
          ox = f * 16; rot = f * 0.1;
          oy = -Math.abs(Math.sin(r.t * 15)) * 14;
          pose.sway = Math.cos(r.t * 7.5) * 0.9;
          pose.runPhase = r.t * 9;
          break;
        }
        case 'munch': {
          const f = Math.abs(Math.sin(r.t * 16));
          oy = -f * 3; rot = f * 0.02;
          pose.sway = Math.sin(r.t * 8) * 0.35;
          break;
        }
        case 'walkin': {
          pose.runPhase = tms * 0.011;
          pose.sway = Math.sin(tms * 0.011) * 0.3;
          break;
        }
        default: break;
      }
    }

    // drbání – tiskne se k ruce a blaženě se kolébá
    if (st.petT > 0) {
      const f = Math.sin(st.t * 5.5);
      rot += f * 0.035;
      ox += f * 5;
      oy += -Math.abs(f) * 3;
      pose.sway = f * 0.6;
      pose.blink = true;
    }

    // chůze na místo
    if (st.walkTo !== null) {
      pose.runPhase = tms * 0.012;
      pose.sway = Math.sin(tms * 0.012) * 0.25;
    }

    XF.pose = pose; XF.ox = ox; XF.oy = oy; XF.rot = rot; XF.sx = sx; XF.sy = sy;
    return XF;
  }

  function drawKarel(tms) {
    const ch = CH();
    if (!ch) return;
    const { pose, ox, oy, rot, sx, sy } = poseFor(tms);
    // příchod portálem – vyroste z nuly, jak jím prochází
    const grow = st.phase === 'portal' ? st.enterK : 1;
    if (grow <= 0.01) return;

    ctx.save();
    ctx.translate(st.kx + ox * st.sc, st.ky + oy * st.sc);
    ctx.rotate(rot * st.face);
    ctx.scale(st.sc * sx * st.face * grow, st.sc * sy * grow);
    GFX.drawCharacter(ctx, ch, 0, 0, 1, pose, tms);
    drawProps(tms);
    ctx.restore();
  }

  function drawCrowd(tms) {
    for (const c of st.crowd) {
      // definici zvířátka si nese sám záznam – lineární hledání v poli
      // pro každého kamaráda v každém snímku bylo zbytečné
      const ch = c.ch || (c.ch = CHARACTERS.find(x => x.id === c.id));
      if (!ch) continue;
      ctx.save();
      ctx.translate(c.x, c.y + Math.sin(st.t * 2 + c.p) * 2);
      ctx.scale(c.sc * c.face * c.k, c.sc * c.k);
      GFX.drawCharacter(ctx, ch, 0, 0, 1, { runPhase: 0, sway: Math.sin(st.t * 1.6 + c.p) * 0.25 }, tms + c.p * 400);
      ctx.restore();
    }
  }

  /* =========================================================
     BUBLINA (DOM) – text je ostrý, dá se označit a čte ho čtečka
     ========================================================= */
  /* ---------- kolik času potřebuje hláška na přečtení ----------
     Zhruba 240 znaků za minutu je pomalé, klidné tempo – Karel není
     titulky k akčnímu filmu. K tomu vteřina navrch na „aha, on něco
     říká" a strop, ať se u dlouhé věty nezasekne netrpělivý hráč. */
  const readMs = (n) => Math.min(5200, 1100 + n * 26);

  function say(text, opts) {
    const o = opts || {};
    const full = L(text) || '';
    st.bubble = { full, shown: o.instant ? full.length : 0, done: !!o.instant, link: o.link || null, warm: !!o.warm };
    st.readUntil = o.instant ? performance.now() + readMs(full.length) : Infinity;
    st.typeT = 0;
    const el = $('karel-bubble');
    if (!el) return;
    el.hidden = false;
    el.classList.toggle('warm', !!o.warm);
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    shownChars = -1; bubbleDirty = true;
    renderBubble(true);
    AUDIO.play('quote');
  }

  /* Psaní po písmenkách sahá na DOM. Při 62 znacích za vteřinu se ale
     `Math.floor(shown)` změní jen v každém čtvrtém snímku – zbylé tři
     zápisy byly úplně stejný text a jen zbytečně zneplatnily rozvržení
     bubliny (a hned za tím si ho placeBubble() zase vynutil dopočítat).
     Píše se proto jen na skutečnou změnu. */
  let shownChars = -1;
  function renderBubble(force) {
    const b = st.bubble;
    const tx = $('karel-text'), lk = $('karel-link'), nx = $('karel-next');
    if (!b || !tx) return;
    const n = Math.floor(b.shown);
    if (force || n !== shownChars) {
      shownChars = n;
      tx.textContent = b.full.slice(0, n);
      bubbleDirty = true;      // text se změnil → bublina má jinou velikost
    }
    const ready = b.shown >= b.full.length;
    if (lk) {
      if (b.link && ready) {
        lk.hidden = false;
        lk.href = b.link.href;
        lk.textContent = L(b.link) || L({ cs: b.link.cs, en: b.link.en });
      } else lk.hidden = true;
    }
    /* Šipka „▸" je jediné, co hráči řekne, jestli se dá pokračovat.
       V řeči znamená „ťukni na další větu", ve hře „hlášku máš přečtenou,
       můžeš si říct o novou". Během zámku schválně nesvítí. */
    if (nx) nx.hidden = !(ready && (st.phase === 'speech' || (st.phase === 'play' && !speechLocked())));
  }

  function hideBubble() {
    st.bubble = null;
    const el = $('karel-bubble');
    if (el) el.hidden = true;
  }

  /* Bublina jede s Karlem – buď nad hlavou, nebo (na širokém pruhu) vedle ní.

     Tohle bylo nejdražší místo celé scény, a nebylo to vidět: funkce se
     volala v KAŽDÉM snímku a hned na začátku četla `offsetWidth` /
     `offsetHeight`. Čtení rozměru těsně za zápisem stylu z minulého snímku
     nutí prohlížeč dopočítat rozvržení uprostřed snímku (layout thrashing) –
     a to i ve chvíli, kdy Karel stojí na místě a bublina se ani nehne.

     Teď se rozměr měří jen když se opravdu mohl změnit (nový text, další
     písmenko, změna velikosti okna) a výsledná poloha se zapisuje jen když
     se liší od té minulé. Ve fázi „play", kdy se nic nehýbe, tak scéna na
     DOM nesáhne vůbec. */
  let bubbleDirty = true, bubW = 0, bubH = 0, bubLastX = null, bubLastY = null, bubLastTail = null;
  function placeBubble() {
    const el = $('karel-bubble');
    if (!el || el.hidden) return;
    if (bubbleDirty) {
      bubW = el.offsetWidth; bubH = el.offsetHeight;
      bubbleDirty = false;
    }
    const t = topPt();
    const h = headPt();
    el.classList.toggle('side', !!st.side);
    let x, y, tail;
    if (st.side) {
      x = Math.min(W - bubW - 10, h.x + 34 * st.sc);
      y = Math.max(10, Math.min(H - bubH - 78, h.y - bubH * 0.62));
      tail = Math.round(Math.max(14, Math.min(bubH - 26, h.y - y)));
    } else {
      x = Math.max(bubW * 0.5 + 8, Math.min(W - bubW * 0.5 - 8, t.x));
      y = Math.max(bubH + 10, t.y - 12 * st.sc);
      tail = Math.round(t.x - x);
    }
    x = Math.round(x); y = Math.round(y);
    if (x !== bubLastX || y !== bubLastY) {
      bubLastX = x; bubLastY = y;
      el.style.transform = st.side
        ? 'translate(' + x + 'px, ' + y + 'px)'
        : 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -100%)';
    }
    if (tail !== bubLastTail) {
      bubLastTail = tail;
      el.style.setProperty('--tail', tail + 'px');
    }
  }

  /* =========================================================
     ŘEČ – posun po zastávkách
     ========================================================= */
  function speakStep() {
    const s = SPEECH[st.step];
    if (!s) { toPlay(); return; }
    say(s, { link: s.link, warm: s.warm });
    // ke každé zastávce něco malého, ať to není mluvící socha
    if (st.step === 1) react('nod');
    else if (st.step === 3) react('hop');
    else if (st.step === 5) { react('nod'); hearts(3); }
    else if (st.step === 6) react('laugh');
  }

  /* ---------- krátké přivítání „už se známe" ----------
     Sedmidílná řeč o azylu, akcích a sbírce na seno má smysl JEDNOU – to je
     poselství, které má vidět každý. Kdo si zapne „ukazuj se pokaždé", už ji
     slyšel, a poslouchat ji při každém spuštění je otrava. Dostane proto
     jednu větu, která rychle řekne, že všechno funguje a může se dovádět,
     a rovnou se odemkne lišta s akcemi. Nic se tím neztrácí: odkazy na web,
     akce, novinky, adopci i tlačítko „Přispět na seno" jsou v liště pod
     bublinou natrvalo, takže obsah těch zastávek je pořád na jedno ťuknutí.

     Milník má přednost před hláškou z koše – stejně jako u pošťouchnutí. */
  function fill(text, vars) {
    const str = L(text) || '';
    return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
  }

  function hello() {
    toPlay();                       // odemkne lištu; bublinu nepřepisuje
    const n = hooks.bumpHello() || 0;
    const mile = QUIPS.hello_at[n];
    /* Pořadí je schválně tohle: milník návštěv (desátá, padesátá…) je
       událost a má přednost před vším. Hned za ním je kontext – „viděl
       jsem tě běžet, {lastDist} metrů" je při přivítání to nejlepší, co
       Karel může říct. Náhodná hláška z pytlíku je až třetí v pořadí. */
    if (mile) {
      const stats = hooks.getStats() || {};
      applyQuip({
        text: { cs: fill(mile.cs, stats), en: fill(QUIPS_EN.hello_at[n] || mile.cs, stats) },
        react: mile.react, link: mile.link,
      });
      return;
    }
    const c = ctxQuip();
    if (c) { applyQuip(c); return; }
    const q = quip('hello');
    if (!q) return;
    // čísla ze savu se doplní až tady, ať tabulka hlášek zůstala čitelná
    const stats = hooks.getStats() || {};
    applyQuip({ ...q, text: { cs: fill(q.text.cs, stats), en: fill(q.text.en, stats) } });
  }

  function advance() {
    const b = st.bubble;
    if (b && !b.done && b.shown < b.full.length) { // dopsat hned
      b.shown = b.full.length; b.done = true;
      st.readUntil = performance.now() + readMs(b.full.length);
      renderBubble(); placeBubble();
      return;
    }
    // kdo dočetl dřív, nečeká na zámek
    st.readUntil = 0;
    st.step++;
    if (st.step >= SPEECH.length) { toPlay(); return; }
    AUDIO.play('click');
    speakStep();
  }

  function toPlay() {
    if (st.phase === 'play') return;
    st.phase = 'play';
    st.pt = 0;
    // poslední bublina zůstane viset – jenom z ní zmizí šipka „ťukni dál"
    renderBubble();
    const bar = $('karel-bar');
    if (bar) { bar.hidden = false; bar.classList.add('in'); }
    const hint = $('karel-hint');
    if (hint) hint.hidden = false;
    const skip = $('karel-skip');
    if (skip) skip.setAttribute('aria-label', I18N.t('karel.close'));
    hooks.onSeen();
  }

  /* =========================================================
     INTERAKCE
     ========================================================= */
  // převod bodu na plátně do Karlových místních souřadnic
  function toLocal(px, py) {
    return { x: (px - st.kx) / st.sc * st.face, y: (py - st.ky) / st.sc };
  }

  function zoneAt(px, py) {
    const p = toLocal(px, py);
    // velkorysé obdélníky – prst není přesný a lepší je trefit se vždycky
    if (p.y < -78 && p.x > 18 && p.x < 66) return 'ears';
    if (p.x > 26 && p.y >= -84 && p.y < -44) return 'nose';
    if (p.x < -22 && p.y > -66 && p.y < -4) return 'tail';
    if (p.y > -24 && p.x > -34 && p.x < 40) return 'hooves';
    if (p.x >= -30 && p.x <= 34 && p.y >= -74 && p.y <= -18) return 'body';
    return null;
  }

  // je bod vůbec na Karlovi? (velkorysá obálka)
  function hitKarel(px, py) {
    const p = toLocal(px, py);
    return p.x > -62 && p.x < 78 && p.y > -122 && p.y < 20;
  }

  function pointAt(e) {
    // offsetX/Y je v místních souřadnicích prvku, takže funguje i tehdy,
    // když je celá hra otočená o 90° (telefon na výšku)
    if (typeof e.offsetX === 'number' && e.target === cv) return { x: e.offsetX, y: e.offsetY };
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (!st.open) return;
    AUDIO.ensureCtx && AUDIO.ensureCtx();
    if (st.phase === 'portal') { skipPortal(); return; }
    if (st.phase === 'speech') { advance(); return; }
    if (st.phase !== 'play') return;

    const p = pointAt(e);
    st.holding = true;
    st.petT = 0;
    const zone = hitKarel(p.x, p.y) ? (zoneAt(p.x, p.y) || 'body') : null;
    st.holdZone = zone;

    if (!zone) {
      // ťuknutí vedle – Karel se otočí za rukou, nic víc
      st.face = p.x < st.kx ? -1 : 1;
      if (!speechLocked() && Math.random() < 0.3) doQuip('generic');
      return;
    }
    poke(zone, p);
  }

  function onMove(e) {
    if (!st.open || !st.holding || st.phase !== 'play') return;
    const p = pointAt(e);
    if (!hitKarel(p.x, p.y)) { endHold(); return; }
    void p;
  }

  function endHold() {
    if (st.petT > 0.9 && !speechLocked()) {
      // po pořádném drbání se ozve spokojený komentář
      doQuip('petting', { silent: true, noCtx: true });
    }
    st.holding = false;
    st.petT = 0;
    st.holdZone = null;
  }

  function onUp() {
    if (!st.open) return;
    endHold();
  }

  /* ---------- ať se hláška dá dočíst ----------
     Dřív každé ťuknutí okamžitě přepsalo bublinu. Kdo ťukl podruhé (a to
     udělá skoro každý – Karel je hebký a láká to), o hlášku prostě přišel:
     text se restartoval od prvního písmene a věta, kterou zrovna četl,
     zmizela. Proměnná `st.lastTap` na to v kódu byla připravená, jen ji
     nikdo nikdy nepoužil.

     Teď to má tři stupně:
       1. Ještě se píše → ťuknutí text DOPÍŠE naráz (netrpělivý hráč
          nemusí čekat na psací stroj).
       2. Dopsáno, ale nedočteno → Karel se ROZHÝBE (reakce, zvuk, jiskry,
          haptika), text ale zůstane. Ťuknutí tedy nikdy nevyjde naprázdno,
          jen nesebere větu z očí.
       3. Dočteno → padne nová hláška a šipka „▸" zhasne.

     Zámek jde přeskočit ťuknutím rovnou na bublinu (advance) – kdo přečetl
     rychleji, nečeká. */
  const speechLocked = () => !!st.bubble && performance.now() < st.readUntil;

  // ťuknutí, které nesmí přepsat text: Karel aspoň zareaguje
  function nudge(p) {
    const h = headPt();
    spawn(p ? p.x : h.x, p ? p.y : h.y, 4, { sp: 90, g: 300, life: 0.45, r: 2.6, col: ['#fff4cf', '#ffe08a'] });
    PLATFORM && PLATFORM.haptic && PLATFORM.haptic('light');
    if (!st.react) react(NUDGE[(Math.random() * NUDGE.length) | 0]);
  }
  const NUDGE = ['ears', 'nod', 'hop', 'shake'];

  function poke(zone, p) {
    const b = st.bubble;
    // 1. ještě se píše → dopsat naráz
    if (b && !b.done && b.shown < b.full.length) {
      b.shown = b.full.length; b.done = true;
      st.readUntil = performance.now() + readMs(b.full.length);
      renderBubble(); placeBubble();
      PLATFORM && PLATFORM.haptic && PLATFORM.haptic('light');
      return;
    }
    // 2. dopsáno, ale ještě nedočteno → jen reakce, text zůstane
    if (speechLocked()) { nudge(p); return; }

    st.pokes++;
    const h = headPt();
    spawn(p ? p.x : h.x, p ? p.y : h.y, 6, { sp: 110, g: 300, life: 0.5, r: 3, col: ['#fff4cf', '#ffe08a'] });
    PLATFORM && PLATFORM.haptic && PLATFORM.haptic('light');

    // milníky mají přednost před běžnou hláškou
    const mile = QUIPS.pokes[st.pokes];
    if (mile) {
      const en = QUIPS_EN.pokes[st.pokes];
      applyQuip({ text: { cs: mile.cs, en: en || mile.cs }, react: mile.react, prop: mile.prop, link: mile.link, special: mile.special });
      return;
    }
    // občas místo hlášky ze zóny padne obecná, ať se scéna nezacyklí
    doQuip(Math.random() < 0.32 ? 'generic' : zone);
  }

  /* Vybere nejzajímavější hlášku, která teď dává smysl. Použité si scéna
     pamatuje po dobu návštěvy, takže se Karel neopakuje; když kontextové
     dojdou, vrátí null a volající sáhne po náhodné z pytlíku. */
  const usedCtx = new Set();
  function ctxQuip() {
    const c = hooks.getStats() || {};
    for (const r of CTX) {
      if (usedCtx.has(r.id)) continue;
      let ok = false;
      try { ok = !!r.when(c); } catch (e) { ok = false; }   // chybějící údaj hlášku jen přeskočí
      if (!ok) continue;
      usedCtx.add(r.id);
      return { text: { cs: fill(r.cs, c), en: fill(r.en, c) }, react: r.react, link: r.link, warm: r.warm };
    }
    return null;
  }

  /* Kontextová hláška má přednost, ale ne pokaždé – kdyby Karel jenom
     hlásil čísla ze savu, přestal by být Karel. Zhruba dvě ze tří jsou
     kontextové, dokud nedojdou. */
  function doQuip(group, opts) {
    const wantCtx = !(opts && opts.noCtx) && Math.random() < 0.66;
    const q = (wantCtx && ctxQuip()) || quip(group) || quip('generic') || ctxQuip();
    if (!q) return;
    applyQuip(q, opts);
  }

  function applyQuip(q, opts) {
    const lbl = q.link ? LINK_LABEL[q.link] : null; // neznámý klíč → hláška bez odkazu
    const link = lbl ? { href: URL[q.link], cs: lbl.cs, en: lbl.en } : null;
    say(q.text, { link, warm: q.warm });
    if (q.prop === 'shades') { st.props.shades = 999; }
    if (q.prop === 'hat') { st.props.hat = 6; }
    if (q.special === 'assemble') assemble();
    react(q.react);
    void opts;
  }

  const LINK_LABEL = {
    web: { cs: '🌿 nechmerust.org', en: '🌿 nechmerust.org' },
    udalosti: { cs: '📅 Nadcházející akce', en: '📅 Upcoming events' },
    novinky: { cs: '📰 Novinky z Louky', en: '📰 News from the Meadow' },
    zapojit: { cs: '💚 Jak se zapojit', en: '💚 How to help' },
    adopce: { cs: '🐾 Virtuální adopce', en: '🐾 Virtual adoption' },
    seno: { cs: '🌾 Přispět na seno', en: '🌾 Donate for hay' },
    instagram: { cs: '📷 Instagram', en: '📷 Instagram' },
  };

  /* ---------- easter egg: „Osli, shromážděte se!" ----------
     Kolem Karla se otevřou další portály a vystoupí z nich zbytek
     osazenstva azylu. Trvá to pár vteřin a pak se rozplynou. */
  function assemble() {
    if (st.assembled) { confetti(); return; }
    st.assembled = true;
    const others = CHARACTERS.filter(c => c.id !== 'karel');
    // parta stojí o kus dál za Karlem: menší a o něco výš, jinak by se
    // pět zvířat vedle sebe na šířku telefonu prostě nevešlo
    const sc = st.sc * 0.52;
    const gy = st.ky - 11 * st.sc;
    const need = 112 * sc;   // nejmenší rozestup, aby se zvířata nepřekrývala
    // Karel nestojí uprostřed, takže symetrické rozdělení kolem něj by
    // půlku party poslalo mimo obrazovku. Projdeme celou šířku a bereme
    // jen sloty, které se vejdou a nelezou Karlovi do těla.
    const spots = [];
    const clear = 62 * st.sc + need * 0.5;   // Karlova polovina + polovina souseda
    for (let x = need * 0.6; x < W - need * 0.4; x += need) {
      if (Math.abs(x - bodyCx()) < clear) continue;
      spots.push(x);
    }
    // od Karla ven, ať se nejdřív zaplní místa, která jsou nejlíp vidět
    spots.sort((a, b) => Math.abs(a - bodyCx()) - Math.abs(b - bodyCx()));
    spots.slice(0, others.length).forEach((x, i) => {
      const c = others[i];
      addPortal(x, gy - 58 * sc, 64 * sc, { hold: 1.6 });
      st.crowd.push({ id: c.id, x, y: gy, sc, k: 0, face: x > bodyCx() ? -1 : 1, p: i * 1.1, t: -0.18 * i });
    });
    setTimeout(() => { if (st.open) confetti(); }, 700);
  }

  function updateCrowd(dt) {
    for (let i = st.crowd.length - 1; i >= 0; i--) {
      const c = st.crowd[i];
      c.t += dt;
      if (c.t < 0) continue;
      c.k = Math.min(1, c.k + dt * 2.2);
      if (c.t > 7) { c.k -= dt * 1.6; if (c.k <= 0) st.crowd.splice(i, 1); }
    }
  }

  /* ---------- mrkev ---------- */
  function feed() {
    st.carrots++;
    // celkový počet mrkví si pamatuje hra – Karel z něj má vlastní hlášku
    if (typeof hooks.bumpFed === 'function') hooks.bumpFed();
    // mrkev přiletí obloukem a Karel po ní chňapne
    const from = { x: st.kx - 200 * st.sc * st.face, y: H * 0.2 };
    const to = headPt();
    st.flying = { x: from.x, y: from.y, tx: to.x, ty: to.y, t: 0, dur: 0.5 };
    AUDIO.play('coin');
  }

  function updateFlying(dt) {
    const f = st.flying;
    if (!f) return;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    const to = headPt();
    f.x = f.x + (to.x - f.x) * Math.min(1, dt * 9);
    f.y = f.y + (to.y - f.y) * Math.min(1, dt * 9) - Math.sin(k * Math.PI) * 60 * dt;
    if (k >= 1) {
      st.flying = null;
      st.props.carrot = 0.9;
      doQuip('carrot');
      if (st.carrots === 5) setTimeout(() => { if (st.open) { react('dance'); confetti(); } }, 900);
    }
  }

  function drawFlying() {
    const f = st.flying;
    if (!f) return;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(st.t * 7);
    const s = 1.6 * st.sc;
    ctx.fillStyle = '#f08c34';
    ctx.beginPath(); ctx.moveTo(-4 * s, -4 * s); ctx.lineTo(4 * s, -4 * s); ctx.lineTo(0, 12 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6fae4f'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -4 * s); ctx.lineTo(0, -11 * s); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     SMYČKA
     ========================================================= */
  function update(dt) {
    st.t += dt; st.pt += dt;

    // mrkání
    st.blink -= dt;
    st.nextBlink -= dt;
    if (st.nextBlink <= 0) { st.blink = 0.12; st.nextBlink = 2 + Math.random() * 4; }

    // reakce
    if (st.react) {
      st.react.t += dt;
      if (st.react.t >= st.react.dur) st.react = null;
    }
    // drbání
    if (st.holding && st.holdZone && st.holdZone !== 'tail') {
      st.petT += dt;
      if (st.petT > 0.35 && Math.random() < dt * 6) hearts(1);
    }
    // rekvizity odtikávají (999 = napořád)
    for (const k of ['hat', 'carrot', 'shades']) {
      if (st.props[k] > 0 && st.props[k] < 900) {
        st.props[k] -= dt;
        if (st.props[k] <= 0) st.props[k] = 0;
      }
    }
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 1.6);

    // psaní textu
    const b = st.bubble;
    if (b && b.shown < b.full.length) {
      b.shown += dt * (reduceMotion.matches || lowFx ? 220 : 62);
      if (b.shown >= b.full.length) {
        b.shown = b.full.length; b.done = true;
        // hláška je dopsaná – teď teprve začíná běžet čas na přečtení
        st.readUntil = performance.now() + readMs(b.full.length);
      }
      renderBubble();
    }

    updateParts(dt);
    updatePortals(dt);
    updateCrowd(dt);
    updateFlying(dt);

    if (st.phase === 'portal') updateArrival(dt);

    /* Zámek na dočtení vyprší časem, ne událostí – šipku „ťukni dál"
       proto musí rozsvítit smyčka. Sahá se na DOM jedině při skutečné
       změně stavu, ne každý snímek. */
    const locked = speechLocked();
    if (locked !== lockWas) { lockWas = locked; renderBubble(true); }

    placeBubble();
  }
  let lockWas = false;

  /* ---------- příchod ----------
     0,0–0,45 s  jiskra a záblesk
     0,45–1,1 s  portál se roztočí a otevře
     1,1–2,0 s   Karel vyroste z portálu a stoupne si na trávu
     2,0–2,5 s   portál se zavře, Karel se otřepe a promluví */
  function updateArrival(dt) {
    void dt;
    const t = st.pt;
    if (!st.arr) st.arr = {};
    // portál se otevírá kolem toho, co je na Karlovi vidět – kotva
    // postavy sedí na hrudníku, ale hlava a čumák sahají daleko dopředu
    const px = bodyCx(), py = st.ky - 62 * st.sc;

    if (!st.arr.spark && t > 0.05) {
      st.arr.spark = true;
      spawn(px, py, lowFx ? 10 : 26, { sp: 190, g: 60, life: 0.7, r: 3.4, col: ['#fffdf5', '#ffe08a', '#ffc94a'] });
      AUDIO.play('clover');
    }
    if (!st.arr.portal && t > 0.42) {
      st.arr.portal = true;
      st.arrPortal = addPortal(px, py, 84 * st.sc, { hold: 1.5 });
      AUDIO.play('golden');
    }
    // Karel prochází
    st.enterK = t < 1.05 ? 0 : Math.min(1, (t - 1.05) / 0.75);
    if (st.enterK > 0 && st.enterK < 1) {
      st.react = st.react && st.react.kind === 'walkin' ? st.react : { kind: 'walkin', t: 0, dur: 9 };
    }
    if (!st.arr.landed && t > 1.85) {
      st.arr.landed = true;
      st.react = null;
      react('shake');
      spawn(bodyCx(), st.ky + 4 * st.sc, 14, { ang: -0.6, spread: 3, sp: 120, g: 300, life: 0.6, r: 3.5 * st.sc * 0.7, col: ['#e6d7ae', '#ffe08a'] });
      AUDIO.play('bray');
    }
    /* Portál se nechává i pro známé – je to půvab scény a trvá dvě sekundy.
       Mění se jen to, co Karel po dopadu řekne: poprvé celou řeč o azylu,
       podruhé a dál jednu větu (viz hello()). */
    if (!st.arr.spoke && t > (st.again ? 1.95 : 2.35)) {
      st.arr.spoke = true;
      st.pt = 0;
      if (st.again) { hello(); return; }
      st.phase = 'speech';
      st.step = 0;
      speakStep();
    }
  }

  function skipPortal() {
    if (st.phase !== 'portal') return;
    st.enterK = 1;
    st.arr = { spark: true, portal: true, landed: true, spoke: true };
    st.react = null;
    st.pt = 0;
    if (st.again) { hello(); return; }
    st.phase = 'speech';
    st.step = 0;
    speakStep();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (st.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * st.shake, (Math.random() - 0.5) * 10 * st.shake);
    }
    const tms = st.t * 1000;
    drawBackdrop();
    drawVignette();
    // portály, které jsou za postavami
    drawPortals();
    drawCrowd(tms);
    drawKarel(tms);
    drawFlying();
    drawParts();
  }

  /* ---------- hlídač plynulosti ----------
     Herní smyčka má svůj `autoQuality` (js/game.js), ale ta na Karlovu scénu
     nedosáhne: po dobu, co je scéna otevřená, se hra vůbec nekreslí. Scéna
     tedy potřebuje vlastní. Pravidla jsou stejná jako ve hře, a schválně:
     pokles je rychlý (dvě vteřiny škubání a jde dolů rozlišení), návrat
     opatrný (deset vteřin klidu) a po druhém propadu se přestane vracet,
     aby obraz nepulzoval sem a tam.

     Nejtěžší chvíle scény je „shromážděte se": šest portálů, pět zvířátek
     navíc a konfety. Právě tam se dřív obraz sekal – a právě tam se teď
     kvalita stačí přizpůsobit dřív, než si toho hráč všimne. */
  const DPR_STEPS = [1.75, 1.35, 1.1];
  let dprStep = 0, slowT = 0, fastT = 0, dropCount = 0;
  function autoQuality(dt) {
    if (dt > 0.024) { slowT += dt; fastT = 0; } else { slowT = Math.max(0, slowT - dt * 0.5); fastT += dt; }
    if (slowT > 2 && dprStep < DPR_STEPS.length - 1) {
      dprStep++; dropCount++; slowT = 0; fastT = 0;
      // druhý propad znamená opravdu slabé zařízení – ozdoby zhasnou
      if (dprStep >= 2) { lowFx = true; seedFireflies(); }
      resize();
      return;
    }
    if (fastT > 10 && dprStep > 0 && dropCount < 2) { dprStep--; fastT = 0; resize(); }
  }

  function frame(now) {
    if (!st.open) return;
    const raw = Math.max(0, (now - lastT) / 1000);
    const dt = Math.min(0.05, raw);
    lastT = now;
    // první snímek po otevření je vždycky dlouhý (načtení, rozvržení) –
    // ten se do hlídače nezapočítává, jinak by scéna hned shodila kvalitu
    if (st.t > 0.6) autoQuality(raw);
    update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }

  /* =========================================================
     OTEVŘENÍ / ZAVŘENÍ
     ========================================================= */
  function open(opts) {
    if (st.open || !CH()) return;
    const o = opts || {};
    lowFx = !!o.lowFx;
    const scr = $('screen-karel');
    if (!scr) return;
    cv = $('karel-canvas');
    if (!cv) return;
    ctx = cv.getContext('2d', { alpha: false });

    // stav do výchozí polohy
    st.open = true;
    st.t = 0; st.pt = 0; st.step = 0;
    st.phase = 'portal';
    st.again = !!o.again;   // už se známe → po portálu jen krátké přivítání
    st.react = null; st.props = {}; st.parts.length = 0; st.portals.length = 0;
    st.crowd.length = 0; st.assembled = false;
    st.pokes = 0; st.carrots = 0; st.petT = 0; st.holding = false;
    st.enterK = 0; st.arr = null; st.flying = null; st.shake = 0;
    st.face = 1; st.walkTo = null;

    scr.classList.add('visible');
    scr.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('karel-open');
    const bar = $('karel-bar'); if (bar) { bar.hidden = true; bar.classList.remove('in'); }
    const hint = $('karel-hint'); if (hint) hint.hidden = true;
    hideBubble();

    resize();
    seedFireflies();
    syncTexts();

    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function close() {
    /* Pečené vrstvy jsou dvě plátna přes celou obrazovku (na hustém displeji
       přes 20 MB dohromady). Scéna se otevírá málokdy, hra pod ní běží pořád
       – tak ať jí ta paměť po zavření zůstane. Uklízí se i sprity portálu. */
    bgFar = null; bgNear = null; bake.w = -1;
    sprInner = null; sprGlow = null;
    vigGrad = null; vig.w = -1;
    if (!st.open) return;
    st.open = false;
    cancelAnimationFrame(raf);
    const scr = $('screen-karel');
    if (scr) { scr.classList.remove('visible'); scr.setAttribute('aria-hidden', 'true'); }
    document.documentElement.classList.remove('karel-open');
    hideBubble();
    hooks.onSeen();
    AUDIO.play('click');
  }

  /* ---------- popisky, které skládá JS ---------- */
  function syncTexts() {
    const set = (id, key) => { const el = $(id); if (el) el.textContent = I18N.t(key); };
    set('karel-feed', 'karel.feed');
    set('karel-say', 'karel.say');
    set('karel-close', 'karel.close');
    const hint = $('karel-hint');
    if (hint) hint.textContent = I18N.t('karel.hint');
    const don = $('karel-donate');
    if (don) don.textContent = I18N.t('karel.donate');
    const skip = $('karel-skip');
    if (skip) skip.setAttribute('aria-label', I18N.t(st.phase === 'play' ? 'karel.close' : 'karel.skip'));
    syncAlways();
  }

  /* =========================================================
     NAPOJENÍ NA HRU
     ========================================================= */
  function init(opt) {
    hooks = Object.assign(hooks, opt || {});
    cv = $('karel-canvas');
    if (!cv) return;

    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', () => { if (st.open) { resize(); seedFireflies(); } });

    // klávesnice: mezerník/enter posouvá řeč, Escape zavírá
    window.addEventListener('keydown', (e) => {
      if (!st.open) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (st.phase === 'portal') skipPortal();
        else if (st.phase === 'speech') advance();
        else { st.readUntil = 0; doQuip('generic'); }
      }
    });

    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('karel-skip', () => { if (st.phase === 'speech' || st.phase === 'portal') { skipPortal(); toPlay(); } else close(); });
    /* Zámek na dočtení platí pro ŤUKNUTÍ NA KARLA – tam je opakování
       nechtěné. Tlačítko v liště je naopak vědomý požadavek „řekni něco
       dalšího", takže zámek ruší: tlačítko, které chvílemi nedělá nic,
       je horší než přepsaná hláška. */
    on('karel-feed', () => { st.readUntil = 0; feed(); });
    on('karel-say', () => { st.readUntil = 0; doQuip('generic'); });
    on('karel-close', () => { doQuip('leave'); setTimeout(close, 260); });
    on('karel-always', () => {
      if (typeof hooks.getAlways !== 'function' || typeof hooks.setAlways !== 'function') return;
      const nowOn = !hooks.getAlways();
      hooks.setAlways(nowOn);
      AUDIO.play(nowOn ? 'buy' : 'click');
      syncAlways();
      if (nowOn) { react('dance'); confetti(); say({ cs: 'Věděl jsem, že máš vkus. Uvidíme se při každém spuštění. 😎', en: 'I knew you had taste. See you every single launch. 😎' }); }
      else say({ cs: 'V pohodě. Kdybys mě chtěl, jsem v menu pod tím oslím tlačítkem. Nikam neutíkám.', en: 'No problem. If you want me, I\'m in the menu under that donkey button. I\'m not going anywhere.' });
    });

    // klik na bublinu posouvá řeč stejně jako klik na plátno
    const bub = $('karel-bubble');
    if (bub) bub.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (st.phase === 'speech') { advance(); return; }
      // ve hře je ťuknutí na bublinu „dočetl jsem" – zámek zmizí hned
      if (st.bubble && !st.bubble.done) { advance(); return; }
      st.readUntil = 0;
    });

    I18N.onChange(() => { if (st.open) syncTexts(); syncAlways(); });
    syncAlways();
  }

  function syncAlways() {
    const b = $('karel-always');
    if (!b || typeof hooks.getAlways !== 'function') return;
    const on = !!hooks.getAlways();
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    b.textContent = I18N.t(on ? 'karel.always.on' : 'karel.always');
  }

  // `pos` je tu kvůli ověřování: kde Karel zrovna stojí a jak je velký,
  // aby šlo z testu ťuknout přesně na ucho a ne vedle
  return { init, open, close, isOpen: () => st.open, syncAlways, pos: () => ({ x: st.kx, y: st.ky, sc: st.sc, face: st.face }) };
})();
