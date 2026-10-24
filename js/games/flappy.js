'use strict';
registerGame('flappy', {
  desc: 'フラッピー (Spaceで羽ばたく)',
  hint: 'Space / ↑ 羽ばたく / Enter リスタート / Esc 戻る',
  create(cv) {
    const W = 400, H = 600, GROUND = 540, R = 13, GAP = 150, PIPE_W = 60, BX = 100;
    const ctx = sizeCanvas(cv, W, H);
    let bird, pipes, score, best = store.get('bestflappy', 0), state, spawnT, t;

    function reset() { bird = { y: H / 2 - 40, vy: 0 }; pipes = []; score = 0; state = 'ready'; spawnT = 0; t = 0; }
    function die() {
      state = 'over';
      if (score > best) { best = score; store.set('bestflappy', best); }
      SFX.boom(); SFX.gameover();
    }
    function flap() {
      if (state === 'over') return reset();
      if (state === 'ready') state = 'play';
      bird.vy = -420; SFX.rotate();
    }
    function update(dt) {
      t += dt;
      if (state === 'ready') { bird.y = H / 2 - 40 + Math.sin(t * 4) * 8; return; }
      if (state === 'over') return;
      bird.vy += 1400 * dt; bird.y += bird.vy * dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawnT = 1.5; pipes.push({ x: W + PIPE_W, top: rnd(70, GROUND - GAP - 70), passed: false }); }
      for (const p of pipes) {
        p.x -= 170 * dt;
        if (!p.passed && p.x + PIPE_W < BX - R) { p.passed = true; score++; SFX.brick(); }
        if (BX + R > p.x && BX - R < p.x + PIPE_W && (bird.y - R < p.top || bird.y + R > p.top + GAP)) die();
      }
      pipes = pipes.filter(p => p.x > -PIPE_W);
      if (bird.y + R >= GROUND || bird.y - R < 0) die();
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      for (const p of pipes) {
        ctx.fillStyle = '#1f9d45';
        ctx.fillRect(p.x, 0, PIPE_W, p.top); ctx.fillRect(p.x, p.top + GAP, PIPE_W, GROUND - p.top - GAP);
        ctx.fillStyle = '#33ff66';                          // パイプの先端
        ctx.fillRect(p.x - 4, p.top - 18, PIPE_W + 8, 18); ctx.fillRect(p.x - 4, p.top + GAP, PIPE_W + 8, 18);
      }
      ctx.fillStyle = '#14502b'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#33ff66'; ctx.fillRect(0, GROUND, W, 3);
      ctx.fillStyle = '#ffe66d'; ctx.beginPath(); ctx.arc(BX, bird.y, R, 0, 7); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(BX + 3, bird.y - 5, 4, 4);
      ctx.fillStyle = '#ff9a3c'; ctx.fillRect(BX + R - 2, bird.y, 8, 4);
      ctx.fillStyle = '#33ff66'; ctx.textAlign = 'center'; ctx.font = 'bold 48px monospace';
      ctx.fillText(score, W / 2, 70);
      ctx.font = '16px monospace';
      if (state === 'ready') ctx.fillText('Space でスタート', W / 2, H / 2 + 60);
      ctx.textAlign = 'right'; ctx.fillText('BEST ' + best, W - 12, 24);
      if (state === 'over') drawOverlay(ctx, W, H, 'GAME OVER', `SCORE ${score}  BEST ${best}  / Enter でリスタート`);
    }

    reset();
    const stop = startLoop(update, draw);
    return {
      key(e) {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') flap();
        else if (e.code === 'Enter' && state === 'over') reset();
      },
      destroy: stop
    };
  }
});
