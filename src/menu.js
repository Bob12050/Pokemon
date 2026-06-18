/* =========================================================================
 * menu.js — スタートメニューと各種サブ画面
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.G;
  const D = G.D;
  const S = global.Sprites;

  function statusTag(s) {
    return { poison: 'どく', burn: 'やけど', paralyze: 'まひ', sleep: 'ねむり', freeze: 'こおり' }[s] || '';
  }

  // ---------- スタートメニュー ----------
  function MenuState() {
    this.items = ['モンスター', 'バッグ', 'レポート', 'ずかん', 'とじる'];
    this.index = 0;
    this.drawUnder = true;
    this.note = null; this.noteT = 0;
  }
  MenuState.prototype.update = function () {
    const I = G.Input;
    if (this.noteT > 0) { this.noteT--; if (this.noteT === 0) this.note = null; }
    if (I.pressed('start') || I.pressed('b')) { G.popState(); return; }
    if (I.pressed('down')) this.index = (this.index + 1) % this.items.length;
    if (I.pressed('up')) this.index = (this.index + this.items.length - 1) % this.items.length;
    if (I.pressed('a')) {
      switch (this.index) {
        case 0: G.pushState(new PartyState()); break;
        case 1: G.pushState(new BagState()); break;
        case 2:
          if (G.save()) { this.note = 'ゲームを セーブしました！'; this.noteT = 90; }
          else { this.note = 'セーブに しっぱいしました'; this.noteT = 90; }
          break;
        case 3: G.pushState(new DexState()); break;
        case 4: G.popState(); break;
      }
    }
  };
  MenuState.prototype.render = function () {
    const ctx = G.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, G.W, G.H);
    const w = 92, x = G.W - w - 4, y = 4, h = this.items.length * 16 + 8;
    G.window9(x, y, w, h, { fill: '#f8f8f8', border: '#284878', inner: '#a8c8e8' });
    for (let i = 0; i < this.items.length; i++) {
      const yy = y + 6 + i * 16;
      G.text(this.items[i], x + 16, yy, '#384048', 8);
      if (i === this.index) G.cursor(x + 6, yy, '#d04030');
    }
    if (this.note) { G.window9(4, G.H - 24, G.W - 8, 20, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' }); G.text(this.note, 12, G.H - 18, '#384048', 8); }
  };

  // ---------- パーティ ----------
  function PartyState() { this.index = 0; this.summary = false; }
  PartyState.prototype.update = function () {
    const I = G.Input;
    if (this.summary) {
      if (I.pressed('b') || I.pressed('a')) this.summary = false;
      return;
    }
    if (I.pressed('b')) { G.popState(); return; }
    if (I.pressed('down')) this.index = Math.min(G.party.length - 1, this.index + 1);
    if (I.pressed('up')) this.index = Math.max(0, this.index - 1);
    if (I.pressed('a')) this.summary = true;
  };
  PartyState.prototype.render = function () {
    const ctx = G.ctx;
    G.clear('#5878a8');
    ctx.fillStyle = '#88a8d0'; for (let i = 0; i < 12; i++) { ctx.fillRect(0, i * 14, G.W, 1); }
    if (this.summary) { this.renderSummary(); return; }
    G.text('モンスター', 8, 6, '#fff', 8);
    for (let i = 0; i < G.party.length; i++) {
      const m = G.party[i], yy = 18 + i * 22;
      G.window9(6, yy, G.W - 12, 20, { fill: m.hp > 0 ? '#f8f8e8' : '#e8d0d0', border: '#688098', inner: '#cfe' });
      S.drawMonster(ctx, m.species, 9, yy + 2, 16, false);
      G.text(m.name, 30, yy + 3, '#384048', 8);
      G.text('Lv' + m.level, 120, yy + 3, '#384048', 8);
      const r = m.hp / m.stats.hp;
      G.bar(30, yy + 14, 80, Math.max(0, r), G.hpColor(r), '#586068');
      G.text(m.hp + '/' + m.stats.hp, 150, yy + 11, '#384048', 7);
      if (m.status) G.text(statusTag(m.status), 200, yy + 3, '#d05858', 7);
      if (i === this.index) G.cursor(2, yy + 6, '#f8f800');
    }
    G.text('Ａ:しょうさい  Ｂ:もどる', 8, G.H - 10, '#fff', 7);
  };
  PartyState.prototype.renderSummary = function () {
    const ctx = G.ctx;
    const m = G.party[this.index];
    const sp = D.SPECIES[m.species];
    G.window9(4, 4, G.W - 8, G.H - 8, { fill: '#f8f8f8', border: '#284878', inner: '#a8c8e8' });
    S.drawMonster(ctx, m.species, 12, 14, 48, false);
    G.text(m.name, 66, 14, '#384048', 8);
    G.text('Lv' + m.level + '  No.' + sp.dexNo, 66, 26, '#384048', 8);
    let tx = 66;
    for (const t of sp.types) { ctx.fillStyle = D.TYPE_COLORS[t]; ctx.fillRect(tx, 38, 40, 9); G.text(t, tx + 2, 39, '#fff', 8); tx += 44; }
    const labels = [['ＨＰ', m.hp + '/' + m.stats.hp], ['こうげき', m.stats.atk], ['ぼうぎょ', m.stats.def], ['とくこう', m.stats.spa], ['とくぼう', m.stats.spd], ['すばやさ', m.stats.spe]];
    for (let i = 0; i < labels.length; i++) {
      const yy = 56 + i * 11;
      G.text(labels[i][0], 14, yy, '#384048', 8);
      G.text('' + labels[i][1], 80, yy, '#384048', 8);
    }
    G.text('わざ', 130, 54, '#384048', 8);
    for (let i = 0; i < m.moves.length; i++) {
      const yy = 66 + i * 18, mv = m.moves[i], md = D.MOVES[mv.name];
      G.window9(126, yy, 108, 16, { fill: '#f0f4f8', border: '#688098', inner: '#cfe' });
      G.text(mv.name, 130, yy + 1, '#384048', 8);
      ctx.fillStyle = D.TYPE_COLORS[md.type]; ctx.fillRect(130, yy + 9, 36, 6);
      G.text('PP' + mv.pp + '/' + mv.maxpp, 180, yy + 8, '#384048', 7);
    }
    const exp = m.exp - D.expForLevel(sp.expGroup, m.level);
    const need = D.expForLevel(sp.expGroup, m.level + 1) - D.expForLevel(sp.expGroup, m.level);
    G.text('つぎのレベルまで', 14, G.H - 22, '#384048', 7);
    G.bar(14, G.H - 12, 100, need > 0 ? Math.max(0, Math.min(1, exp / need)) : 1, '#4090d0', '#586068');
  };

  // ---------- バッグ ----------
  function BagState() { this.index = 0; this.choosing = false; this.target = 0; this.pendingItem = null; this.note = null; this.noteT = 0; }
  BagState.prototype.list = function () {
    return Object.keys(G.bag).map(id => ({ id, n: G.bag[id], item: D.ITEMS[id] })).filter(e => e.item);
  };
  BagState.prototype.update = function () {
    const I = G.Input;
    if (this.noteT > 0) { this.noteT--; if (this.noteT === 0) this.note = null; }
    const list = this.list();
    if (this.choosing) {
      if (I.pressed('b')) { this.choosing = false; return; }
      if (I.pressed('down')) this.target = Math.min(G.party.length - 1, this.target + 1);
      if (I.pressed('up')) this.target = Math.max(0, this.target - 1);
      if (I.pressed('a')) this.applyItem();
      return;
    }
    if (I.pressed('b')) { G.popState(); return; }
    if (I.pressed('down')) this.index = Math.min(list.length - 1, this.index + 1);
    if (I.pressed('up')) this.index = Math.max(0, this.index - 1);
    if (I.pressed('a')) {
      if (!list.length) return;
      const e = list[this.index];
      if (e.item.kind === 'ball') { this.note = 'いまは つかえない。'; this.noteT = 80; return; }
      this.pendingItem = e; this.choosing = true; this.target = 0;
    }
  };
  BagState.prototype.applyItem = function () {
    const e = this.pendingItem, item = e.item, m = G.party[this.target];
    let ok = false, msg = '';
    if (item.kind === 'heal') {
      if (m.hp <= 0) { msg = 'ひんしには つかえない！'; }
      else if (m.hp >= m.stats.hp) { msg = 'HPは まんたんだ！'; }
      else { m.hp = Math.min(m.stats.hp, m.hp + item.heal); ok = true; msg = m.name + 'の HPが かいふくした！'; }
    } else if (item.kind === 'cure') {
      if (m.status === item.cure) { m.status = null; m.sleepTurns = 0; ok = true; msg = m.name + 'は げんきに なった！'; }
      else msg = 'こうかが なさそうだ…';
    } else if (item.kind === 'revive') {
      if (m.hp <= 0) { m.hp = Math.floor(m.stats.hp / 2); ok = true; msg = m.name + 'は ふっかつした！'; }
      else msg = 'つかう ひつようが ない。';
    }
    if (ok) G.useItem(e.id);
    this.note = msg; this.noteT = 90; this.choosing = false;
  };
  BagState.prototype.render = function () {
    const ctx = G.ctx;
    G.clear('#c8a060');
    ctx.fillStyle = '#b89050'; for (let i = 0; i < 12; i++) ctx.fillRect(0, i * 14, G.W, 1);
    const list = this.list();
    G.window9(4, 4, G.W - 8, G.H - 30, { fill: '#f8f8f8', border: '#284878', inner: '#e8d8b0' });
    G.text('どうぐ', 12, 8, '#384048', 8);
    if (!list.length) G.text('なにも もっていない。', 16, 30, '#384048', 8);
    const start = Math.max(0, Math.min(this.index - 4, list.length - 6));
    for (let i = 0; i < 6 && start + i < list.length; i++) {
      const e = list[start + i], yy = 22 + i * 13;
      G.text(e.item.name, 16, yy, '#384048', 8);
      G.text('×' + e.n, G.W - 40, yy, '#384048', 8);
      if (start + i === this.index) G.cursor(8, yy, '#d04030');
    }
    // 説明 or 通知
    G.window9(4, G.H - 24, G.W - 8, 20, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    if (this.note) G.text(this.note, 12, G.H - 18, '#384048', 8);
    else if (list.length) {
      const d = list[this.index].item.desc || '';
      G.text(d.slice(0, 30), 12, G.H - 18, '#384048', 8);
    }
    if (this.choosing) this.renderChoose();
  };
  BagState.prototype.renderChoose = function () {
    const ctx = G.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, G.W, G.H);
    G.window9(20, 10, G.W - 40, G.H - 20, { fill: '#f8f8f8', border: '#284878', inner: '#a8c8e8' });
    G.text('だれに つかう？', 28, 16, '#384048', 8);
    for (let i = 0; i < G.party.length; i++) {
      const m = G.party[i], yy = 28 + i * 18;
      S.drawMonster(ctx, m.species, 28, yy, 16, false);
      G.text(m.name, 48, yy + 2, '#384048', 8);
      G.text('HP ' + m.hp + '/' + m.stats.hp, 130, yy + 2, '#384048', 8);
      if (i === this.target) G.cursor(20, yy + 4, '#d04030');
    }
  };

  // ---------- ずかん ----------
  function DexState() { this.index = 0; }
  DexState.prototype.update = function () {
    const I = G.Input;
    if (I.pressed('b')) { G.popState(); return; }
    const ids = Object.keys(D.SPECIES);
    if (I.pressed('down')) this.index = Math.min(ids.length - 1, this.index + 1);
    if (I.pressed('up')) this.index = Math.max(0, this.index - 1);
  };
  DexState.prototype.render = function () {
    const ctx = G.ctx;
    G.clear('#b02828');
    ctx.fillStyle = '#902020'; ctx.fillRect(0, 0, G.W, 14);
    G.text('モンスターずかん', 8, 4, '#fff', 8);
    const ids = Object.keys(D.SPECIES);
    const start = Math.max(0, Math.min(this.index - 4, ids.length - 9));
    G.window9(4, 16, 120, G.H - 22, { fill: '#f8f8f8', border: '#284878', inner: '#e8c0c0' });
    for (let i = 0; i < 9 && start + i < ids.length; i++) {
      const id = ids[start + i], sp = D.SPECIES[id], yy = 22 + i * 13;
      const st = G.dex[id];
      const label = st ? ('No.' + String(sp.dexNo).padStart(2, '0') + ' ' + (st ? sp.name : '？？？')) : ('No.' + String(sp.dexNo).padStart(2, '0') + ' -------');
      G.text(st === 'owned' ? '●' : (st === 'seen' ? '○' : ' '), 8, yy, '#d04030', 8);
      G.text(label, 18, yy, st ? '#384048' : '#a0a0a0', 8);
      if (start + i === this.index) G.cursor(2, yy, '#d04030');
    }
    // 詳細
    const id = ids[this.index], sp = D.SPECIES[id], st = G.dex[id];
    G.window9(128, 16, G.W - 132, G.H - 22, { fill: '#f8f8f8', border: '#284878', inner: '#e8c0c0' });
    if (st) {
      S.drawMonster(ctx, id, 150, 24, 48, false);
      G.text(sp.name, 134, 76, '#384048', 8);
      let tx = 134;
      for (const t of sp.types) { ctx.fillStyle = D.TYPE_COLORS[t]; ctx.fillRect(tx, 88, 36, 8); G.text(t, tx + 2, 89, '#fff', 7); tx += 40; }
      G.text(st === 'owned' ? 'つかまえた！' : 'みつけた', 134, 102, '#384048', 7);
    } else {
      G.text('？？？', 150, 60, '#a0a0a0', 8);
    }
    const owned = ids.filter(i => G.dex[i] === 'owned').length;
    const seen = ids.filter(i => G.dex[i]).length;
    G.text('みた:' + seen + ' つかまえた:' + owned, 132, G.H - 12, '#384048', 7);
  };

  // ---------- ショップ ----------
  const SHOP_STOCK = ['monball', 'superball', 'potion', 'superpotion', 'antidote', 'awakening', 'revive'];
  function ShopState() { this.index = 0; this.note = null; this.noteT = 0; }
  ShopState.prototype.update = function () {
    const I = G.Input;
    if (this.noteT > 0) { this.noteT--; if (this.noteT === 0) this.note = null; }
    if (I.pressed('b')) { G.popState(); return; }
    if (I.pressed('down')) this.index = Math.min(SHOP_STOCK.length - 1, this.index + 1);
    if (I.pressed('up')) this.index = Math.max(0, this.index - 1);
    if (I.pressed('a')) {
      const id = SHOP_STOCK[this.index], item = D.ITEMS[id];
      if (G.money >= item.price) {
        G.money -= item.price; G.addItem(id, 1);
        this.note = item.name + 'を かいました！'; this.noteT = 80;
      } else {
        this.note = 'おかねが たりません！'; this.noteT = 80;
      }
    }
  };
  ShopState.prototype.render = function () {
    const ctx = G.ctx;
    G.clear('#3868a8');
    ctx.fillStyle = '#2858a0'; for (let i = 0; i < 12; i++) ctx.fillRect(0, i * 14, G.W, 1);
    // 所持金
    G.window9(G.W - 96, 4, 92, 18, { fill: '#f8f8f8', border: '#284878', inner: '#a8c8e8' });
    G.text('しょじきん', G.W - 90, 8, '#384048', 8);
    G.text(G.money + '円', G.W - 90, 14, '#384048', 8);
    // 一覧
    G.window9(4, 26, G.W - 8, G.H - 52, { fill: '#f8f8f8', border: '#284878', inner: '#cfe' });
    G.text('フレンドリィショップ', 12, 30, '#384048', 8);
    for (let i = 0; i < SHOP_STOCK.length; i++) {
      const item = D.ITEMS[SHOP_STOCK[i]], yy = 42 + i * 12;
      G.text(item.name, 16, yy, '#384048', 8);
      G.text(item.price + '円', G.W - 56, yy, '#384048', 8);
      if (i === this.index) G.cursor(8, yy, '#d04030');
    }
    // 説明/通知
    G.window9(4, G.H - 24, G.W - 8, 20, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    if (this.note) G.text(this.note, 12, G.H - 18, '#384048', 8);
    else G.text((D.ITEMS[SHOP_STOCK[this.index]].desc || '').slice(0, 30), 12, G.H - 18, '#384048', 8);
  };

  G.openMenu = function () { G.pushState(new MenuState()); };
  G.openShop = function () { G.pushState(new ShopState()); };
  G.MenuState = MenuState;
})(window);
