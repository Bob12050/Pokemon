/* =========================================================================
 * manifest.js — 用意した画像をここに登録すると、ゲームが自動で使います。
 *
 * ・画像が無い／未登録のものは、これまで通りコードによる手続き描画になります。
 * ・登録方法は次のいずれか:
 *
 *   1) すべての画像を試し読みする（assets/ 配下に置くだけで使われる）
 *        window.ASSET_MANIFEST = 'auto';
 *      ※ 未配置のファイルは 404 がコンソールに出ますが、動作には影響しません。
 *
 *   2) 用意したものだけ登録する（推奨・コンソールがきれい）
 *        window.ASSET_MANIFEST = [
 *          'mon:sproutle:front',   // キーで登録（assets/monsters/sproutle_front.png）
 *          'mon:sproutle:back',
 *          'tileset',              // assets/overworld/tileset.png
 *          'title',                // assets/title.png
 *        ];
 *
 * 期待されるファイル一覧はブラウザのコンソールで  MEDev.list()  を実行すると見られます。
 * ========================================================================= */
window.ASSET_MANIFEST = [];
