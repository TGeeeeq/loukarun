const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const platformSource = fs.readFileSync(path.join(root, 'js/platform.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
const karelSource = fs.readFileSync(path.join(root, 'js/karel.js'), 'utf8');

function platform({ native = false, mode = 'browser', ios = false, browserFullscreen = false } = {}) {
  const listeners = {};
  const window = {
    Capacitor: native ? { isNativePlatform: () => true } : undefined,
    addEventListener: (name, fn) => { listeners[name] = fn; },
    matchMedia: (query) => ({ matches: query === `(display-mode: ${mode})` }),
  };
  vm.runInNewContext(platformSource, {
    window,
    navigator: { standalone: ios },
    document: { fullscreenElement: browserFullscreen ? {} : null },
  });
  return { api: window.PLATFORM, listeners };
}

for (const [name, options, expected] of [
  ['ordinary browser', {}, true],
  ['native Android', { native: true }, false],
  ['standalone PWA', { mode: 'standalone' }, false],
  ['fullscreen PWA', { mode: 'fullscreen' }, false],
  ['iOS home screen', { ios: true }, false],
  ['ordinary browser using fullscreen', { mode: 'fullscreen', browserFullscreen: true }, true],
]) {
  test(`installation advice: ${name}`, () => {
    assert.equal(platform(options).api.shouldOfferInstall(), expected);
  });
}

test('installation immediately suppresses further advice', () => {
  const { api, listeners } = platform();
  assert.equal(api.shouldOfferInstall(), true);
  listeners.appinstalled();
  assert.equal(api.shouldOfferInstall(), false);
});

// Run the actual UI functions in isolation: no duplicated implementation.
function functionBlock(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Function boundaries exist: ${start}`);
  return source.slice(from, to);
}

test('skipping the story leaves result counters running and cannot restart typing', () => {
  const tasks = [];
  let sounds = 0;
  const el = { textContent: '', parentElement: { classList: { add() {} } } };
  const context = vm.createContext({
    overTasks: tasks, overSkip: null,
    overRun: (fn) => tasks.push(fn),
    AUDIO: { play: () => { sounds++; } },
  });
  vm.runInContext(functionBlock(gameSource, '  function overType(', '\n  function revealOver('), context);
  context.overType(el, 'Hotovo 🥕', 320);
  const counter = () => false;
  tasks.push(counter);
  const skip = context.overSkip;
  skip();
  assert.equal(el.textContent, 'Hotovo 🥕');
  assert.equal(tasks.length, 2);
  assert.equal(tasks[1], counter);
  assert.equal(tasks[0](1000), true);
  skip();
  assert.equal(sounds, 1);
  assert.equal(context.overSkip, null);
});

for (const allowed of [false, true]) {
  test(`Karel installation steps: advice ${allowed ? 'allowed' : 'suppressed'}`, () => {
    const context = vm.createContext({
      st: { step: 6 }, GUIDE_FROM: 6,
      SPEECH: Array.from({ length: 11 }, (_, i) => ({ cs: String(i) })),
      PLATFORM: { shouldOfferInstall: () => allowed },
      say() {}, react() {}, hearts() {}, toPlay() {},
    });
    vm.runInContext(functionBlock(karelSource, '  function speakStep()', '\n  /* ---------- krátké přivítání'), context);
    context.speakStep();
    assert.equal(context.st.step, allowed ? 6 : 9);
  });
}
