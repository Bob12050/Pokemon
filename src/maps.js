/* =========================================================================
 * maps.js — タイル定義・マップ・描画・エンカウント
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.G;
  const TILE = 16;

  // タイル属性：solid=通行不可, enc=草むら, animWater
  const PROPS = {
    '.': { solid: false }, ',': { solid: false, enc: true }, ':': { solid: false },
    'F': { solid: false }, '=': { solid: false }, 'M': { solid: false },
    'T': { solid: true }, '#': { solid: true }, 'W': { solid: true, water: true },
    'H': { solid: true }, 'R': { solid: true }, 'Y': { solid: true }, 'D': { solid: false }, 'S': { solid: true },
    'b': { solid: true }, 'C': { solid: true }, 'P': { solid: true }, '~': { solid: false, water: true },
    'B': { solid: true }, 'L': { solid: false, ledge: true }
  };

  function solidAt(map, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return true;
    const ch = map.grid[y][x] || 'T';
    const p = PROPS[ch];
    return p ? p.solid : true;
  }
  function tileAt(map, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return 'T';
    return map.grid[y][x] || '.';
  }

  // ---------- タイル描画 ----------
  function fillTexture(ctx, px, py, base, dots, dotColor) {
    ctx.fillStyle = base; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = dotColor;
    for (const [dx, dy] of dots) ctx.fillRect(px + dx, py + dy, 1, 1);
  }

  function drawTile(ctx, ch, px, py, frame) {
    switch (ch) {
      case '.': case 'D':
        fillTexture(ctx, px, py, '#6cbf4a', [[3, 4], [9, 7], [12, 12], [5, 11]], '#5aad3c');
        if (ch === 'D') { ctx.fillStyle = '#5a3a20'; ctx.fillRect(px + 4, py + 3, 8, 13); ctx.fillStyle = '#3a2414'; ctx.fillRect(px + 5, py + 5, 6, 11); ctx.fillStyle = '#caa050'; ctx.fillRect(px + 9, py + 10, 1, 2); }
        break;
      case ',':
        fillTexture(ctx, px, py, '#5aad3c', [], '');
        ctx.fillStyle = '#3f8f2a';
        for (let i = 0; i < 4; i++) { const bx = px + 2 + i * 4; ctx.fillRect(bx, py + 9, 1, 5); ctx.fillRect(bx + 1, py + 7, 1, 7); ctx.fillRect(bx + 2, py + 10, 1, 4); }
        ctx.fillStyle = '#6cbf4a'; ctx.fillRect(px, py, TILE, 4);
        break;
      case ':':
        fillTexture(ctx, px, py, '#d8c890', [[2, 3], [11, 6], [6, 13]], '#c8b878');
        break;
      case 'F':
        fillTexture(ctx, px, py, '#6cbf4a', [], '');
        ctx.fillStyle = '#f04860'; ctx.fillRect(px + 4, py + 5, 2, 2); ctx.fillRect(px + 10, py + 9, 2, 2);
        ctx.fillStyle = '#f8e040'; ctx.fillRect(px + 5, py + 6, 1, 1); ctx.fillRect(px + 11, py + 10, 1, 1);
        break;
      case 'T':
        fillTexture(ctx, px, py, '#6cbf4a', [], '');
        ctx.fillStyle = '#1f6b1a'; ctx.beginPath(); ctx.arc(px + 8, py + 7, 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#2f8b28'; ctx.beginPath(); ctx.arc(px + 6, py + 5, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#5a3a1c'; ctx.fillRect(px + 6, py + 12, 4, 4);
        break;
      case 'W': case '~': {
        const o = (frame % 60 < 30) ? 0 : 2;
        ctx.fillStyle = '#3868c8'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#5a8ae8';
        ctx.fillRect(px + 1 + o, py + 4, 5, 1); ctx.fillRect(px + 9 - o, py + 9, 5, 1); ctx.fillRect(px + 3 + o, py + 12, 4, 1);
        break;
      }
      case 'H':
        ctx.fillStyle = '#e0d0b0'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#c8b088'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py + 8, TILE, 1);
        ctx.fillStyle = '#b89868'; ctx.fillRect(px, py + TILE - 1, TILE, 1);
        break;
      case 'B': // 窓付き壁
        ctx.fillStyle = '#e0d0b0'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#7ac0e0'; ctx.fillRect(px + 3, py + 3, 10, 8);
        ctx.fillStyle = '#cfeaf5'; ctx.fillRect(px + 3, py + 3, 10, 2);
        ctx.fillStyle = '#9a7848'; ctx.fillRect(px + 7, py + 3, 2, 8);
        break;
      case 'R':
        ctx.fillStyle = '#c84038'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#a82820'; ctx.fillRect(px, py + 6, TILE, 1); ctx.fillRect(px, py + 12, TILE, 1);
        ctx.fillStyle = '#e87060'; ctx.fillRect(px, py, TILE, 2);
        break;
      case 'Y':
        ctx.fillStyle = '#3868c8'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#2848a0'; ctx.fillRect(px, py + 6, TILE, 1); ctx.fillRect(px, py + 12, TILE, 1);
        ctx.fillStyle = '#70a0e8'; ctx.fillRect(px, py, TILE, 2);
        break;
      case 'S':
        fillTexture(ctx, px, py, '#6cbf4a', [], '');
        ctx.fillStyle = '#a87848'; ctx.fillRect(px + 2, py + 3, 12, 8);
        ctx.fillStyle = '#caa060'; ctx.fillRect(px + 3, py + 4, 10, 6);
        ctx.fillStyle = '#5a3a1c'; ctx.fillRect(px + 4, py + 6, 8, 1); ctx.fillRect(px + 4, py + 8, 6, 1);
        ctx.fillStyle = '#7a5230'; ctx.fillRect(px + 6, py + 11, 1, 4); ctx.fillRect(px + 9, py + 11, 1, 4);
        break;
      case '#':
        fillTexture(ctx, px, py, '#6cbf4a', [], '');
        ctx.fillStyle = '#caa060'; ctx.fillRect(px, py + 5, TILE, 2); ctx.fillRect(px + 3, py, 2, TILE); ctx.fillRect(px + 11, py, 2, TILE);
        break;
      case '=':
        ctx.fillStyle = '#caa470'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#b89058'; ctx.fillRect(px, py + 7, TILE, 1); ctx.fillRect(px, py + 15, TILE, 1);
        break;
      case 'M':
        ctx.fillStyle = '#caa470'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#d05858'; ctx.fillRect(px + 2, py + 2, 12, 12);
        ctx.fillStyle = '#e87878'; ctx.fillRect(px + 4, py + 4, 8, 8);
        break;
      case 'b':
        ctx.fillStyle = '#7a5230'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#9a6a40'; ctx.fillRect(px, py + 1, TILE, 6); ctx.fillRect(px, py + 9, TILE, 6);
        ctx.fillStyle = '#d04040'; ctx.fillRect(px + 2, py + 1, 2, 5); ctx.fillStyle = '#4060c0'; ctx.fillRect(px + 6, py + 1, 2, 5); ctx.fillStyle = '#40a040'; ctx.fillRect(px + 10, py + 9, 2, 5);
        break;
      case 'C':
        ctx.fillStyle = '#caa470'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#f0d8a0'; ctx.fillRect(px, py, TILE, 8);
        ctx.fillStyle = '#a07848'; ctx.fillRect(px, py + 8, TILE, 2);
        break;
      case 'L':
        fillTexture(ctx, px, py, '#6cbf4a', [], '');
        ctx.fillStyle = '#caa060'; ctx.fillRect(px, py + 10, TILE, 6);
        ctx.fillStyle = '#a87848'; ctx.fillRect(px, py + 13, TILE, 3);
        break;
      default:
        ctx.fillStyle = '#000'; ctx.fillRect(px, py, TILE, TILE);
    }
  }

  // ---------- マップ定義 ----------
  // 凡例: . 草地  , 草むら  : 道  T 木  # 柵  W 水  H 壁  B 窓壁  R 屋根  D ドア
  //       S 看板  F 花  = 室内床  M マット(出口)  b 棚  C カウンター  L 段差
  const MAPS = {
    town: {
      name: 'ワカバタウン', outdoor: true,
      grid: [
        'TTTTTTTTT::TTTTTTTT',
        'T.................T',
        'T..RRRR.....RRRR..T',
        'T..RRRR.....RRRR..T',
        'T..BDHB.....BDHB..T',
        'T.................T',
        'T..S..............T',
        'T....F....F.......T',
        'T.................T',
        'T.................T',
        'T.................T',
        'T.......RRRR......T',
        'T.......RRRR......T',
        'T.......BDHB......T',
        'T......S..........T',
        'T.................T',
        'TTTTTTTTTTTTTTTTTTT'
      ],
      warps: [
        { x: 4, y: 4, to: 'home', tx: 3, ty: 5, dir: 'up' },
        { x: 13, y: 4, to: 'rival', tx: 3, ty: 5, dir: 'up' },
        { x: 9, y: 13, to: 'lab', tx: 4, ty: 6, dir: 'up' }
      ],
      exits: [
        { x: 9, y: 0, to: 'route1', tx: 9, ty: 16, dir: 'up' },
        { x: 10, y: 0, to: 'route1', tx: 10, ty: 16, dir: 'up' }
      ],
      npcs: [
        { x: 3, y: 6, sprite: 'sign', text: ['ワカバタウン', '"あたらしい ぼうけんの はじまり"'] },
        { x: 7, y: 14, sprite: 'sign', text: ['オーキはかせの けんきゅうじょ', 'モンスターの ひみつを しらべている。'] },
        { x: 14, y: 8, sprite: 'npc', dir: 'down', name: 'むらびと', text: ['きたの くさむらには やせいの モンスターが ひそんでいる。', 'モンスターを つれていないと あぶないよ！'] }
      ],
      encounters: null
    },

    home: {
      name: 'じぶんの いえ', outdoor: false,
      grid: [
        'HHHHHHHH',
        'H======H',
        'H=b===bH',
        'H======H',
        'H==CC==H',
        'H======H',
        'H==MM==H',
        'HHHHHHHH'
      ],
      warps: [], exits: [{ x: 3, y: 6, to: 'town', tx: 4, ty: 5, dir: 'down' }, { x: 4, y: 6, to: 'town', tx: 4, ty: 5, dir: 'down' }],
      npcs: [
        { x: 5, y: 2, sprite: 'npc', dir: 'down', name: 'ママ', text: ['いってらっしゃい！', 'つかれたら いつでも やすみに かえってきてね。', 'モンスターたちが げんきに なるわ。'], heal: true }
      ],
      encounters: null
    },

    rival: {
      name: 'おさななじみの いえ', outdoor: false,
      grid: [
        'HHHHHHHH',
        'H======H',
        'H=b===bH',
        'H======H',
        'H==CC==H',
        'H======H',
        'H==MM==H',
        'HHHHHHHH'
      ],
      warps: [], exits: [{ x: 3, y: 6, to: 'town', tx: 13, ty: 5, dir: 'down' }, { x: 4, y: 6, to: 'town', tx: 13, ty: 5, dir: 'down' }],
      npcs: [
        { x: 2, y: 2, sprite: 'npc', dir: 'down', name: 'おさななじみ', text: ['おっ、ぼうけんに でるのか？', 'おれも まけてられないな！'] }
      ],
      encounters: null
    },

    lab: {
      name: 'オーキはかせの けんきゅうじょ', outdoor: false,
      grid: [
        'HHHHHHHHH',
        'H=======H',
        'Hb=bbb=bH',
        'H=======H',
        'H==ppp==H',
        'H=======H',
        'Hb=====bH',
        'H===MM==H',
        'HHHHHHHHH'
      ],
      warps: [], exits: [{ x: 4, y: 7, to: 'town', tx: 9, ty: 14, dir: 'down' }, { x: 5, y: 7, to: 'town', tx: 9, ty: 14, dir: 'down' }],
      npcs: [
        { x: 4, y: 3, sprite: 'prof', dir: 'down', name: 'オーキはかせ', text: ['おお、げんきそうだな！', 'モンスターは つかまえると ずかんに きろくされる。', 'たくさんの なかまを みつけるのじゃぞ！'], prof: true }
      ],
      encounters: null
    },

    route1: {
      name: '１ばんどうろ', outdoor: true,
      grid: [
        'TTTTTTTTT..TTTTTTTT',
        'T,,,,,,,,,,,,,,,,,T',
        'T,,,,,,,,,,,,,,,,,T',
        'T.................T',
        'T..TT.......TT....T',
        'T..TT.......TT....T',
        'T.................T',
        'T...,,,,,,,,,,,...T',
        'T...,,,,,,,,,,,...T',
        'T.................T',
        'T.................T',
        'T....TT.....TT....T',
        'T....TT.....TT....T',
        'T.................T',
        'T....,,,,,,,,,....T',
        'T....,,,,,,,,,....T',
        'T.S...............T',
        'TTTTTTTTT::TTTTTTTT'
      ],
      warps: [],
      exits: [
        { x: 9, y: 0, to: 'city', tx: 8, ty: 12, dir: 'up' },
        { x: 10, y: 0, to: 'city', tx: 9, ty: 12, dir: 'up' },
        { x: 9, y: 17, to: 'town', tx: 9, ty: 1, dir: 'down' },
        { x: 10, y: 17, to: 'town', tx: 10, ty: 1, dir: 'down' }
      ],
      npcs: [
        { x: 2, y: 16, sprite: 'sign', text: ['１ばんどうろ', 'この さき ニジイロシティ'] },
        { x: 14, y: 9, sprite: 'npc', dir: 'left', name: 'たんけんか', text: ['くさむらで モンスターを よわらせてから', 'ボールを なげると つかまえやすいぞ！', 'ねむらせると なお よし！'] },
        {
          x: 12, y: 10, sprite: 'youngster', dir: 'left', trainer: true, sight: 4, prize: 80, flag: 't_route1_a',
          name: 'たんぱんこぞう ケンタ',
          intro: ['たんぱんこぞう ケンタ', 'やあ！ ぼくと しょうぶしよう！'],
          defeat: ['つよいなあ！ もっと きたえてくる！'],
          party: [{ species: 'nibblet', level: 6 }, { species: 'flittle', level: 7 }],
          text: ['つよいなあ！ もっと きたえてくる！']
        },
        {
          x: 4, y: 3, sprite: 'lass', dir: 'right', trainer: true, sight: 4, prize: 110, flag: 't_route1_b',
          name: 'ミニスカート アヤ',
          intro: ['ミニスカート アヤ', 'かわいい モンスター みつけたの！ しょうぶ よ！'],
          defeat: ['まけちゃった… でも たのしかった！'],
          party: [{ species: 'buzzle', level: 6 }, { species: 'cobblite', level: 8 }],
          text: ['まけちゃった… でも たのしかった！']
        }
      ],
      encounters: { rate: 18, table: [
        { species: 'nibblet', min: 2, max: 5, weight: 30 },
        { species: 'flittle', min: 2, max: 5, weight: 25 },
        { species: 'buzzle', min: 2, max: 4, weight: 20 },
        { species: 'sparkit', min: 3, max: 6, weight: 12 },
        { species: 'cobblite', min: 3, max: 6, weight: 8 },
        { species: 'sproutle', min: 4, max: 6, weight: 3 },
        { species: 'wispurr', min: 4, max: 6, weight: 1 },
        { species: 'dratlet', min: 4, max: 6, weight: 1 }
      ] }
    },

    city: {
      name: 'ニジイロシティ', outdoor: true,
      grid: [
        'TTTTTTTTTTTTTTTTT',
        'T...............T',
        'T..RRRR...YYYY..T',
        'T..RRRR...YYYY..T',
        'T..BDHB...BDHB..T',
        'T...............T',
        'T...............T',
        'T..RRRR.........T',
        'T..RRRR.........T',
        'T..BDHB.........T',
        'T.......F.......T',
        'T..S...F.F......T',
        'T...............T',
        'TTTTTTTT::TTTTTTT'
      ],
      warps: [
        { x: 4, y: 4, to: 'center', tx: 4, ty: 5, dir: 'up' },
        { x: 11, y: 4, to: 'mart', tx: 4, ty: 5, dir: 'up' },
        { x: 4, y: 9, to: 'cityhouse', tx: 3, ty: 5, dir: 'up' }
      ],
      exits: [
        { x: 8, y: 13, to: 'route1', tx: 9, ty: 1, dir: 'down' },
        { x: 9, y: 13, to: 'route1', tx: 10, ty: 1, dir: 'down' }
      ],
      npcs: [
        { x: 3, y: 11, sprite: 'sign', text: ['ニジイロシティ', '"にじが かかる ふれあいの まち"'] },
        { x: 12, y: 7, sprite: 'npc', dir: 'down', name: 'まちのひと', text: ['あかい やねは モンスターセンター。', 'モンスターを ただで かいふくできるよ！'] },
        { x: 13, y: 11, sprite: 'npc', dir: 'left', name: 'おとこのこ', text: ['あおい やねの ショップで', 'ボールや くすりが かえるんだ。'] }
      ],
      encounters: null
    },

    center: {
      name: 'モンスターセンター', outdoor: false,
      grid: [
        'HHHHHHHHH',
        'H=CCCCC=H',
        'H=======H',
        'H=======H',
        'H=b===b=H',
        'H=======H',
        'H===MM==H',
        'HHHHHHHHH'
      ],
      warps: [], exits: [{ x: 4, y: 6, to: 'city', tx: 4, ty: 5, dir: 'down' }, { x: 5, y: 6, to: 'city', tx: 4, ty: 5, dir: 'down' }],
      npcs: [
        { x: 4, y: 2, sprite: 'nurse', dir: 'down', name: 'ジョーイ', heal: true, text: ['モンスターセンターへ ようこそ！', 'モンスターを げんきな じょうたいに しますね。'] }
      ],
      encounters: null
    },

    mart: {
      name: 'フレンドリィショップ', outdoor: false,
      grid: [
        'HHHHHHHHH',
        'H=CCCC==H',
        'H=======H',
        'H=======H',
        'H=b=b=b=H',
        'H=======H',
        'H===MM==H',
        'HHHHHHHHH'
      ],
      warps: [], exits: [{ x: 4, y: 6, to: 'city', tx: 11, ty: 5, dir: 'down' }, { x: 5, y: 6, to: 'city', tx: 11, ty: 5, dir: 'down' }],
      npcs: [
        { x: 4, y: 2, sprite: 'clerk', dir: 'down', name: 'てんいん', shop: true, text: ['いらっしゃいませ！', 'なにを おもとめですか？'] }
      ],
      encounters: null
    },

    cityhouse: {
      name: 'ニジイロシティの いえ', outdoor: false,
      grid: [
        'HHHHHHHH',
        'H======H',
        'H=b==b=H',
        'H======H',
        'H==CC==H',
        'H======H',
        'H==MM==H',
        'HHHHHHHH'
      ],
      warps: [], exits: [{ x: 3, y: 6, to: 'city', tx: 4, ty: 10, dir: 'down' }, { x: 4, y: 6, to: 'city', tx: 4, ty: 10, dir: 'down' }],
      npcs: [
        { x: 2, y: 2, sprite: 'npc', dir: 'down', name: 'はかせのたまご', text: ['しんかは レベルアップで おきることが おおいよ。', 'タイプの あいしょうを おぼえると しょうぶが ゆうりに なる！'] }
      ],
      encounters: null
    }
  };

  // 出口は到達タイルとして walkable 扱いにするための補正：exits 上は通行可
  function isExitTile(map, x, y) {
    if (!map.exits) return null;
    return map.exits.find(e => e.x === x && e.y === y) || null;
  }
  function warpAt(map, x, y) {
    if (!map.warps) return null;
    return map.warps.find(w => w.x === x && w.y === y) || null;
  }
  function npcAt(map, x, y) {
    if (!map.npcs) return null;
    return map.npcs.find(n => n.x === x && n.y === y) || null;
  }

  function dims(map) { map.h = map.grid.length; map.w = map.grid[0].length; return map; }
  for (const k in MAPS) dims(MAPS[k]);

  global.GameMaps = { MAPS, TILE, PROPS, drawTile, solidAt, tileAt, isExitTile, warpAt, npcAt };
})(window);
