# CLAUDE.md — 東北ネヂ製造株式会社 Webサイト

## プロジェクト概要

東北ネヂ製造株式会社（Tohoku Bolt MFG. Co., Ltd. / nedzi）のコーポレートサイトリニューアルプロジェクト。  
日本語版・英語版（/en/）の2言語構成。

## 技術スタック

- **フレームワーク**: Astro 5.x
- **スタイリング**: Tailwind CSS 3.x
- **CMS**: microCMS（ニュース記事管理）
- **デプロイ**: FTP（`npm run deploy`）
- **言語**: 日本語（/） / 英語（/en/）

## よく使うコマンド

```bash
npm run dev       # 開発サーバー起動（localhost:4321）
npm run build     # 本番ビルド
npm run preview   # ビルド結果プレビュー
npm run deploy    # FTPデプロイ
npm run images    # 画像処理スクリプト
```

## ディレクトリ構成

```
src/
├── components/
│   ├── company/        # 企業情報ページ用コンポーネント
│   │   ├── Certification.astro   # 認証・資格
│   │   ├── History.astro         # 沿革
│   │   ├── SDGs.astro            # SDGs取り組み
│   │   ├── Outline.astro         # 会社概要
│   │   └── ...
│   ├── en/             # 英語版コンポーネント
│   └── Footer.astro    # フッター（SNSアイコン含む）
├── pages/
│   ├── index.astro     # 日本語トップ
│   ├── company.astro   # 企業情報
│   ├── en/             # 英語版ページ群
│   │   ├── index.astro
│   │   ├── company.astro
│   │   ├── manufacture.astro
│   │   └── product.astro
│   └── ...
├── layouts/
│   ├── Layout.astro    # 日本語レイアウト
│   └── LayoutEn.astro  # 英語レイアウト
└── lib/
    └── microcms.ts     # microCMS API設定
public/
└── images/             # 静的画像（webp推奨）
```

## ブランドカラー

| 用途 | クラス / 値 |
|------|------------|
| プライマリ（ティール） | `text-primary` / `#008B9B` |
| アクセント（オレンジ） | `#E64A19` |
| テキスト（墨） | `text-ink` |

## フォント

- 日本語見出し: `font-mb101`（MB101）
- 英語見出し: `font-cormo`（Cormorant Garamond）、`font-gara`（EB Garamond）
- 本文: `font-sans`（Noto Sans JP）

## 画像について

- 形式: `.webp` 推奨
- 配置: `public/images/`
- SDGsアイコン: `public/images/sdgs/E_SDG_PRINT-XX.jpg`

## SNS リンク

- LinkedIn: `https://www.linkedin.com/company/東北ネヂ製造（株）/`
- Instagram: `https://www.instagram.com/tohokubolt_official/`
- Elfsight Instagram Feed app ID: `0deee985-68ee-44ea-80b7-26596f3a7523`

## 注意事項

- 英語版（/en/）は日本語版と構成を合わせて更新すること
- Astro の外部スクリプトタグには `is:inline` を付ける
- 画像の `opacity` と グラデーションオーバーレイの組み合わせでヘッダー明度を調整している
- `<script>` タグに `src` 属性がある場合、Astro は `is:inline` を要求する
