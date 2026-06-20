/* =========================================================================
 * assets.js — 画像アセットのローダ（フォールバック付き）＋ PNG雛形書き出し
 *
 * 使い方:
 *  - assets/manifest.js で window.ASSET_MANIFEST に「用意した画像」を登録すると
 *    自動でゲームに反映されます。未登録/未配置の画像は手続き描画にフォールバック。
 *  - すべて試し読みするには manifest.js で  window.ASSET_MANIFEST = 'auto'
 *  - 現状の手続き描画を PNG 雛形として書き出す開発ツール: window.MEDev
 *      MEDev.exportMonster('sproutle')  // 1種(正面/背面)
 *      MEDev.exportAllMonsters()        // 全21種(42枚)
 *      MEDev.exportPlayerSheet()        // 歩行シート
 *      MEDev.exportTileset()            // タイルセット
 * ========================================================================= */
(function (global) {
  'use strict';

  // 期待される画像の一覧（キー・パス・サイズ・説明）
  function buildRegistry() {
    const D = global.GameData;
    const list = [];
    for (const id in D.SPECIES) {
      const nm = D.SPECIES[id].name;
      list.push({ key: 'mon:' + id + ':front', src: 'assets/monsters/' + id + '_front.png', w: 64, h: 64, keyBG: true, desc: nm + '（正面・敵）' });
      list.push({ key: 'mon:' + id + ':back', src: 'assets/monsters/' + id + '_back.png', w: 64, h: 64, keyBG: true, desc: nm + '（背面・自分）' });
    }
    list.push({ key: 'player_ow', src: 'assets/overworld/player.png', w: 48, h: 64, keyBG: true, desc: '主人公 歩行 3フレーム×4方向(下上左右) 各16x16' });
    list.push({ key: 'tileset', src: 'assets/overworld/tileset.png', w: 128, h: 48, desc: 'タイルセット 8列×3行 各16x16' });
    list.push({ key: 'title', src: 'assets/title.png', w: 240, h: 160, desc: 'タイトル画面 全画面' });
    list.push({ key: 'battlebg', src: 'assets/battle_bg.png', w: 240, h: 112, desc: 'バトル背景' });
    return list;
  }

  const REGISTRY = buildRegistry();
  const byKey = {}; REGISTRY.forEach(e => { byKey[e.key] = e; });
  const images = {};
  let total = 0, loaded = 0;

  // 自動制御フラグ（manifest.js で上書き可能）
  const opt = global.ASSET_OPTIONS || {};
  const AUTO_RESIZE = opt.autoResize !== false;   // 既定: 任意サイズ → 規定サイズへ自動縮小
  const AUTO_KEY = opt.autoBgRemove !== false;    // 既定: 白などの背景を自動透過
  const KEY_THRESHOLD = opt.bgThreshold || 60;    // 背景とみなす色距離

  function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // 四隅の色を背景とみなして透過抜き（既に透過なら何もしない）
  function removeBackground(ctx, w, h) {
    const im = ctx.getImageData(0, 0, w, h), d = im.data;
    const at = (x, y) => 4 * (y * w + x);
    const cs = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
    // すでに透過している画像はスキップ
    let aSum = 0; for (const c of cs) aSum += d[c + 3];
    if (aSum / cs.length < 12) return;
    let r = 0, g = 0, b = 0; for (const c of cs) { r += d[c]; g += d[c + 1]; b += d[c + 2]; }
    r /= 4; g /= 4; b /= 4;
    // 四隅がバラバラ（＝背景が一様でない）なら抜かない
    let maxd = 0;
    for (const c of cs) { const dd = Math.hypot(d[c] - r, d[c + 1] - g, d[c + 2] - b); if (dd > maxd) maxd = dd; }
    if (maxd > 40) return;
    const th = KEY_THRESHOLD, feather = 28;
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b);
      if (dist < th) d[i + 3] = 0;
      else if (dist < th + feather) d[i + 3] = Math.min(d[i + 3], Math.round(255 * (dist - th) / feather));
    }
    ctx.putImageData(im, 0, 0);
  }

  // 読み込んだ画像を規定サイズへ整え、必要なら背景透過してキャンバス化
  function bake(img, entry) {
    const nw = img.naturalWidth || entry.w, nh = img.naturalHeight || entry.h;
    let w = nw, h = nh;
    if (AUTO_RESIZE && entry.w && entry.h && (nw !== entry.w || nh !== entry.h)) { w = entry.w; h = entry.h; }
    const c = newCanvas(w, h), ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    if (AUTO_KEY && entry.keyBG) {
      try { removeBackground(ctx, w, h); } catch (e) { /* file://でtaintされた場合などはスキップ */ }
    }
    return c;
  }

  function load(entry) {
    if (images[entry.key]) return;
    const img = new Image();
    const rec = { img: img, canvas: null, loaded: false, entry: entry };
    images[entry.key] = rec; total++;
    img.onload = function () {
      try { rec.canvas = bake(img, entry); } catch (e) { rec.canvas = null; }
      rec.loaded = true; loaded++;
    };
    img.onerror = function () { /* 無ければフォールバック（静かに無視） */ };
    img.src = entry.src;
  }

  function start() {
    const m = global.ASSET_MANIFEST;
    if (!m) return;
    if (m === 'auto') { REGISTRY.forEach(load); return; }
    if (Array.isArray(m)) {
      m.forEach(function (item) {
        if (typeof item === 'string') {
          const e = byKey[item] || REGISTRY.find(function (r) { return r.src === item || r.src.endsWith(item); });
          if (e) load(e); else load({ key: item, src: item });
        } else if (item && item.key && item.src) {
          load(item);
        }
      });
    }
  }

  function get(key) { const r = images[key]; return (r && r.loaded) ? (r.canvas || r.img) : null; }
  function has(key) { return !!get(key); }

  global.Assets = { get: get, has: has, REGISTRY: REGISTRY, progress: function () { return { loaded: loaded, total: total }; }, reload: start, _bake: bake, _removeBackground: removeBackground };
  start();

  // ----------------- 開発用: 手続き描画を PNG 雛形として書き出す -----------------
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function download(canvas, name) {
    const a = document.createElement('a');
    a.download = name; a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  const Sp = global.Sprites;

  const MEDev = {
    exportMonster: function (id, size) {
      size = size || 64;
      [false, true].forEach(function (back) {
        const c = makeCanvas(size, size), ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const src = Sp.getMonsterCanvas(id, back);
        ctx.drawImage(src, 0, 0, size, size);
        download(c, id + '_' + (back ? 'back' : 'front') + '.png');
      });
    },
    exportAllMonsters: function (size) {
      const ids = Object.keys(global.GameData.SPECIES);
      let i = 0;
      const self = this;
      (function next() {
        if (i >= ids.length) return;
        self.exportMonster(ids[i], size); i++;
        setTimeout(next, 250); // ブラウザの連続DLブロック回避
      })();
    },
    // 全モンスターを1枚のコンタクトシートで（確認用）
    exportContactSheet: function (cell) {
      cell = cell || 64;
      const ids = Object.keys(global.GameData.SPECIES);
      const cols = 6, rows = Math.ceil(ids.length * 2 / cols);
      const c = makeCanvas(cols * cell, rows * cell), ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      let n = 0;
      ids.forEach(function (id) {
        [false, true].forEach(function (back) {
          const x = (n % cols) * cell, y = Math.floor(n / cols) * cell;
          ctx.drawImage(Sp.getMonsterCanvas(id, back), x, y, cell, cell); n++;
        });
      });
      download(c, 'monsters_contact_sheet.png');
    },
    exportPlayerSheet: function () {
      const c = makeCanvas(48, 64), ctx = c.getContext('2d');
      const dirs = ['down', 'up', 'left', 'right'];
      dirs.forEach(function (dir, r) {
        for (let f = 0; f < 3; f++) Sp.drawPlayer(ctx, dir, f, f * 16, r * 16, 16);
      });
      download(c, 'player.png');
    },
    exportTileset: function () {
      const TM = global.GameMaps.TILEMAP, drawTile = global.GameMaps.drawTile;
      const c = makeCanvas(128, 48), ctx = c.getContext('2d');
      for (const ch in TM) { const p = TM[ch]; drawTile(ctx, ch, p[0] * 16, p[1] * 16, 0); }
      download(c, 'tileset.png');
    },
    list: function () { return REGISTRY.map(function (e) { return e.src + '  (' + e.w + 'x' + e.h + ')  ' + e.desc; }); }
  };
  global.MEDev = MEDev;
})(window);
