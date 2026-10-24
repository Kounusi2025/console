'use strict';
registerGame('snake', {
  desc: 'スネーク',
  hint: '矢印キー / WASD で移動 / Enter リスタート / Esc 戻る',
  create(cv) {
    const N = 20, S = 24;
    const ctx = sizeCanvas(cv, N * S, N * S);
    let snake, dir, nextDir, food, score, over;

    function placeFood() {
      do { food = { x: rndInt(0, N), y: rndInt(0, N) }; }
      while (snake.some(s => s.x === food.x && s.y === food.y));
    }
    function reset() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = nextDir = { x: 1, y: 0 }; score = 0; over = false; placeFood();
    }
    function step() {
      if (over) return;
      dir = nextDir;
      const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(s => s.x === h.x && s.y === h.y)) {
        over = true; SFX.gameover(); return;
      }
      snake.unshift(h);
      if (h.x === food.x && h.y === food.y) { score++; SFX.eat(); placeFood(); } else snake.pop();
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#ff5470'; ctx.fillRect(food.x * S + 3, food.y * S + 3, S - 6, S - 6);
      snake.forEach((s, i) => { ctx.fillStyle = i ? '#33ff66' : '#b8ffcf'; ctx.fillRect(s.x * S + 1, s.y * S + 1, S - 2, S - 2); });
      ctx.fillStyle = '#33ff66'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SCORE ' + score, 8, 18);
      if (over) drawOverlay(ctx, cv.width, cv.height, 'GAME OVER', 'Enter でリスタート');
    }

    reset(); draw();
    const timer = setInterval(() => { step(); draw(); }, 110);
    return {
      key(e) {
        if (over && e.code === 'Enter') { reset(); return; }
        const d = DIR_KEYS[e.code];
        if (d && !(d[0] === -dir.x && d[1] === -dir.y)) nextDir = { x: d[0], y: d[1] };   // 逆走は不可
      },
      destroy() { clearInterval(timer); }
    };
  }
});
