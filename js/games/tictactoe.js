'use strict';
registerGame('tictactoe', {
  desc: '○×ゲーム (あなた=X / CPU=O)',
  hint: 'クリック / 数字キー1-9 / 矢印+Enter で置く / R リスタート / Esc 戻る',
  create(cv) {
    const W = 360, H = 430, S = 100, OX = 30, OY = 50;
    const ctx = sizeCanvas(cv, W, H);
    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const wins = { x: 0, o: 0, d: 0 };
    let b, turn, result, line, cursor = 4, starter = 'O', timer = null, dead = false;

    const winner = bd => {
      for (const l of LINES) if (bd[l[0]] && bd[l[0]] === bd[l[1]] && bd[l[0]] === bd[l[2]]) return { p: bd[l[0]], l };
      return null;
    };
    function minimax(bd, p, depth) {                       // CPUの読み (O視点のスコア)
      const w = winner(bd);
      if (w) return w.p === 'O' ? 10 - depth : depth - 10;
      if (bd.every(Boolean)) return 0;
      let best = p === 'O' ? -99 : 99;
      for (let i = 0; i < 9; i++) if (!bd[i]) {
        bd[i] = p;
        const s = minimax(bd, p === 'O' ? 'X' : 'O', depth + 1);
        bd[i] = null;
        best = p === 'O' ? Math.max(best, s) : Math.min(best, s);
      }
      return best;
    }
    function cpuPick() {
      const empty = [...b.keys()].filter(i => !b[i]);
      if (Math.random() < 0.2) return empty[rndInt(0, empty.length)];   // たまにミスする
      let bestI = empty[0], bestS = -99;
      for (const i of empty) { b[i] = 'O'; const s = minimax(b, 'X', 1); b[i] = null; if (s > bestS) { bestS = s; bestI = i; } }
      return bestI;
    }
    function finish() {
      const w = winner(b);
      if (w) {
        result = w.p; line = w.l; wins[w.p.toLowerCase()]++;
        w.p === 'X' ? SFX.levelup() : SFX.gameover();
      } else if (b.every(Boolean)) { result = 'D'; wins.d++; SFX.pause(); }
    }
    function cpuTurn() {
      turn = 'O';
      timer = setTimeout(() => {
        if (dead) return;
        b[cpuPick()] = 'O'; SFX.place2(); finish();
        if (!result) turn = 'X';
        draw();
      }, 450);
    }
    function play(i) {
      if (result || turn !== 'X' || b[i]) return;
      b[i] = 'X'; SFX.place(); finish();
      if (!result) cpuTurn();
      draw();
    }
    function reset() {
      clearTimeout(timer);
      b = Array(9).fill(null); result = null; line = null; turn = 'X';
      starter = starter === 'X' ? 'O' : 'X';              // 先攻を交代
      if (starter === 'O') cpuTurn();
      draw();
    }
    const center = i => [OX + (i % 3) * S + S / 2, OY + ((i / 3) | 0) * S + S / 2];
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#33ff66'; ctx.font = '18px monospace'; ctx.textAlign = 'center';
      ctx.fillText(result ? ({ X: 'あなたの勝ち！', O: 'CPUの勝ち…', D: '引き分け' })[result]
        : (turn === 'X' ? 'あなたの番 (X)' : 'CPU思考中...'), W / 2, 30);
      if (!result) {
        ctx.fillStyle = 'rgba(51,255,102,.18)';
        ctx.fillRect(OX + (cursor % 3) * S + 3, OY + ((cursor / 3) | 0) * S + 3, S - 6, S - 6);
      }
      ctx.strokeStyle = '#1f9d45'; ctx.lineWidth = 3;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(OX + i * S, OY + 8); ctx.lineTo(OX + i * S, OY + 3 * S - 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(OX + 8, OY + i * S); ctx.lineTo(OX + 3 * S - 8, OY + i * S); ctx.stroke();
      }
      ctx.lineWidth = 8; ctx.lineCap = 'round';
      b.forEach((v, i) => {
        if (!v) return;
        const [cx, cy] = center(i), r = 27;
        if (v === 'X') {
          ctx.strokeStyle = '#33ff66';
          ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
          ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
        } else { ctx.strokeStyle = '#ffe66d'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
      });
      if (line) {
        const [x1, y1] = center(line[0]), [x2, y2] = center(line[2]);
        ctx.strokeStyle = '#ff5470'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.fillStyle = '#33ff66'; ctx.font = '15px monospace';
      ctx.fillText(`WIN ${wins.x}   LOSE ${wins.o}   DRAW ${wins.d}`, W / 2, OY + 3 * S + 36);
      if (result) ctx.fillText('R / Enter でもう一度', W / 2, OY + 3 * S + 62);
    }
    const onClick = ev => {
      const [px, py] = canvasPoint(cv, ev), x = px - OX, y = py - OY;
      if (x >= 0 && y >= 0 && x < 3 * S && y < 3 * S) { cursor = Math.floor(y / S) * 3 + Math.floor(x / S); play(cursor); draw(); }
    };
    cv.addEventListener('click', onClick);
    reset();
    return {
      key(e) {
        const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
        if (m) { cursor = +m[1] - 1; play(cursor); draw(); return; }
        if (e.code === 'KeyR' || (result && (e.code === 'Enter' || e.code === 'Space'))) return reset();
        if (e.code === 'ArrowLeft' && cursor % 3) cursor--;
        else if (e.code === 'ArrowRight' && cursor % 3 < 2) cursor++;
        else if (e.code === 'ArrowUp' && cursor > 2) cursor -= 3;
        else if (e.code === 'ArrowDown' && cursor < 6) cursor += 3;
        else if (e.code === 'Enter' || e.code === 'Space') play(cursor);
        draw();
      },
      destroy() { dead = true; clearTimeout(timer); cv.removeEventListener('click', onClick); }
    };
  }
});
