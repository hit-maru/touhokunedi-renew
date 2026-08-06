# 東北ネヂRenew 保守履歴

## 1. このファイルの目的

このファイルは、東北ネヂRenew保守履歴の正本です。

次回作業開始時は、必ず最初にこのファイルを読みます。作業完了ごとに、なぜ修正したのか、何を変更したのか、本番へ反映済みか、関連スクリプト、関連レポート、今後の注意点を追記します。

記載するのは、実施済み・確認済みの事項だけです。推測は書きません。未確認事項は「未確認」と明記します。

## 2. プロジェクト概要

- サイト名: 東北ネヂRenew
- 公開URL: https://touhokunedi.com/
- 構成: Astro / microCMS / FTP deploy
- deploy: `npm run deploy` から `deploy.js` によるFTP反映
- ニュース: 168記事

## 3. 保守ログ

### 2026-07-21 安海様対応

内容:

- フッター修正
- AIページ修正
- 本番deploy

結果:

- 完了

関連commit:

- `53d2ad2` - `fix: simplify sales AI chatbot page`
- `8f5d6f9` - `fix: simplify general AI chatbot page`
- `84e44f1` - `fix: guide users before AI generation`
- `1cc6727` - `fix: standardize tool filenames and validate deploy`
- `3910c32` - `feat: add phone numbers to footer offices`
- `6ee907c` - `fix: improve footer phone readability`
- `8ad5572` - `fix: adjust footer phone number size`

補足:

- 上記commitのGit上のcommit日時は、いずれも `2026-07-22 +0900` として記録されている。

### 2026-07-22 WordPressニュース移行

内容:

- WordPress WXR XMLを解析
- microCMSへインポート済みのニュース記事を調査
- Content APIに `content` が返らない旧記事の原因を調査
- `content` のみを既存Content ID維持でPATCHし、本文を復旧

原因:

- WordPress XMLには本文が存在していた。
- 旧インポート済み記事は、microCMS管理画面では本文が見える一方、Content APIレスポンスに `content` が存在しないものが多数あった。
- Astro表示側ではなく、インポート済み記事の登録状態が原因だった。

結果:

- 167件の本文を復旧
- PATCH失敗: 0件
- 更新フィールド: `content` のみ
- `thumbnail` 変更: なし
- build成功
- preview確認成功
- 本番deploy成功
- 本番代表記事で本文表示確認済み

当初保留:

- Content ID: `tonzkg82_b`
- タイトル: `&lt;会社見学>東日本旅客鉄道株式会社　盛岡保線設備技術センター様`
- 理由: microCMS側タイトルの `&lt;` とWordPress XML側タイトルの `<` の差により、自動照合対象外とした。
- 状態: 2026-07-23に個別修復済み。詳細は「2026-07-23 `tonzkg82_b` 個別修復」を参照。

関連スクリプト:

- [`scripts/repair-wp-import-news.mjs`](../scripts/repair-wp-import-news.mjs) - WordPress XML本文をmicroCMSニュース記事の `content` へ復旧するスクリプト

関連ドキュメント:

- [`RESTORE-WORDPRESS-IMPORT.md`](../RESTORE-WORDPRESS-IMPORT.md) - WordPressインポート記事復旧手順

関連commit:

- `6deafe6` - `fix: restore WordPress news content from microCMS`

### 2026-07-23 本文画像復旧

内容:

- 旧WordPress本文内画像URLを調査
- 旧WordPress uploadsバックアップを画像マスターとして照合
- 本文内画像242件を照合
- 旧URLと同じ本番公開パスへFTPで画像を復旧

結果:

- microCMS記事数: 168
- uploads内画像ファイル数: 1887
- 対象本文画像数: 242
- 対象画像を含む記事数: 122
- 一致数: 242
- 未一致数: 0
- 重複候補数: 0
- FTP転送成功数: 1887
- FTP転送失敗数: 0
- 242件HTTP確認: 200件数 242 / 404件数 0 / その他 0
- 代表記事 `7o3aqoc7t03` / `第30回QCサークル発表会` の2画像はHTTP 200確認済み

関連スクリプト:

- [`scripts/repair-wp-images.mjs`](../scripts/repair-wp-images.mjs) - 本文内画像URLとローカルuploads画像の照合
- [`scripts/restore-wp-uploads.mjs`](../scripts/restore-wp-uploads.mjs) - uploads画像を本番の旧WordPress公開パスへFTP復旧

関連レポート:

- [`reports/image-repair-report.md`](../reports/image-repair-report.md) - 本文画像照合レポート
- [`reports/wp-uploads-restore-report.md`](../reports/wp-uploads-restore-report.md) - uploads本番復旧レポート

関連commit:

- `0b9e341` - `fix: restore WordPress article images`

### 2026-07-23 ニュース一覧改善: 年度検索修正

原因:

- `src/pages/news/[page].astro` の `getStaticPaths` 内で、全記事を先に10件ずつページ分割していた。
- その後、年度フィルタが `document.querySelectorAll('.news-item')` で現在ページ内の記事だけを対象にしていた。
- そのため、現在ページに存在しない年度の記事は、全体に記事が存在していても表示できなかった。
- カテゴリフィルタも同じ問題を持っていた。

修正:

- microCMSから取得済みの全記事をJSONとしてページへ渡す。
- クライアント側で全記事を対象に、年度、カテゴリの順で絞り込む。
- 絞り込み後の配列を10件ずつページ分割し、一覧とページネーションを再描画する。

結果:

- 2024年の記事が正常表示
- 2023年の記事が正常表示
- 年度検索とカテゴリ検索の併用が可能
- 検索後ページネーションが絞り込み後件数に合わせて動作
- 本番反映済み

関連commit:

- `0ab6539` - `fix: filter news across all articles`

### 2026-07-23 カテゴリ検索改善

調査内容:

- WordPress XML
- WordPress DBダンプ
- taxonomy
- postmeta
- 旧WordPressテーマ
- 旧HTMLバックアップ
- 既存移行スクリプト・調査ログ

調査結果:

- WordPress XML上の対象168記事カテゴリは、全件 `お知らせ / news`。
- DB taxonomy上も、確認できた範囲では対象記事に紐づくカテゴリは `お知らせ / news` のみ。
- `製品情報`、`展示会`、`イベント` に相当するtaxonomy、term、postmeta、ACFフィールドは発見できなかった。
- 旧テーマは `get_the_category()` の先頭カテゴリを表示する実装で、4分類を生成する独自処理は確認できなかった。
- 旧HTMLから168記事の4分類対応表は抽出できなかった。

採用方針:

- 根拠のない推測分類は行わない。
- 0件カテゴリは検索UIに表示しない。
- 将来、microCMSで `製品情報`、`展示会`、`イベント` の記事が1件以上登録された場合は、次回build/deploy時に自動で検索UIへ表示する。

修正:

- `src/pages/news/[page].astro` で全記事からカテゴリ別件数をbuild時に集計。
- 件数が1件以上のカテゴリだけを、上部カテゴリUIとサイドバーへ表示。
- 固定カテゴリ順は `製品情報`、`展示会`、`イベント`、`ニュース` を維持。

結果:

- 現在の上部カテゴリ表示: `すべて`、`ニュース`
- 現在のサイドバーカテゴリ表示: `ニュース`
- `製品情報`、`展示会`、`イベント` は非表示
- `ニュース` は168件対象
- `2024年 + ニュース`: 29件 / 3ページ
- PC・スマホ表示確認済み
- 本番反映済み

関連レポート:

- [`reports/wp-news-category-repair-report.md`](../reports/wp-news-category-repair-report.md) - WordPressニュースカテゴリ復旧dry-runレポート
- [`reports/wp-news-category-source-investigation.md`](../reports/wp-news-category-source-investigation.md) - WordPressニュース4分類保存元調査レポート

関連スクリプト:

- [`scripts/repair-wp-news-categories.mjs`](../scripts/repair-wp-news-categories.mjs) - WordPressニュースカテゴリ調査・dry-run用スクリプト

関連commit:

- `1a995f8` - `fix: hide empty news categories`

### 2026-07-23 保守開始ゲート追加

目的:

- 次回以降、このワークスペースでCodexが最初の作業指示を受けた時点で、通常作業より先に保守開始チェックを実行する。
- 前回以降のmicroCMSニュース投稿差分を確認し、未確認のまま通常作業へ進まないようにする。

実装:

- `AGENTS.md` に「東北ネヂRenew 保守開始ゲート」を追加。
- `npm run maintenance:start` を追加。
- `npm run maintenance:check-news` を追加。
- `npm run maintenance:apply-news` を追加。
- `tmp/maintenance-last-check.json` に日本時間の日次チェック結果概要を保存。
- 同日中は再実行せず、通常作業へ進める。

確認済み:

- 状態ファイルがない初回実行で保守開始チェックが動く。
- 成功時のみ `tmp/maintenance-last-check.json` が更新される。
- 同日2回目はチェックをスキップする。
- 翌日想定では再度チェック対象になる。
- チェック失敗時は成功扱いで状態ファイルを更新しない。
- `npm run build` 成功。

注意:

- microCMSへの書き込みは行わない。
- snapshot確定は自動で行わない。
- 正本への追記は自動では行わない。
- `npm run maintenance:apply-news` は、差分確認後に必要性を判断して別工程で実行する。

関連スクリプト:

- [`scripts/ensure-maintenance-start.mjs`](../scripts/ensure-maintenance-start.mjs) - 同日実施済み判定と保守開始チェック呼び出し
- [`scripts/maintenance-check-news.mjs`](../scripts/maintenance-check-news.mjs) - microCMSニュースのGET専用差分チェック
- [`scripts/maintenance-apply-news.mjs`](../scripts/maintenance-apply-news.mjs) - 差分確認後に手動でニュースsnapshotを確定する別工程

### 2026-07-23 microCMSニュース初期snapshot確定

目的:

- 保守開始チェックで、前回以降のmicroCMSニュース投稿差分を比較できるようにする。
- 既存168件は新規投稿として扱わず、初期基準点として固定する。

実施内容:

- 現在のmicroCMS `news` 全168件をGETで取得。
- [`data/microcms-news-snapshot.json`](../data/microcms-news-snapshot.json) を初期snapshotとして作成。
- snapshotには本文HTML、本文画像、thumbnailは保存しない。
- 記事順は公開日降順、同日内はContent ID昇順で固定。

保存項目:

- snapshot作成日時
- endpoint
- fields
- 総記事数
- `id`
- `title`
- `date`
- `createdAt`
- `updatedAt`
- `publishedAt`
- `revisedAt`
- `category`

結果:

- 基準記事数: 168件
- 既存168件を差分対象外として基準化。
- 次回以降は、このsnapshotとの差分で新規投稿、更新、削除・非公開候補、カテゴリ変化を検出する。
- 保守開始時は `npm run maintenance:start` から始める。

確認済み:

- 新規投稿7件のテスト検出。
- 更新1件のテスト検出と変更項目の特定。
- カテゴリ変化1件のテスト検出とカテゴリ別件数変化の検出。
- 削除・非公開候補1件のテスト検出。
- 翌日初回実行ではsnapshot比較が行われる。
- 同日2回目はチェックをスキップする。

### 2026-07-23 `tonzkg82_b` 個別修復

対象:

- Content ID: `tonzkg82_b`
- 修正前タイトル: `&lt;会社見学>東日本旅客鉄道株式会社　盛岡保線設備技術センター様`
- 正式タイトル: `〈会社見学〉東日本旅客鉄道株式会社　盛岡保線設備技術センター様`

修正理由:

- タイトル先頭の半角 `<` がHTMLエンティティとして残り、WordPress XMLとの自動照合対象外になっていた。
- WordPress XMLには元記事本文が存在していたため、Content IDを明示して個別復旧した。

照合:

- WordPress XML: `/Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml`
- XML側タイトル: `<会社見学>東日本旅客鉄道株式会社　盛岡保線設備技術センター様`
- WordPress post ID: `5183`
- XML本文文字数: 942
- 対象microCMS Content ID: `tonzkg82_b`

更新内容:

- microCMS PATCH実行: 成功
- HTTP Status: 200
- 更新フィールド: `title`、`content` のみ
- 変更していないフィールド: `thumbnail`、`category`、`date`、公開状態、Content ID、その他フィールド
- `thumbnail` 変更: なし
- `category` 変更: なし
- `date` 変更: なし

復旧結果:

- Content APIで正式タイトルを確認済み。
- Content APIで `content` が存在し、空でないことを確認済み。
- 復旧後contentLength: 942
- `data/microcms-news-snapshot.json` は復旧後のmicroCMS状態で更新済み。

Build / 表示確認:

- `npm run build`: 成功
- `dist/news/tonzkg82_b/index.html` に正式タイトルと本文HTMLが出力されたことを確認済み。
- ローカルpreviewで正式タイトルと本文表示を確認済み。
- 通常deploy: 実施済み。
- deploy実施日時: 2026-07-23 09:30 JST
- 本番URL `https://touhokunedi.com/news/tonzkg82_b/`: HTTP 200確認済み。
- 本番HTMLで正式タイトル表示を確認済み。
- 本番HTMLで本文表示を確認済み。

日付修正:

- 実施日時: 2026-07-23 09:45 JST
- 誤っていた本番表示日: 2026年05月29日
- WordPress XMLの元投稿日:
  - `wp:post_date`: `2025-08-28 08:51:03`
  - `wp:post_date_gmt`: `2025-08-27 23:51:03`
  - `pubDate`: `Wed, 27 Aug 2025 23:51:03 +0000`
- 修正後の表示日: 2025年08月28日
- microCMS PATCH実行: 成功
- 更新フィールド: `date` のみ
- 変更していないフィールド: `title`、`content`、`thumbnail`、`category`、公開状態、Content ID、その他フィールド
- 詳細ページテンプレートが `publishedAt` を表示していたため、`date` を優先して表示するように修正した。
- `data/microcms-news-snapshot.json` はPATCH後のmicroCMS状態で更新済み。
- `npm run build`: 成功
- `dist/news/tonzkg82_b/index.html` に `2025年08月28日`、正式タイトル、本文HTMLが出力されたことを確認済み。
- `npm run deploy`: 成功
- 本番URL `https://touhokunedi.com/news/tonzkg82_b/`: HTTP 200確認済み。
- 本番HTMLで `2025年08月28日`、正式タイトル、本文表示を確認済み。

関連スクリプト:

- [`scripts/repair-wp-import-news.mjs`](../scripts/repair-wp-import-news.mjs) - 既存の本文復旧スクリプト。今回の1件はタイトル差分があるため、Content IDとXMLタイトルを明示して個別PATCHした。

関連commit:

- `26cbc03` - `fix: restore remaining WordPress news article`

### 2026-07-24 SNS埋め込み表示位置変更

目的:

- トップページ下部にあったLinkedIn・Instagram埋め込みを、お知らせ一覧ページ下部へ移動する。

修正:

- `src/pages/index.astro` からSNS埋め込みブロックを削除。
- `src/pages/news/[page].astro` のニュース一覧・ページネーション直後、フッター直前へLinkedIn・Instagram埋め込みを配置。
- スマホ幅ではLinkedIn見出し右側の補助文言を非表示にし、見出しの幅不足を防止。

保守開始チェック:

- `npm run maintenance:start`: 成功
- 前回件数: 168
- 現在件数: 168
- 新規投稿: 0
- 更新: 0
- 削除・非公開候補: 0
- カテゴリ変化: 0

確認:

- `npm run build`: 成功
- `git diff --check`: 成功
- PCローカルpreviewで、ニュース一覧・ページネーション後、フッター前にSNS埋め込みが表示されることを確認。
- PCローカルpreviewで、配置、余白、見出し崩れがないことを確認。
- スマホローカルpreviewで、ニュース一覧・ページネーション後、フッター前にSNS埋め込みが表示されることを確認。
- スマホローカルpreviewで、配置、余白、見出し崩れがないことを確認。
- スマホ幅でLinkedIn見出し右側の補助文言が非表示になることを確認。

本番反映:

- commit: `0fd3aac` - `feat: move social embeds to news page`
- push: `origin/main` へ成功
- `npm run deploy`: 成功
- deploy実施日時: 2026-07-24 08:14 JST

本番確認:

- 本番トップページ `https://touhokunedi.com/`: HTTP 200確認済み。
- 本番ニュース一覧ページ `https://touhokunedi.com/news/1/`: HTTP 200確認済み。
- 本番トップページHTMLで、LinkedIn・Instagram埋め込みブロックが存在しないことを確認済み。
- 本番ニュース一覧ページHTMLで、ニュース一覧・ページネーション後、フッター前にSNS埋め込みが存在することを確認済み。
- 本番ニュース一覧ページHTMLで、スマホ幅用にLinkedIn見出し右側の補助文言へ `hidden sm:inline` が付与されていることを確認済み。
- 本番PC幅表示で、ページネーション後、フッター前にLinkedIn・Instagram埋め込みが表示され、配置、余白、見出し崩れがないことを確認済み。
- 本番スマホ幅表示で、ページネーション後、フッター前にLinkedIn埋め込みが表示され、配置、余白、見出し崩れがないことを確認済み。
- 本番スマホ幅表示で、LinkedIn見出し右側の補助文言が非表示になっていることを確認済み。

### 2026-07-25 投稿エディタAI生成復旧（OpenAI一本化・互換維持）

背景:

- 投稿エディタで「エラーが発生しました。もう一度お試しください。」が発生。
- Network Responseで `not_found_error` と `model: claude-sonnet-4-20250514` を確認。
- 現在のAPIキーはOpenAIのため、Claudeモデル指定が不整合だった。

対応:

- `public/tools/ai-proxy-TN.php` の許可モデルをOpenAI系に更新。
- `public/tools/ai-shared-config-TN.js` を追加し、モデル名を1箇所で管理。
- `public/tools/Article-editor-TN.html` と `public/tools/ai-demo-TN.html` は共通設定モデルを参照する形へ統一。
- フロント側のレスポンス参照形式（`content[0].text`）は変更しない方針を維持。

確認:

- 本番 `tools` 配下へ対象ファイルを部分反映済み。
- GASソースは本リポジトリ内に存在しないことを確認。
- GAS側のOpenAI互換変換修正完了後、記事生成の動作確認はOK（ユーザー確認）。

本番反映ファイル:

- `public/tools/Article-editor-TN.html`
- `public/tools/ai-demo-TN.html`
- `public/tools/ai-proxy-TN.php`
- `public/tools/ai-shared-config-TN.js`

注意:

- 画像アップロード機能は未変更。
- APIキーやトークンなど秘密情報の露出は行っていない。
- commit / push は明示指示後に実施する。

### 2026-08-06 AI投稿エディタ復旧・改善

内容:

- AI投稿エディタの画像アップロードとAI生成を復旧。
- 画像アップロード未認証時は、ログイン画面HTMLをJSONとして解析せず、認証エラーとして扱うよう修正。
- AI投稿エディタ側に画像アップローダーへのログイン導線を追加。
- 画像アップロード処理の重複したclick handlerを解消。
- 画像1枚レイアウトでアップロード成功後に「満席です。」が誤表示される問題を解消。
- GASへのcURL待機時間を20秒から90秒へ延長し、PHP実行時間上限として `set_time_limit(100)` を追加。
- 左カラムを独立した縦スクロール領域に変更。
- 右カラムのプレビュー領域とHTMLコード領域を独立した縦スクロール領域に変更。
- スマートフォン表示では、ページ全体で自然にスクロールできる構成を維持。

原因:

- 未認証時に `uploader-TN.php` が返すHTML応答を、AI投稿エディタ側でJSONとして解析していた。
- `Article-editor-TN.html` 内で画像アップロードclick handlerが重複登録されていた。
- GASへのcURL待機時間が20秒で、OpenAI応答前に504となっていた。

修正内容:

- `uploader-TN.php` でAPIリクエスト未認証時に `401 Unauthorized` とJSONエラーを返すよう修正。
- `Article-editor-TN.html` で画像アップロード応答をHTTPステータス、Content-Type、JSONの `ok`、`AUTH_REQUIRED` の順に判定するよう修正。
- `Article-editor-TN.html` で非JSON応答本文を画面へ表示せず、ログイン案内を表示するよう修正。
- `Article-editor-TN.html` で古い画像アップロード初期化ブロックを削除し、認証エラー処理を含む実装だけを残した。
- `Article-editor-TN.html` で画像枠上限到達時はアップロードボタンを無効化し、状態を「完了」と表示するよう修正。
- `ai-proxy-TN.php` で `CURLOPT_CONNECTTIMEOUT => 5`、`CURLOPT_TIMEOUT => 90`、`set_time_limit(100)` を維持。
- 原因調査のために追加したGAS応答診断用 `error_log` は削除。

本番確認結果:

- 単数画像レイアウトで、画像アップロードとHTML生成が成功することを確認済み。
- 複数画像レイアウトで、画像アップロードとHTML生成が成功することを確認済み。
- 左カラムと右カラムの独立スクロール用CSSを反映し、本番 `/tools/Article-editor-TN.html` へFTP反映済み。
- 通常deployは行わず、`/tools/` の対象ファイルだけFTP反映。

対象ファイル:

- `public/tools/Article-editor-TN.html`
- `public/tools/uploader-TN.php`
- `public/tools/ai-proxy-TN.php`

関連commit:

- `TBD` - `fix: restore image-assisted article editor`

## 4. 現在の仕様

### ニュース

- 記事数: 168件
- データ元: microCMS `news`
- 詳細ページURL: 既存Content IDを維持

### カテゴリ表示

- 記事が1件以上存在するカテゴリだけ表示する。
- 現在表示するカテゴリ:
  - ニュース
- 現在非表示のカテゴリ:
  - 製品情報
  - 展示会
  - イベント
- 将来、非表示カテゴリの記事が1件以上登録された場合、次回build/deploy時に自動表示する。

### 年度検索

- 全記事を対象に検索する。
- 年度選択後は、その年度の1ページ目を表示する。
- 「すべての年度」で年度条件を解除する。

### カテゴリ検索

- 全記事を対象に検索する。
- カテゴリ選択後は、1ページ目へ戻す。
- 「すべて」でカテゴリ条件を解除する。
- 年度検索と併用できる。

### ページネーション

- 1ページ10件。
- 年度・カテゴリで絞り込んだ後の件数からページネーションを生成する。
- ページ番号クリック時も、選択中の年度・カテゴリを維持する。

## 5. 既知課題

### `tonzkg82_b`

- 2026-07-23に個別修復済み。
- 詳細は「2026-07-23 `tonzkg82_b` 個別修復」を参照。
- 本番HTML反映済み。

### ニュース4分類

- `製品情報`、`展示会`、`イベント` に分類する正本は、現時点で特定できていない。
- 現在確認できる正本では、168件すべて `ニュース`。
- 推測分類は行わない。

## 6. 関連スクリプト

| スクリプト | 用途 | 注意点 |
| --- | --- | --- |
| [`scripts/repair-wp-import-news.mjs`](../scripts/repair-wp-import-news.mjs) | WordPress XML本文をmicroCMSニュース記事の `content` へ復旧 | 通常はdry-runから実行。`thumbnail` は `--with-thumbnail` を付けない限り更新しない。 |
| [`scripts/repair-wp-images.mjs`](../scripts/repair-wp-images.mjs) | 本文内画像URLとローカルuploads画像の照合 | microCMS更新、FTP転送、deployは行わない照合用。 |
| [`scripts/restore-wp-uploads.mjs`](../scripts/restore-wp-uploads.mjs) | ローカルuploads画像を本番の旧WordPress公開パスへFTP復旧 | microCMS本文、thumbnail、通常サイトdeployには触れない。 |
| [`scripts/repair-wp-news-categories.mjs`](../scripts/repair-wp-news-categories.mjs) | WordPressニュースカテゴリの調査・dry-run | 現時点のPATCH候補は0件。推測分類は禁止。 |
| [`scripts/maintenance-check-news.mjs`](../scripts/maintenance-check-news.mjs) | microCMSニュースのGET専用差分チェック | microCMSへ書き込まない。snapshotは読み取りのみ。 |
| [`scripts/ensure-maintenance-start.mjs`](../scripts/ensure-maintenance-start.mjs) | 作業開始時の日次保守チェックゲート | 成功時のみ `tmp/maintenance-last-check.json` を更新する。 |
| [`scripts/maintenance-apply-news.mjs`](../scripts/maintenance-apply-news.mjs) | microCMSニュースsnapshotの手動確定 | 自動実行しない。差分確認後、必要性を判断して別工程で実行する。 |
| `deploy.js` | Astro build成果物を本番へFTP deploy | 実行はユーザー明示指示がある場合のみ。秘密情報は表示しない。 |

## 7. 関連レポート

| レポート | 用途 | 主な結論 |
| --- | --- | --- |
| [`RESTORE-WORDPRESS-IMPORT.md`](../RESTORE-WORDPRESS-IMPORT.md) | WordPressインポート記事本文復旧の手順 | Content APIのPATCH権限が必要。復旧対象は原則 `content` のみ。 |
| [`reports/image-repair-report.md`](../reports/image-repair-report.md) | 本文画像照合 | 対象本文画像242件、すべてuploads内で一致。 |
| [`reports/wp-uploads-restore-report.md`](../reports/wp-uploads-restore-report.md) | uploads本番復旧結果 | 242件HTTP 200、404件数0。 |
| [`reports/wp-news-category-repair-report.md`](../reports/wp-news-category-repair-report.md) | WordPress XMLカテゴリdry-run | 168件すべて `お知らせ / news`、PATCH可能件数0。 |
| [`reports/wp-news-category-source-investigation.md`](../reports/wp-news-category-source-investigation.md) | DB・taxonomy・postmeta・テーマ調査 | 4分類の正本は特定できず。 |

## 8. 主要commit

| commit | 内容 |
| --- | --- |
| `53d2ad2` | 営業AIページを簡略化 |
| `8f5d6f9` | general AIチャットボットページを簡略化 |
| `84e44f1` | AI生成前のユーザー案内を改善 |
| `1cc6727` | toolsファイル名を標準化し、deploy検証を追加 |
| `3910c32` | フッター拠点情報へ電話番号を追加 |
| `6ee907c` | フッター電話番号の可読性を改善 |
| `8ad5572` | フッター電話番号サイズを調整 |
| `6deafe6` | WordPressニュース本文をmicroCMSへ復旧 |
| `0b9e341` | WordPress本文画像復旧ツール・レポートを追加 |
| `0ab6539` | ニュース一覧の年度・カテゴリ検索を全記事対象へ修正 |
| `1a995f8` | 0件カテゴリをニュース検索UIから非表示化 |

## 9. 次回作業開始時

最初に確認すること:

1. このファイル: [`docs/SITE_MAINTENANCE_LOG.md`](./SITE_MAINTENANCE_LOG.md)
2. `git status --short`
3. 最新deploy状況
4. 未追跡ファイル
5. `AGENTS.md`
6. `PROJECT_CONTEXT.md`

未追跡ファイルは、作業対象でない限り削除・stage・commitしない。

## 10. 保守ルール

必ず守ること:

- 作業前にこのファイルを読む。
- 作業終了時にこのファイルへ追記する。
- deployしたら必ず記録する。
- commit hashを必ず残す。
- 本番確認を書いて終了する。
- 推測を書かない。
- 未確認事項は「未確認」と明記する。
- 関連スクリプト・関連レポートへのリンクも更新する。
- `.env`、APIキー、FTP情報、パスワード、トークンなどの秘密情報は表示・記載・Git管理しない。
- microCMS更新、FTP転送、deploy、commit、pushは、ユーザーの明示指示がある場合だけ実行する。
