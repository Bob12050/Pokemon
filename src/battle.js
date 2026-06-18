/* =========================================================================
 * battle.js — ターン制バトル（第3世代システム準拠）
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.G;
  const D = G.D;
  const S = global.Sprites;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function chance(p) { return Math.random() * 100 < p; }
  function stageMul(st) { return st >= 0 ? (2 + st) / 2 : 2 / (2 - st); }
  function accMul(st) { return st >= 0 ? (3 + st) / 3 : 3 / (3 - st); }

  function Battler(mon, isFoe) {
    this.mon = mon;
    this.isFoe = isFoe;
    this.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
    this.flinch = false;
    this.confuse = 0;
    this.recharge = false;
    this.charging = null;
    this.dispHP = mon.hp;
  }
  Battler.prototype.eff = function (key) {
    let v = this.mon.stats[key] * stageMul(this.stages[key]);
    if (key === 'atk' && this.mon.status === 'burn') v *= 0.5;
    if (key === 'spe' && this.mon.status === 'paralyze') v *= 0.25;
    return v;
  };
  Battler.prototype.name = function () { return this.mon.name; };

  // ---------- バトル状態 ----------
  function BattleState(foeMon, opts) {
    this.opts = opts || {};
    this.foeParty = (this.opts.foeParty && this.opts.foeParty.length) ? this.opts.foeParty : [foeMon];
    this.foeIndex = 0;
    this.foe = new Battler(this.foeParty[0], true);
    this.me = new Battler(G.party.find(m => m.hp > 0) || G.party[0], false);
    this.activeIndex = G.party.indexOf(this.me.mon);
    this.phase = 'intro';
    this.menuIndex = 0;
    this.moveIndex = 0;
    this.subIndex = 0;
    this.queue = [];
    this.printed = '';
    this.full = '';
    this.tick = 0;
    this.flash = 0;
    this.flashFull = 0;
    this.slideT = 26;          // 登場スライドイン
    this.foeFaintT = 0; this.meFaintT = 0;
    this.shakeFoe = 0; this.shakeMe = 0;
    this.foeVisible = true; this.meVisible = true;
    this.ballAnim = null;
    this.runCount = 0;
    this.ended = false;
    this.bagFilter = null;
    G.dexSee(this.foe.mon.species);
  }

  BattleState.prototype.enter = function () {
    let intro;
    if (this.opts.isWild) intro = ['あ！ やせいの ' + this.foe.name() + 'が とびだしてきた！'];
    else intro = [(this.opts.trainerName || 'トレーナー') + 'が しょうぶを しかけてきた！',
      (this.opts.trainerName || 'トレーナー') + 'は ' + this.foe.name() + 'を くりだした！'];
    intro.push('ゆけ！ ' + this.me.name() + '！');
    this.say(intro, () => { this.phase = 'menu'; });
  };

  // メッセージキュー
  BattleState.prototype.say = function (lines, done) {
    if (typeof lines === 'string') lines = [lines];
    this.queue = lines.slice();
    this.onDone = done || function () {};
    this.phase = 'message';
    this.nextLine();
  };
  BattleState.prototype.nextLine = function () {
    if (this.queue.length === 0) { const d = this.onDone; this.onDone = null; this.printed = this.full = ''; if (d) d(); return; }
    this.full = this.queue.shift();
    this.printed = '';
  };

  BattleState.prototype.update = function (dt) {
    this.tick++;
    if (this.flash > 0) this.flash--;
    if (this.flashFull > 0) this.flashFull--;
    if (this.slideT > 0) this.slideT--;
    if (this.shakeFoe > 0) this.shakeFoe--;
    if (this.shakeMe > 0) this.shakeMe--;
    if (this.foeFaintT > 0) { this.foeFaintT--; if (this.foeFaintT === 0) this.foeVisible = false; }
    if (this.meFaintT > 0) { this.meFaintT--; if (this.meFaintT === 0) this.meVisible = false; }
    // HPバー追従
    for (const b of [this.foe, this.me]) {
      if (b.dispHP < b.mon.hp) b.dispHP = Math.min(b.mon.hp, b.dispHP + Math.max(1, (b.mon.stats.hp) / 60));
      else if (b.dispHP > b.mon.hp) b.dispHP = Math.max(b.mon.hp, b.dispHP - Math.max(1, (b.mon.stats.hp) / 60));
    }

    const I = G.Input;
    if (this.phase === 'message') {
      if (this.printed.length < this.full.length) {
        if (this.tick % 1 === 0) this.printed = this.full.slice(0, this.printed.length + 1);
        if (I.pressed('a') || I.pressed('b')) this.printed = this.full;
      } else {
        if (I.pressed('a') || I.pressed('b')) this.nextLine();
      }
      return;
    }
    if (this.phase === 'menu') return this.updateMenu(I);
    if (this.phase === 'move') return this.updateMove(I);
    if (this.phase === 'bag') return this.updateBag(I);
    if (this.phase === 'party') return this.updateParty(I);
    if (this.phase === 'forget') return this.updateForget(I);
    if (this.phase === 'end') { if (!this.ended) { this.ended = true; this.finish(); } return; }
  };

  // ---------- メインメニュー ----------
  BattleState.prototype.updateMenu = function (I) {
    if (I.pressed('right')) this.menuIndex = this.menuIndex % 2 === 0 ? this.menuIndex + 1 : this.menuIndex;
    if (I.pressed('left')) this.menuIndex = this.menuIndex % 2 === 1 ? this.menuIndex - 1 : this.menuIndex;
    if (I.pressed('down')) this.menuIndex = this.menuIndex < 2 ? this.menuIndex + 2 : this.menuIndex;
    if (I.pressed('up')) this.menuIndex = this.menuIndex >= 2 ? this.menuIndex - 2 : this.menuIndex;
    if (I.pressed('a')) {
      if (this.menuIndex === 0) { this.phase = 'move'; this.moveIndex = 0; }
      else if (this.menuIndex === 1) { this.phase = 'bag'; this.subIndex = 0; }
      else if (this.menuIndex === 2) { this.openParty(); }
      else if (this.menuIndex === 3) { this.tryRun(); }
    }
  };

  // ---------- わざ選択 ----------
  BattleState.prototype.updateMove = function (I) {
    const moves = this.me.mon.moves;
    if (I.pressed('b')) { this.phase = 'menu'; return; }
    if (I.pressed('right') && this.moveIndex % 2 === 0 && this.moveIndex + 1 < moves.length) this.moveIndex++;
    if (I.pressed('left') && this.moveIndex % 2 === 1) this.moveIndex--;
    if (I.pressed('down') && this.moveIndex + 2 < moves.length) this.moveIndex += 2;
    if (I.pressed('up') && this.moveIndex - 2 >= 0) this.moveIndex -= 2;
    if (I.pressed('a')) {
      const mv = moves[this.moveIndex];
      if (mv.pp <= 0) { this.say('PPが のこっていない！', () => { this.phase = 'move'; }); return; }
      this.doTurn({ kind: 'move', move: mv.name });
    }
  };

  // ---------- バッグ ----------
  BattleState.prototype.bagList = function () {
    return Object.keys(G.bag).map(id => ({ id, n: G.bag[id], item: D.ITEMS[id] }))
      .filter(e => e.item && (e.item.kind === 'ball' || e.item.kind === 'heal' || e.item.kind === 'cure' || e.item.kind === 'revive'));
  };
  BattleState.prototype.updateBag = function (I) {
    const list = this.bagList();
    if (I.pressed('b')) { this.phase = 'menu'; return; }
    if (I.pressed('down')) this.subIndex = Math.min(list.length - 1, this.subIndex + 1);
    if (I.pressed('up')) this.subIndex = Math.max(0, this.subIndex - 1);
    if (I.pressed('a')) {
      if (list.length === 0) return;
      const e = list[this.subIndex];
      if (e.item.kind === 'ball') {
        if (!this.opts.isWild) { this.say('トレーナーの モンスターは つかまえられない！', () => { this.phase = 'bag'; }); return; }
        this.doTurn({ kind: 'ball', id: e.id });
      } else if (e.item.kind === 'heal') {
        if (this.me.mon.hp >= this.me.mon.stats.hp) { this.say('HPは まんたんだ！', () => { this.phase = 'bag'; }); return; }
        this.doTurn({ kind: 'item', id: e.id });
      } else if (e.item.kind === 'cure') {
        if (this.me.mon.status !== e.item.cure) { this.say('こうかが なさそうだ…', () => { this.phase = 'bag'; }); return; }
        this.doTurn({ kind: 'item', id: e.id });
      } else if (e.item.kind === 'revive') {
        this.say('いまは つかえない！', () => { this.phase = 'bag'; });
      }
    }
  };

  // ---------- パーティ（交代） ----------
  BattleState.prototype.openParty = function () {
    this.phase = 'party'; this.subIndex = this.activeIndex;
  };
  BattleState.prototype.updateParty = function (I) {
    if (I.pressed('b')) { this.phase = 'menu'; return; }
    if (I.pressed('down')) this.subIndex = Math.min(G.party.length - 1, this.subIndex + 1);
    if (I.pressed('up')) this.subIndex = Math.max(0, this.subIndex - 1);
    if (I.pressed('a')) {
      const target = G.party[this.subIndex];
      if (target.hp <= 0) { this.say(target.name + 'は たたかえない！', () => { this.phase = 'party'; }); return; }
      if (target === this.me.mon) { this.say('すでに せんとうちゅうだ！', () => { this.phase = 'party'; }); return; }
      this.doTurn({ kind: 'switch', index: this.subIndex });
    }
  };

  // ---------- 技忘れ（4つ埋まっている時の新技） ----------
  BattleState.prototype.updateForget = function (I) {
    const moves = this.me.mon.moves;
    if (I.pressed('down')) this.subIndex = Math.min(moves.length, this.subIndex + 1);
    if (I.pressed('up')) this.subIndex = Math.max(0, this.subIndex - 1);
    if (I.pressed('a')) {
      if (this.subIndex === moves.length) { // あきらめる
        this.say(this.me.mon.name + 'は ' + this.pendingMove + 'を おぼえなかった。', () => { this.afterForget(); });
      } else {
        const old = moves[this.subIndex].name;
        moves[this.subIndex] = { name: this.pendingMove, pp: D.MOVES[this.pendingMove].pp, maxpp: D.MOVES[this.pendingMove].pp };
        this.say(['１・２・３… ポカン！', old + 'を わすれて', this.me.mon.name + 'は ' + this.pendingMove + 'を おぼえた！'], () => { this.afterForget(); });
      }
    }
  };

  // ---------- 逃げる ----------
  BattleState.prototype.tryRun = function () {
    if (!this.opts.isWild) { this.say('しょうぶから にげられない！', () => { this.phase = 'menu'; }); return; }
    this.runCount++;
    const a = this.me.eff('spe'), b = this.foe.eff('spe');
    const odds = b === 0 ? 256 : Math.floor((a * 128 / b) + 30 * this.runCount) % 256;
    if (a > b || rnd(256) < odds) {
      this.say('うまく にげきれた！', () => { this.phase = 'end'; this.result = 'run'; });
    } else {
      this.queueTurn = null;
      this.say('うまく にげられない！', () => { this.foeTurnThen(() => { this.toMenuOrEnd(); }); });
    }
  };

  // ---------- ターン実行 ----------
  BattleState.prototype.doTurn = function (action) {
    this.playerAction = action;
    // プレイヤーの交代/アイテム/ボールは先制
    if (action.kind === 'switch') {
      const lines = [this.me.name() + '！ もどれ！'];
      this.say(lines, () => {
        this.me = new Battler(G.party[action.index], false);
        this.activeIndex = action.index;
        this.say(['ゆけ！ ' + this.me.name() + '！'], () => this.foeTurnThen(() => this.endTurn()));
      });
      return;
    }
    if (action.kind === 'item') {
      const item = D.ITEMS[action.id];
      G.useItem(action.id);
      let msg;
      if (item.kind === 'heal') { this.me.mon.hp = Math.min(this.me.mon.stats.hp, this.me.mon.hp + item.heal); msg = this.me.name() + 'の HPが かいふくした！'; }
      else if (item.kind === 'cure') { this.me.mon.status = null; this.me.mon.sleepTurns = 0; msg = this.me.name() + 'の ' + statusName(item.cure) + 'が なおった！'; }
      this.say(['' + G.player.name + 'は ' + item.name + 'を つかった。', msg], () => this.foeTurnThen(() => this.endTurn()));
      return;
    }
    if (action.kind === 'ball') {
      this.attemptCatch(action.id);
      return;
    }
    // move: 素早さ／優先度で順番決定
    const myMove = D.MOVES[action.move];
    const foeAction = this.foeChooseMove();
    const foeMove = foeAction ? D.MOVES[foeAction.move] : null;
    const myPr = myMove.priority || 0, foePr = foeMove ? (foeMove.priority || 0) : 0;
    let meFirst;
    if (myPr !== foePr) meFirst = myPr > foePr;
    else if (this.me.eff('spe') !== this.foe.eff('spe')) meFirst = this.me.eff('spe') > this.foe.eff('spe');
    else meFirst = Math.random() < 0.5;

    const seq = meFirst
      ? [['me', action], ['foe', foeAction]]
      : [['foe', foeAction], ['me', action]];
    this.runSequence(seq, 0);
  };

  BattleState.prototype.foeChooseMove = function () {
    const usable = this.foe.mon.moves.filter(m => m.pp > 0);
    const pool = usable.length ? usable : [{ name: 'わるあがき', pp: 1, maxpp: 1, struggle: true }];
    const pick = pool[rnd(pool.length)];
    return { kind: 'move', move: pick.struggle ? 'たいあたり' : pick.name, ref: pick };
  };

  BattleState.prototype.runSequence = function (seq, i) {
    if (i >= seq.length) { this.endTurn(); return; }
    const [who, action] = seq[i];
    if (!action) { this.runSequence(seq, i + 1); return; }
    const attacker = who === 'me' ? this.me : this.foe;
    const defender = who === 'me' ? this.foe : this.me;
    if (attacker.mon.hp <= 0) { this.runSequence(seq, i + 1); return; }
    this.execMove(attacker, defender, action.move, action.ref, () => {
      if (this.foe.mon.hp <= 0 || this.me.mon.hp <= 0) { this.handleFaints(seq, i); return; }
      this.runSequence(seq, i + 1);
    });
  };

  // 状態異常などで行動できるか
  BattleState.prototype.canAct = function (b, moveName, cb) {
    const m = b.mon;
    if (m.status === 'sleep') {
      if (m.sleepTurns > 0) m.sleepTurns--;
      if (m.sleepTurns <= 0) { m.status = null; this.say(b.name() + 'は めを さました！', cb); return; }
      this.say(b.name() + 'は ぐうぐう ねむっている。', () => cb(false)); return;
    }
    if (m.status === 'freeze') {
      if (chance(20)) { m.status = null; this.say(b.name() + 'の こおりが とけた！', cb); return; }
      this.say(b.name() + 'は こおって うごけない！', () => cb(false)); return;
    }
    if (b.flinch) { b.flinch = false; this.say(b.name() + 'は ひるんで うごけない！', () => cb(false)); return; }
    if (m.status === 'paralyze' && chance(25)) { this.say(b.name() + 'は からだが しびれて うごけない！', () => cb(false)); return; }
    if (b.confuse > 0) {
      b.confuse--;
      if (chance(50)) {
        // 自分を攻撃
        const dmg = this.confusionDamage(b);
        b.mon.hp = Math.max(0, b.mon.hp - dmg);
        this.flash = 6; if (b.isFoe) this.shakeFoe = 8; else this.shakeMe = 8;
        this.say([b.name() + 'は こんらん している！', 'わけも わからず じぶんを こうげきした！'], () => cb(false)); return;
      }
      this.say(b.name() + 'は こんらん している！', cb); return;
    }
    cb(true);
  };

  BattleState.prototype.confusionDamage = function (b) {
    const lvl = b.mon.level;
    const A = b.eff('atk'), Dd = b.eff('def');
    return Math.max(1, Math.floor((Math.floor(Math.floor(2 * lvl / 5 + 2) * 40 * A / Dd) / 50) + 2));
  };

  BattleState.prototype.execMove = function (attacker, defender, moveName, ref, cb) {
    this.canAct(attacker, moveName, (ok) => {
      if (ok === false) { cb(); return; }
      const move = D.MOVES[moveName];
      // PP消費
      const ppmove = attacker.mon.moves.find(m => m.name === moveName);
      if (ppmove && ppmove.pp > 0) ppmove.pp--;
      this.say(attacker.name() + 'の ' + moveName + '！', () => {
        // 命中判定
        const acc = (move.acc || 100) * accMul(attacker.stages.acc) / accMul(defender.stages.eva);
        if (move.acc != null && !chance(acc)) {
          this.say(attacker.name() + 'の こうげきは はずれた！', cb); return;
        }
        if (move.status) { this.applyStatusMove(attacker, defender, move, cb); return; }
        this.applyDamageMove(attacker, defender, move, moveName, cb);
      });
    });
  };

  BattleState.prototype.applyDamageMove = function (attacker, defender, move, moveName, cb) {
    const def = D.SPECIES[defender.mon.species];
    let dmg, eff = 1, crit = false;
    if (move.fixed) { dmg = move.fixed; }
    else {
      const cat = D.categoryOf(move.type);
      const A = cat === 'physical' ? attacker.eff('atk') : attacker.eff('spa');
      const Dd = cat === 'physical' ? defender.eff('def') : defender.eff('spd');
      const lvl = attacker.mon.level;
      let base = Math.floor(Math.floor(Math.floor(2 * lvl / 5 + 2) * move.power * A / Dd) / 50) + 2;
      crit = chance((move.highCrit ? 12.5 : 6.25));
      if (crit) base = Math.floor(base * 2);
      const stab = D.SPECIES[attacker.mon.species].types.indexOf(move.type) >= 0 ? 1.5 : 1;
      eff = D.typeMultiplier(move.type, def.types);
      const rand = (85 + rnd(16)) / 100;
      dmg = Math.floor(base * stab * eff * rand);
      if (eff > 0) dmg = Math.max(1, dmg);
    }
    if (eff === 0) { this.say(defender.name() + 'には こうかが ないようだ…', cb); return; }
    defender.mon.hp = Math.max(0, defender.mon.hp - dmg);
    this.flash = 6; if (defender.isFoe) this.shakeFoe = 10; else this.shakeMe = 10;
    this.lastHit = defender.isFoe ? 'foe' : 'me';
    if (eff > 1) this.flashFull = 7;

    const after = () => {
      const extras = [];
      if (crit) extras.push('きゅうしょに あたった！');
      if (eff > 1) extras.push('こうかは ばつぐんだ！');
      else if (eff < 1) extras.push('こうかは いまひとつの ようだ…');
      const cont = () => {
        // ドレイン
        if (move.drain && attacker.mon.hp > 0) {
          const heal = Math.max(1, Math.floor(dmg * move.drain));
          attacker.mon.hp = Math.min(attacker.mon.stats.hp, attacker.mon.hp + heal);
          this.say(defender.name() + 'から せいきを すいとった！', () => this.afterDamageEffects(attacker, defender, move, cb));
          return;
        }
        this.afterDamageEffects(attacker, defender, move, cb);
      };
      if (extras.length) this.say(extras, cont); else cont();
    };
    after();
  };

  BattleState.prototype.afterDamageEffects = function (attacker, defender, move, cb) {
    if (defender.mon.hp <= 0) { cb(); return; }
    const e = move.effect;
    if (!e) { cb(); return; }
    const roll = e.chance == null ? true : chance(e.chance);
    if (!roll) { cb(); return; }
    if (e.flinch) { defender.flinch = true; cb(); return; }
    if (e.status) {
      if (!defender.mon.status && this.canInflict(defender, e.status)) {
        defender.mon.status = e.status;
        if (e.status === 'sleep') defender.mon.sleepTurns = 1 + rnd(3);
        if (e.status === 'confuse') { defender.mon.status = null; defender.confuse = 2 + rnd(4); this.say(defender.name() + 'は こんらん した！', cb); return; }
        this.say(defender.name() + 'は ' + statusName(e.status) + '！', cb); return;
      }
      cb(); return;
    }
    if (e.stat) {
      const target = e.target === 'self' ? attacker : defender;
      this.changeStat(target, e.stat, e.stages, cb); return;
    }
    cb();
  };

  BattleState.prototype.canInflict = function (b, status) {
    const types = D.SPECIES[b.mon.species].types;
    if (status === 'burn' && types.indexOf('ほのお') >= 0) return false;
    if (status === 'paralyze' && types.indexOf('でんき') >= 0) return false;
    if (status === 'freeze' && types.indexOf('こおり') >= 0) return false;
    if (status === 'poison' && (types.indexOf('どく') >= 0 || types.indexOf('はがね') >= 0)) return false;
    return true;
  };

  BattleState.prototype.applyStatusMove = function (attacker, defender, move, cb) {
    const e = move.effect;
    if (!e) { cb(); return; }
    if (e.stat) {
      const target = e.target === 'self' ? attacker : defender;
      this.changeStat(target, e.stat, e.stages, cb); return;
    }
    cb();
  };

  BattleState.prototype.changeStat = function (b, stat, stages, cb) {
    const cur = b.stages[stat];
    const nv = Math.max(-6, Math.min(6, cur + stages));
    const sname = { atk: 'こうげき', def: 'ぼうぎょ', spa: 'とくこう', spd: 'とくぼう', spe: 'すばやさ', acc: 'めいちゅう', eva: 'かいひ' }[stat];
    if (nv === cur) { this.say(b.name() + 'の ' + sname + 'は もう かわらない！', cb); return; }
    b.stages[stat] = nv;
    const word = stages > 0 ? (stages >= 2 ? 'ぐーんと あがった！' : 'あがった！') : (stages <= -2 ? 'がくっと さがった！' : 'さがった！');
    this.say(b.name() + 'の ' + sname + 'が ' + word, cb);
  };

  // 相手のターンのみ実行（逃げ失敗時など）
  BattleState.prototype.foeTurnThen = function (done) {
    if (this.foe.mon.hp <= 0) { done(); return; }
    const fa = this.foeChooseMove();
    this.execMove(this.foe, this.me, fa.move, fa.ref, () => {
      if (this.me.mon.hp <= 0) { this.handleFaints([['foe', fa]], 0, done); return; }
      done();
    });
  };

  // ---------- ひんし処理 ----------
  BattleState.prototype.handleFaints = function (seq, i, doneOverride) {
    const cont = () => {
      if (this.foe.mon.hp <= 0) { this.onFoeFaint(seq, i, doneOverride); return; }
      if (this.me.mon.hp <= 0) { this.onMeFaint(); return; }
      if (doneOverride) doneOverride(); else this.endTurn();
    };
    cont();
  };

  BattleState.prototype.onFoeFaint = function () {
    this.foeFaintT = 14;
    const lines = [(this.opts.isWild ? 'やせいの ' : '') + this.foe.name() + 'を たおした！'];
    // 経験値
    const exp = G.expYield(this.foe.mon);
    const ev = G.gainExp(this.me.mon, exp);
    lines.push(this.me.name() + 'は ' + exp + ' けいけんちを もらった！');
    this.say(lines, () => this.processGrowth(ev, () => this.afterFoeDown()));
  };

  BattleState.prototype.afterFoeDown = function () {
    // トレーナー戦：次のモンスター
    if (!this.opts.isWild && this.foeIndex < this.foeParty.length - 1) {
      const tn = this.opts.trainerName || 'トレーナー';
      const next = this.foeParty[this.foeIndex + 1];
      this.say([tn + 'は ' + next.name + 'を くりだした！'], () => {
        this.foeIndex++;
        this.foe = new Battler(next, true);
        G.dexSee(next.species);
        this.foeVisible = true; this.foeFaintT = 0; this.slideT = 18;
        this.toMenuOrEnd();
      });
      return;
    }
    // 勝利
    if (!this.opts.isWild) {
      const tn = this.opts.trainerName || 'トレーナー';
      const lines = [tn + 'との しょうぶに かった！'];
      if (this.opts.prize) {
        G.money += this.opts.prize;
        lines.push(G.player.name + 'は しょうきんとして ' + this.opts.prize + '円を てにいれた！');
      }
      if (this.opts.defeatText) lines.push.apply(lines, [].concat(this.opts.defeatText));
      this.say(lines, () => { this.result = 'win'; this.phase = 'end'; });
      return;
    }
    this.result = 'win'; this.phase = 'end';
  };

  BattleState.prototype.processGrowth = function (ev, done) {
    const lines = [];
    for (const lv of ev.levels) lines.push(this.me.name() + 'は レベル ' + lv + 'に あがった！');
    const learns = ev.learned.slice();
    const evo = ev.evolve;
    this.say(lines, () => this.processLearns(learns, () => {
      if (evo) this.doEvolve(evo, done);
      else done();
    }));
  };

  BattleState.prototype.processLearns = function (learns, done) {
    if (!learns.length) { done(); return; }
    const mv = learns.shift();
    const has = this.me.mon.moves.find(m => m.name === mv);
    if (has) { this.processLearns(learns, done); return; }
    if (this.me.mon.moves.length < 4) {
      this.say(this.me.name() + 'は ' + mv + 'を おぼえた！', () => this.processLearns(learns, done));
    } else {
      this.pendingMove = mv;
      this.afterForget = () => this.processLearns(learns, done);
      this.say([this.me.name() + 'は あたらしく ' + mv + 'を おぼえたい。', 'しかし わざは ４つまで。', 'どれを わすれさせる？'], () => {
        this.phase = 'forget'; this.subIndex = 0;
      });
    }
  };

  BattleState.prototype.doEvolve = function (toId, done) {
    const oldName = this.me.name();
    this.say(['おや…？ ' + oldName + 'の ようすが…！'], () => {
      G.evolve(this.me.mon, toId);
      G.dexOwn(toId);
      this.say(['おめでとう！ ' + oldName + 'は', G.D.SPECIES[toId].name + 'に しんかした！'], done);
    });
  };

  BattleState.prototype.onMeFaint = function () {
    this.meFaintT = 14;
    this.say(this.me.name() + 'は たおれた！', () => {
      const alive = G.party.filter(m => m.hp > 0);
      if (alive.length === 0) {
        this.say(['めの まえが まっくらに なった！'], () => { this.result = 'lose'; this.phase = 'end'; });
      } else {
        this.forceSwitch = true;
        this.openParty();
      }
    });
  };

  // パーティ選択完了（強制交代含む）
  BattleState.prototype.afterSwitchSelected = function () {};

  BattleState.prototype.endTurn = function () {
    // ターン終了時：状態異常ダメージ
    const order = [this.me, this.foe];
    const applyDot = (idx) => {
      if (idx >= order.length) { this.checkEndAfterDot(); return; }
      const b = order[idx];
      if (b.mon.hp <= 0) { applyDot(idx + 1); return; }
      if (b.mon.status === 'poison' || b.mon.status === 'burn') {
        const dmg = Math.max(1, Math.floor(b.mon.stats.hp / 8));
        b.mon.hp = Math.max(0, b.mon.hp - dmg);
        const word = b.mon.status === 'poison' ? 'どくの ダメージを うけた！' : 'やけどの ダメージを うけた！';
        this.say(b.name() + 'は ' + word, () => {
          if (b.mon.hp <= 0) { if (b.isFoe) this.onFoeFaint(); else this.onMeFaint(); return; }
          applyDot(idx + 1);
        });
        return;
      }
      applyDot(idx + 1);
    };
    applyDot(0);
  };

  BattleState.prototype.checkEndAfterDot = function () {
    if (this.foe.mon.hp <= 0) { this.onFoeFaint(); return; }
    if (this.me.mon.hp <= 0) { this.onMeFaint(); return; }
    this.toMenuOrEnd();
  };
  BattleState.prototype.toMenuOrEnd = function () { this.phase = 'menu'; this.menuIndex = 0; };

  // 強制交代のパーティ確定をフック
  const origUpdateParty = BattleState.prototype.updateParty;
  BattleState.prototype.updateParty = function (I) {
    if (this.forceSwitch && I.pressed('b')) return; // 逃げ不可
    if (I.pressed('a')) {
      const target = G.party[this.subIndex];
      if (target && target.hp > 0 && target !== this.me.mon) {
        this.me = new Battler(target, false);
        this.activeIndex = this.subIndex;
        const fs = this.forceSwitch; this.forceSwitch = false;
        this.meVisible = true; this.meFaintT = 0; this.slideT = 18;
        this.say('ゆけ！ ' + this.me.name() + '！', () => {
          if (fs) this.toMenuOrEnd(); else this.foeTurnThen(() => this.endTurn());
        });
        return;
      }
    }
    origUpdateParty.call(this, I);
  };

  // ---------- 捕獲 ----------
  BattleState.prototype.attemptCatch = function (ballId) {
    const ball = D.ITEMS[ballId];
    G.useItem(ballId);
    const foe = this.foe.mon;
    const rate = D.SPECIES[foe.species].catchRate;
    let statusBonus = 1;
    if (foe.status === 'sleep' || foe.status === 'freeze') statusBonus = 2;
    else if (foe.status) statusBonus = 1.5;
    const a = Math.floor(((3 * foe.stats.hp - 2 * foe.hp) * rate * ball.ballBonus) / (3 * foe.stats.hp) * statusBonus);
    let shakes = 0;
    if (a >= 255) shakes = 4;
    else {
      const b = 65536 * Math.pow(Math.min(1, a / 255), 0.1875);
      shakes = 0;
      for (let i = 0; i < 4; i++) { if (rnd(65536) < b) shakes++; else break; }
    }
    this.say([G.player.name + 'は ' + ball.name + 'を なげた！'], () => {
      this.foeVisible = false;
      const wob = ['…', '… …', '… … …'];
      const msgs = [];
      for (let i = 0; i < Math.min(shakes, 3); i++) msgs.push(wob[i]);
      const finalize = () => {
        if (shakes >= 4) {
          G.dexOwn(foe.species);
          const caughtMon = foe;
          this.say(['やった！ ' + foe.name + 'を つかまえた！'], () => {
            if (G.party.length < 6) {
              G.party.push(caughtMon);
              this.say(foe.name + 'は てもちに くわわった！', () => { this.result = 'caught'; this.phase = 'end'; });
            } else {
              G.box = G.box || []; G.box.push(caughtMon);
              this.say(foe.name + 'は ボックスへ おくられた！', () => { this.result = 'caught'; this.phase = 'end'; });
            }
          });
        } else {
          this.foeVisible = true;
          this.say(['ざんねん！ あと すこしだったのに！', 'モンスターが あばれている！'][shakes >= 2 ? 1 : 0] || 'モンスターは ボールから でてしまった！',
            () => this.foeTurnThen(() => this.endTurn()));
        }
      };
      if (msgs.length) this.say(msgs, finalize); else finalize();
    });
  };

  // ---------- 終了処理 ----------
  BattleState.prototype.finish = function () {
    const res = this.result;
    G.popState();
    if (res === 'lose') {
      for (const m of G.party) G.fullHeal(m);
      G.pos = { map: 'home', x: 3, y: 3, dir: 'down' };
      if (G.overworld) G.overworld.loadMap('home', 3, 3, 'down', true);
    }
    if (this.opts.onEnd) this.opts.onEnd(res);
  };

  function statusName(s) {
    return { poison: 'どく', burn: 'やけど', paralyze: 'まひ', sleep: 'ねむり', freeze: 'こおり', confuse: 'こんらん' }[s] || s;
  }
  function statusTag(s) {
    return { poison: 'ＤＯＫＵ', burn: 'ＹＡＫＥ', paralyze: 'ＭＡＨＩ', sleep: 'ＮＥＭＵ', freeze: 'ＫＯＯＲ' }[s] || '';
  }

  // ========================= 描画 =========================
  BattleState.prototype.render = function () {
    const ctx = G.ctx;
    // 背景
    const grad = ctx.createLinearGradient(0, 0, 0, 112);
    grad.addColorStop(0, '#a8d8f0'); grad.addColorStop(1, '#e8f4d8');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, G.W, 112);
    ctx.fillStyle = '#cfe8b0'; ctx.fillRect(0, 96, G.W, 16);
    // プラットフォーム
    ctx.fillStyle = '#9fce6a'; ctx.beginPath(); ctx.ellipse(180, 70, 42, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7fb84a'; ctx.beginPath(); ctx.ellipse(48, 104, 50, 14, 0, 0, 7); ctx.fill();

    // 敵モンスター
    if (this.foeVisible) {
      let sx = 150 + (this.shakeFoe > 0 ? (this.shakeFoe % 2 ? 2 : -2) : 0);
      sx += Math.round(this.slideT * 4);          // 右からスライドイン
      let sy = 18, alpha = 1;
      if (this.foeFaintT > 0) { sy += (14 - this.foeFaintT) * 3; alpha = this.foeFaintT / 14; }
      ctx.save(); ctx.globalAlpha = alpha;
      if (!(this.flash > 0 && this.flash % 2 === 0 && this.lastHit === 'foe'))
        S.drawMonster(ctx, this.foe.mon.species, sx, sy, 52, false);
      ctx.restore();
    }
    // 自分モンスター（背面）
    if (this.meVisible) {
      let mx = 24 + (this.shakeMe > 0 ? (this.shakeMe % 2 ? 2 : -2) : 0);
      mx -= Math.round(this.slideT * 4);          // 左からスライドイン
      let my = 56, alpha = 1;
      if (this.meFaintT > 0) { my += (14 - this.meFaintT) * 3; alpha = this.meFaintT / 14; }
      ctx.save(); ctx.globalAlpha = alpha;
      if (!(this.flash > 0 && this.flash % 2 === 0 && this.lastHit === 'me'))
        S.drawMonster(ctx, this.me.mon.species, mx, my, 60, true);
      ctx.restore();
    }
    // 効果ばつぐん等の全画面フラッシュ
    if (this.flashFull > 0 && this.flashFull % 2 === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, 0, G.W, 112);
    }

    // HPボックス
    this.drawHPBox(8, 10, this.foe, false);
    this.drawHPBox(132, 78, this.me, true);

    // 下部
    if (this.phase === 'message') { G.messageBox(); this.drawMsg(); }
    else if (this.phase === 'menu') { this.drawActionMenu(); }
    else if (this.phase === 'move') { this.drawMoveMenu(); }
    else if (this.phase === 'bag') { this.drawBag(); }
    else if (this.phase === 'party') { this.drawPartySelect(); }
    else if (this.phase === 'forget') { this.drawForget(); }
    else { G.messageBox(); }
  };

  BattleState.prototype.drawHPBox = function (x, y, b, mine) {
    const ctx = G.ctx;
    const w = 100, h = mine ? 30 : 24;
    G.window9(x, y, w, h, { fill: '#f8f8e8', border: '#486890', inner: '#c8d8b8' });
    G.textShadow(b.name(), x + 6, y + 4, '#384048', '#c0c8b8', 8);
    G.text('Lv' + b.mon.level, x + w - 22, y + 4, '#384048', 8);
    if (b.mon.status) { ctx.fillStyle = '#d05858'; ctx.fillRect(x + 6, y + 14, 18, 7); G.text(statusTag(b.mon.status).slice(0, 3), x + 7, y + 14, '#fff', 7); }
    const barX = b.mon.status ? x + 28 : x + 18, barW = w - (barX - x) - 8;
    G.text('HP', x + 6, y + 14, '#d8a020', 7);
    const ratio = Math.max(0, b.dispHP / b.mon.stats.hp);
    ctx.fillStyle = '#202028'; ctx.fillRect(barX - 1, y + 15, barW + 2, 5);
    G.bar(barX, y + 16, barW, ratio, G.hpColor(b.mon.hp / b.mon.stats.hp), '#586068');
    if (mine) G.text(Math.max(0, Math.ceil(b.dispHP)) + '/' + b.mon.stats.hp, x + w - 44, y + 22, '#384048', 8);
  };

  BattleState.prototype.drawMsg = function () {
    const lines = wrap(this.printed, 34);
    for (let i = 0; i < lines.length && i < 3; i++) G.textShadow(lines[i], 12, G.H - 38 + i * 11, '#384048', '#b8c0c8', 8);
    if (this.printed.length >= this.full.length && (this.tick % 40 < 20)) G.cursor(G.W - 16, G.H - 14, '#384048');
  };

  BattleState.prototype.drawActionMenu = function () {
    const ctx = G.ctx;
    G.window9(4, G.H - 44, 140, 40, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    G.textShadow('どうする？', 12, G.H - 38, '#384048', '#b8c0c8', 8);
    G.window9(146, G.H - 44, G.W - 150, 40, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    const labels = ['たたかう', 'バッグ', 'モンスター', 'にげる'];
    for (let i = 0; i < 4; i++) {
      const cx = 156 + (i % 2) * 44, cy = G.H - 38 + Math.floor(i / 2) * 14;
      G.text(labels[i], cx, cy, '#384048', 8);
      if (i === this.menuIndex) G.cursor(cx - 8, cy, '#d04030');
    }
  };

  BattleState.prototype.drawMoveMenu = function () {
    const ctx = G.ctx;
    const moves = this.me.mon.moves;
    G.window9(4, G.H - 44, 150, 40, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    for (let i = 0; i < 4; i++) {
      const cx = 14 + (i % 2) * 70, cy = G.H - 38 + Math.floor(i / 2) * 16;
      if (moves[i]) {
        G.text(moves[i].name, cx, cy, moves[i].pp > 0 ? '#384048' : '#b04040', 8);
        if (i === this.moveIndex) G.cursor(cx - 8, cy, '#d04030');
      }
    }
    const m = moves[this.moveIndex];
    G.window9(156, G.H - 44, G.W - 160, 40, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    if (m) {
      const md = D.MOVES[m.name];
      G.text('PP ' + m.pp + '/' + m.maxpp, 164, G.H - 38, '#384048', 8);
      ctx.fillStyle = (D.TYPE_COLORS[md.type] || '#888'); ctx.fillRect(164, G.H - 26, 60, 9);
      G.text(md.type, 166, G.H - 25, '#fff', 8);
      G.text(D.categoryOf(md.type) === 'physical' ? 'ぶつり' : 'とくしゅ', 164, G.H - 14, '#384048', 7);
    }
  };

  BattleState.prototype.drawBag = function () {
    const ctx = G.ctx;
    const list = this.bagList();
    G.window9(4, G.H - 60, G.W - 8, 56, { fill: '#f8f8f8', border: '#284878', inner: '#a0c0a0' });
    G.text('どうぐ', 12, G.H - 56, '#384048', 8);
    if (list.length === 0) { G.text('どうぐを もっていない。', 16, G.H - 40, '#384048', 8); return; }
    const start = Math.max(0, Math.min(this.subIndex - 2, list.length - 4));
    for (let i = 0; i < 4 && start + i < list.length; i++) {
      const e = list[start + i], yy = G.H - 44 + i * 11;
      G.text(e.item.name, 16, yy, '#384048', 8);
      G.text('×' + e.n, G.W - 40, yy, '#384048', 8);
      if (start + i === this.subIndex) G.cursor(8, yy, '#d04030');
    }
  };

  BattleState.prototype.drawPartySelect = function () {
    const ctx = G.ctx;
    G.window9(4, 4, G.W - 8, G.H - 8, { fill: '#f0f4f8', border: '#284878', inner: '#a8c8e8' });
    G.text(this.forceSwitch ? 'つぎの モンスターを えらべ！' : 'どの モンスターに する？', 12, 10, '#384048', 8);
    for (let i = 0; i < G.party.length; i++) {
      const m = G.party[i], yy = 24 + i * 22;
      G.window9(10, yy, G.W - 20, 20, { fill: m.hp > 0 ? '#f8f8e8' : '#e8d0d0', border: '#688098', inner: '#cfe' });
      S.drawMonster(ctx, m.species, 12, yy + 2, 16, false);
      G.text(m.name, 32, yy + 3, '#384048', 8);
      G.text('Lv' + m.level, 110, yy + 3, '#384048', 8);
      const r = m.hp / m.stats.hp;
      G.bar(32, yy + 14, 70, Math.max(0, r), G.hpColor(r), '#586068');
      G.text(m.hp + '/' + m.stats.hp, 150, yy + 12, '#384048', 7);
      if (m.status) G.text(statusTag(m.status).slice(0, 3), 200, yy + 3, '#d05858', 7);
      if (i === this.subIndex) G.cursor(4, yy + 6, '#d04030');
    }
  };

  BattleState.prototype.drawForget = function () {
    const ctx = G.ctx;
    const moves = this.me.mon.moves;
    G.window9(4, 4, G.W - 8, G.H - 8, { fill: '#f0f4f8', border: '#284878', inner: '#a8c8e8' });
    G.text('わすれる わざを えらぶ', 12, 10, '#384048', 8);
    for (let i = 0; i < moves.length; i++) {
      const yy = 26 + i * 16;
      G.text(moves[i].name, 24, yy, '#384048', 8);
      G.text('PP' + moves[i].pp + '/' + moves[i].maxpp, 150, yy, '#384048', 8);
      if (i === this.subIndex) G.cursor(14, yy, '#d04030');
    }
    const yy = 26 + moves.length * 16;
    G.text('やめる（' + this.pendingMove + 'を あきらめる）', 24, yy, '#b04040', 8);
    if (this.subIndex === moves.length) G.cursor(14, yy, '#d04030');
  };

  function wrap(str, n) {
    const out = []; let cur = '';
    for (const ch of str) { cur += ch; if (cur.length >= n) { out.push(cur); cur = ''; } }
    if (cur) out.push(cur);
    return out;
  }

  G.startBattle = function (foeMon, opts) {
    const bs = new BattleState(foeMon, opts);
    G.pushState(bs);
    return bs;
  };
  G.BattleState = BattleState;
})(window);
