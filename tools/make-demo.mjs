/* =========================================================
   Sestaví z plné hry soběstačné DEMO (index.html + manifest).
   Volá se z build-demo.sh. Bere kořenový index.html a jen do něj
   vloží demo-přepínač a rožní odznak – cesty (js/, style.css,
   assets/) tím zůstávají kořenové, takže demo funguje jako
   samostatný web na vlastní doméně.

   Použití: node tools/make-demo.mjs <zdroj> <výstup>
   ========================================================= */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = process.argv[2] || '.';
const out = process.argv[3] || '_site';
mkdirSync(out, { recursive: true });

let html = readFileSync(`${src}/index.html`, 'utf8');

const inject = `  <style>
    /* nenápadný rožní odznak, ať tester pozná ukázkovou verzi */
    #demo-badge{position:fixed;top:0;left:0;z-index:9999;pointer-events:none;
      font-family:'Baloo 2',system-ui,sans-serif;font-weight:800;font-size:12px;
      letter-spacing:.08em;color:#4a3b12;background:linear-gradient(135deg,#ffe08a,#ffc23c);
      padding:4px 30px;transform:translate(-30px,14px) rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,.25);text-shadow:0 1px 0 rgba(255,255,255,.4);}
    @media (max-width:640px){#demo-badge{font-size:10px;padding:3px 26px;}}
  </style>
  <script>
    // jediná změna oproti plné hře: omezí nabídku na první 3 zvířátka
    window.LOUKA_DEMO = true;
    window.LOUKA_DEMO_ANIMALS = 3;
  </script>
`;

html = html.replace(/<title>[\s\S]*?<\/title>/,
  '<title>Louka Run 🥕 DEMO – hra na podporu azylu Nech mě růst</title>');
html = html.replace('</head>', inject + '</head>');
html = html.replace('<body>', '<body>\n  <div id="demo-badge">DEMO</div>');

writeFileSync(`${out}/index.html`, html);

const m = JSON.parse(readFileSync(`${src}/manifest.webmanifest`, 'utf8'));
m.name = 'Louka Run DEMO – hra na podporu azylu Nech mě růst';
m.short_name = 'Louka Run DEMO';
m.description = 'Ukázková verze veselé běhací hry se zvířátky z azylu Nech mě růst. Vyzkoušej první tři zvířátka!';
writeFileSync(`${out}/manifest.webmanifest`, JSON.stringify(m, null, 2) + '\n');

console.log('DEMO index.html + manifest.webmanifest sestaveny → ' + out);
