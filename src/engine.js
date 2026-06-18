/* =========================================================================
 * engine.js — コアエンジン：ループ／入力／GBA風UI／モンスター生成／セーブ
 * ========================================================================= */
(function (global) {
  'use strict';
  const D = global.GameData;

  const W = 240, H = 160;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ---------- 入力 ----------
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyZ: 'a', KeyX: 'b', Enter: 'start', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down'
  };
  const down = {}, justDown = {};
  function setBtn(name, isDown) {
    if (isDown) { if (!down[name]) justDown[name] = true; down[name] = true; }
    else { down[name] = false; }
  }
  window.addEventListener('keydown', e => {
    const b = KEYMAP[e.code];
    if (b) { e.preventDefault(); setBtn(b, true); }
  });
  window.addEventListener('keyup', e => {
    const b = KEYMAP[e.code];
    if (b) { e.preventDefault(); setBtn(b, false); }
  });
  document.querySelectorAll('.btn[data-key]').forEach(el => {
    const code = el.getAttribute('data-key');
    const b = KEYMAP[code];
    if (!b) return;
    const on = e => { e.preventDefault(); setBtn(b, true); };
    const off = e => { e.preventDefault(); setBtn(b, false); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
    el.addEventListener('mouseleave', off);
  });

  const Input = {
    held: n => !!down[n],
    pressed: n => !!justDown[n],
    clear: () => { for (const k in justDown) delete justDown[k]; },
    flush: () => { for (const k in down) down[k] = false; for (const k in justDown) delete justDown[k]; }
  };

  // ---------- 状態スタック ----------
  const states = [];
  function pushState(s) { states.push(s); if (s.enter) s.enter(); }
  function popState() { const s = states.pop(); if (s && s.exit) s.exit(); }
  function setState(s) { while (states.length) popState(); pushState(s); }
  function topState() { return states[states.length - 1]; }
  function replaceTop(s) { popState(); pushState(s); }

  // ---------- 描画ヘルパ ----------
  function clear(color) { ctx.fillStyle = color || '#000'; ctx.fillRect(0, 0, W, H); }

  function setFont(px) { ctx.font = px + 'px "Courier New", monospace'; ctx.textBaseline = 'top'; }

  function text(str, x, y, color, px) {
    setFont(px || 8);
    ctx.fillStyle = color || '#303030';
    ctx.fillText(str, x, y);
  }
  // 影付きテキスト（GBA風）
  function textShadow(str, x, y, color, shadowCol, px) {
    setFont(px || 8);
    ctx.fillStyle = shadowCol || '#a8b0b8';
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color || '#384048';
    ctx.fillText(str, x, y);
  }

  // GBA風ウィンドウ枠
  function window9(x, y, w, h, opts) {
    opts = opts || {};
    const fill = opts.fill || '#f8f8f8';
    const border = opts.border || '#3060a8';
    const inner = opts.inner || '#a0c0e8';
    ctx.fillStyle = border; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = inner; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = fill; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  }

  // メッセージウィンドウ（下部）
  function messageBox() { window9(4, H - 44, W - 8, 40, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' }); }

  // HP/EXP バー
  function bar(x, y, w, ratio, color, bg) {
    ctx.fillStyle = bg || '#404850'; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(0, Math.round(w * ratio)), 3);
  }
  function hpColor(ratio) {
    if (ratio > 0.5) return '#40c860'; if (ratio > 0.2) return '#f0c020'; return '#e85040';
  }

  // 三角カーソル
  function cursor(x, y, color) {
    ctx.fillStyle = color || '#384048';
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x, y + 6); ctx.closePath();
    ctx.fill();
  }

  // ---------- モンスター生成・成長 ----------
  function calcStats(speciesId, level, ivs, evs) {
    const sp = D.SPECIES[speciesId];
    const b = sp.base; const s = {};
    const e = evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    s.hp = Math.floor((2 * b.hp + ivs.hp + Math.floor(e.hp / 4)) * level / 100) + level + 10;
    for (const k of ['atk', 'def', 'spa', 'spd', 'spe']) {
      s[k] = Math.floor((2 * b[k] + ivs[k] + Math.floor(e[k] / 4)) * level / 100) + 5;
    }
    return s;
  }

  function movesForLevel(speciesId, level) {
    const sp = D.SPECIES[speciesId];
    const learned = sp.learnset.filter(([lv]) => lv <= level).map(([, m]) => m);
    // 重複除去して最新4つ
    const uniq = [];
    for (const m of learned) { const i = uniq.indexOf(m); if (i >= 0) uniq.splice(i, 1); uniq.push(m); }
    return uniq.slice(-4).map(name => ({ name, pp: D.MOVES[name].pp, maxpp: D.MOVES[name].pp }));
  }

  function randIV() { return Math.floor(Math.random() * 32); }

  function createMonster(speciesId, level, opts) {
    opts = opts || {};
    const ivs = { hp: randIV(), atk: randIV(), def: randIV(), spa: randIV(), spd: randIV(), spe: randIV() };
    const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const stats = calcStats(speciesId, level, ivs, evs);
    const sp = D.SPECIES[speciesId];
    return {
      species: speciesId,
      name: opts.nickname || sp.name,
      level,
      ivs, evs, stats,
      hp: stats.hp,
      exp: D.expForLevel(sp.expGroup, level),
      moves: opts.moves || movesForLevel(speciesId, level),
      status: null,      // 'poison'|'burn'|'paralyze'|'sleep'|'freeze'|null
      sleepTurns: 0
    };
  }

  function recalc(mon) {
    const before = mon.stats.hp;
    mon.stats = calcStats(mon.species, mon.level, mon.ivs, mon.evs);
    const diff = mon.stats.hp - before;
    if (diff > 0) mon.hp += diff;            // レベルアップでHP上限増加分を加算
    if (mon.hp > mon.stats.hp) mon.hp = mon.stats.hp;
  }

  // 経験値付与 → レベルアップ／技習得／進化候補を返す
  function gainExp(mon, amount) {
    const sp = D.SPECIES[mon.species];
    const events = { levels: [], learned: [], evolve: null, gained: amount };
    mon.exp += amount;
    while (mon.level < 100 && mon.exp >= D.expForLevel(sp.expGroup, mon.level + 1)) {
      mon.level++;
      recalc(mon);
      events.levels.push(mon.level);
      // 技習得
      for (const [lv, mv] of sp.learnset) {
        if (lv === mon.level && !mon.moves.find(m => m.name === mv)) {
          if (mon.moves.length < 4) { mon.moves.push({ name: mv, pp: D.MOVES[mv].pp, maxpp: D.MOVES[mv].pp }); events.learned.push(mv); }
          else events.learned.push(mv); // 4つ埋まっていても通知（簡易版では自動では覚えない）
        }
      }
      // 進化
      if (sp.evolve && mon.level >= sp.evolve.level && !events.evolve) events.evolve = sp.evolve.to;
    }
    return events;
  }

  function evolve(mon, toId) {
    mon.species = toId;
    if (mon.name === D.SPECIES[mon.species] ? false : true) { /* keep nickname logic below */ }
    const wasDefaultName = true;
    mon.name = D.SPECIES[toId].name;
    recalc(mon);
  }

  function expYield(foe) {
    const sp = D.SPECIES[foe.species];
    return Math.floor(sp.baseExp * foe.level / 7);
  }

  function pct(mon) { return mon.hp / mon.stats.hp; }
  function isFainted(mon) { return mon.hp <= 0; }
  function fullHeal(mon) {
    mon.hp = mon.stats.hp; mon.status = null; mon.sleepTurns = 0;
    for (const m of mon.moves) m.pp = m.maxpp;
  }

  // ---------- セーブ / ロード ----------
  const SAVE_KEY = 'monster_emerald_save_v1';
  function save() {
    try {
      const data = {
        player: G.player, party: G.party, bag: G.bag, money: G.money,
        flags: G.flags, pos: G.pos, dex: G.dex, time: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

  // ---------- ゲーム全体状態 ----------
  const G = {
    W, H, ctx, canvas, Input,
    pushState, popState, setState, topState, replaceTop, states,
    clear, text, textShadow, window9, messageBox, bar, hpColor, cursor, setFont,
    D, Sprites: global.Sprites,
    createMonster, calcStats, gainExp, evolve, recalc, expYield, pct, isFainted, fullHeal, movesForLevel,
    save, load, hasSave,
    // ランタイムデータ（newGame で初期化）
    player: null, party: [], bag: {}, money: 0, flags: {}, pos: null, dex: {}
  };

  G.applySave = function (d) {
    G.player = d.player; G.party = d.party; G.bag = d.bag; G.money = d.money;
    G.flags = d.flags || {}; G.pos = d.pos; G.dex = d.dex || {};
  };

  G.newGame = function (name, starterId) {
    G.player = { name: name || 'ヒカル', gender: 'm' };
    G.party = [G.createMonster(starterId, 5)];
    G.bag = { monball: 5, potion: 3 };
    G.money = 3000;
    G.flags = { gotStarter: true };
    G.dex = {}; G.dex[starterId] = 'owned';
    G.pos = { map: 'town', x: 8, y: 9, dir: 'down' };
  };

  G.dexSee = function (id) { if (!G.dex[id]) G.dex[id] = 'seen'; };
  G.dexOwn = function (id) { G.dex[id] = 'owned'; };

  // バッグ操作
  G.addItem = function (id, n) { G.bag[id] = (G.bag[id] || 0) + (n || 1); };
  G.useItem = function (id) { if (G.bag[id]) { G.bag[id]--; if (G.bag[id] <= 0) delete G.bag[id]; return true; } return false; };

  // ---------- メインループ ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last); last = now;
    try {
      const s = topState();
      if (s && s.update) s.update(dt);
      if (s && s.render) {
        // 下層も描く必要がある状態（メニュー等）は drawUnder フラグで
        if (s.drawUnder && states.length > 1) {
          const under = states[states.length - 2];
          if (under && under.render) under.render();
        }
        s.render();
      }
    } catch (err) {
      console.error('frame error:', err);
    }
    Input.clear();
    requestAnimationFrame(frame);
  }
  G.start = function () {
    const ld = document.getElementById('loading');
    if (ld) ld.style.display = 'none';
    requestAnimationFrame(frame);
  };

  global.G = G;
})(window);
