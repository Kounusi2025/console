'use strict';
registerGame('pong', {
  desc: 'ポン (対CPU・7点先取)',
  hint: '↑ ↓ / W S 移動 / Enter リスタート / Esc 戻る',
  create(cv) {
    const W = 640, H = 400, PW = 12, PH = 80, WIN = 7, LX = 20, RX = W - 20 - PW;
    const ctx = sizeCanvas(cv, W, H);
    const keys = {};
    let py, cy, ball, ps, cs, over, serveT, serveDir;

    function serve(dir) { ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 7 }; serveT = 0.8; serveDir = dir; }
    function reset() { py = cy = H / 2 - PH / 2; ps = cs = 0; over = false; serve(Math.random() < 0.5 ? 1 : -1); }
    function bounce(paddleY, dir) {                        // 当たった位置で角度が変わる。少しずつ加速
      const rel = (ball.y - (paddleY + PH / 2)) / (PH / 2 + ball.r);
      const sp = Math.min(820, Math.hypot(ball.vx, ball.vy) * 1.06), a = rel;
      ball.vx = dir * Math.cos(a) * sp; ball.vy = Math.sin(a) * sp;
      SFX.paddle();
    }
    function point(player) {
      player ? ps++ : cs++;
      if (ps >= WIN || cs >= WIN) { over = true; player ? SFX.levelup() : SFX.gameover(); return; }
      player ? SFX.clear(1) : SFX.pause();
      serve(player ? -1 : 1);
    }
    function update(dt) {
      if (over) return;
      const dir = ((keys.ArrowDown || keys.KeyS) ? 1 : 0) - ((keys.ArrowUp || keys.KeyW) ? 1 : 0);
      py = clamp(py + dir * 420 * dt, 0, H - PH);
      const target = ball.vx > 0 ? ball.y - PH / 2 : H / 2 - PH / 2;   // CPUは打ち返す側のときだけ追う
      cy = clamp(cy + clamp(target - cy, -290 * dt, 290 * dt), 0, H - PH);
      if (serveT > 0) {
        serveT -= dt;
        if (serveT <= 0) { ball.vx = serveDir * 320; ball.vy = rnd(-180, 180); }
        return;
      }
      for (let i = 0; i < 3; i++) {
        ball.x += ball.vx * dt / 3; ball.y += ball.vy * dt / 3;
        if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); SFX.wall(); }
        if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); SFX.wall(); }
        if (ball.vx < 0 && ball.x - ball.r <= LX + PW && ball.x + ball.r >= LX &&
            ball.y >= py - ball.r && ball.y <= py + PH + ball.r) { ball.x = LX + PW + ball.r; bounce(py, 1); }
        if (ball.vx > 0 && ball.x + ball.r >= RX && ball.x - ball.r <= RX + PW &&
            ball.y >= cy - ball.r && ball.y <= cy + PH + ball.r) { ball.x = RX - ball.r; bounce(cy, -1); }
        if (ball.x < -ball.r) { point(false); return; }
        if (ball.x > W + ball.r) { point(true); return; }
      }
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(51,255,102,.35)';
      for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 2, y, 4, 12);
      ctx.fillStyle = '#33ff66';
      ctx.fillRect(LX, py, PW, PH); ctx.fillRect(RX, cy, PW, PH);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#33ff66'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center';
      ctx.fillText(ps, W / 2 - 70, 60); ctx.fillText(cs, W / 2 + 70, 60);
      if (over) drawOverlay(ctx, W, H, ps > cs ? 'YOU WIN!' : 'YOU LOSE', 'Enter でリスタート');
    }

    reset();
    const stop = startLoop(update, draw);
    return {
      key(e) { keys[e.code] = true; if (e.code === 'Enter' && over) reset(); },
      keyup(e) { keys[e.code] = false; },
      destroy: stop
    };
  }
});
