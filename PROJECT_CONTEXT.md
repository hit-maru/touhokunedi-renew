# PROJECT_CONTEXT.md - 東北ネヂRenew 共通背景

## プロジェクト

- プロジェクト名: 東北ネヂRenew
- 用途: 東北ネヂ製造株式会社のコーポレートサイト
- 会社正式名称: 東北ネヂ製造株式会社
- 会社英名: Tohoku Bolt MFG. Co., Ltd. / nedzi
- 本番URL: https://touhokunedi.com/
- 言語構成: 日本語版 `/`、英語版 `/en/`

## 技術構成

- Astro 5.x
- Tailwind CSS 3.x
- microCMS
- GitHub
- Xserver Business
- `deploy.js` によるFTPデプロイ

## 開発でよく使うコマンド

```bash
npm run dev       # 開発サーバー起動
npm run build     # 本番ビルド
npm run preview   # ビルド結果プレビュー
npm run images    # 画像処理スクリプト
npm run deploy    # FTPデプロイ
```

`npm run deploy` は本番反映を行うコマンド。実行ルールは `AGENTS.md` を正とし、ユーザーの明示的な指示がある場合だけ実行する。

## 公開構造

- `src/pages` 配下は Astro の公開ページとして扱われる。
- `public` 配下は静的公開ファイルとして扱われる。
- microCMS はニュース記事管理に利用している。
- GA4 を利用している。
- 本番FTPデプロイは `deploy.js` を利用する。

## 現在の基準状態

- 2026年7月22日時点の `main` 最新コミット: `2508531ee94d4e694f86ac5234b45e32192937c3`
- 2026年7月22日時点で `origin/main` と同期済み。

## 直近の作業

- 不要公開ページ削除
- GA4デバッグコード削除
- GA4計測仕様書追加
- Build、Push、Deploy、本番確認完了

## 運用上の注意

- `public/tools/` は現在未追跡。
- `public/tools/` は Xserver のBasic認証とPHPログインによる二重保護で運用されている。
- `uploader-TN.php` には固定ログインパスワードがあり、将来的に外部設定化が必要。
- 秘密情報の実値、FTP情報、APIキー、パスワードはこのファイルに記載しない。

## サイト構成メモ

```text
src/
├── components/
│   ├── company/        # 企業情報ページ用コンポーネント
│   ├── en/             # 英語版コンポーネント
│   └── Footer.astro    # フッター
├── pages/
│   ├── index.astro     # 日本語トップ
│   ├── company.astro   # 企業情報
│   ├── en/             # 英語版ページ群
│   └── ai/             # AIチャットボットページ群
├── layouts/
│   ├── Layout.astro    # 日本語レイアウト
│   └── LayoutEn.astro  # 英語レイアウト
└── lib/
    └── microcms.ts     # microCMS API設定

public/
└── images/             # 静的画像
```

## デザイン・実装メモ

- ブランドカラー:
  - プライマリ: `#008B9B`
  - アクセント: `#E64A19`
  - テキスト: `text-ink`
- フォント:
  - 日本語見出し: `font-mb101`
  - 英語見出し: `font-cormo`、`font-gara`
  - 本文: `font-sans`
- 画像形式は `.webp` 推奨。
- SDGsアイコンは `public/images/sdgs/E_SDG_PRINT-XX.jpg` を利用。
- 英語版 `/en/` は日本語版と構成を合わせて更新する。
- Astro の外部スクリプトタグには `is:inline` が必要。
- `<script>` タグに `src` 属性がある場合、Astro は `is:inline` を要求する。

## 今後の優先事項

1. `src/pages` 全監査
2. `public` 全監査
3. `public/tools` の正式運用設計
