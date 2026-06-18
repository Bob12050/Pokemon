/* =========================================================================
 * overworld.js — フィールド探索
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.G;
  const M = global.GameMaps;
  const S = global.Sprites;
  const TILE = M.TILE;

  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function OverworldState() {
    this.map = null;
    this.tx = 0; this.ty = 0;       // タイル座標
    this.ox = 0; this.oy = 0;       // 移動中のピクセルオフセット
    this.dir = 'down';
    this.moving = false;
    this.frame = 0;
    this.stepCount = 0;
    this.anim = 0;
    this.msg = null;                // {lines, idx, printed, onClose}
    this.transition = 0;
    this.encReady = true;
  }

  OverworldState.prototype.enter = function () {
    G.overworld = this;
    const p = G.pos;
    this.loadMap(p.map, p.x, p.y, p.dir, true);
  };

  OverworldState.prototype.loadMap = function (name, x, y, dir, immediate) {
    this.map = M.MAPS[name];
    this.mapName = name;
    this.tx = x; this.ty = y;
    this.ox = 0; this.oy = 0;
    this.dir = dir || 'down';
    this.moving = false;
    this.encReady = true;
    G.pos = { map: name, x, y, dir: this.dir };
    this.transition = immediate ? 0 : 8;
  };

  OverworldState.prototype.showMessage = function (lines, onClose) {
    if (typeof lines === 'string') lines = [lines];
    this.msg = { lines, idx: 0, printed: '', onClose: onClose || null };
  };

  OverworldState.prototype.update = function (dt) {
    this.frame++;
    const I = G.Input;
    if (this.transition > 0) { this.transition--; return; }

    // メッセージ表示中
    if (this.msg) {
      const full = this.msg.lines[this.msg.idx];
      if (this.msg.printed.length < full.length) {
        this.msg.printed = full.slice(0, this.msg.printed.length + 2);
        if (I.pressed('a') || I.pressed('b')) this.msg.printed = full;
      } else if (I.pressed('a') || I.pressed('b')) {
        this.msg.idx++;
        if (this.msg.idx >= this.msg.lines.length) {
          const cb = this.msg.onClose; this.msg = null;
          if (cb) cb();
        } else this.msg.printed = '';
      }
      return;
    }

    // メニューを開く
    if (I.pressed('start')) { G.openMenu(); return; }

    if (this.moving) { this.updateMove(); return; }

    // 調べる
    if (I.pressed('a')) { if (this.interact()) return; }

    // 移動入力
    let nd = null;
    if (I.held('up')) nd = 'up';
    else if (I.held('down')) nd = 'down';
    else if (I.held('left')) nd = 'left';
    else if (I.held('right')) nd = 'right';
    if (nd) {
      this.dir = nd;
      const [dx, dy] = DIRV[nd];
      const nx = this.tx + dx, ny = this.ty + dy;
      if (this.canEnter(nx, ny)) {
        this.moving = true; this.moveDir = nd; this.moveStep = 0;
      } else {
        this.anim = (this.anim + 1) % 30; // その場で向き変え
      }
    }
  };

  OverworldState.prototype.canEnter = function (nx, ny) {
    const map = this.map;
    // 出口タイルは通行可
    if (M.isExitTile(map, nx, ny)) return true;
    if (M.solidAt(map, nx, ny)) return false;
    // NPCがいる所は不可
    const npc = M.npcAt(map, nx, ny);
    if (npc) return false;
    return true;
  };

  OverworldState.prototype.updateMove = function () {
    const [dx, dy] = DIRV[this.moveDir];
    this.moveStep += 2;
    this.ox = dx * this.moveStep;
    this.oy = dy * this.moveStep;
    this.anim = (Math.floor(this.moveStep / 4) % 2) + 1;
    if (this.moveStep >= TILE) {
      this.tx += dx; this.ty += dy;
      this.ox = 0; this.oy = 0; this.moving = false; this.anim = 0;
      this.stepCount++;
      G.pos = { map: this.mapName, x: this.tx, y: this.ty, dir: this.dir };
      this.onArrive();
    }
  };

  OverworldState.prototype.onArrive = function () {
    const map = this.map;
    // 出口
    const ex = M.isExitTile(map, this.tx, this.ty);
    if (ex) { this.doWarp(ex); return; }
    // ワープ（ドア）
    const w = M.warpAt(map, this.tx, this.ty);
    if (w) { this.doWarp(w); return; }
    // エンカウント
    const ch = M.tileAt(map, this.tx, this.ty);
    if (ch === ',' && map.encounters) this.checkEncounter();
  };

  OverworldState.prototype.doWarp = function (w) {
    this.transition = 8;
    const self = this;
    setTimeout(() => {
      self.loadMap(w.to, w.tx, w.ty, w.dir, false);
    }, 120);
  };

  OverworldState.prototype.checkEncounter = function () {
    const enc = this.map.encounters;
    if (Math.random() * 100 >= enc.rate) return;
    const total = enc.table.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total, pick = enc.table[0];
    for (const e of enc.table) { r -= e.weight; if (r <= 0) { pick = e; break; } }
    const level = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
    const foe = G.createMonster(pick.species, level);
    this.transition = 6;
    const self = this;
    setTimeout(() => {
      G.startBattle(foe, { isWild: true, onEnd: () => { self.transition = 6; } });
    }, 100);
  };

  OverworldState.prototype.interact = function () {
    const [dx, dy] = DIRV[this.dir];
    const fx = this.tx + dx, fy = this.ty + dy;
    const npc = M.npcAt(this.map, fx, fy);
    if (npc) {
      const self = this;
      if (npc.dir !== undefined && npc.sprite !== 'sign') npc.dir = opposite(this.dir);
      this.showMessage(npc.text, () => {
        if (npc.heal) {
          for (const m of G.party) G.fullHeal(m);
          self.showMessage('モンスターたちは げんきに なった！');
        }
      });
      return true;
    }
    return false;
  };

  function opposite(d) { return { up: 'down', down: 'up', left: 'right', right: 'left' }[d]; }

  // ---------- 描画 ----------
  OverworldState.prototype.render = function () {
    const ctx = G.ctx;
    const map = this.map;
    G.clear('#000');
    // カメラ
    const px = this.tx * TILE + this.ox + TILE / 2;
    const py = this.ty * TILE + this.oy + TILE / 2;
    let camX = Math.round(px - G.W / 2);
    let camY = Math.round(py - G.H / 2);
    const mapW = map.w * TILE, mapH = map.h * TILE;
    if (mapW <= G.W) camX = (mapW - G.W) / 2; else camX = Math.max(0, Math.min(camX, mapW - G.W));
    if (mapH <= G.H) camY = (mapH - G.H) / 2; else camY = Math.max(0, Math.min(camY, mapH - G.H));

    // タイル
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    const x1 = x0 + Math.ceil(G.W / TILE) + 1, y1 = y0 + Math.ceil(G.H / TILE) + 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ch = M.tileAt(map, x, y);
        M.drawTile(ctx, ch, x * TILE - camX, y * TILE - camY, this.frame);
      }
    }

    // NPC
    if (map.npcs) for (const n of map.npcs) {
      if (n.sprite === 'sign') continue;
      const nx = n.x * TILE - camX, ny = n.y * TILE - camY - 4;
      drawHuman(ctx, n.sprite, n.dir || 'down', nx, ny);
    }

    // プレイヤー
    const ppx = this.tx * TILE + this.ox - camX;
    const ppy = this.ty * TILE + this.oy - camY - 6;
    S.drawPlayer(ctx, this.dir, this.anim, ppx, ppy, TILE);

    // マップ名（入場時）
    if (this.transition > 0 && map.name) {
      // フェード
      ctx.fillStyle = 'rgba(0,0,0,' + (this.transition / 8 * 0.7) + ')';
      ctx.fillRect(0, 0, G.W, G.H);
    }
    if (this.frame - (this.enterFrame || 0) < 0) { }

    // メッセージ
    if (this.msg) this.drawMsg();

    // マップ名プレート
    if (this.showName > 0) {
      this.showName--;
    }
  };

  OverworldState.prototype.drawMsg = function () {
    const ctx = G.ctx;
    G.window9(4, G.H - 44, G.W - 8, 40, { fill: '#f8f8f8', border: '#284878', inner: '#88a8d8' });
    const lines = wrap(this.msg.printed, 32);
    for (let i = 0; i < lines.length && i < 3; i++) G.textShadow(lines[i], 12, G.H - 38 + i * 11, '#384048', '#b8c0c8', 8);
    const full = this.msg.lines[this.msg.idx];
    if (this.msg.printed.length >= full.length && this.frame % 40 < 20) G.cursor(G.W - 16, G.H - 14, '#384048');
  };

  function drawHuman(ctx, sprite, dir, x, y) {
    // NPC は色違いのトレーナースプライトで代用
    S.drawPlayer(ctx, dir, 0, x, y, TILE);
    if (sprite === 'prof') {
      // 白衣っぽく上半分を白で薄く重ねる
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 3, y + 9, 10, 7);
    }
  }

  function wrap(str, n) {
    const out = []; let cur = '';
    for (const ch of str) { cur += ch; if (cur.length >= n) { out.push(cur); cur = ''; } }
    if (cur) out.push(cur);
    return out;
  }

  G.OverworldState = OverworldState;
})(window);
