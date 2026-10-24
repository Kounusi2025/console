'use strict';
registerGame('minesweeper', {
  desc: 'マインスイーパー',
  hint: 'クリック=開く / 右クリック=旗 / 矢印+Space=開く / X=旗 / R リスタート / Esc 戻る',
  create(cv) {
    const COLS = 16, ROWS = 12, MINES = 30, S = 34, OX = 20, OY = 70;
    const W = COLS * S + OX * 2, H = OY + ROWS * S + 20;
    const ctx = sizeCanvas(cv, W, H);
    const NUM_COL = ['', '#35d0ff', '#33ff66', '#ff5470', '#b050f0', '#ff9a3c', '#7dffb0', '#ffe66d', '#ffffff'];
    let cells, state, cur = { x: 0, y: 0 }, t0 = 0, elapsed = 0, opened = 0, flags = 0;

    const at = (x, y) => (x >= 0 && y >= 0 && x < COLS && y < ROWS) ? cells[y * COLS + x] : null;
    const neighbors = (x, y) => {
      const r = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const c = (dx || dy) && at(x + dx, y + dy);
        if (c) r.push([x + dx, y + dy, c]);
      }
      return r;
    };
    function reset() {
      cells = Array.from({ length: COLS * ROWS }, () => ({ mine: false, open: false, flag: false, n: 0 }));
      state = 'ready'; elapsed = 0; opened = 0; flags = 0;
    }
    function plant(sx, sy) {                               // 最初に開いたマスの周りには地雷を置かない
      for (let left = MINES; left;) {
        const x = rndInt(0, COLS), y = rndInt(0, ROWS), c = at(x, y);
        if (c.mine || (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1)) continue;
        c.mine = true; left--;
      }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
        at(x, y).n = neighbors(x, y).filter(n => n[2].mine).length;
    }
    const ended = () => state === 'won' || state === 'lost';
    function reveal(x, y) {
      if (ended()) return;
      const first = at(x, y);
      if (first.open || first.flag) return;
      if (state === 'ready') { plant(x, y); state = 'play'; t0 = performance.now(); }
      if (first.mine) {
        state = 'lost'; cells.forEach(c => { if (c.mine) c.open = true; });
        SFX.boom(); SFX.gameover(); return;
      }
      const stack = [[x, y]]; let n = 0;
      while (stack.length) {                               // 数字が0のマスは周りも連鎖して開く
        const [cx, cy] = stack.pop(), c = at(cx, cy);
        if (c.open || c.flag) continue;
        c.open = true; opened++; n++;
        if (!c.n) for (const [nx, ny] of neighbors(cx, cy)) stack.push([nx, ny]);
      }
      n > 1 ? SFX.clear(1) : SFX.brick();
      if (opened === COLS * ROWS - MINES) { state = 'won'; SFX.levelup(); }
    }
    function toggleFlag(x, y) {
      const c = at(x, y);
      if (ended() || c.open) return;
      c.flag = !c.flag; flags += c.flag ? 1 : -1; SFX.place();
    }
    function update() { if (state === 'play') elapsed = (performance.now() - t0) / 1000; }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#33ff66'; ctx.font = '18px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`MINES ${MINES - flags}   TIME ${elapsed.toFixed(0)}s`, OX, 40);
      ctx.textAlign = 'right';
      if (state === 'won') { ctx.fillStyle = '#ffe66d'; ctx.fillText('CLEAR!  R でもう一度', W - OX, 40); }
      if (state === 'lost') { ctx.fillStyle = '#ff5470'; ctx.fillText('BOOM!  R でリスタート', W - OX, 40); }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = at(x, y), px = OX + x * S, py = OY + y * S;
        ctx.fillStyle = c.open ? '#07130b' : '#14502b'; ctx.fillRect(px + 1, py + 1, S - 2, S - 2);
        if (!c.open) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(px + 1, py + 1, S - 2, 4); }
        const cx = px + S / 2, cy = py + S / 2;
        if (c.open && c.mine) {
          ctx.fillStyle = '#ff5470'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
        } else if (c.open && c.n) {
          ctx.fillStyle = NUM_COL[c.n]; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
          ctx.fillText(c.n, cx, cy + 7);
        } else if (c.flag) {
          ctx.fillStyle = '#ffe66d'; ctx.fillRect(cx - 1, cy - 9, 2, 18);
          ctx.fillStyle = '#ff5470'; ctx.beginPath();
          ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 10, cy - 4); ctx.lineTo(cx, cy + 1); ctx.fill();
        }
      }
      ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 2;
      ctx.strokeRect(OX + cur.x * S + 2, OY + cur.y * S + 2, S - 4, S - 4);
    }
    const cellAt = ev => {
      const [px, py] = canvasPoint(cv, ev);
      const x = Math.floor((px - OX) / S), y = Math.floor((py - OY) / S);
      return at(x, y) ? { x, y } : null;
    };
    const onClick = ev => { const p = cellAt(ev); if (p) { cur = p; reveal(p.x, p.y); } };
    const onContext = ev => { ev.preventDefault(); const p = cellAt(ev); if (p) { cur = p; toggleFlag(p.x, p.y); } };
    cv.addEventListener('click', onClick);
    cv.addEventListener('contextmenu', onContext);

    reset();
    const stop = startLoop(update, draw);
    return {
      key(e) {
        const d = DIR_KEYS[e.code];
        if (d) { cur = { x: clamp(cur.x + d[0], 0, COLS - 1), y: clamp(cur.y + d[1], 0, ROWS - 1) }; SFX.step(); }
        else if (e.code === 'Space' || e.code === 'Enter') reveal(cur.x, cur.y);
        else if (e.code === 'KeyX') toggleFlag(cur.x, cur.y);
        else if (e.code === 'KeyR') reset();
      },
      destroy() { stop(); cv.removeEventListener('click', onClick); cv.removeEventListener('contextmenu', onContext); }
    };
  }
});
