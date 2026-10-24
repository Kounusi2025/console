'use strict';
registerGame('typing', {
  desc: 'タイピング (落ちてくる英単語を打つ)',
  hint: '英字で入力 / Backspace で選択解除 / Enter リスタート / Esc 戻る',
  create(cv) {
    const W = 640, H = 480, CW = 13;                       // CW: 1文字の幅(px)
    const ctx = sizeCanvas(cv, W, H);
    const WORDS = ['console', 'terminal', 'kernel', 'buffer', 'script', 'python', 'server', 'packet', 'binary',
      'cursor', 'window', 'memory', 'thread', 'branch', 'commit', 'deploy', 'docker', 'linux', 'login', 'token',
      'cache', 'pixel', 'sprite', 'level', 'score', 'tetris', 'maze', 'pong', 'snake', 'shoot', 'block', 'craft',
      'mine', 'world', 'portal', 'nether', 'diamond', 'redstone', 'creeper', 'zombie', 'sword', 'pickaxe',
      'plugin', 'lobby', 'survival', 'command', 'teleport', 'inventory', 'glitch', 'noise', 'retro', 'arcade'];
    let words, target, score, lives, over, spawnT, time, combo;

    function reset() { words = []; target = null; score = 0; lives = 5; over = false; spawnT = 0.5; time = 0; combo = 0; }
    function spawn() {
      const used = new Set(words.map(w => w.s));
      const pool = WORDS.filter(s => !used.has(s));
      const s = pool[rndInt(0, pool.length)];
      words.push({ s, x: rnd(20, W - 20 - s.length * CW), y: -10, vy: 40 + time * 0.8 + rnd(0, 20), typed: 0 });
    }
    function type(ch) {
      if (!target) {                                       // 先頭が合う単語のうち、いちばん下にあるものを狙う
        const c = words.filter(w => w.s[0] === ch).sort((a, b) => b.y - a.y)[0];
        if (!c) { SFX.wall(); combo = 0; return; }
        target = c;
      }
      if (target.s[target.typed] !== ch) { SFX.wall(); combo = 0; return; }
      target.typed++; SFX.step();
      if (target.typed === target.s.length) {
        score += target.s.length * 10 + combo * 5; combo++;
        words = words.filter(w => w !== target); target = null; SFX.brick();
      }
    }
    function update(dt) {
      if (over) return;
      time += dt; spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.7, 2.2 - time * 0.02); spawn(); }
      for (const w of words) w.y += w.vy * dt;
      for (const w of words.filter(w => w.y > H - 30)) {
        words = words.filter(x => x !== w);
        if (w === target) target = null;
        lives--; combo = 0; SFX.boom();
        if (lives <= 0) { over = true; SFX.gameover(); }
      }
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,84,112,.5)'; ctx.fillRect(0, H - 30, W, 2);
      ctx.font = '22px monospace'; ctx.textAlign = 'left';
      for (const w of words) {
        const done = w.s.slice(0, w.typed), rest = w.s.slice(w.typed);
        ctx.fillStyle = '#33ff66'; ctx.fillText(done, w.x, w.y);
        ctx.fillStyle = '#e8ffee'; ctx.fillText(rest, w.x + done.length * CW, w.y);
        if (w === target) { ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 2; ctx.strokeRect(w.x - 4, w.y - 20, w.s.length * CW + 8, 28); }
      }
      ctx.fillStyle = '#33ff66'; ctx.font = '16px monospace';
      ctx.fillText('SCORE ' + score, 10, H - 8);
      if (combo > 1) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffe66d'; ctx.fillText(combo + ' COMBO', W / 2, H - 8); }
      ctx.textAlign = 'right'; ctx.fillStyle = '#33ff66'; ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 10, H - 8);
      if (over) drawOverlay(ctx, W, H, 'GAME OVER', `SCORE ${score}  / Enter でリスタート`);
    }

    reset();
    const stop = startLoop(update, draw);
    return {
      textInput: true,                                     // M / F などの共通ショートカットを無効にする
      key(e) {
        if (over) { if (e.code === 'Enter') reset(); return; }
        if (e.key.length === 1 && /[a-z]/i.test(e.key)) type(e.key.toLowerCase());
        else if (e.code === 'Backspace') target = null;
      },
      destroy: stop
    };
  }
});
