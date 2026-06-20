/* =========================================================================
 * manifest.js — 用意した画像をゲームに反映する設定ファイル
 *
 * ■ いちばん簡単な使い方（おすすめ）
 *    下の行を 'auto' にすると、assets/ 配下に置いた画像を自動で読み込みます。
 *    Geminiが出した「白背景・大きいサイズ」の画像でも、
 *      ・自動で規定サイズ（モンスターなら64x64）へ縮小
 *      ・四隅の背景色を自動で透過抜き
 *    までやります。ファイルを置くだけでOK。
 *
 *      window.ASSET_MANIFEST = 'auto';
 *
 *    ※ 'auto' だと未配置のファイルについて 404 がコンソールに出ますが、
 *      ゲームの動作には影響しません（その箇所は従来のコード描画になります）。
 *    ※ 背景の自動透過は localhost で配信した時に有効です。
 *      （file:// で直接開くと安全制約で透過はスキップされ、縮小だけ行われます）
 *
 * ■ コンソールを汚したくない場合は、用意したものだけ配列で登録:
 *      window.ASSET_MANIFEST = [
 *        'mon:sproutle:front',
 *        'mon:sproutle:back',
 *        'title',
 *      ];
 *
 * ■ 自動処理の調整（任意）
 *      window.ASSET_OPTIONS = {
 *        autoResize: true,     // 規定サイズへ自動縮小（既定 true）
 *        autoBgRemove: true,   // 背景の自動透過（既定 true）
 *        bgThreshold: 60       // 背景とみなす色の許容差（大きいほど多く抜く）
 *      };
 *
 * 期待ファイル一覧はブラウザのコンソールで  MEDev.list()  で確認できます。
 * ========================================================================= */

// 既定は空（＝すべてコード描画）。画像を入れたら 'auto' に変えるのが手軽です。
// くさ・ほのお御三家の正面画像を読み込み（背面は正面から自動生成）。
window.ASSET_MANIFEST = [
  'mon:sproutle:front',
  'mon:leaflox:front',
  'mon:florabeast:front',
  'mon:embit:front',
  'mon:flarit:front',
  'mon:pyrothurn:front'
];
// window.ASSET_MANIFEST = 'auto';
