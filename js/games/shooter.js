'use strict';
registerGame('shooter', {
  desc: 'スペースシューティング',
  hint: '← → ↑ ↓ / WASD 移動 / Space 弾 / Enter リスタート / Esc 戻る',
  create(cv) {
    const W = 480, H = 640;
    const ctx = sizeCanvas(cv, W, H);
    const keys = {};
    const stars = Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(20, 120) }));
    let ship, bullets, enemies, parts, score, lives, over, time, spawnT, shootT, inv;

    function reset() {
      ship = { x: W / 2, y: H - 60 }; bullets = []; enemies = []; parts = [];
      score = 0; lives = 3; over = false; time = 0; spawnT = 0.5; shootT = 0; inv = 0;
    }
    function burst(x, y, col, n = 14) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, 6.28), v = rnd(40, 220);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.7), col });
      }
    }
    function update(dt) {
      for (const s of stars) { s.y += s.s * dt; if (s.y > H) { s.y = 0; s.x = rnd(0, W); } }
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      parts = parts.filter(p => p.life > 0);
      if (over) return;
      time += dt;
      const dx = ((keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA) ? 1 : 0);
      const dy = ((keys.ArrowDown || keys.KeyS) ? 1 : 0) - ((keys.ArrowUp || keys.KeyW) ? 1 : 0);
      ship.x = clamp(ship.x + dx * 300 * dt, 16, W - 16);
      ship.y = clamp(ship.y + dy * 300 * dt, 40, H - 24);
      shootT -= dt;
      if (keys.Space && shootT <= 0) {
        shootT = 0.17;
        bullets.push({ x: ship.x - 9, y: ship.y - 12 }, { x: ship.x + 9, y: ship.y - 12 });
        SFX.shoot();
      }
      bullets.forEach(b => b.y -= 640 * dt);
      bullets = bullets.filter(b => b.y > -10);
      spawnT -= dt;
      if (spawnT <= 0) {                                       // 時間がたつほど敵が増える
        spawnT = Math.max(0.28, 1.0 - time * 0.012);
        const zig = Math.random() < 0.3, bx = rnd(60, W - 60);
        enemies.push({ x: bx, bx, y: -20, vy: 90 + time * 2 + rnd(0, 50), zig, hp: zig ? 2 : 1, ph: rnd(0, 6) });
      }
      for (const e of enemies) { e.y += e.vy * dt; if (e.zig) e.x = e.bx + Math.sin(e.ph + e.y / 40) * 50; }
      enemies = enemies.filter(e => e.y < H + 30);
      for (const e of enemies) for (const b of bullets) {
        if (e.hp > 0 && b.y > -50 && Math.hypot(e.x - b.x, e.y - b.y) < 17) {
          b.y = -100; e.hp--;
          if (e.hp <= 0) { score += e.zig ? 200 : 100; burst(e.x, e.y, e.zig ? '#b050f0' : '#ff5470'); SFX.boom(); }
          else SFX.brick();
        }
      }
      enemies = enemies.filter(e => e.hp > 0);
      inv -= dt;
      if (inv <= 0) for (const e of enemies) {
        if (Math.hypot(e.x - ship.x, e.y - ship.y) < 22) {
          e.hp = 0; burst(e.x, e.y, '#ff5470'); SFX.boom();
          lives--; inv = 1.6;                                  // 被弾後は少しの間無敵
          if (lives <= 0) { over = true; burst(ship.x, ship.y, '#33ff66', 40); SFX.gameover(); }
          break;
        }
      }
      enemies = enemies.filter(e => e.hp > 0);
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#7dffb0';
      for (const s of stars) ctx.fillRect(s.x, s.y, s.s > 80 ? 2 : 1, s.s > 80 ? 2 : 1);
      ctx.fillStyle = '#ffe66d';
      for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
      for (const e of enemies) {
        ctx.fillStyle = e.zig ? '#b050f0' : '#ff5470';
        ctx.beginPath(); ctx.moveTo(e.x, e.y + 16); ctx.lineTo(e.x + 16, e.y - 4);
        ctx.lineTo(e.x + 8, e.y - 14); ctx.lineTo(e.x - 8, e.y - 14); ctx.lineTo(e.x - 16, e.y - 4);
        ctx.closePath(); ctx.fill();
      }
      if (!over && !(inv > 0 && Math.floor(inv * 10) % 2)) {
        ctx.fillStyle = '#33ff66';
        ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 18); ctx.lineTo(ship.x + 15, ship.y + 14);
        ctx.lineTo(ship.x, ship.y + 7); ctx.lineTo(ship.x - 15, ship.y + 14); ctx.closePath(); ctx.fill();
      }
      for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 3, 3); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#33ff66'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SCORE ' + score, 10, 24);
      ctx.textAlign = 'right'; ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 10, 24);
      if (over) drawOverlay(ctx, W, H, 'GAME OVER', 'Enter でリスタート');
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
