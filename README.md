# 東北ネジ製造株式会社 公式サイト

[![microCMS Deploy](https://github.com/hit-maru/touhokunedi-renew/actions/workflows/main.yml/badge.svg)](https://github.com/hit-maru/touhokunedi-renew/actions/workflows/main.yml)

## 概要

東北ネジ製造株式会社の公式Webサイトです。

## 技術スタック

- **フレームワーク**: Astro
- **CMS**: microCMS
- **デプロイ**: GitHub Actions + FTP
- **ホスティング**: エックスサーバー
- **スタイリング**: Tailwind CSS

## 機能

- ✅ microCMS連携によるヘッドレスCMS
- ✅ GitHub Actionsによる自動デプロイ
- ✅ 画像自動アップロード（microCMS）
- ✅ レスポンシブデザイン
- ✅ 多言語対応（日本語・英語）

## 開発

### 必要な環境

- Node.js 20以上
- npm

### ローカル環境のセットアップ
```bash
# 依存関係のインストール
npm install

# 環境変数の設定
# .env ファイルを作成して以下を設定
MICROCMS_SERVICE_DOMAIN=touhokunedi
MICROCMS_API_KEY=your-api-key

# 開発サーバー起動
npm run dev
```

### ビルド
```bash
npm run build
```

## コマンド

| コマンド | 説明 |
| :--- | :--- |
| `npm install` | 依存関係をインストール |
| `npm run dev` | 開発サーバー起動（localhost:4321） |
| `npm run build` | 本番用ビルド（./dist/に出力） |
| `npm run preview` | ビルドしたサイトをローカルでプレビュー |

## デプロイ

microCMSで記事を公開すると、自動的にGitHub Actionsが起動してエックスサーバーへデプロイされます。

### デプロイフロー
```
1. microCMSで記事公開
   ↓
2. Webhook → GitHub Actions
   ↓
3. ビルド（1〜2分）
   ↓
4. FTP デプロイ
   ↓
5. サイトに反映
```

## ライセンス

© 2026 東北ネジ製造株式会社