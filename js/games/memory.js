'use strict';
registerGame('memory', {
  desc: '神経衰弱',
  hint: 'クリック / 矢印+Space でめくる / R リスタート / Esc 戻る',
  create(cv) {
    const COLS = 4, ROWS = 4, S = 100, G = 12, OX = 22, OY = 80;
    const W = OX * 2 + COLS * S + (COLS - 1) * G, H = OY + ROWS * S + (ROWS - 1) * G + 30;
    const ctx = sizeCanvas(cv, W, H);
    const SYMBOLS = ['★', '♥', '♦', '♣', '♠', '●', '▲', '■'];
    const SYM_COL = ['#ffe66d', '#ff5470', '#35d0ff', '#33ff66', '#b050f0', '#ff9a3c', '#7dffb0', '#ffffff'];
    let cards, first, locked, moves, found, cursor = 0, t0, elapsed, timer = null;

    function reset() {
      clearTimeout(timer);
      cards = shuffle([...SYMBOLS.keys(), ...SYMBOLS.keys()]).map(id => ({ id, up: false, done: false }));
      first = null; locked = false; moves = 0; found = 0; t0 = 0; elapsed = 0;
    }
    function flip(i) {
      const c = cards[i];
      if (locked || c.up || c.done) return;
      if (!t0) t0 = performance.now();
      c.up = true; SFX.flip();
      if (first === null) { first = i; return; }
      moves++;
      if (cards[first].id === c.id) {
        cards[first].done = c.done = true; first = null; found++; SFX.match();
        if (found === SYMBOLS.length) SFX.levelup();
      } else {
        locked = true; const a = first; first = null;     // 少し見せてから裏返す
        timer = setTimeout(() => { cards[a].up = false; c.up = false; locked = false; }, 700);
      }
    }
    function update() { if (t0 && found < SYMBOLS.length) elapsed = (performance.now() - t0) / 1000; }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#33ff66'; ctx.font = '18px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`MOVES ${moves}   PAIRS ${found}/${SYMBOLS.length}   TIME ${elapsed.toFixed(0)}s`, OX, 44);
      cards.forEach((c, i) => {
        const x = OX + (i % COLS) * (S + G), y = OY + ((i / COLS) | 0) * (S + G);
        if (c.up || c.done) {
          ctx.fillStyle = c.done ? '#0c2a16' : '#143a22'; ctx.fillRect(x, y, S, S);
          ctx.fillStyle = SYM_COL[c.id]; ctx.font = '54px monospace'; ctx.textAlign = 'center';
          ctx.fillText(SYMBOLS[c.id], x + S / 2, y + S / 2 + 18);
        } else {
          ctx.fillStyle = '#14502b'; ctx.fillRect(x, y, S, S);
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, y, S, 6);
          ctx.fillStyle = '#33ff66'; ctx.font = '40px monospace'; ctx.textAlign = 'center';
          ctx.fillText('?', x + S / 2, y + S / 2 + 14);
        }
        if (i === cursor) { ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, S - 4, S - 4); }
      });
      if (found === SYMBOLS.length) drawOverlay(ctx, W, H, 'CLEAR!', `MOVES ${moves}  TIME ${elapsed.toFixed(0)}s  / R でもう一度`);
    }
    const onClick = ev => {
      const [px, py] = canvasPoint(cv, ev);
      const col = Math.floor((px - OX) / (S + G)), row = Math.floor((py - OY) / (S + G));
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
      if ((px - OX) % (S + G) > S || (py - OY) % (S + G) > S) return;     // すき間のクリックは無視
      cursor = row * COLS + col; flip(cursor);
    };
    cv.addEventListener('click', onClick);

    reset();
    const stop = startLoop(update, draw);
    return {
      key(e) {
        const d = DIR_KEYS[e.code];
        if (d) { cursor = clamp(cursor % COLS + d[0], 0, COLS - 1) + clamp(((cursor / COLS) | 0) + d[1], 0, ROWS - 1) * COLS; SFX.step(); }
        else if (e.code === 'Space' || e.code === 'Enter') flip(cursor);
        else if (e.code === 'KeyR') reset();
      },
      destroy() { stop(); clearTimeout(timer); cv.removeEventListener('click', onClick); }
    };
  }
});
