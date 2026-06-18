/* =========================================================================
 * audio.js — WebAudio チップチューン（BGM＋効果音）。素材なしで合成。
 * ========================================================================= */
(function (global) {
  'use strict';

  let actx = null;
  let master = null;
  let enabled = true;
  let curName = null;
  let scheduler = null;
  let nextTime = 0;
  let stepIndex = 0;
  let curTrack = null;
  const LOOKAHEAD = 0.1, INTERVAL = 25;

  function ensure() {
    if (actx) return;
    try {
      actx = new (global.AudioContext || global.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.22;
      master.connect(actx.destination);
    } catch (e) { enabled = false; }
  }

  // 音名 → 周波数
  function freq(name) {
    if (!name || name === '-' || name === '.') return 0;
    const m = name.match(/^([A-G])(#|b)?(\d)$/);
    if (!m) return 0;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    let semi = base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const oct = parseInt(m[3], 10);
    const midi = semi + (oct + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // "C4 E4 G4 -" を1トークン=8分音符として展開。'.' は前音を延長、'-' は休符
  function seq(str) {
    const toks = str.trim().split(/\s+/);
    const out = [];
    for (const t of toks) {
      if (t === '.') { if (out.length) out[out.length - 1].dur += 1; else out.push({ f: 0, dur: 1 }); }
      else out.push({ f: t === '-' ? 0 : freq(t), dur: 1 });
    }
    return out;
  }

  // ---- 楽曲（8分音符グリッド、ループ） ----
  const TRACKS = {
    title: {
      bpm: 110,
      ch: [
        { wave: 'triangle', vol: 0.5, notes: seq('C5 E5 G5 . C6 . G5 . E5 G5 C6 . E6 . D6 . C5 E5 G5 . A5 . F5 . D5 F5 A5 . G5 . E5 .') },
        { wave: 'square', vol: 0.25, notes: seq('C3 . G3 . C3 . G3 . C3 . G3 . D3 . G3 . C3 . G3 . A3 . E3 . F3 . C3 . G3 . G3 .') }
      ]
    },
    town: {
      bpm: 120,
      ch: [
        { wave: 'square', vol: 0.4, notes: seq('E5 G5 C6 G5 A5 C6 E6 C6 D6 B5 G5 B5 C6 . . . E5 G5 C6 G5 F5 A5 D6 A5 G5 E5 C5 E5 G5 . . .') },
        { wave: 'triangle', vol: 0.3, notes: seq('C3 . . . F3 . . . G3 . . . C3 . . . C3 . . . F3 . . . G3 . . . G3 . . .') }
      ]
    },
    route: {
      bpm: 140,
      ch: [
        { wave: 'square', vol: 0.38, notes: seq('G5 A5 G5 E5 C5 E5 G5 . A5 G5 E5 C5 D5 . . . G5 A5 G5 E5 C5 E5 G5 . A5 C6 B5 A5 G5 . . .') },
        { wave: 'triangle', vol: 0.3, notes: seq('C3 G3 C3 G3 A2 E3 A2 E3 F2 C3 F2 C3 G2 D3 G2 D3 C3 G3 C3 G3 A2 E3 A2 E3 F2 C3 G2 D3 C3 . . .') }
      ]
    },
    battle: {
      bpm: 150,
      ch: [
        { wave: 'square', vol: 0.38, notes: seq('A5 . A5 G5 A5 . C6 . B5 A5 G5 A5 E5 . . . A5 . A5 G5 A5 . E6 . D6 C6 B5 A5 B5 . . .') },
        { wave: 'sawtooth', vol: 0.18, notes: seq('A2 A2 E3 A2 A2 A2 E3 A2 F2 F2 C3 F2 G2 G2 D3 G2 A2 A2 E3 A2 A2 A2 E3 A2 E2 E2 B2 E2 A2 . . .') }
      ]
    },
    victory: {
      bpm: 150, once: true,
      ch: [
        { wave: 'square', vol: 0.45, notes: seq('C5 . C5 C5 . C5 . C5 . E5 . . G5 . . . C6 . . . G5 . C6 . . . . .') },
        { wave: 'triangle', vol: 0.3, notes: seq('C3 . C3 C3 . C3 . C3 . C3 . . E3 . . . C3 . . . G3 . G3 . C3 . . .') }
      ]
    },
    heal: {
      bpm: 130, once: true,
      ch: [
        { wave: 'triangle', vol: 0.4, notes: seq('C5 E5 G5 C6 . . . . G5 C6 E6 G6 . . . .') }
      ]
    }
  };

  function scheduleStep(track, idx, when) {
    for (const c of track.ch) {
      const ev = c.notes[idx % c.notes.length];
      if (!ev || ev.f <= 0) continue;
      const beat = 60 / track.bpm / 2; // 8分音符の秒数
      const dur = ev.dur * beat;
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = c.wave;
      osc.frequency.setValueAtTime(ev.f, when);
      const peak = c.vol;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.9);
      osc.connect(g); g.connect(master);
      osc.start(when); osc.stop(when + dur);
    }
  }

  function loopScheduler() {
    if (!actx || !curTrack) return;
    const beat = 60 / curTrack.bpm / 2;
    while (nextTime < actx.currentTime + LOOKAHEAD) {
      const len = curTrack.ch[0].notes.length;
      if (curTrack.once && stepIndex >= len) { stopBGM(); if (curTrack._then) curTrack._then(); return; }
      scheduleStep(curTrack, stepIndex, nextTime);
      nextTime += beat;
      stepIndex++;
    }
  }

  function bgm(name, opts) {
    ensure();
    if (!enabled) return;
    if (curName === name && !(opts && opts.restart)) return;
    stopBGM();
    const t = TRACKS[name];
    if (!t) return;
    curName = name; curTrack = Object.assign({}, t); curTrack._then = opts && opts.then;
    stepIndex = 0; nextTime = actx.currentTime + 0.05;
    scheduler = setInterval(loopScheduler, INTERVAL);
    loopScheduler();
  }

  function stopBGM() {
    if (scheduler) { clearInterval(scheduler); scheduler = null; }
    curTrack = null; curName = null;
  }

  // ジングル（victory等）を鳴らし、終わったら指定BGMへ戻す
  function jingle(name, resumeName) {
    bgm(name, { then: () => { if (resumeName) bgm(resumeName, { restart: true }); } });
  }

  // ---- 効果音 ----
  function blip(f, dur, type, vol, slideTo) {
    ensure(); if (!enabled || !actx) return;
    const osc = actx.createOscillator(), g = actx.createGain();
    osc.type = type || 'square';
    const t = actx.currentTime;
    osc.frequency.setValueAtTime(f, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime((vol || 0.3), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur);
  }

  function sfx(name) {
    if (!enabled) return;
    switch (name) {
      case 'cursor': blip(660, 0.05, 'square', 0.18); break;
      case 'select': blip(880, 0.08, 'square', 0.22); break;
      case 'cancel': blip(330, 0.08, 'square', 0.2); break;
      case 'hit': blip(200, 0.12, 'square', 0.28, 120); break;
      case 'hit_super': blip(160, 0.18, 'sawtooth', 0.32, 80); setTimeout(() => blip(140, 0.12, 'square', 0.25, 70), 60); break;
      case 'hit_weak': blip(300, 0.08, 'sine', 0.18, 240); break;
      case 'faint': blip(440, 0.4, 'square', 0.28, 80); break;
      case 'levelup': blip(523, 0.09, 'square', 0.25); setTimeout(() => blip(659, 0.09, 'square', 0.25), 90); setTimeout(() => blip(784, 0.16, 'square', 0.28), 180); break;
      case 'ball': blip(520, 0.1, 'square', 0.22, 880); break;
      case 'shake': blip(300, 0.06, 'square', 0.18); break;
      case 'catch': blip(659, 0.1, 'square', 0.26); setTimeout(() => blip(880, 0.18, 'triangle', 0.28), 110); break;
      case 'heal': blip(880, 0.1, 'triangle', 0.24); setTimeout(() => blip(1175, 0.18, 'triangle', 0.24), 100); break;
      case 'door': blip(440, 0.06, 'square', 0.2, 660); break;
      case 'bump': blip(140, 0.06, 'square', 0.18); break;
      case 'run': blip(784, 0.06, 'square', 0.2); setTimeout(() => blip(523, 0.1, 'square', 0.2), 60); break;
      case 'encounter': blip(660, 0.06, 'square', 0.25); setTimeout(() => blip(440, 0.06, 'square', 0.25), 70); setTimeout(() => blip(880, 0.1, 'square', 0.28), 140); break;
    }
  }

  // 最初のユーザー操作でAudioContextを起こす
  function unlock() {
    ensure();
    if (actx && actx.state === 'suspended') actx.resume();
  }
  global.addEventListener('keydown', unlock, { once: false });
  global.addEventListener('touchstart', unlock, { once: false });
  global.addEventListener('mousedown', unlock, { once: false });

  global.Audio2 = {
    bgm, stopBGM, jingle, sfx, unlock,
    setEnabled: v => { enabled = v; if (!v) stopBGM(); },
    isEnabled: () => enabled,
    current: () => curName
  };
})(window);
