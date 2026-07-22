# WordPressインポート記事復旧手順

## 目的

WordPress XMLからインポート済みの旧ニュース記事について、microCMS上で欠落している `content` を、既存Content IDを維持したまま復旧する。

対象XML:

```text
/Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml
```

確認済み事項:

- WordPress XMLはWXR形式。
- 代表記事 `opgoi3z1b` / `2023いわきオープンファクトリー開催` の `<content:encoded>` は存在する。
- 代表記事のXML本文文字数は `1192`。
- `repair-wp-import-news.mjs` のdry-runは成功済み。
- 直近のapply失敗理由は `PATCH is forbidden.` のみ。

## APIキー整理

復旧スクリプト実行に必要なのは `Content API` キー。

必要権限:

- `GET`: 既存記事一覧・対象記事の取得
- `PATCH`: 既存Content IDのまま `content` を更新

不要:

- `Management API` キーは、このスクリプトの実行には不要。

任意で有用:

- Management APIキーがあれば、APIスキーマ、公開状態、管理メタ情報の確認に使える。
- ただし今回の復旧本体は `PATCH /api/v1/news/{contentId}` で行うため、Content APIのPATCH権限が必須。

`.env` の差し替え対象:

```text
MICROCMS_SERVICE_DOMAIN=touhokunedi
MICROCMS_API_KEY=PATCH可能なContent APIキー
```

秘密情報はGit管理しない。

## 事前確認

作業前に確認する。

```bash
git status --short
node --check scripts/repair-wp-import-news.mjs
test -f /Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml
```

禁止事項:

- 事前承認なしで `--limit 10` を実行しない。
- 事前承認なしで `--all` を実行しない。
- 復旧確認前にdeployしない。
- 既存記事を削除しない。
- `thumbnail` は当面更新しない。`--with-thumbnail` は使わない。

## バックアップ取得

復旧前にContent APIから現状を保存する。

```bash
mkdir -p tmp/wp-import-repair-backup
node -e 'const fs=require("fs");const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}));(async()=>{const all=[];for(let offset=0;;offset+=100){const url=`https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/news?limit=100&offset=${offset}&fields=id,title,date,category,content,thumbnail,createdAt,updatedAt,publishedAt,revisedAt&orders=-date`;const res=await fetch(url,{headers:{"X-MICROCMS-API-KEY":env.MICROCMS_API_KEY}});const json=await res.json();all.push(...json.contents);if(all.length>=json.totalCount)break;}fs.writeFileSync(`tmp/wp-import-repair-backup/news-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.json`,JSON.stringify(all,null,2));console.log(`backup contents: ${all.length}`);})()'
```

バックアップ確認:

```bash
ls -lh tmp/wp-import-repair-backup/
```

## Dry Run

まず代表記事1件でdry-runする。

```bash
node scripts/repair-wp-import-news.mjs \
  --xml /Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml \
  --dry-run \
  --id opgoi3z1b \
  --limit 1
```

確認する出力:

- `matched XML posts: 1`
- `update candidates: 1`
- `selected this run: 1`
- `selected diff json: tmp/wp-import-repair/selected-diff-*.json`

JSON確認:

```bash
cat tmp/wp-import-repair/selected-diff-*.json
```

確認ポイント:

- `patchFields` が `["content"]`
- `thumbnailChanged` が `false`
- `before.hasContent` が `false`
- `after.hasContent` が `true`
- `after.contentLength` が `1192`

## Limit 1

PATCH可能なContent APIキーへ差し替えた後、代表記事1件のみapplyする。

```bash
node scripts/repair-wp-import-news.mjs \
  --xml /Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml \
  --apply \
  --id opgoi3z1b \
  --limit 1
```

成功条件:

- `PATCH results: ok=1, failed=0`
- `results-*.json` の対象行が `ok: true`

失敗時:

- `PATCH is forbidden.` の場合、APIキーのPATCH権限不足。
- 10件、全件、build、deployへ進まない。

## API確認

Content APIで `content` が返るか確認する。

```bash
node -e 'const fs=require("fs");const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}));(async()=>{const url=`https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/news/opgoi3z1b?fields=id,title,content,thumbnail`;const res=await fetch(url,{headers:{"X-MICROCMS-API-KEY":env.MICROCMS_API_KEY}});const json=await res.json();console.log(JSON.stringify({status:res.status,keys:Object.keys(json),hasContent:typeof json.content==="string"&&json.content.length>0,contentLength:typeof json.content==="string"?json.content.length:null,hasThumbnail:Boolean(json.thumbnail),contentHead200:typeof json.content==="string"?json.content.slice(0,200):""},null,2));})()'
```

成功条件:

- `status: 200`
- `keys` に `content` が含まれる
- `hasContent: true`
- `contentLength: 1192`

管理画面確認:

- microCMS管理画面で `opgoi3z1b` を開く。
- 本文欄にXML由来本文が入っていることを確認する。
- 保存・公開操作は不要。表示確認のみ。

## Build

API確認後にビルドする。

```bash
npm run build
```

成功条件:

- buildが正常終了する。
- `opgoi3z1b` で本文欠落警告が出ない。

静的HTML確認:

```bash
rg -n '2/27（火）|IMG_2764|IMG_2769' dist/news/opgoi3z1b/index.html
```

成功条件:

- `dist/news/opgoi3z1b/index.html` に本文HTMLが出力されている。
- 本文中画像URLがHTML内に残っている。

## Preview

ローカルpreviewで表示確認する。

```bash
npm run preview -- --host 127.0.0.1 --port 4322
```

別ターミナルで確認:

```bash
curl -fsS http://127.0.0.1:4322/news/opgoi3z1b/ | rg '2/27（火）|IMG_2764|IMG_2769'
```

ブラウザ確認:

```text
http://127.0.0.1:4322/news/opgoi3z1b/
```

成功条件:

- 記事本文が表示される。
- 本文中画像がHTML上に存在する。
- レイアウト崩れがない。

## Limit 10

代表記事1件が成功し、ユーザー承認を得てから実行する。

```bash
node scripts/repair-wp-import-news.mjs \
  --xml /Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml \
  --dry-run \
  --limit 10
```

dry-run JSON/CSVを確認後、承認を得てapplyする。

```bash
node scripts/repair-wp-import-news.mjs \
  --xml /Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml \
  --apply \
  --limit 10
```

確認:

- `PATCH results: ok=10, failed=0`
- Content APIで複数記事の `content` が返る。
- `npm run build` が成功する。
- previewで代表複数記事を確認する。

## 全件

limit10が成功し、ユーザー承認を得てから実行する。

```bash
node scripts/repair-wp-import-news.mjs \
  --xml /Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml \
  --dry-run \
  --all
```

dry-runの確認後、承認を得てapplyする。

```bash
node scripts/repair-wp-import-news.mjs \
  --xml /Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml \
  --apply \
  --all
```

確認:

- `PATCH results` の失敗件数が0。
- 失敗がある場合は `results-*.json` を確認し、再実行範囲を絞る。
- `npm run build` が成功する。
- 旧記事の本文が複数ページで表示される。

## Deploy

全件復旧、build、preview、本番反映承認がそろってから実行する。

```bash
npm run deploy
```

本番確認:

```text
https://touhokunedi.com/news/opgoi3z1b/
```

確認項目:

- HTTP 200。
- 本文が表示される。
- 本文中画像URLが表示・リンクされる。
- 一覧ページに影響がない。

## スクリプト最終レビュー

対象: `scripts/repair-wp-import-news.mjs`

レビュー結果:

- XML解析: WXRの `<item>`、`wp:post_type`、`wp:status`、`content:encoded`、`wp:postmeta`、本文中画像URLを抽出できる。代表XMLで本文取得済み。
- 記事照合: 既存microCMS記事とXML記事を `title + date` で照合する。Content IDはmicroCMS側の既存IDを使うため維持される。
- 誤更新防止: デフォルトはdry-run。applyには `--apply` が必要。さらに `--apply` は `--id`、`--limit`、`--all` のいずれかが必須。
- content更新: デフォルトPATCH対象は `content` のみ。`thumbnail` は `--with-thumbnail` がない限り送信されない。
- dry-run: JSON/CSVに更新対象一覧を出力し、選択対象の更新前/更新後/差分も `selected-diff-*.json` に出力する。
- ログ: 件数サマリ、report JSON、CSV、selected diff、results JSONのパスを標準出力する。
- 例外処理: XML未指定、XML不在、環境変数不足、GET失敗、引数不正は明示エラーで停止する。PATCH失敗はresultsに記録される。
- 再実行安全性: 既に `content` が存在する記事は通常 `nothing_to_update` でskipされる。再更新が必要な場合のみ `--force-content` を使う。

判定:

```text
本番投入可能
```

ただし前提として、`.env` の `MICROCMS_API_KEY` がContent APIのPATCH権限を持っていること。

## 作業記録

- 保留記事: `tonzkg82_b`
- タイトル: `&lt;会社見学>東日本旅客鉄道株式会社　盛岡保線設備技術センター様`
- 原因: microCMS側タイトルの `&lt;` とWordPress XML側タイトルの `<` の差分。
- 判定: 同一記事だが、今回はスクリプトを修正せず自動復旧対象外。
- 扱い: `xml_match_not_found` のままskipしてよい。

## 復旧作業開始前チェックリスト

- [ ] 作業者が復旧対象と手順を把握している。
- [ ] `WordPress.2026-05-29.xml` の場所を確認した。
- [ ] `git status --short` で作業前状態を記録した。
- [ ] `.env` の `MICROCMS_API_KEY` をPATCH可能なContent APIキーへ差し替えた。
- [ ] APIキーの実値をチャット、Git、ログへ出力していない。
- [ ] `node --check scripts/repair-wp-import-news.mjs` が成功した。
- [ ] microCMS現状バックアップを取得した。
- [ ] `--dry-run --id opgoi3z1b --limit 1` の結果を確認した。
- [ ] `patchFields` が `content` のみであることを確認した。
- [ ] `thumbnailChanged` が `false` であることを確認した。
- [ ] ユーザーから `--apply --id opgoi3z1b --limit 1` の承認を得た。
- [ ] 1件apply後、Content APIで `content` が返ることを確認した。
- [ ] microCMS管理画面で本文表示を確認した。
- [ ] `npm run build` が成功した。
- [ ] `dist/news/opgoi3z1b/index.html` に本文HTMLが入ったことを確認した。
- [ ] ローカルpreviewで本文表示を確認した。
- [ ] limit10実行前にユーザー承認を得た。
- [ ] 全件実行前にユーザー承認を得た。
- [ ] deploy前にユーザー承認を得た。
