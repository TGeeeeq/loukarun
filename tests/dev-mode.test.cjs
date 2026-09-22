const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const devSource = read('js/dev.js');
const platformSource = read('js/platform.js');

test('dev.js se načítá před game.js', () => {
  const html = read('index.html');
  const dev = html.indexOf('src="js/dev.js"');
  const game = html.indexOf('src="js/game.js"');
  assert.ok(dev > 0 && game > 0 && dev < game);
});

test('dev.js je v CORE, ale nikdy ve VITAL', () => {
  const sw = read('sw.js');
  const block = (name) => sw.slice(sw.indexOf(`const ${name} = [`), sw.indexOf('];', sw.indexOf(`const ${name} = [`)));
  assert.match(block('CORE'), /js\/dev\.js/);
  assert.doesNotMatch(block('VITAL'), /dev\.js/);
});

test('příznak režimu nebydlí v savu, který reset maže', () => {
  const flag = devSource.match(/FLAG_KEY = '([^']+)'/)[1];
  const save = devSource.match(/SAVE_KEY = '([^']+)'/)[1];
  assert.notEqual(flag, save);
  assert.equal(save, read('js/game.js').match(/SAVE_KEY = '([^']+)'/)[1]);
});

test('dev.js jde přeložit (zpětný apostrof v CSS by ukončil template literal)', () => {
  assert.doesNotThrow(() => new vm.Script(devSource));
  const css = devSource.slice(devSource.indexOf('const CSS = `') + 13);
  assert.match(css.slice(0, css.indexOf('`')), /#dev-open\{/);
  assert.match(css.slice(0, css.indexOf('`')), /#dev-msg\{/);
});

test('mazání nesahá na localStorage mimo STORE', () => {
  assert.doesNotMatch(devSource, /localStorage\./);
});

function store({ native }) {
  const ls = new Map([['k', 'old']]);
  const prefs = new Map([['k', 'old']]);
  const calls = [];
  const window = {
    Capacitor: native ? {
      isNativePlatform: () => true,
      registerPlugin: () => ({
        set: async ({ key, value }) => { calls.push('set'); prefs.set(key, value); },
        remove: async ({ key }) => { calls.push('remove'); prefs.delete(key); },
        get: async ({ key }) => ({ value: prefs.get(key) ?? null }),
      }),
    } : undefined,
    addEventListener() {},
    matchMedia: () => ({ matches: false }),
  };
  const storage = (m) => ({ getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) });
  vm.runInNewContext(platformSource, {
    window, navigator: {}, document: {},
    localStorage: storage(ls), sessionStorage: storage(new Map([['lr_recovered', '1']])),
  });
  return { STORE: window.STORE, ls, prefs, calls };
}

test('STORE.remove maže localStorage i nativní zálohu', async () => {
  const { STORE, ls, prefs } = store({ native: true });
  await STORE.remove('k');
  assert.equal(ls.has('k'), false);
  assert.equal(prefs.has('k'), false);
});

test('STORE.remove na webu vrací slib a maže localStorage', async () => {
  const { STORE, ls } = store({ native: false });
  const r = STORE.remove('k');
  assert.equal(typeof r.then, 'function');
  await r;
  assert.equal(ls.has('k'), false);
});
