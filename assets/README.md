# 画像アセットについて

このゲームは現在、すべてのグラフィックを**コードで手続き的に描画**しています。
ここに画像（PNG）を置いて `manifest.js` に登録すると、**該当部分だけ画像に置き換わります**。
画像が無い箇所は今まで通りの描画になるので、**1枚ずつ少しずつ差し替えられます**。

## 反映のしかた（かんたん版）

**Geminiが出した「白背景・大きいサイズ」の画像を、そのまま置くだけでOKです。**
読み込み時に自動で「規定サイズへ縮小」＋「四隅の背景色を透過抜き」します。

1. 画像を所定のフォルダに、下表の**ファイル名**で置く（サイズは大きいままで可）
2. `assets/manifest.js` の登録を `window.ASSET_MANIFEST = 'auto';` にする
3. **ローカルサーバで開く**（背景の自動透過に必要）：
   ```
   python3 -m http.server     # → http://localhost:8000
   ```
   ※ `index.html` を file:// で直接開くと、安全制約で背景透過はスキップされ、
     縮小のみ行われます（透過PNGを自分で用意すれば file:// でもOK）。

> 自動処理の細かい調整（透過のしきい値など）は `manifest.js` の `ASSET_OPTIONS` 参照。

## 優先度と一覧（おすすめ順）

### ★★★ 最優先：モンスター（各64×64・透過PNG）
今は7テンプレの色替えなので、ここを個別絵にすると一番化けます。
正面（敵に表示）と背面（自分側に表示）の2枚ずつ。

| 置き場所 | 例 |
|----------|----|
| `assets/monsters/<id>_front.png` | `sproutle_front.png` |
| `assets/monsters/<id>_back.png`  | `sproutle_back.png`  |

`<id>` 一覧：sproutle / leaflox / florabeast / embit / flarit / pyrothurn /
dribblet / aquafin / tidalore / nibblet / chompad / flittle / skywist /
buzzle / stingwing / sparkit / cobblite / boulderon / gloomoth / wispurr / dratlet

### ★★ タイルセット：`assets/overworld/tileset.png`（128×48）
16×16タイルを **8列×3行** に並べる。セル位置は固定：

```
列→ 0      1        2     3      4       5       6      7
行0  草地   草むら   道    花     木      水      柵     段差
行1  壁     窓壁     赤屋根 青屋根 灰屋根  緑屋根  ドア   看板
行2  室内床 マット   棚    カウンタ 機械    -       -      -
```

### ★★ 主人公 歩行：`assets/overworld/player.png`（48×64）
16×16セルを **3列(フレーム)×4行(下・上・左・右)**。

### ★ タイトル：`assets/title.png`（240×160 全画面）
### ★ バトル背景：`assets/battle_bg.png`（240×112）

## 雛形（テンプレート）を書き出す開発ツール

現在の手続き描画を**正しいサイズのPNG**として書き出せます。これを下絵にすると楽です。
ブラウザのコンソール（F12）で：

```js
MEDev.exportContactSheet()      // 全モンスターを1枚で確認
MEDev.exportMonster('sproutle') // 1種の正面/背面PNG
MEDev.exportAllMonsters()       // 全21種(42枚)を順次ダウンロード
MEDev.exportPlayerSheet()       // 歩行シート player.png
MEDev.exportTileset()           // tileset.png
MEDev.list()                    // 期待ファイルの一覧
```

> 任意：タイプアイコン・バッジ・どうぐ・トレーナー立ち絵なども将来追加可能です。
> 必要になったら言ってください（ローダ側に枠を足します）。
