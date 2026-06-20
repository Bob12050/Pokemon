/* =========================================================================
 * sprites.js — ドット絵（オリジナル）の生成と描画
 * モンスターはテンプレ形状＋種族カラーで塗り分け。すべて自作。
 * ========================================================================= */
(function (global) {
  'use strict';

  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function rgbToHex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function shade(hex, f) {
    const [r, g, b] = hexToRgb(hex);
    if (f >= 0) return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
    return rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f));
  }

  // ---- モンスター形状テンプレート（'.'/' ' は透明） ----
  // o=輪郭, x=本体, d=濃い, l=明るい, b=おなか(クリーム), e=白目, p=黒目, a=アクセント
  const TEMPLATES = {
    reptile: [
      '......oooo......',
      '....ooxxxxoo....',
      '...oxxxxxxxxo...',
      '..oxxllxxllxxo..',
      '..oxxepxxepxxo..',
      '..oxxxxxxxxxxo..',
      '..oxxxxooxxxxo..',
      '...oxxxxxxxxo...',
      '..oxxbbbbbbxxo..',
      '.oxxbbbbbbbbxxo.',
      '.oxxbbbbbbbbxxo.',
      '.oxxxbbbbbbxxxo.',
      '..oxxoxxxxoxxo..',
      '..ooo.oxxo.ooo..',
      '......oo.oo.....',
      '.....oo...oo....'
    ],
    quadruped: [
      '...oo......oo...',
      '..oxxo....oxxo..',
      '..oxlxoooooxlxo.',
      '.oxxxxxxxxxxxxxo',
      '.oxxepxxxxepxxxo',
      '.oxxxxxooxxxxxxo',
      '.oxxxxxxxxxxxxxo',
      '.oxbbbbbbbbbbbxo',
      '.oxbbbbbbbbbbbxo',
      '.oxxbbbbbbbbxxxo',
      '.oxxxxxxxxxxxxxo',
      '.oxxoxxooxxoxxxo',
      '..oo.oo..oo.oo..',
      '......o..o......'
    ],
    bird: [
      '.......oo.......',
      '......oxxo......',
      '.....oxlxxo.....',
      '....oxepxlxo....',
      '...oaaxxxxxxo...',
      '..oxxxxxxxxxxo..',
      '.oxxxbbbbxxxxxo.',
      'oxxxxbbbbxxxxxxo',
      'oxxxxxbbbbxxxxxo',
      '.oxxxxxxxxxxxxo.',
      '..oxxxxxxxxxxo..',
      '...ooxxxxxxoo...',
      '.....oxxxxo.....',
      '......o..o......',
      '.....oo..oo.....'
    ],
    bug: [
      '..o..........o..',
      '..oo........oo..',
      '...oo......oo...',
      '....oxxxxxxo....',
      '...oxxepxepxxo..',
      '..oaxxxxxxxxao..',
      '..oxxxoxxoxxxo..',
      '..oxxxxxxxxxxo..',
      '.oxxbbxxxxbbxxo.',
      '.oxxbbbbbbbbxxo.',
      '.oxaxbbbbbbxaxo.',
      '..oxxxxxxxxxxo..',
      '...oxxoxxoxxo...',
      '....oo.oo.oo....'
    ],
    rock: [
      '....oooooo......',
      '..ooxllxxxoo....',
      '.oxxxxxxxxxxo...',
      'oxxlxxxxxxxxxo..',
      'oxxxxepxxepxxxo.',
      'oxxxxxxxxxxxxxxo',
      'oxxxoxxxxxxoxxxo',
      'oxxxxxxooxxxxxxo',
      '.oxxxxxxxxxxxxo.',
      '..oxxddxxddxxo..',
      '...oxxxxxxxxo...',
      '....oooooooo....'
    ],
    ghost: [
      '......oooo......',
      '....ooxxxxoo....',
      '...oxxxxxxxxo...',
      '..oxllxxxxllxo..',
      '..oxepxxxxepxo..',
      '..oxxxxxxxxxxo..',
      '.oxxxxoooxxxxxo.',
      '.oxxxxxxxxxxxxo.',
      '.oxxxxxxxxxxxxo.',
      '.oxxxxxxxxxxxxo.',
      '.oxxxxxxxxxxxxo.',
      '.oxoxxoxxoxxoxo.',
      '..o.oo.oo.oo.o..'
    ],
    serpent: [
      '........oooo....',
      '.......oxxxxo...',
      '......oxllxxo...',
      '......oxepxxo...',
      '.....oxxxxxxo...',
      '....oxxxooxo....',
      '...oxxxxoo......',
      '..oxxbbxo.......',
      '.oxxbbbxxo......',
      'oxxbbbbbxxo.....',
      'oxxbbbbbbxxo....',
      '.oxxbbbbbbxxo...',
      '..oxxxbbbxxxo...',
      '...oxxxxxxxo....',
      '....ooooooo.....'
    ]
  };

  // 種族 → テンプレ＋アクセント色
  const SPRITE_MAP = {
    sproutle: ['reptile', '#3a7d2c'], leaflox: ['reptile', '#2f6b22'], florabeast: ['reptile', '#1f5018'],
    embit: ['reptile', '#ffd040'], flarit: ['reptile', '#ffb020'], pyrothurn: ['reptile', '#ffe060'],
    dribblet: ['quadruped', '#bfe0ff'], aquafin: ['quadruped', '#a0d0ff'], tidalore: ['quadruped', '#d0b070'],
    nibblet: ['quadruped', '#fff0e0'], chompad: ['quadruped', '#fff0e0'],
    flittle: ['bird', '#ffe0a0'], skywist: ['bird', '#ffd080'],
    buzzle: ['bug', '#e8f070'], stingwing: ['bug', '#d0e040'], gloomoth: ['bug', '#d090e0'],
    sparkit: ['quadruped', '#fff070'],
    cobblite: ['rock', '#e0d080'], boulderon: ['rock', '#c0b060'],
    wispurr: ['ghost', '#d0c0f0'],
    dratlet: ['serpent', '#b090ff']
  };

  const COLMAP = {};
  function buildPalette(base, accent) {
    return {
      'o': '#202028',
      'x': base,
      'd': shade(base, -0.35),
      'l': shade(base, 0.4),
      'b': '#fbf0d0',
      'e': '#ffffff',
      'p': '#202028',
      'a': accent
    };
  }

  const cache = {};
  function getMonsterCanvas(speciesId, back) {
    const key = speciesId + (back ? '_b' : '_f');
    if (cache[key]) return cache[key];
    const sp = global.GameData.SPECIES[speciesId];
    const map = SPRITE_MAP[speciesId] || ['quadruped', '#ffffff'];
    const grid = TEMPLATES[map[0]];
    const pal = buildPalette(sp ? sp.color : '#888', map[1]);
    const h = grid.length;
    const w = grid.reduce((m, r) => Math.max(m, r.length), 0);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = grid[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x] || '.';
        if (ch === '.' || ch === ' ') continue;
        let px = back ? (w - 1 - x) : x;
        c.fillStyle = pal[ch] || base;
        c.fillRect(px, y, 1, 1);
      }
    }
    if (back) {
      // 背面はうっすらだけ陰影をつける（暗くしすぎない）
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(0,0,0,0.10)';
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
    }
    cache[key] = cv;
    return cv;
  }

  const derivedBackCache = {};
  function getDerivedBack(speciesId, frontImg) {
    if (derivedBackCache[speciesId]) return derivedBackCache[speciesId];
    const w = frontImg.width || 64, h = frontImg.height || 64;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    // 背面が無いので正面を左右反転して代用（明るさはそのまま）
    c.save(); c.translate(w, 0); c.scale(-1, 1);
    c.drawImage(frontImg, 0, 0, w, h);
    c.restore();
    derivedBackCache[speciesId] = cv;
    return cv;
  }

  function drawMonster(ctx, speciesId, dx, dy, size, back) {
    ctx.imageSmoothingEnabled = false;
    // 画像があれば優先
    const A = global.Assets;
    if (A) {
      const img = A.get('mon:' + speciesId + ':' + (back ? 'back' : 'front'));
      if (img) { ctx.drawImage(img, dx, dy, size, size); return; }
      // 背面画像が無く正面画像がある場合は、正面を反転＋暗くして代用
      if (back) {
        const front = A.get('mon:' + speciesId + ':front');
        if (front) { ctx.drawImage(getDerivedBack(speciesId, front), dx, dy, size, size); return; }
      }
    }
    const cv = getMonsterCanvas(speciesId, back);
    ctx.drawImage(cv, dx, dy, size, size);
  }

  // ---- プレイヤー（トレーナー）スプライト ----
  // c=帽子, f=顔, s=肌, h=髪, b=服, p=ズボン, o=輪郭, e=目
  const TRAINER = {
    down: [
      '....oooo....',
      '...occcco...',
      '..occcccco..',
      '..ocffffco..',
      '..ofsepseo..',  // 顔・目
      '..ofssssso..',
      '..oobbbboo..',
      '.obbbbbbbbo.',
      '.obssbbssbo.',
      '.obbbbbbbbo.',
      '..obb..bbo..',
      '..opp..ppo..',
      '..opp..ppo..',
      '..ooo..ooo..'
    ],
    up: [
      '....oooo....',
      '...occcco...',
      '..occcccco..',
      '..occcccco..',
      '..ohhhhhho..',
      '..ohhhhhho..',
      '..oobbbboo..',
      '.obbbbbbbbo.',
      '.obssbbssbo.',
      '.obbbbbbbbo.',
      '..obb..bbo..',
      '..opp..ppo..',
      '..opp..ppo..',
      '..ooo..ooo..'
    ],
    side: [
      '...oooo.....',
      '..occcco....',
      '.occcccco...',
      '.ocffffo....',
      '.ofsep o....',
      '.ofsssso....',
      '..obbbbo....',
      '.obbbbbbo...',
      'osbbbbbbso..',
      '.obbbbbbo...',
      '..obbbo.....',
      '..oppo......',
      '..oppo......',
      '..ooo.......'
    ]
  };
  const TPAL = {
    o: '#202028', c: '#d83030', f: '#202028', s: '#f0c090',
    h: '#6b4020', b: '#3858c8', p: '#384058', e: '#ffffff'
  };
  // 'e' 文字は目（白）、'p'(顔内) は黒目に。faceの中の e/p を扱う
  function trainerCanvas(dir, frame) {
    const grid = TRAINER[dir];
    const h = grid.length, w = grid[0].length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h + 1;
    const c = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = grid[y][x];
        if (ch === '.' || ch === ' ') continue;
        let col;
        if (ch === 'e') col = '#ffffff';
        else if (ch === 'p') col = '#202028';
        else col = TPAL[ch] || '#fff';
        // 歩行フレーム: 下2行(足)を左右に1pxずらす
        let yy = y, xx = x;
        if (y >= h - 3 && (ch === 'p' || ch === 'o')) {
          if (frame === 1 && x < w / 2) yy = y - 0; // 簡易: 片足上げ
          if (frame === 1 && x < w / 2 && y === h - 1) continue;
          if (frame === 2 && x > w / 2 && y === h - 1) continue;
        }
        c.fillStyle = col;
        c.fillRect(xx, yy, 1, 1);
      }
    }
    return cv;
  }
  const trainerCache = {};
  // 歩行シート（3フレーム×4方向[下上左右]・各16x16）対応
  function drawPlayerSheet(ctx, sheet, dir, frame, dx, dy, size) {
    const cols = 3, rows = 4;
    const cw = sheet.width / cols, chh = sheet.height / rows;
    const rowIdx = { down: 0, up: 1, left: 2, right: 3 }[dir] != null ? { down: 0, up: 1, left: 2, right: 3 }[dir] : 0;
    const col = Math.max(0, Math.min(cols - 1, frame));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, col * cw, rowIdx * chh, cw, chh, dx, dy, size, size * chh / cw);
  }

  function drawPlayer(ctx, dir, frame, dx, dy, size) {
    const A = global.Assets;
    if (A) {
      const sheet = A.get('player_ow');
      if (sheet) { drawPlayerSheet(ctx, sheet, dir, frame, dx, dy, size); return; }
    }
    let d = dir, flip = false;
    if (dir === 'left') { d = 'side'; flip = true; }
    else if (dir === 'right') d = 'side';
    const key = d + frame + (flip ? 'F' : '');
    if (!trainerCache[key]) trainerCache[key] = trainerCanvas(d, frame);
    const cv = trainerCache[key];
    ctx.imageSmoothingEnabled = false;
    if (flip) {
      ctx.save();
      ctx.translate(dx + size, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(cv, 0, 0, size, size * cv.height / cv.width);
      ctx.restore();
    } else {
      ctx.drawImage(cv, dx, dy, size, size * cv.height / cv.width);
    }
  }

  global.Sprites = { drawMonster, getMonsterCanvas, drawPlayer, shade };
})(window);
