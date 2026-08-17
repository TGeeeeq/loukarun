// shrne JSON z audit.js do čitelné tabulky
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let rep;
  try { rep = JSON.parse(raw); } catch (e) { console.log(raw.slice(0, 3000)); return; }
  const byKind = new Map();
  let total = 0;
  const lines = [];
  for (const r of rep) {
    if (!r.findings.length) continue;
    // sloučit stejné nálezy v rámci obrazovky
    const seen = new Map();
    for (const f of r.findings) {
      const k = f.kind + '|' + (f.sel || f.text || '');
      if (!seen.has(k)) seen.set(k, { ...f, n: 0 });
      seen.get(k).n++;
    }
    const list = [...seen.values()];
    total += list.length;
    lines.push(`\n### ${r.device} — ${r.screen}`);
    for (const f of list.slice(0, 12)) {
      byKind.set(f.kind, (byKind.get(f.kind) || 0) + 1);
      void 0;
      // telefon na výšku má hru otočenou o 90° – osy v nálezech jsou prohozené
      const rot = /portrait/.test(r.device);
      const kind = rot ? f.kind.replace('vodorovně', 'SVISLE(hra)').replace('svisle', 'VODOROVNĚ(hra)') : f.kind;
      lines.push(`  [${kind}] ${f.sel || ''} ${f.by ? '⊂ ' + f.by : ''} ${f.px ? '+' + f.px + 'px' : ''} ${f.n > 1 ? '×' + f.n : ''}`.trimEnd() +
        (f.text ? `\n      „${f.text}"` : ''));
    }
    if (list.length > 12) lines.push(`  … a dalších ${list.length - 12}`);
  }
  console.log('SOUHRN PODLE DRUHU:');
  for (const [k, v] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${v.toString().padStart(4)}  ${k}`);
  console.log(`  ---- celkem ${total} nálezů`);
  console.log(lines.join('\n'));
});
