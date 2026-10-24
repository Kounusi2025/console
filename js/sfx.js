'use strict';
/* サウンド: Web Audio で合成するので音声ファイルは不要 */

const SFX = (() => {
  const VOLUME = 0.5;
  let ac = null, master = null, noiseBuf = null, lastKey = 0;
  let muted = !!store.get('muted', false);

  /* ブラウザの仕様でユーザー操作のあとにしか鳴らせないので、キー入力のたびに呼ぶ */
  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : VOLUME;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  }
  function setMuted(m) {
    muted = m; store.set('muted', m);
    if (master) master.gain.setTargetAtTime(m ? 0 : VOLUME, ac.currentTime, 0.02);
  }

  /* 基本の音: tone(周波数, 長さ, {type, vol, to(スライド先), at(遅延秒), when(絶対時刻)}) */
  function tone(freq, dur, o = {}) {
    if (!ac || muted) return;
    const { type = 'square', vol = 0.1, to = null, at = 0, when = null, attack = 0.004 } = o;
    const t = when ?? (ac.currentTime + at);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(dur, o = {}) {
    if (!ac || muted) return;
    const { vol = 0.1, freq = 1000, q = 1, type = 'bandpass', to = null, at = 0 } = o;
    const t = ac.currentTime + at;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.03);
  }
  const arp = (freqs, dur, o = {}, gap = 0.06) =>
    freqs.forEach((f, i) => tone(f, dur, { ...o, at: i * gap }));

  /* バグ演出の音: ノイズ + デジタルなピー音 + 低いうなり */
  function glitch(dur, intensity = 1) {
    if (!ac || muted) return;
    const t0 = ac.currentTime, end = t0 + dur;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    const ng = ac.createGain(); ng.gain.value = 0;
    src.connect(bp); bp.connect(ng); ng.connect(master);
    const osc = ac.createOscillator(); osc.type = 'sawtooth';
    const og = ac.createGain(); og.gain.value = 0;
    osc.connect(og); og.connect(master);
    const rum = ac.createOscillator(); rum.type = 'sine';
    rum.frequency.setValueAtTime(110, t0); rum.frequency.exponentialRampToValueAtTime(35, end);
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.linearRampToValueAtTime(0.2 * intensity, t0 + dur * 0.5);
    rg.gain.linearRampToValueAtTime(0.0001, end);
    rum.connect(rg); rg.connect(master);

    for (let t = 0; t < dur; t += 0.045) {            // 約45msごとにランダムに変化
      const amp = Math.sin((t / dur) * Math.PI) * intensity;
      bp.frequency.setValueAtTime(300 + Math.random() * 5000, t0 + t);
      ng.gain.setValueAtTime(Math.random() < 0.35 + amp * 0.5 ? 0.06 + 0.14 * amp : 0, t0 + t);
      osc.frequency.setValueAtTime(80 + Math.random() * 1800 * (0.4 + amp), t0 + t);
      og.gain.setValueAtTime(Math.random() < 0.3 ? 0.01 + 0.03 * amp : 0, t0 + t);
    }
    ng.gain.setValueAtTime(0, end); og.gain.setValueAtTime(0, end);
    src.start(t0); osc.start(t0); rum.start(t0);
    [src, osc, rum].forEach(n => n.stop(end + 0.05));
  }

  /* BGM: ロシア民謡「コロベイニキ」(パブリックドメイン)。テトリスで使用 */
  const N = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, A4: 440, B4: 493.88 };
  const MEL = [
    [N.E5,1],[N.B4,.5],[N.C5,.5],[N.D5,1],[N.C5,.5],[N.B4,.5],
    [N.A4,1],[N.A4,.5],[N.C5,.5],[N.E5,1],[N.D5,.5],[N.C5,.5],
    [N.B4,1.5],[N.C5,.5],[N.D5,1],[N.E5,1],
    [N.C5,1],[N.A4,1],[N.A4,1],[0,1],
    [N.D5,1.5],[N.F5,.5],[N.A5,1],[N.G5,.5],[N.F5,.5],
    [N.E5,1.5],[N.C5,.5],[N.E5,1],[N.D5,.5],[N.C5,.5],
    [N.B4,1],[N.B4,.5],[N.C5,.5],[N.D5,1],[N.E5,1],
    [N.C5,1],[N.A4,1],[N.A4,1],[0,1]
  ];
  const ROOTS = [110, 110, 164.81, 110, 146.83, 130.81, 164.81, 110];   // A A E A D C E A
  const LOOP = 32;
  const EVENTS = [];
  {
    let b = 0;
    for (const [f, d] of MEL) { EVENTS.push({ beat: b, f, d, k: 'm' }); b += d; }
    ROOTS.forEach((r, bar) => {
      for (let i = 0; i < 4; i++) EVENTS.push({ beat: bar * 4 + i, f: i % 2 ? r * 1.5 : r, d: 1, k: 'b' });
    });
    EVENTS.sort((a, b) => a.beat - b.beat);
  }

  let timer = null, playing = false, idx = 0, nextTime = 0, getLevel = () => 1;
  const spb = () => 60 / Math.min(210, 140 + (getLevel() - 1) * 9);   // レベルが上がると速くなる
  function pump() {                                    // 先読みで少し先の音まで予約する
    if (!ac) return;
    if (nextTime < ac.currentTime - 0.5) nextTime = ac.currentTime;   // タブ復帰時の遅れを捨てる
    while (nextTime < ac.currentTime + 0.25) {
      const ev = EVENTS[idx], s = spb();
      if (ev.f) tone(ev.f, ev.d * s * 0.92, ev.k === 'm'
        ? { type: 'square', vol: 0.04, when: nextTime, attack: 0.01 }
        : { type: 'triangle', vol: 0.11, when: nextTime, attack: 0.01 });
      const ni = (idx + 1) % EVENTS.length;
      const nb = ni === 0 ? LOOP + EVENTS[0].beat : EVENTS[ni].beat;
      nextTime += (nb - ev.beat) * s;
      idx = ni;
    }
  }
  function musicStart(lv, delay = 0.3) {
    if (!ac) return;
    clearInterval(timer);
    getLevel = lv; idx = 0; playing = true; nextTime = ac.currentTime + delay;
    timer = setInterval(pump, 60);
  }
  function musicStop() { playing = false; clearInterval(timer); timer = null; }
  function musicPause() { clearInterval(timer); timer = null; }
  function musicResume() {
    if (!playing || timer || !ac) return;
    nextTime = ac.currentTime + 0.05; timer = setInterval(pump, 60);
  }

  return {
    unlock, setMuted, isMuted: () => muted,
    toggle() { setMuted(!muted); return muted; },
    glitch, musicStart, musicStop, musicPause, musicResume,

    /* コンソール */
    key() {
      const n = performance.now(); if (n - lastKey < 30) return; lastKey = n;
      tone(900 + Math.random() * 300, 0.02, { vol: 0.025 });
    },
    ok() { tone(880, 0.06, { vol: 0.05 }); tone(1320, 0.08, { vol: 0.05, at: 0.06 }); },
    boot() {
      arp([262, 330, 392, 523, 659, 784, 1047], 0.12, { vol: 0.07 });
      noise(0.4, { vol: 0.08, freq: 400, to: 6000, q: 0.7 });
    },

    /* ゲーム共通 */
    move()   { tone(220, 0.04, { vol: 0.05 }); },
    rotate() { tone(440, 0.07, { vol: 0.06, to: 700 }); },
    tick()   { tone(150, 0.03, { type: 'triangle', vol: 0.06 }); },
    step()   { tone(300, 0.03, { type: 'triangle', vol: 0.05 }); },
    wall()   { tone(260, 0.04, { vol: 0.06 }); },
    paddle() { tone(380, 0.06, { type: 'triangle', vol: 0.12, to: 520 }); },
    brick()  { tone(700 + Math.random() * 500, 0.06, { vol: 0.07 }); },
    shoot()  { tone(900, 0.07, { vol: 0.035, to: 300 }); },
    eat()    { tone(660, 0.07, { vol: 0.07, to: 990 }); },
    place()  { tone(520, 0.07, { vol: 0.09 }); },
    place2() { tone(340, 0.09, { type: 'triangle', vol: 0.12 }); },
    flip()   { tone(600, 0.05, { type: 'triangle', vol: 0.08, to: 800 }); },
    match()  { arp([660, 990], 0.1, { vol: 0.08 }, 0.08); },
    lock()   { tone(110, 0.09, { type: 'triangle', vol: 0.16, to: 70 }); },
    drop() {
      noise(0.14, { vol: 0.35, freq: 900, to: 80, type: 'lowpass' });
      tone(90, 0.18, { type: 'sine', vol: 0.3, to: 40 });
    },
    boom() {
      noise(0.28, { vol: 0.28, freq: 1800, to: 100, type: 'lowpass' });
      tone(120, 0.22, { type: 'sawtooth', vol: 0.08, to: 40 });
    },
    clear(n) {
      arp(n >= 4 ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047].slice(0, n + 1), 0.13, { vol: 0.08 });
      noise(0.2, { vol: 0.12, freq: 3000, q: 0.5, type: 'highpass' });
    },
    levelup()  { arp([392, 523, 659, 784, 1047], 0.14, { type: 'triangle', vol: 0.1 }, 0.07); },
    gameover() { arp([392, 330, 262, 196, 131], 0.3, { type: 'sawtooth', vol: 0.08 }, 0.18); },
    pause()    { tone(330, 0.08, { vol: 0.06 }); tone(220, 0.1, { vol: 0.06, at: 0.08 }); }
  };
})();
