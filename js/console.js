'use strict';
/* コンソール本体: 画面表示・バグ演出・コマンド・ゲームの起動と終了 */

const term = $('#term'), out = $('#out'), input = $('#cmd'), noise = $('#noise');
const gameBox = $('#game'), cv = $('#cv'), hint = $('#hint'), promptEl = $('#prompt');
const MAX_LINES = 400;                       // 出力が増えすぎて重くならないよう上限を設ける

function print(text = '', cls = '') {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.textContent = text === '' ? '\u00a0' : text;
  out.appendChild(d);
  while (out.childElementCount > MAX_LINES) out.firstElementChild.remove();
  term.scrollTop = term.scrollHeight;
  return d;
}
async function typeLine(text, cls = '', speed = 18) {
  const d = print('', cls);
  for (const ch of text) { d.textContent += ch; SFX.key(); await sleep(speed); }
  term.scrollTop = term.scrollHeight;
}

/* ============ バグったような演出 ============ */
const GLITCH_CHARS = [...'▓▒░█▌▐01#$%&@ｱｲｳｴｵｶｷｸ<>/\\'];
const GLITCH_COLORS = ['rgba(255,0,80,.35)', 'rgba(0,255,255,.35)', 'rgba(51,255,102,.5)', 'rgba(255,255,255,.18)'];
const pick = arr => arr[(Math.random() * arr.length) | 0];

function glitch(dur = 1800, intensity = 1, onMid) {
  return new Promise(resolve => {
    const g = noise.getContext('2d');
    noise.width = innerWidth; noise.height = innerHeight;
    noise.style.display = 'block';
    document.body.classList.add('glitch');
    SFX.glitch(dur / 1000, intensity);

    // 文字化けさせるのは末尾の行とプロンプトだけ (全行だと重い)
    const nodes = [];
    for (const div of [...out.children].slice(-60))
      for (const n of div.childNodes) if (n.nodeType === 3) nodes.push([n, n.nodeValue]);
    if (promptEl.firstChild) nodes.push([promptEl.firstChild, promptEl.firstChild.nodeValue]);

    const t0 = performance.now(); let mid = false;
    (function frame(t) {
      const p = Math.min(1, (t - t0) / dur);
      const amp = Math.sin(p * Math.PI) * intensity;
      g.clearRect(0, 0, noise.width, noise.height);

      const bars = Math.floor(4 + amp * 24);
      for (let i = 0; i < bars; i++) {
        g.fillStyle = pick(GLITCH_COLORS);
        const w = noise.width * (0.3 + Math.random() * 0.7);
        g.fillRect(Math.random() * (noise.width - w), Math.random() * noise.height, w, 2 + Math.random() * 28 * amp);
      }
      for (let i = 0; i < amp * 40; i++) {            // ブロックノイズ
        g.fillStyle = pick(GLITCH_COLORS);
        g.fillRect(Math.random() * noise.width, Math.random() * noise.height, 10 + Math.random() * 60, 10 + Math.random() * 20);
      }
      for (const [node, orig] of nodes) {
        node.nodeValue = [...orig].map(c => (c !== ' ' && Math.random() < amp * 0.5) ? pick(GLITCH_CHARS) : c).join('');
      }
      if (!mid && p >= 0.5 && onMid) { mid = true; onMid(); }
      if (p < 1) requestAnimationFrame(frame);
      else {
        for (const [node, orig] of nodes) node.nodeValue = orig;
        document.body.classList.remove('glitch');
        noise.style.display = 'none';
        resolve();
      }
    })(t0);
  });
}

/* ============ ゲームの起動・終了 ============ */
let current = null, currentHint = '', busy = false;

function updateHint() {
  hint.textContent = currentHint + (current && current.textInput ? ''
    : ' / M サウンド' + (SFX.isMuted() ? '(OFF)' : '(ON)') + ' / F 全画面');
}
/* ウィンドウサイズに合わせてゲーム画面を拡大縮小 (縦横比は維持) */
function fitGame() {
  if (!current) return;
  const s = Math.min((innerWidth * 0.96) / cv.width, (innerHeight - 110) / cv.height);
  cv.style.width = Math.floor(cv.width * s) + 'px';
  cv.style.height = Math.floor(cv.height * s) + 'px';
}
addEventListener('resize', fitGame);

function openGame(name) {
  input.blur(); input.value = '';                    // ゲーム中の入力がコマンド欄に入らないように
  current = GAMES[name].create(cv);
  currentHint = GAMES[name].hint;
  gameBox.style.display = 'flex';
  updateHint(); fitGame(); SFX.boot();
}
function closeGame() {
  if (!current) return;
  current.destroy(); current = null;
  gameBox.style.display = 'none';
  print('[ process terminated ]', 'dim');
  busy = false; input.value = ''; input.focus();
}
async function launch(name) {
  busy = true;
  await typeLine(`> generating ${name}.exe ...`, 'hl');
  await glitch(1800, 1);
  for (const l of ['allocating memory', 'compiling blocks', 'linking gravity', 'injecting fun']) {
    print(`[ OK ] ${l}`, 'ok'); SFX.ok(); await sleep(140);
  }
  print(`> ${name}.exe ready. launching...`, 'hl');
  await sleep(250);
  await glitch(1000, 1.3, () => openGame(name));     // 演出の中盤でゲーム画面に切り替え
}

$('#back').addEventListener('mousedown', e => e.preventDefault());   // フォーカスを奪わない
$('#back').addEventListener('click', closeGame);

addEventListener('keydown', e => {
  SFX.unlock();
  if (!current) return;
  if (e.code === 'Escape') { closeGame(); e.preventDefault(); return; }
  if (!current.textInput) {
    if (e.code === 'KeyM') { SFX.toggle(); updateHint(); return; }
    if (e.code === 'KeyF') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      return;
    }
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || /^(Arrow|Enter|Backspace|Tab)/.test(e.key)))
    e.preventDefault();                              // ブラウザのスクロールなどを防ぐ
  current.key(e);
});
addEventListener('keyup', e => { if (current && current.keyup) current.keyup(e); });

/* ============ コマンド ============ */
const COMMANDS = {
  help() {
    print('使えるコマンド:');
    print('  help         このヘルプを表示');
    print('  ls           遊べるゲーム一覧');
    print('  random       ランダムにゲームを生成');
    print('  about        このサイトについて');
    print('  date         現在時刻');
    print('  echo <text>  文字を表示');
    print('  clear        画面をクリア');
    print('  sound on|off 効果音とBGMのON/OFF');
    print('  <ゲーム名>   ゲームを生成して起動 (例: tetris)');
  },
  ls() { for (const k in GAMES) print(`  ${k.padEnd(12)} ${GAMES[k].desc}`, 'ok'); },
  random() { const names = Object.keys(GAMES); return launch(names[rndInt(0, names.length)]); },
  about() { print(`console - コマンドでゲームが生成される自作サイト (${Object.keys(GAMES).length} games)`); },
  date() { print(new Date().toLocaleString('ja-JP')); },
  echo(args) { print(args.join(' ')); },
  clear() { out.innerHTML = ''; },
  sound(args) {
    const a = (args[0] || '').toLowerCase();
    if (a === 'on') SFX.setMuted(false); else if (a === 'off') SFX.setMuted(true); else SFX.toggle();
    print(`sound: ${SFX.isMuted() ? 'OFF' : 'ON'}`, 'ok');
  }
};

const history = []; let hi = 0;
async function run(raw) {
  const line = raw.trim();
  print(`guest@console:~$ ${raw}`, 'dim');
  if (!line) return;
  history.push(line); hi = history.length;
  const [cmd, ...args] = line.split(/\s+/);
  const name = cmd.toLowerCase();
  if (GAMES[name]) return launch(name);
  if (COMMANDS[name]) return COMMANDS[name](args);
  print(`command not found: ${cmd}  ('help' でコマンド一覧)`, 'err');
}

input.addEventListener('keydown', async e => {
  if (busy) { e.preventDefault(); return; }
  if (e.key.length === 1 || e.key === 'Backspace') SFX.key();
  if (e.key === 'Enter') {
    const v = input.value; input.value = '';
    await run(v);
    term.scrollTop = term.scrollHeight;
  } else if (e.key === 'ArrowUp') {
    if (hi > 0) input.value = history[--hi];
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    input.value = hi < history.length - 1 ? history[++hi] : ((hi = history.length), '');
    e.preventDefault();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const m = [...Object.keys(COMMANDS), ...Object.keys(GAMES)].filter(c => c.startsWith(input.value.toLowerCase()));
    if (m.length === 1) input.value = m[0];
  }
});
term.addEventListener('click', () => { if (!current) input.focus(); });

/* ============ 起動 ============ */
(async function boot() {
  busy = true;
  print('  ____ ___  _   _ ____   ___  _     _____', 'ok');
  print(' / ___/ _ \\| \\ | / ___| / _ \\| |   | ____|', 'ok');
  print('| |  | | | |  \\| \\___ \\| | | | |   |  _|', 'ok');
  print('| |__| |_| | |\\  |___) | |_| | |___| |___', 'ok');
  print(' \\____\\___/|_| \\_|____/ \\___/|_____|_____|', 'ok');
  print();
  await typeLine("Welcome. 'help' でコマンド一覧、'ls' でゲーム一覧、'tetris' でゲーム生成。", '', 12);
  print();
  busy = false; input.focus();
})();
