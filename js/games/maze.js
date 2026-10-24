'use strict';
registerGame('maze', {
  desc: '迷路ゲーム',
  hint: '← → ↑ ↓ / WASD 移動 / H ヒント / R 作り直し / Esc 戻る',
  create(cv) {
    const SIZE = 560, M = 20, OY = M + 28;
    const ctx = sizeCanvas(cv, SIZE + M * 2, SIZE + M + OY);
    // [dx, dy, 壁ビット, 反対側の壁ビット]  上=1 右=2 下=4 左=8
    const DIRS = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
    let N, cs, cells, px, py, level = 1, moves, t0, elapsed, hint = false, locked = false, timer = null;

    function gen() {                                       // 穴掘り法 (深さ優先) で迷路を作る
      N = Math.min(24, 6 + level * 2); cs = SIZE / N;
      cells = Array(N * N).fill(15);
      const seen = new Uint8Array(N * N), st = [0]; seen[0] = 1;
      while (st.length) {
        const c = st[st.length - 1], x = c % N, y = (c / N) | 0;
        const nb = DIRS.filter(d => {
          const nx = x + d[0], ny = y + d[1];
          return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny * N + nx];
        });
        if (!nb.length) { st.pop(); continue; }
        const d = nb[rndInt(0, nb.length)], n = (y + d[1]) * N + x + d[0];
        cells[c] &= ~d[2]; cells[n] &= ~d[3]; seen[n] = 1; st.push(n);
      }
      px = py = 0; moves = 0; t0 = performance.now(); elapsed = 0; hint = false; locked = false;
    }
    function path() {                                      // 現在地からゴールまでの最短経路 (幅優先探索)
      const prev = new Int32Array(N * N).fill(-2), q = [py * N + px]; prev[q[0]] = -1;
      for (let i = 0; i < q.length; i++) {
        const c = q[i], x = c % N, y = (c / N) | 0;
        for (const d of DIRS) {
          if (cells[c] & d[2]) continue;
          const n = (y + d[1]) * N + x + d[0];
          if (prev[n] === -2) { prev[n] = c; q.push(n); }
        }
      }
      const out = [];
      for (let c = N * N - 1; c >= 0; c = prev[c]) out.push(c);
      return out;
    }
    function move(dx, dy) {
      if (locked) return;
      const d = DIRS.find(d => d[0] === dx && d[1] === dy);
      if (cells[py * N + px] & d[2]) return;
      px += dx; py += dy; moves++; SFX.step();
      if (px === N - 1 && py === N - 1) {
        locked = true; elapsed = (performance.now() - t0) / 1000; SFX.levelup();
        timer = setTimeout(() => { level++; gen(); }, 1200);
      }
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#33ff66'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
      const t = locked ? elapsed : (performance.now() - t0) / 1000;
      ctx.fillText(`LEVEL ${level}   MOVES ${moves}   TIME ${t.toFixed(1)}s`, M, M + 8);
      if (locked) { ctx.textAlign = 'right'; ctx.fillStyle = '#ffe66d'; ctx.fillText('CLEAR!', M + SIZE, M + 8); }
      ctx.save(); ctx.translate(M, OY);
      const cell = (i, col) => {
        ctx.fillStyle = col;
        ctx.fillRect((i % N) * cs + cs * .22, ((i / N) | 0) * cs + cs * .22, cs * .56, cs * .56);
      };
      if (hint) {
        ctx.strokeStyle = 'rgba(255,230,109,.6)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath();
        path().forEach((c, i) => {
          const x = (c % N + .5) * cs, y = (((c / N) | 0) + .5) * cs;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke(); ctx.setLineDash([]);
      }
      cell(N * N - 1, '#ff5470');
      ctx.strokeStyle = '#33ff66'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < N * N; i++) {                    // 隣と共有する壁は上と左だけ描けばよい
        const x = (i % N) * cs, y = ((i / N) | 0) * cs, w = cells[i];
        if (w & 1) { ctx.moveTo(x, y); ctx.lineTo(x + cs, y); }
        if (w & 8) { ctx.moveTo(x, y); ctx.lineTo(x, y + cs); }
        if (w & 2 && i % N === N - 1) { ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); }
        if (w & 4 && ((i / N) | 0) === N - 1) { ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); }
      }
      ctx.stroke();
      cell(py * N + px, '#ffe66d');
      ctx.restore();
    }

    gen();
    const stop = startLoop(() => {}, draw);
    return {
      key(e) {
        const m = DIR_KEYS[e.code];
        if (m) move(m[0], m[1]);
        else if (e.code === 'KeyH') hint = !hint;
        else if (e.code === 'KeyR' && !locked) gen();
      },
      destroy() { stop(); clearTimeout(timer); }
    };
  }
});
