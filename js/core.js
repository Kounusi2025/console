'use strict';
/* 共通ヘルパー: すべてのゲームとコンソール本体から使う */

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);          // a以上b未満の小数
const rndInt = (a, b) => Math.floor(rnd(a, b));             // a以上b未満の整数
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function shuffle(arr) {                                     // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rndInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* localStorage の安全ラッパー (使えない環境でも落ちない) */
const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem('console-' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('console-' + key, JSON.stringify(value)); } catch (e) {}
  }
};

/* ゲーム登録
   registerGame(name, { desc, hint, create(canvas) })
   create は { key(e), keyup?(e), destroy(), textInput? } を返す。
   textInput: true のゲームは M / F などの共通ショートカットを無効にして文字入力を受け取る。 */
const GAMES = {};
const registerGame = (name, def) => { GAMES[name] = def; };

/* 矢印キー / WASD → 方向ベクトル */
const DIR_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0]
};

/* キャンバスのサイズを決めて 2D コンテキストを返す */
function sizeCanvas(cv, w, h) {
  cv.width = w; cv.height = h;
  return cv.getContext('2d');
}

/* ゲームループ (dt は秒、最大33ms)。止めるときは返り値の関数を呼ぶ */
function startLoop(update, draw) {
  let raf = 0, last = 0, dead = false;
  const frame = t => {
    if (dead) return;
    update(Math.min(0.033, (t - last) / 1000)); last = t;
    draw();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(t => { last = t; frame(t); });
  return () => { dead = true; cancelAnimationFrame(raf); };
}

/* GAME OVER などの暗幕 + 文字。area = [x, y, w, h] で範囲を絞れる */
function drawOverlay(ctx, w, h, title, sub = '', area = null) {
  const [x, y, ow, oh] = area || [0, 0, w, h];
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x, y, ow, oh);
  ctx.fillStyle = '#33ff66'; ctx.textAlign = 'center';
  ctx.font = '28px monospace'; ctx.fillText(title, x + ow / 2, y + oh / 2 - 6);
  if (sub) { ctx.font = '14px monospace'; ctx.fillText(sub, x + ow / 2, y + oh / 2 + 22); }
}

/* キャンバス上のクリック位置 → キャンバス座標 (拡大縮小に対応) */
function canvasPoint(cv, ev) {
  const r = cv.getBoundingClientRect();
  return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height];
}
