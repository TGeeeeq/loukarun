const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/comfort.js'), 'utf8');
function load(settings = {}, legacy = {}, systemMotion = false) {
  const classes = new Map();
  const motion = { matches: systemMotion };
  const context = vm.createContext({
    window: { matchMedia: () => motion },
    document: { getElementById: () => null, documentElement: { classList: { toggle: (name, on) => classes.set(name, on) } } },
    STORE: { getSync: (key) => JSON.stringify(key === 'loukarun_comfort_v1' ? settings : legacy), set: () => true },
    AUDIO: { setMix() {} }, PLATFORM: { setHaptics() {} }, I18N: { lang: 'cs', onChange() {} },
  });
  vm.runInContext(source, context);
  return { api: context.window.COMFORT, classes };
}
// Nové volby musí být výchozí vypnuté: po aktualizaci se hra chová jako dosud.
// Kdyby se to obrátilo, vracejícím se hráčům zmizí znělka a na telefonu
// přibydou dvě tlačítka přes hrací plochu, aniž o to kdo požádal.
test('comfort defaults preserve muted players and do not alter progress', () => {
  const { api } = load({}, { sfx: false });
  assert.equal(api.haptics, false);
  assert.equal(api.fastStart, false);
  assert.equal(api.settings.touchControls, false);
  assert.equal(api.settings.musicVolume, 1);
});
test('comfort values are normalized, with no truthy string booleans', () => {
  const { api } = load({ musicVolume: -1, voiceVolume: 5, sfxVolume: '0.5', reduceMotion: 'false', largeText: true });
  assert.equal(api.settings.musicVolume, 0);
  assert.equal(api.settings.voiceVolume, 1);
  assert.equal(api.settings.sfxVolume, 1);
  assert.equal(api.reducedMotion, false);
  assert.equal(api.settings.largeText, true);
});
test('system reduced motion cannot be disabled by game preference', () => {
  assert.equal(load({ reduceMotion: false }, {}, true).api.reducedMotion, true);
  assert.equal(load({ reduceMotion: true }).classes.get('comfort-reduced'), true);
});
test('HTML loads every dependency and exposes the new controls', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('id="comfort-settings"'));
  assert.ok(html.includes('id="comfort-jump"'));
  assert.ok(html.includes('id="comfort-slide"'));
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scripts.indexOf('js/platform.js') < scripts.indexOf('js/comfort.js'));
  assert.ok(scripts.indexOf('js/comfort.js') < scripts.indexOf('js/game.js'));
  for (const script of scripts) new vm.Script(fs.readFileSync(path.join(root, script), 'utf8'), { filename: script });
  new vm.Script(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), { filename: 'sw.js' });
});
test('audio mixer clamps invalid input and retains independent channel levels', () => {
  const context = vm.createContext({ window: { addEventListener() {} }, document: { addEventListener() {} }, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/audio.js'), 'utf8'), context);
  const audio = vm.runInContext('AUDIO', context);
  const levels = audio.setMix({ music: 0.3, sfx: -4, voice: 9 });
  assert.equal(levels.music, 0.3); assert.equal(levels.sfx, 0); assert.equal(levels.voice, 1);
  assert.equal(audio.setMix({ music: NaN }).music, 0.3);
});
