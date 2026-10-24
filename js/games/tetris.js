'use strict';
registerGame('tetris', {
  desc: 'テトリス',
  hint: '← → 移動 / ↑ 回転 / ↓ ソフトドロップ / Space ハードドロップ / P 一時停止 / Enter リスタート / Esc 戻る',
  create(cv) {
    const C = 10, R = 20, S = 30, W = C * S;
    const ctx = sizeCanvas(cv, W + 170, R * S);
    const SHAPES = {
      I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], O: [[1,1],[1,1]],
      T: [[0,1,0],[1,1,1],[0,0,0]], S: [[0,1,1],[1,1,0],[0,0,0]],
      Z: [[1,1,0],[0,1,1],[0,0,0]], J: [[1,0,0],[1,1,1],[0,0,0]], L: [[0,0,1],[1,1,1],[0,0,0]]
    };
    const COL = { I: '#00f0f0', O: '#f0f000', T: '#b050f0', S: '#30e030', Z: '#f03030', J: '#4060ff', L: '#f0a000' };
    let board, cur, next, bag, score, lines, level, over, paused, acc;

    const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
    const take = () => {                              // 7種を1巡ずつ出す (偏りを防ぐ)
      if (!bag || !bag.length) bag = shuffle(Object.keys(SHAPES));
      const k = bag.pop();
      return { k, m: SHAPES[k].map(r => r.slice()), x: 0, y: 0 };
    };
    const hit = (m, x, y) => {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) {
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= C || ny >= R) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
      return false;
    };
    function spawn() {
      cur = next || take(); next = take();
      cur.x = Math.floor((C - cur.m[0].length) / 2); cur.y = 0;
      if (hit(cur.m, cur.x, cur.y)) { over = true; SFX.gameover(); SFX.musicStop(); }
    }
    function reset() {
      board = Array.from({ length: R }, () => Array(C).fill(0));
      score = 0; lines = 0; level = 1; over = false; paused = false; next = null; bag = null; acc = 0;
      spawn();
      SFX.musicStart(() => level, 0.5);
    }
    function lock(hard) {
      cur.m.forEach((row, r) => row.forEach((v, c) => {
        if (v && cur.y + r >= 0) board[cur.y + r][cur.x + c] = COL[cur.k];
      }));
      board = board.filter(row => row.some(v => !v));
      const n = R - board.length, prevLevel = level;
      while (board.length < R) board.unshift(Array(C).fill(0));
      score += [0, 100, 300, 500, 800][n] * level;
      lines += n; level = 1 + Math.floor(lines / 10);
      if (hard) SFX.drop();
      if (n) { SFX.clear(n); if (level > prevLevel) setTimeout(SFX.levelup, 350); }
      else if (!hard) SFX.lock();
      spawn();
    }
    const interval = () => Math.max(80, 800 - (level - 1) * 70);
    const gravity = () => { if (!hit(cur.m, cur.x, cur.y + 1)) cur.y++; else lock(); };

    function cell(x, y, color, alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 1, y + 1, S - 2, 4);
      ctx.globalAlpha = 1;
    }
    function update(dt) {
      if (paused || over) return;
      acc += dt * 1000;
      if (acc > interval()) { acc = 0; gravity(); }
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = 'rgba(51,255,102,.12)';
      ctx.beginPath();
      for (let i = 0; i <= C; i++) { ctx.moveTo(i * S, 0); ctx.lineTo(i * S, R * S); }
      for (let i = 0; i <= R; i++) { ctx.moveTo(0, i * S); ctx.lineTo(W, i * S); }
      ctx.stroke();
      board.forEach((row, y) => row.forEach((v, x) => v && cell(x * S, y * S, v)));
      if (!over) {
        let gy = cur.y; while (!hit(cur.m, cur.x, gy + 1)) gy++;       // 落下位置のゴースト
        cur.m.forEach((row, r) => row.forEach((v, c) => {
          if (v) { cell((cur.x + c) * S, (gy + r) * S, COL[cur.k], 0.2);
                   cell((cur.x + c) * S, (cur.y + r) * S, COL[cur.k]); }
        }));
      }
      ctx.fillStyle = '#33ff66'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
      const px = W + 18;
      ctx.fillText('NEXT', px, 28);
      next.m.forEach((row, r) => row.forEach((v, c) => v && cell(px + c * 24 - 4, 40 + r * 24, COL[next.k])));
      [['SCORE', score, 200], ['LEVEL', level, 262], ['LINES', lines, 324]].forEach(([label, v, y]) => {
        ctx.fillText(label, px, y); ctx.fillText(String(v), px, y + 22);
      });
      if (paused || over)
        drawOverlay(ctx, W, R * S, over ? 'GAME OVER' : 'PAUSED', over ? 'Enter でリスタート' : 'P で再開', [0, 0, W, R * S]);
    }

    reset();
    const stop = startLoop(update, draw);
    return {
      key(e) {
        if (e.code === 'KeyP' && !over) {
          paused = !paused; SFX.pause();
          paused ? SFX.musicPause() : SFX.musicResume();
        }
        if (over) { if (e.code === 'Enter') reset(); return; }
        if (paused) return;
        switch (e.code) {
          case 'ArrowLeft': case 'KeyA': if (!hit(cur.m, cur.x - 1, cur.y)) { cur.x--; SFX.move(); } break;
          case 'ArrowRight': case 'KeyD': if (!hit(cur.m, cur.x + 1, cur.y)) { cur.x++; SFX.move(); } break;
          case 'ArrowDown': case 'KeyS':
            if (!hit(cur.m, cur.x, cur.y + 1)) { cur.y++; score++; SFX.tick(); } else lock();
            break;
          case 'ArrowUp': case 'KeyW': case 'KeyX': {
            const nm = rot(cur.m);
            for (const k of [0, -1, 1, -2, 2])            // 壁際では少しずらして回転
              if (!hit(nm, cur.x + k, cur.y)) { cur.m = nm; cur.x += k; SFX.rotate(); break; }
            break;
          }
          case 'Space':
            while (!hit(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 2; }
            lock(true);
            break;
        }
      },
      destroy() { stop(); SFX.musicStop(); }
    };
  }
});
