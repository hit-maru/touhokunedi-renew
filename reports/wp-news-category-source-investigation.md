# WordPressニュース4分類 保存元調査レポート

作成日: 2026-07-23

## 調査目的

WordPress XMLからmicroCMSへ移行したお知らせ168記事について、旧サイトで表示されていたとされる4分類（製品情報 / 展示会 / イベント / ニュース）がWordPressのどこに保存されていたかを特定する。

今回の調査では、microCMS更新、DB更新、deploy、commit、pushは実行していない。

## 探索したディレクトリ

- `/Users/maruokahitoshimacbookpro/Desktop/Dev/touhokunedi-renew`
- `/Users/maruokahitoshimacbookpro/Desktop/東北ネヂRenew_本番バックアップ`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/wp611`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/Old-old/_wk/_DPP/htdocs/wp`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/touhokunedi.com-1677826640`

巨大な `uploads` 画像群とログファイルは全文走査対象から除外し、DB、テーマ、プラグイン、HTML、既存移行ログを優先した。

## 発見したWordPress関連ファイル

### DBダンプ

| パス | サイズ | 備考 |
| --- | ---: | --- |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/wordpress.sql` | 2.8MB | WordPress DB dump |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/localhost.sql` | 3.7MB | WordPress DB dump |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/連番なしDB_BK/wordpress.sql` | 2.8MB | WordPress DB dump |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/wp611/adminer.sql.gz` | 474KB | gzip圧縮DB dump |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/Old-old/_wk/_DPP/htdocs/wp/adminer.sql.gz` | 474KB | gzip圧縮DB dump |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/Old-old/_wk/_DPP/htdocs/wp/wp-content/updraft/backup_2022-07-06-2046_touhokunedicom_4bd5096abd8c-db.gz` | 364KB | UpdraftPlus DB backup |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/Old-old/_wk/_DPP/ssl.sql` | 3.7MB | `wp-config.php` の `DB_NAME=ssl` と対応する可能性あり |

### WordPress本体・テーマ・プラグイン

- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/wp611`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/Old-old/_wk/_DPP/htdocs/wp`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp/wp-content/themes/touhokunedi`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp/wp-content/themes/themes/touhokunedi`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp/wp-content/plugins`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp/wp-content/plugins-stop03`

### 既存移行・調査ファイル

- `scripts/repair-wp-news-categories.mjs`
- `reports/wp-news-category-repair-report.md`
- `tmp/wp-import-repair/wp-news-category-repair-results.json`

## wp-config.php 確認結果

秘密情報は表示していない。

| パス | DB_NAME | DB_HOST | table_prefix |
| --- | --- | --- | --- |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/wp611/wp-config.php` | `ssl` | `touhokunedi.com` | `wp_` |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp/wp-config.php` | `wordpress` | `localhost` | `wp_` |
| `/Users/maruokahitoshimacbookpro/0-東北ネヂ/Old-old/_wk/_DPP/htdocs/wp/wp-config.php` | `ssl` | `touhokunedi.com` | `wp_` |

## データベーステーブル一覧

確認できたWordPress系テーブルは主に以下。

- `wp_commentmeta`
- `wp_comments`
- `wp_links`
- `wp_options`
- `wp_pmr_status` （一部dumpのみ）
- `wp_postmeta`
- `wp_posts`
- `wp_termmeta`
- `wp_terms`
- `wp_term_relationships`
- `wp_term_taxonomy`
- `wp_usermeta`
- `wp_users`

接頭辞は確認したWordPress設定上すべて `wp_`。

## 発見したtaxonomy一覧

確認したDBダンプ内で見つかったtaxonomyは以下。

| taxonomy | term | slug | dump内count | 備考 |
| --- | --- | --- | ---: | --- |
| `category` | お知らせ | `news` | 90 / 97 / 109 / 116 | dump世代により件数差あり。対象記事の紐付けはこのtermのみ |
| `category` | メディア | `media` | 0 | 対象記事との紐付けなし |
| `link_category` | ブログロール | URLエンコードslug | 7 | リンク用。投稿分類ではない |
| `wp_theme` | touhokunedi | `touhokunedi` | 1 | テーマ情報。投稿分類ではない |

`製品情報`、`展示会`、`イベント` に相当するterm、slug、taxonomyはDBダンプ内で発見できなかった。

## 対象168記事とのtaxonomy紐付け

既存の `tmp/wp-import-repair/wp-news-category-repair-results.json` からWordPress post IDを取得し、DBダンプ内の `wp_term_relationships` と照合した。

| dump | 対象post IDとのrelationship | 対象記事に紐づいたtaxonomy |
| --- | ---: | --- |
| `wordpress.sql` | 71 | `category / お知らせ / news` のみ |
| `wp611/adminer.sql.gz` | 71 | `category / お知らせ / news` のみ |
| `backup_2022-07-06...-db.gz` | 78 | `category / お知らせ / news` のみ |
| `Old-old/.../adminer.sql.gz` | 71 | `category / お知らせ / news` のみ |
| `localhost.sql` | 90 | `category / お知らせ / news` のみ |
| `連番なしDB_BK/wordpress.sql` | 71 | `category / お知らせ / news` のみ |
| `ssl.sql` | 98 | `category / お知らせ / news` のみ |

DBダンプは2022年前後までの世代が中心で、2023-2026の記事を全件含む最新DBではない。ただし、確認できた対象post ID範囲では4分類に該当するtaxonomy紐付けは存在しなかった。

## 発見したterm一覧と件数

代表的な最新側候補である `ssl.sql` では以下。

| term_id | name | slug | taxonomy | count |
| ---: | --- | --- | --- | ---: |
| 1 | お知らせ | news | category | 116 |
| 2 | ブログロール | URLエンコードslug | link_category | 7 |
| 3 | メディア | media | category | 0 |
| 4 | touhokunedi | touhokunedi | wp_theme | 1 |

他のDBダンプも同様で、`category` は実質 `お知らせ/news` のみ。

## 分類に関係しそうなmeta_key一覧

対象post IDに紐づく `wp_postmeta` を調査した結果、確認できたmeta_keyは以下。

| meta_key | 備考 |
| --- | --- |
| `_edit_lock` | WordPress編集ロック |
| `_edit_last` | 最終編集者 |
| `_wp_old_date` | 旧日付 |
| `_wp_desired_post_slug` | slug関連 |
| `_encloseme` | ping/enclosure関連 |

以下の分類候補文字列を含むmeta_key/meta_valueは発見できなかった。

- `製品情報`
- `展示会`
- `イベント`
- `ニュース`
- `product`
- `exhibition`
- `event`
- `news`
- `category`
- `genre`
- `type`
- `label`
- `news_type`
- `field_` / ACF系

ACFのフィールド定義、分類用カスタムフィールド、`news_type` 相当のmetaは確認できなかった。

## テーマ・プラグイン内の関連コード

旧テーマのニュース一覧表示は、WordPress標準カテゴリの先頭要素をそのまま表示する実装だった。

確認箇所:

- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp/wp-content/themes/touhokunedi/page-newsrelease.php`
- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/www/htdocs/wp/wp-content/themes/touhokunedi/index.php`
- 同テーマの `Old-old` / `themes/themes` 配下コピー

該当処理:

```php
$cat_now = get_the_category();
$cat_now = $cat_now[0];
$now_name = $cat_now->cat_name;
$now_nicename = $cat_now->category_nicename;
echo '?cat='.$now_id.'" class="cat-'.$now_nicename.'">'.$now_name.'</a>';
```

検索した範囲では、以下の分類用処理は発見できなかった。

- `register_taxonomy` による独自taxonomy登録
- `get_post_meta` / `get_field` による分類値取得
- `tax_query` / `meta_query` による4分類抽出
- `news_type` / `genre` / `label` / `post_type` を用いたニュース分類

CSSには旧カテゴリslug向けのスタイルがあった。

- `.cat-news`
- `.cat-media`
- 一部コピーに `.cat-sendai`, `.cat-iwaki`

ただし、これらは4分類（製品情報 / 展示会 / イベント / ニュース）ではなく、DB側にも対応termは見つからなかった。

## 旧HTMLからカテゴリ抽出可能か

現時点で見つかった旧HTMLは限定的。

- `/Users/maruokahitoshimacbookpro/0-東北ネヂ/touhokunedi.com-1677826640/index.html`
- `/Users/maruokahitoshimacbookpro/Desktop/東北ネヂRenew_本番バックアップ/ai/.../index.html`

これらからニュース168件のURL、タイトル、日付、表示カテゴリの対応表は抽出できなかった。

旧記事一覧または旧記事詳細の静的HTML一式が見つかれば復元できる可能性はあるが、今回確認したローカルバックアップ内には、4分類ラベル付きの一覧HTMLは見つからなかった。

## 既存WordPress XML / 移行ログとの整合

既存レポート `reports/wp-news-category-repair-report.md` と `tmp/wp-import-repair/wp-news-category-repair-results.json` では、対象168記事すべてが以下として照合済み。

- WXR上のカテゴリ: `お知らせ / news`
- 正規化後: `ニュース`
- microCMS現状: `ニュース`
- PATCH可能件数: 0

今回のDB・テーマ調査結果もこれと矛盾しない。

## 4分類の正本を特定できたか

特定できなかった。

確認できた根拠は以下。

- WordPress XML: 対象168件すべて `お知らせ / news`
- DB taxonomy: 対象post ID範囲では `category / お知らせ / news` のみ
- DB postmeta: 分類に使えるmeta_key/meta_valueなし
- 旧テーマ: `get_the_category()` の先頭カテゴリを表示するだけ
- 旧HTML: 4分類ラベル付きの一覧・詳細HTMLバックアップなし

したがって、現ローカルバックアップだけでは「製品情報 / 展示会 / イベント / ニュース」を正確に復元する正本は確認できない。

## 正確に分類できる記事数

- `ニュース` としてなら、WXR根拠で168件すべて確認済み。
- 旧サイト表示上の4分類を復元する根拠としては、正確に分類できる記事数は0件。
- 未確定記事数は168件。

タイトルや本文からの推測分類、AIによる自動分類は今回の禁止事項に従い実施していない。

## microCMS PATCHへ進めるか

進めない。

理由:

- 既存microCMS側はすでに168件が `ニュース` で、WXR/DBで確認できる値も同じ。
- `製品情報`、`展示会`、`イベント` へ変更するための正本が見つかっていない。
- 現時点のPATCH候補は0件。

## 次に必要な作業

4分類を正確に復元するには、次のいずれかが必要。

1. 旧サーバーから、WordPress稼働当時の最新DB全体をSQLで取得する。
   - phpMyAdminで対象DBを選択
   - エクスポート形式: SQL
   - 方法: 簡易
   - 文字コード: UTF-8
   - 圧縮: gzipまたはzip
   - DB名は `wp-config.php` の `DB_NAME` を確認する
   - `DB_USER`、`DB_HOST` は確認してよいが、パスワードは共有・記載しない
2. 旧サイトのニュース一覧・詳細ページHTMLの静的バックアップ一式を取得する。
   - URL、タイトル、日付、表示カテゴリが同時に含まれるHTMLが望ましい
   - HTMLからカテゴリラベルを抽出できれば、microCMS Content IDとの対応表を作成可能
3. WordPress管理画面または旧CMS運用資料に、4分類の手動対応表がないか確認する。

現ローカル環境にあるDBダンプ・テーマ・既存XMLだけでは、4分類の保存場所は確認できない。
