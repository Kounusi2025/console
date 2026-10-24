'use strict';
registerGame('2048', {
  desc: '2048 (数字パズル)',
  hint: '← → ↑ ↓ / WASD スライド / R リスタート / Esc 戻る',
  create(cv) {
    const W = 440, H = 540, T = 90, G = 12, OX = 22, OY = 110;
    const ctx = sizeCanvas(cv, W, H);
    const COLORS = {
      0: '#0c1a10', 2: '#1d4d2b', 4: '#26703c', 8: '#2f9e4f', 16: '#4acb6a', 32: '#7ddb5a',
      64: '#c4e84a', 128: '#ffe66d', 256: '#ffc247', 512: '#ff9a3c', 1024: '#ff6a4d', 2048: '#ff5470'
    };
    let grid, score, best = store.get('best2048', 0), over, won;

    function spawn() {
      const empty = [...grid.keys()].filter(i => !grid[i]);
      if (empty.length) grid[empty[rndInt(0, empty.length)]] = Math.random() < 0.9 ? 2 : 4;
    }
    function reset() {
      grid = Array(16).fill(0); score = 0; over = won = false;
      spawn(); spawn();
    }
    function slide(line) {                                 // 1行を左へ詰めて同じ数を合体
      const v = line.filter(Boolean), res = []; let gain = 0;
      for (let i = 0; i < v.length; i++) {
        if (v[i] === v[i + 1]) { res.push(v[i] * 2); gain += v[i] * 2; i++; } else res.push(v[i]);
      }
      while (res.length < 4) res.push(0);
      return [res, gain];
    }
    const canMove = () => grid.some((v, i) => !v || (i % 4 < 3 && v === grid[i + 1]) || (i < 12 && v === grid[i + 4]));
    function move(dx, dy) {
      let moved = false, gain = 0;
      for (let i = 0; i < 4; i++) {
        const idx = [0, 1, 2, 3].map(j =>                  // 動かす向きの先頭から数えたマス番号
          dx ? (dx > 0 ? i * 4 + 3 - j : i * 4 + j) : (dy > 0 ? (3 - j) * 4 + i : j * 4 + i));
        const [res, g] = slide(idx.map(k => grid[k]));
        res.forEach((v, j) => { if (grid[idx[j]] !== v) { moved = true; grid[idx[j]] = v; } });
        gain += g;
      }
      if (!moved) return;
      score += gain;
      if (score > best) { best = score; store.set('best2048', best); }
      gain ? SFX.brick() : SFX.step();
      spawn();
      if (!won && grid.includes(2048)) { won = true; SFX.levelup(); }
      if (!canMove()) { over = true; SFX.gameover(); }
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#33ff66'; ctx.textAlign = 'left'; ctx.font = 'bold 44px monospace';
      ctx.fillText('2048', OX, 62);
      ctx.font = '14px monospace'; ctx.textAlign = 'right';
      ctx.fillText('SCORE ' + score, W - OX, 40); ctx.fillText('BEST ' + best, W - OX, 62);
      if (won && !over) { ctx.textAlign = 'left'; ctx.fillStyle = '#ffe66d'; ctx.fillText('2048達成! そのまま続けられます', OX, 92); }
      grid.forEach((v, i) => {
        const x = OX + (i % 4) * (T + G), y = OY + ((i / 4) | 0) * (T + G);
        ctx.fillStyle = COLORS[v] || '#ff5470'; ctx.fillRect(x, y, T, T);
        if (v) {
          ctx.fillStyle = v <= 4 ? '#aef5c0' : '#04110a'; ctx.textAlign = 'center';
          ctx.font = `bold ${v < 100 ? 38 : v < 1000 ? 32 : 26}px monospace`;
          ctx.fillText(v, x + T / 2, y + T / 2 + 12);
        }
      });
      if (over) drawOverlay(ctx, W, H, 'GAME OVER', 'R でリスタート', [OX, OY, 4 * T + 3 * G, 4 * T + 3 * G]);
    }

    reset(); draw();
    return {
      key(e) {
        if (e.code === 'KeyR') { reset(); draw(); return; }
        const d = DIR_KEYS[e.code];
        if (d && !over) { move(d[0], d[1]); draw(); }
      },
      destroy() {}
    };
  }
});
