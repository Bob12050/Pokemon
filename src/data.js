/* =========================================================================
 * data.js — ゲームデータ
 * ポケモンエメラルド（第3世代）のシステムを再現。モンスターは完全オリジナル。
 * ========================================================================= */
(function (global) {
  'use strict';

  // ---- タイプ（第3世代の17タイプ。フェアリー無し） ----
  const TYPES = [
    'ノーマル', 'ほのお', 'みず', 'くさ', 'でんき', 'こおり', 'かくとう',
    'どく', 'じめん', 'ひこう', 'エスパー', 'むし', 'いわ', 'ゴースト',
    'ドラゴン', 'あく', 'はがね'
  ];

  // タイプ別の色（UI表示用）
  const TYPE_COLORS = {
    'ノーマル': '#a8a878', 'ほのお': '#f08030', 'みず': '#6890f0', 'くさ': '#78c850',
    'でんき': '#f8d030', 'こおり': '#98d8d8', 'かくとう': '#c03028', 'どく': '#a040a0',
    'じめん': '#e0c068', 'ひこう': '#a890f0', 'エスパー': '#f85888', 'むし': '#a8b820',
    'いわ': '#b8a038', 'ゴースト': '#705898', 'ドラゴン': '#7038f8', 'あく': '#705848',
    'はがね': '#b8b8d0'
  };

  // 第3世代でのカテゴリ（タイプで物理/特殊が決まる）
  const PHYSICAL_TYPES = ['ノーマル', 'かくとう', 'ひこう', 'どく', 'じめん', 'いわ', 'むし', 'ゴースト', 'はがね'];
  function categoryOf(type) {
    return PHYSICAL_TYPES.indexOf(type) >= 0 ? 'physical' : 'special';
  }

  // ---- タイプ相性表（第3世代）。1倍は省略 ----
  const CHART = {
    'ノーマル': { 'いわ': .5, 'ゴースト': 0, 'はがね': .5 },
    'ほのお': { 'ほのお': .5, 'みず': .5, 'くさ': 2, 'こおり': 2, 'むし': 2, 'いわ': .5, 'ドラゴン': .5, 'はがね': 2 },
    'みず': { 'ほのお': 2, 'みず': .5, 'くさ': .5, 'じめん': 2, 'いわ': 2, 'ドラゴン': .5 },
    'くさ': { 'ほのお': .5, 'みず': 2, 'くさ': .5, 'どく': .5, 'じめん': 2, 'ひこう': .5, 'むし': .5, 'いわ': 2, 'ドラゴン': .5, 'はがね': .5 },
    'でんき': { 'みず': 2, 'くさ': .5, 'でんき': .5, 'じめん': 0, 'ひこう': 2, 'ドラゴン': .5 },
    'こおり': { 'ほのお': .5, 'みず': .5, 'くさ': 2, 'こおり': .5, 'じめん': 2, 'ひこう': 2, 'ドラゴン': 2, 'はがね': .5 },
    'かくとう': { 'ノーマル': 2, 'こおり': 2, 'いわ': 2, 'あく': 2, 'はがね': 2, 'どく': .5, 'ひこう': .5, 'エスパー': .5, 'むし': .5, 'ゴースト': 0 },
    'どく': { 'くさ': 2, 'どく': .5, 'じめん': .5, 'いわ': .5, 'ゴースト': .5, 'はがね': 0 },
    'じめん': { 'ほのお': 2, 'でんき': 2, 'くさ': .5, 'どく': 2, 'ひこう': 0, 'むし': .5, 'いわ': 2, 'はがね': 2 },
    'ひこう': { 'くさ': 2, 'でんき': .5, 'かくとう': 2, 'むし': 2, 'いわ': .5, 'はがね': .5 },
    'エスパー': { 'かくとう': 2, 'どく': 2, 'エスパー': .5, 'あく': 0, 'はがね': .5 },
    'むし': { 'ほのお': .5, 'くさ': 2, 'かくとう': .5, 'どく': .5, 'ひこう': .5, 'エスパー': 2, 'ゴースト': .5, 'あく': 2, 'はがね': .5 },
    'いわ': { 'ほのお': 2, 'こおり': 2, 'ひこう': 2, 'むし': 2, 'かくとう': .5, 'じめん': .5, 'はがね': .5 },
    'ゴースト': { 'ノーマル': 0, 'エスパー': 2, 'ゴースト': 2, 'あく': .5, 'はがね': .5 },
    'ドラゴン': { 'ドラゴン': 2, 'はがね': .5 },
    'あく': { 'かくとう': .5, 'エスパー': 2, 'ゴースト': 2, 'あく': .5, 'はがね': .5 },
    'はがね': { 'ほのお': .5, 'みず': .5, 'でんき': .5, 'こおり': 2, 'いわ': 2, 'はがね': .5 }
  };

  function typeMultiplier(atkType, defTypes) {
    let m = 1;
    const row = CHART[atkType] || {};
    for (const dt of defTypes) {
      if (dt in row) m *= row[dt];
    }
    return m;
  }

  // ---- わざ ----
  // category は基本タイプから決まるが、status は明示。
  // effect: { status, chance } / { stat, stages, target } / drain / flinch / highCrit / priority / recoil
  const MOVES = {
    'たいあたり':       { type: 'ノーマル', power: 35, acc: 95, pp: 35 },
    'ひっかく':         { type: 'ノーマル', power: 40, acc: 100, pp: 35 },
    'たたきつける':     { type: 'ノーマル', power: 40, acc: 100, pp: 35 },
    'でんこうせっか':   { type: 'ノーマル', power: 40, acc: 100, pp: 30, priority: 1 },
    'のしかかり':       { type: 'ノーマル', power: 85, acc: 100, pp: 15, effect: { status: 'paralyze', chance: 30 } },
    'はかいこうせん':   { type: 'ノーマル', power: 150, acc: 90, pp: 5, recharge: true },
    'なきごえ':         { type: 'ノーマル', power: 0, acc: 100, pp: 40, status: true, effect: { stat: 'atk', stages: -1, target: 'foe' } },
    'しっぽをふる':     { type: 'ノーマル', power: 0, acc: 100, pp: 30, status: true, effect: { stat: 'def', stages: -1, target: 'foe' } },
    'かたくなる':       { type: 'ノーマル', power: 0, acc: 100, pp: 30, status: true, effect: { stat: 'def', stages: 1, target: 'self' } },
    'せいちょう':       { type: 'ノーマル', power: 0, acc: 100, pp: 20, status: true, effect: { stat: 'spa', stages: 1, target: 'self' } },
    'ひのこ':           { type: 'ほのお', power: 40, acc: 100, pp: 25, effect: { status: 'burn', chance: 10 } },
    'かえんほうしゃ':   { type: 'ほのお', power: 95, acc: 100, pp: 15, effect: { status: 'burn', chance: 10 } },
    'ほのおのキバ':     { type: 'ほのお', power: 65, acc: 95, pp: 15, effect: { status: 'burn', chance: 10 } },
    'みずでっぽう':     { type: 'みず', power: 40, acc: 100, pp: 25 },
    'あわ':             { type: 'みず', power: 40, acc: 100, pp: 30, effect: { stat: 'spe', stages: -1, target: 'foe', chance: 10 } },
    'バブルこうせん':   { type: 'みず', power: 65, acc: 100, pp: 20, effect: { stat: 'spe', stages: -1, target: 'foe', chance: 10 } },
    'なみのり':         { type: 'みず', power: 95, acc: 100, pp: 15 },
    'つるのムチ':       { type: 'くさ', power: 45, acc: 100, pp: 25 },
    'はっぱカッター':   { type: 'くさ', power: 55, acc: 95, pp: 25, highCrit: true },
    'すいとる':         { type: 'くさ', power: 20, acc: 100, pp: 25, drain: .5 },
    'メガドレイン':     { type: 'くさ', power: 40, acc: 100, pp: 15, drain: .5 },
    'ソーラービーム':   { type: 'くさ', power: 120, acc: 100, pp: 10, charge: true },
    'でんきショック':   { type: 'でんき', power: 40, acc: 100, pp: 30, effect: { status: 'paralyze', chance: 10 } },
    'スパーク':         { type: 'でんき', power: 65, acc: 100, pp: 20, effect: { status: 'paralyze', chance: 30 } },
    '10まんボルト':     { type: 'でんき', power: 95, acc: 100, pp: 15, effect: { status: 'paralyze', chance: 10 } },
    'こおりのつぶて':   { type: 'こおり', power: 40, acc: 100, pp: 30, priority: 1 },
    'れいとうビーム':   { type: 'こおり', power: 95, acc: 100, pp: 10, effect: { status: 'freeze', chance: 10 } },
    'からてチョップ':   { type: 'かくとう', power: 50, acc: 100, pp: 25, highCrit: true },
    'けたぐり':         { type: 'かくとう', power: 60, acc: 100, pp: 20 },
    'どくばり':         { type: 'どく', power: 15, acc: 100, pp: 35, effect: { status: 'poison', chance: 30 } },
    'ヘドロこうげき':   { type: 'どく', power: 65, acc: 100, pp: 20, effect: { status: 'poison', chance: 30 } },
    'すなかけ':         { type: 'じめん', power: 0, acc: 100, pp: 15, status: true, effect: { stat: 'acc', stages: -1, target: 'foe' } },
    'あなをほる':       { type: 'じめん', power: 80, acc: 100, pp: 10 },
    'じしん':           { type: 'じめん', power: 100, acc: 100, pp: 10 },
    'つつく':           { type: 'ひこう', power: 35, acc: 100, pp: 35 },
    'つばさでうつ':     { type: 'ひこう', power: 60, acc: 100, pp: 35 },
    'かぜおこし':       { type: 'ひこう', power: 40, acc: 100, pp: 35 },
    'エアスラッシュ':   { type: 'ひこう', power: 75, acc: 95, pp: 15, effect: { flinch: true, chance: 30 } },
    'ねんりき':         { type: 'エスパー', power: 50, acc: 100, pp: 25, effect: { status: 'confuse', chance: 10 } },
    'サイケこうせん':   { type: 'エスパー', power: 65, acc: 100, pp: 20, effect: { status: 'confuse', chance: 10 } },
    'サイコキネシス':   { type: 'エスパー', power: 90, acc: 100, pp: 10, effect: { stat: 'spd', stages: -1, target: 'foe', chance: 10 } },
    'むしくい':         { type: 'むし', power: 60, acc: 100, pp: 20 },
    'いとをはく':       { type: 'むし', power: 0, acc: 95, pp: 40, status: true, effect: { stat: 'spe', stages: -2, target: 'foe' } },
    'シザークロス':     { type: 'むし', power: 80, acc: 100, pp: 20 },
    'いわおとし':       { type: 'いわ', power: 50, acc: 90, pp: 15 },
    'いわなだれ':       { type: 'いわ', power: 75, acc: 90, pp: 10, effect: { flinch: true, chance: 30 } },
    'したでなめる':     { type: 'ゴースト', power: 30, acc: 100, pp: 30, effect: { status: 'paralyze', chance: 30 } },
    'シャドーボール':   { type: 'ゴースト', power: 80, acc: 100, pp: 15, effect: { stat: 'spd', stages: -1, target: 'foe', chance: 20 } },
    'りゅうのいかり':   { type: 'ドラゴン', power: 0, acc: 100, pp: 10, fixed: 40 },
    'りゅうのいぶき':   { type: 'ドラゴン', power: 60, acc: 100, pp: 20, effect: { status: 'paralyze', chance: 30 } },
    'かみつく':         { type: 'あく', power: 60, acc: 100, pp: 25, effect: { flinch: true, chance: 30 } },
    'かみくだく':       { type: 'あく', power: 80, acc: 100, pp: 15, effect: { stat: 'def', stages: -1, target: 'foe', chance: 20 } },
    'メタルクロー':     { type: 'はがね', power: 50, acc: 95, pp: 35, effect: { stat: 'atk', stages: 1, target: 'self', chance: 10 } },
    'アイアンテール':   { type: 'はがね', power: 100, acc: 75, pp: 15, effect: { stat: 'def', stages: -1, target: 'foe', chance: 30 } }
  };

  // ---- 経験値グループ ----
  // mediumFast: n^3 / fast: 0.8 n^3 / mediumSlow: 1.2n^3-15n^2+100n-140
  function expForLevel(group, level) {
    const n = level;
    switch (group) {
      case 'fast': return Math.floor(0.8 * n * n * n);
      case 'mediumSlow': return Math.max(0, Math.floor(1.2 * n * n * n - 15 * n * n + 100 * n - 140));
      case 'slow': return Math.floor(1.25 * n * n * n);
      default: return n * n * n; // mediumFast
    }
  }

  // ---- モンスター種族データ（完全オリジナル） ----
  // sprite はオリジナルのドット絵キー（sprites.js 参照）
  const SPECIES = {
    // --- くさ御三家 ---
    sproutle: {
      id: 'sproutle', name: 'スプラウト', dexNo: 1, types: ['くさ'],
      base: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
      learnset: [[1, 'たいあたり'], [1, 'なきごえ'], [7, 'つるのムチ'], [10, 'せいちょう'], [13, 'すいとる'], [16, 'はっぱカッター'], [22, 'メガドレイン'], [30, 'ソーラービーム']],
      evolve: { to: 'leaflox', level: 16 }, catchRate: 45, expGroup: 'mediumSlow', baseExp: 64, color: '#78c850'
    },
    leaflox: {
      id: 'leaflox', name: 'リーフロックス', dexNo: 2, types: ['くさ'],
      base: { hp: 60, atk: 62, def: 63, spa: 80, spd: 80, spe: 60 },
      learnset: [[1, 'たいあたり'], [1, 'つるのムチ'], [16, 'はっぱカッター'], [22, 'メガドレイン'], [30, 'ソーラービーム']],
      evolve: { to: 'florabeast', level: 32 }, catchRate: 45, expGroup: 'mediumSlow', baseExp: 142, color: '#5aa840'
    },
    florabeast: {
      id: 'florabeast', name: 'フロラビースト', dexNo: 3, types: ['くさ', 'あく'],
      base: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
      learnset: [[1, 'はっぱカッター'], [1, 'かみつく'], [22, 'メガドレイン'], [30, 'ソーラービーム'], [40, 'かみくだく']],
      evolve: null, catchRate: 45, expGroup: 'mediumSlow', baseExp: 236, color: '#3f8030'
    },
    // --- ほのお御三家 ---
    embit: {
      id: 'embit', name: 'エムビット', dexNo: 4, types: ['ほのお'],
      base: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
      learnset: [[1, 'ひっかく'], [1, 'なきごえ'], [7, 'ひのこ'], [10, 'でんこうせっか'], [16, 'ほのおのキバ'], [22, 'かみつく'], [30, 'かえんほうしゃ']],
      evolve: { to: 'flarit', level: 16 }, catchRate: 45, expGroup: 'mediumSlow', baseExp: 65, color: '#f08030'
    },
    flarit: {
      id: 'flarit', name: 'フラリット', dexNo: 5, types: ['ほのお'],
      base: { hp: 58, atk: 64, def: 58, spa: 80, spd: 65, spe: 80 },
      learnset: [[1, 'ひっかく'], [1, 'ひのこ'], [16, 'ほのおのキバ'], [22, 'かみつく'], [30, 'かえんほうしゃ']],
      evolve: { to: 'pyrothurn', level: 32 }, catchRate: 45, expGroup: 'mediumSlow', baseExp: 142, color: '#e06010'
    },
    pyrothurn: {
      id: 'pyrothurn', name: 'パイロサーン', dexNo: 6, types: ['ほのお', 'かくとう'],
      base: { hp: 78, atk: 104, def: 78, spa: 90, spd: 75, spe: 100 },
      learnset: [[1, 'ほのおのキバ'], [1, 'からてチョップ'], [22, 'けたぐり'], [30, 'かえんほうしゃ'], [40, 'はかいこうせん']],
      evolve: null, catchRate: 45, expGroup: 'mediumSlow', baseExp: 240, color: '#c03028'
    },
    // --- みず御三家 ---
    dribblet: {
      id: 'dribblet', name: 'ドリブレット', dexNo: 7, types: ['みず'],
      base: { hp: 50, atk: 48, def: 65, spa: 50, spd: 64, spe: 43 },
      learnset: [[1, 'たいあたり'], [1, 'しっぽをふる'], [7, 'みずでっぽう'], [10, 'かたくなる'], [16, 'あわ'], [22, 'かみつく'], [30, 'なみのり']],
      evolve: { to: 'aquafin', level: 16 }, catchRate: 45, expGroup: 'mediumSlow', baseExp: 66, color: '#6890f0'
    },
    aquafin: {
      id: 'aquafin', name: 'アクアフィン', dexNo: 8, types: ['みず'],
      base: { hp: 70, atk: 63, def: 80, spa: 65, spd: 80, spe: 58 },
      learnset: [[1, 'たいあたり'], [1, 'みずでっぽう'], [16, 'バブルこうせん'], [22, 'かみつく'], [30, 'なみのり']],
      evolve: { to: 'tidalore', level: 32 }, catchRate: 45, expGroup: 'mediumSlow', baseExp: 143, color: '#4878d8'
    },
    tidalore: {
      id: 'tidalore', name: 'タイダロア', dexNo: 9, types: ['みず', 'じめん'],
      base: { hp: 100, atk: 110, def: 90, spa: 85, spd: 90, spe: 60 },
      learnset: [[1, 'バブルこうせん'], [1, 'かみくだく'], [22, 'あなをほる'], [30, 'なみのり'], [40, 'じしん']],
      evolve: null, catchRate: 45, expGroup: 'mediumSlow', baseExp: 238, color: '#3060c0'
    },
    // --- 野生モンスター ---
    nibblet: {
      id: 'nibblet', name: 'ニブレット', dexNo: 10, types: ['ノーマル'],
      base: { hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 72 },
      learnset: [[1, 'たいあたり'], [1, 'しっぽをふる'], [5, 'でんこうせっか'], [9, 'かみつく'], [16, 'のしかかり'], [20, 'かみくだく']],
      evolve: { to: 'chompad', level: 18 }, catchRate: 255, expGroup: 'mediumFast', baseExp: 56, color: '#a89878'
    },
    chompad: {
      id: 'chompad', name: 'チョムパッド', dexNo: 11, types: ['ノーマル'],
      base: { hp: 55, atk: 81, def: 60, spa: 50, spd: 70, spe: 97 },
      learnset: [[1, 'たいあたり'], [1, 'かみつく'], [16, 'のしかかり'], [20, 'かみくだく'], [28, 'はかいこうせん']],
      evolve: null, catchRate: 90, expGroup: 'mediumFast', baseExp: 147, color: '#887860'
    },
    flittle: {
      id: 'flittle', name: 'フリトル', dexNo: 12, types: ['ノーマル', 'ひこう'],
      base: { hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 },
      learnset: [[1, 'つつく'], [1, 'なきごえ'], [5, 'かぜおこし'], [9, 'でんこうせっか'], [15, 'つばさでうつ'], [21, 'エアスラッシュ']],
      evolve: { to: 'skywist', level: 17 }, catchRate: 255, expGroup: 'mediumSlow', baseExp: 50, color: '#c8b890'
    },
    skywist: {
      id: 'skywist', name: 'スカイウィスト', dexNo: 13, types: ['ノーマル', 'ひこう'],
      base: { hp: 63, atk: 60, def: 55, spa: 50, spd: 50, spe: 71 },
      learnset: [[1, 'つつく'], [1, 'つばさでうつ'], [21, 'エアスラッシュ'], [28, 'かみくだく'], [35, 'はかいこうせん']],
      evolve: null, catchRate: 120, expGroup: 'mediumSlow', baseExp: 122, color: '#9a8a66'
    },
    buzzle: {
      id: 'buzzle', name: 'バズル', dexNo: 14, types: ['むし'],
      base: { hp: 40, atk: 35, def: 30, spa: 20, spd: 20, spe: 50 },
      learnset: [[1, 'たいあたり'], [1, 'いとをはく'], [9, 'むしくい'], [15, 'どくばり']],
      evolve: { to: 'stingwing', level: 12 }, catchRate: 255, expGroup: 'mediumFast', baseExp: 39, color: '#a8b820'
    },
    stingwing: {
      id: 'stingwing', name: 'スティングウィング', dexNo: 15, types: ['むし', 'ひこう'],
      base: { hp: 55, atk: 70, def: 50, spa: 40, spd: 55, spe: 75 },
      learnset: [[1, 'むしくい'], [1, 'どくばり'], [16, 'エアスラッシュ'], [22, 'シザークロス'], [28, 'ヘドロこうげき']],
      evolve: null, catchRate: 120, expGroup: 'mediumFast', baseExp: 130, color: '#88981a'
    },
    sparkit: {
      id: 'sparkit', name: 'スパーキット', dexNo: 16, types: ['でんき'],
      base: { hp: 45, atk: 40, def: 40, spa: 65, spd: 55, spe: 90 },
      learnset: [[1, 'でんきショック'], [1, 'しっぽをふる'], [9, 'でんこうせっか'], [13, 'スパーク'], [20, 'したでなめる'], [28, '10まんボルト']],
      evolve: null, catchRate: 190, expGroup: 'mediumFast', baseExp: 82, color: '#f8d030'
    },
    cobblite: {
      id: 'cobblite', name: 'コブライト', dexNo: 17, types: ['いわ'],
      base: { hp: 50, atk: 55, def: 90, spa: 30, spd: 45, spe: 25 },
      learnset: [[1, 'たいあたり'], [1, 'かたくなる'], [9, 'いわおとし'], [15, 'すなかけ'], [22, 'いわなだれ'], [25, 'じしん']],
      evolve: { to: 'boulderon', level: 25 }, catchRate: 255, expGroup: 'mediumSlow', baseExp: 60, color: '#b8a038'
    },
    boulderon: {
      id: 'boulderon', name: 'ボルデロン', dexNo: 18, types: ['いわ', 'じめん'],
      base: { hp: 80, atk: 90, def: 130, spa: 35, spd: 55, spe: 35 },
      learnset: [[1, 'いわおとし'], [1, 'メタルクロー'], [22, 'いわなだれ'], [30, 'じしん'], [38, 'アイアンテール']],
      evolve: null, catchRate: 120, expGroup: 'mediumSlow', baseExp: 137, color: '#988030'
    },
    gloomoth: {
      id: 'gloomoth', name: 'グルーモス', dexNo: 19, types: ['むし', 'どく'],
      base: { hp: 60, atk: 45, def: 50, spa: 80, spd: 80, spe: 70 },
      learnset: [[1, 'どくばり'], [1, 'かぜおこし'], [12, 'メガドレイン'], [18, 'サイケこうせん'], [26, 'ヘドロこうげき'], [34, 'エアスラッシュ']],
      evolve: null, catchRate: 75, expGroup: 'mediumFast', baseExp: 138, color: '#9858a0'
    },
    wispurr: {
      id: 'wispurr', name: 'ウィスパー', dexNo: 20, types: ['ゴースト'],
      base: { hp: 45, atk: 30, def: 35, spa: 80, spd: 55, spe: 80 },
      learnset: [[1, 'したでなめる'], [1, 'なきごえ'], [10, 'ねんりき'], [16, 'サイケこうせん'], [24, 'シャドーボール'], [30, 'サイコキネシス']],
      evolve: null, catchRate: 90, expGroup: 'mediumFast', baseExp: 120, color: '#705898'
    },
    dratlet: {
      id: 'dratlet', name: 'ドラットレット', dexNo: 21, types: ['ドラゴン'],
      base: { hp: 41, atk: 64, def: 45, spa: 50, spd: 50, spe: 50 },
      learnset: [[1, 'たいあたり'], [1, 'なきごえ'], [10, 'りゅうのいかり'], [16, 'かみつく'], [25, 'りゅうのいぶき'], [35, 'はかいこうせん']],
      evolve: null, catchRate: 45, expGroup: 'slow', baseExp: 60, color: '#7038f8'
    }
  };

  // ---- アイテム ----
  const ITEMS = {
    monball:   { id: 'monball', name: 'モンスターボール', kind: 'ball', ballBonus: 1, price: 200, desc: '野生のモンスターを捕まえる基本のボール。' },
    superball: { id: 'superball', name: 'スーパーボール', kind: 'ball', ballBonus: 1.5, price: 600, desc: 'モンスターボールより捕まえやすい。' },
    hyperball: { id: 'hyperball', name: 'ハイパーボール', kind: 'ball', ballBonus: 2, price: 1200, desc: 'とても捕まえやすい高性能ボール。' },
    potion:    { id: 'potion', name: 'キズぐすり', kind: 'heal', heal: 20, price: 300, desc: 'HPを20かいふくする。' },
    superpotion:{ id: 'superpotion', name: 'いいキズぐすり', kind: 'heal', heal: 50, price: 700, desc: 'HPを50かいふくする。' },
    hyperpotion:{ id: 'hyperpotion', name: 'すごいキズぐすり', kind: 'heal', heal: 200, price: 1200, desc: 'HPを200かいふくする。' },
    revive:    { id: 'revive', name: 'げんきのかけら', kind: 'revive', price: 1500, desc: 'ひんしのモンスターをHP半分でふっかつ。' },
    antidote:  { id: 'antidote', name: 'どくけし', kind: 'cure', cure: 'poison', price: 100, desc: 'どく状態をかいふくする。' },
    awakening: { id: 'awakening', name: 'ねむけざまし', kind: 'cure', cure: 'sleep', price: 250, desc: 'ねむり状態をかいふくする。' }
  };

  global.GameData = {
    TYPES, TYPE_COLORS, CHART, MOVES, SPECIES, ITEMS,
    categoryOf, typeMultiplier, expForLevel, PHYSICAL_TYPES
  };
})(window);
