/* =========================================================================
 * main.js — タイトル／最初のモンスター選択／起動
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.G;
  const D = G.D;
  const S = global.Sprites;
  G.box = G.box || [];

  // ---------- タイトル ----------
  function TitleState() {
    this.options = G.hasSave() ? ['つづきから', 'さいしょから'] : ['さいしょから'];
    this.index = 0;
    this.t = 0;
  }
  TitleState.prototype.update = function () {
    this.t++;
    const I = G.Input;
    if (I.pressed('down')) this.index = (this.index + 1) % this.options.length;
    if (I.pressed('up')) this.index = (this.index + this.options.length - 1) % this.options.length;
    if (I.pressed('a') || I.pressed('start')) {
      const opt = this.options[this.index];
      if (opt === 'つづきから') {
        const d = G.load();
        if (d) { G.applySave(d); G.setState(new G.OverworldState()); }
      } else {
        G.setState(new StarterSelectState());
      }
    }
  };
  TitleState.prototype.render = function () {
    const ctx = G.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, G.H);
    grad.addColorStop(0, '#063'); grad.addColorStop(0.5, '#0a8060'); grad.addColorStop(1, '#063');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, G.W, G.H);
    // きらめき
    for (let i = 0; i < 20; i++) {
      const x = (i * 53 + this.t) % G.W, y = (i * 31) % 70;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.2 * Math.sin((this.t + i * 20) / 20)) + ')';
      ctx.fillRect(x, y, 1, 1);
    }
    // ロゴ
    ctx.textAlign = 'center';
    G.setFont(22); ctx.fillStyle = '#0c3'; ctx.fillText('MONSTER', G.W / 2 + 2, 26);
    ctx.fillStyle = '#7fffc0'; ctx.fillText('MONSTER', G.W / 2, 24);
    G.setFont(26); ctx.fillStyle = '#063'; ctx.fillText('EMERALD', G.W / 2 + 2, 48);
    ctx.fillStyle = '#3fe89a'; ctx.fillText('EMERALD', G.W / 2, 46);
    ctx.textAlign = 'left';
    // 御三家プレビュー
    S.drawMonster(ctx, 'sproutle', 40, 78, 36, false);
    S.drawMonster(ctx, 'embit', 100, 78, 36, false);
    S.drawMonster(ctx, 'dribblet', 160, 78, 36, false);
    // メニュー
    const w = 110, x = (G.W - w) / 2, y = 120, h = this.options.length * 14 + 8;
    G.window9(x, y, w, h, { fill: '#f8f8f8', border: '#284878', inner: '#88c8a8' });
    for (let i = 0; i < this.options.length; i++) {
      const yy = y + 6 + i * 14;
      ctx.textAlign = 'left';
      G.text(this.options[i], x + 20, yy, '#384048', 8);
      if (i === this.index) G.cursor(x + 8, yy, '#d04030');
    }
    if (this.t % 60 < 40) { ctx.textAlign = 'center'; G.text('▼ Ｚキーで けってい ▼', G.W / 2, G.H - 8, '#dff', 7); ctx.textAlign = 'left'; }
  };

  // ---------- 最初のモンスター選択 ----------
  const STARTERS = [
    { id: 'sproutle', desc: 'くさタイプ。おだやかで かしこい。' },
    { id: 'embit', desc: 'ほのおタイプ。げんきで まけずぎらい。' },
    { id: 'dribblet', desc: 'みずタイプ。おっとりして たくましい。' }
  ];
  function StarterSelectState() { this.index = 1; this.t = 0; this.confirm = false; }
  StarterSelectState.prototype.update = function () {
    this.t++;
    const I = G.Input;
    if (this.confirm) {
      if (I.pressed('a')) {
        const id = STARTERS[this.index].id;
        G.newGame('ヒカル', id);
        const ow = new G.OverworldState();
        G.setState(ow);
        ow.showMessage([
          'オーキはかせ「ようこそ モンスターの せかいへ！」',
          'きみは ' + D.SPECIES[id].name + 'を あいぼうに えらんだ。',
          'さあ、ぼうけんの はじまりだ！ きたの くさむらを めざそう。'
        ]);
        return;
      }
      if (I.pressed('b')) this.confirm = false;
      return;
    }
    if (I.pressed('left')) this.index = (this.index + 2) % 3;
    if (I.pressed('right')) this.index = (this.index + 1) % 3;
    if (I.pressed('a')) this.confirm = true;
    if (I.pressed('b')) G.setState(new TitleState());
  };
  StarterSelectState.prototype.render = function () {
    const ctx = G.ctx;
    G.clear('#284058');
    ctx.fillStyle = '#3a5874'; ctx.fillRect(0, 0, G.W, 12);
    G.text('さいしょの あいぼうを えらぼう', 8, 3, '#fff', 8);
    // 3体のモンスターボール台
    for (let i = 0; i < 3; i++) {
      const cx = 40 + i * 80;
      ctx.fillStyle = '#5a7a96'; ctx.beginPath(); ctx.ellipse(cx, 80, 30, 8, 0, 0, 7); ctx.fill();
      const bob = i === this.index ? Math.sin(this.t / 8) * 2 : 0;
      S.drawMonster(ctx, STARTERS[i].id, cx - 24, 34 + bob, 48, false);
      if (i === this.index) { G.cursor(cx - 30, 70, '#f8f800'); }
    }
    const st = STARTERS[this.index], sp = D.SPECIES[st.id];
    G.window9(4, G.H - 52, G.W - 8, 48, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    G.text(sp.name, 12, G.H - 46, '#384048', 8);
    let tx = 70;
    for (const t of sp.types) { ctx.fillStyle = D.TYPE_COLORS[t]; ctx.fillRect(tx, G.H - 47, 38, 9); G.text(t, tx + 2, G.H - 46, '#fff', 8); tx += 42; }
    G.text(st.desc, 12, G.H - 34, '#384048', 8);
    if (this.confirm) {
      G.text('この モンスターに きめる？  Ａ:はい Ｂ:いいえ', 12, G.H - 20, '#d04030', 8);
    } else {
      G.text('◀▶ えらぶ   Ａ:けってい', 12, G.H - 20, '#384048', 8);
    }
  };

  // 起動
  G.setState(new TitleState());
  G.start();
  global.TitleState = TitleState;
})(window);
