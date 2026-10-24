'use strict';
registerGame('breakout', {
  desc: 'ブロック崩し',
  hint: '← → 移動 / Space 発射 / Enter リスタート / Esc 戻る',
  create(cv) {
    const W = 480, H = 560;
    const ctx = sizeCanvas(cv, W, H);
    const COLS = 8, ROWS = 6, BW = W / COLS, BH = 22, TOP = 60, PY = H - 30;
    const colors = ['#ff5470', '#ff9a3c', '#ffe66d', '#33ff66', '#35d0ff', '#b050f0'];
    const keys = {};
    let paddle, ball, bricks, score, lives, level, over;

    function build() {
      bricks = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
        bricks.push({ x: c * BW, y: TOP + r * (BH + 4), alive: true, col: colors[r] });
    }
    function resetBall() { ball = { x: paddle.x + paddle.w / 2, y: PY - 8, vx: 0, vy: 0, r: 7, stuck: true }; }
    function reset() {
      paddle = { x: W / 2 - 45, w: 90, h: 12 };
      score = 0; lives = 3; level = 1; over = false;
      build(); resetBall();
    }
    function launch() {
      if (over || !ball.stuck) return;
      const sp = 300 + level * 30, a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.stuck = false;
      SFX.paddle();
    }
    function step(dt) {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); SFX.wall(); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); SFX.wall(); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); SFX.wall(); }
      if (ball.vy > 0 && ball.y + ball.r >= PY && ball.y - ball.r <= PY + paddle.h &&
          ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r) {
        const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2 + ball.r);   // 当たった位置で角度が変わる
        const sp = Math.hypot(ball.vx, ball.vy), a = rel * 1.05;
        ball.vx = Math.sin(a) * sp; ball.vy = -Math.cos(a) * sp; ball.y = PY - ball.r;
        SFX.paddle();
      }
      for (const b of bricks) {
        if (!b.alive) continue;
        const cx = clamp(ball.x, b.x, b.x + BW - 2), cy = clamp(ball.y, b.y, b.y + BH);
        const dx = ball.x - cx, dy = ball.y - cy;
        if (dx * dx + dy * dy < ball.r * ball.r) {
          b.alive = false; score += 10 * level; SFX.brick();
          if (Math.abs(dx) > Math.abs(dy)) ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
          else ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
          const k = Math.min(1.008, 680 / Math.hypot(ball.vx, ball.vy));            // だんだん加速 (上限あり)
          ball.vx *= k; ball.vy *= k;
          break;
        }
      }
      if (ball.y > H + ball.r) {
        lives--;
        if (lives <= 0) { over = true; SFX.gameover(); } else { resetBall(); SFX.pause(); }
      } else if (bricks.every(b => !b.alive)) {
        level++; build(); resetBall(); SFX.levelup();
      }
    }
    function update(dt) {
      if (over) return;
      const dir = ((keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA) ? 1 : 0);
      paddle.x = clamp(paddle.x + dir * 480 * dt, 0, W - paddle.w);
      if (ball.stuck) { ball.x = paddle.x + paddle.w / 2; ball.y = PY - ball.r - 1; return; }
      for (let i = 0; i < 3 && !ball.stuck && !over; i++) step(dt / 3);              // 高速でもすり抜けないよう分割
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      for (const b of bricks) if (b.alive) {
        ctx.fillStyle = b.col; ctx.fillRect(b.x + 1, b.y + 1, BW - 3, BH - 1);
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(b.x + 1, b.y + 1, BW - 3, 4);
      }
      ctx.fillStyle = '#33ff66'; ctx.fillRect(paddle.x, PY, paddle.w, paddle.h);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#33ff66'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SCORE ' + score, 10, 24); ctx.fillText('LEVEL ' + level, 10, 44);
      ctx.textAlign = 'right'; ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 10, 24);
      ctx.textAlign = 'center';
      if (ball.stuck && !over) ctx.fillText('Space で発射', W / 2, H / 2 + 60);
      if (over) drawOverlay(ctx, W, H, 'GAME OVER', 'Enter でリスタート');
    }

    reset();
    const stop = startLoop(update, draw);
    return {
      key(e) { keys[e.code] = true; if (e.code === 'Space') launch(); if (e.code === 'Enter' && over) reset(); },
      keyup(e) { keys[e.code] = false; },
      destroy: stop
    };
  }
});
