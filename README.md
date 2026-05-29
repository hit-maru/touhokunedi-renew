# 東北ネジ製造株式会社 公式サイト

![Deploy Astro Site to Xserver](https://github.com/hit-maru/touhokunedi-renew/actions/workflows/main.yml/badge.svg)

## 概要

東北ネジ製造株式会社の公式Webサイトです。

## 技術スタック

- **フレームワーク**: Astro
- **CMS**: microCMS
- **デプロイ**: GitHub Actions + FTP
- **ホスティング**: エックスサーバー ビジネスプラン（sv12328.xbiz.ne.jp）
- **スタイリング**: Tailwind CSS

## 機能

- ✅ microCMS連携によるヘッドレスCMS
- ✅ GitHub Actionsによる自動デプロイ
- ✅ 画像自動アップロード（microCMS）
- ✅ レスポンシブデザイン
- ✅ 多言語対応（日本語・英語）
- ✅ お知らせ一覧：ページネーション（10件/ページ）
- ✅ お知らせ一覧：年度フィルタ・カテゴリフィルタ

## サーバー構成

| 項目 | 内容 |
|------|------|
| ドメイン | touhokunedi.com |
| Webサーバー | Xserver ビジネスプラン |
| メールサーバー | Xserver ビジネスプラン |
| デプロイパス | /touhokunedi.com/public_html/ |

## 開発

### 必要な環境

- Node.js 22以上
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

### コマンド

| コマンド | 説明 |
|----------|------|
| `npm install` | 依存関係をインストール |
| `npm run dev` | 開発サーバー起動（localhost:4321） |
| `npm run build` | 本番用ビルド（`./dist/`に出力） |
| `npm run preview` | ビルドしたサイトをローカルでプレビュー |

## デプロイ

microCMSで記事を公開すると、自動的にGitHub Actionsが起動してエックスサーバーへデプロイされます。

### デプロイフロー

1. microCMSで記事公開
2. Webhook → GitHub Actions（トリガー名: Tohoku_Bolt）
3. ビルド（1〜2分）
4. FTPデプロイ → /touhokunedi.com/public_html/
5. サイトに反映

### GitHub Secrets（必須）

| シークレット名 | 内容 |
|----------------|------|
| `FTP_SERVER` | sv12328.xbiz.ne.jp |
| `FTP_USERNAME` | FTPユーザー名 |
| `FTP_PASSWORD` | FTPパスワード |
| `MICROCMS_SERVICE_DOMAIN` | touhokunedi |
| `MICROCMS_API_KEY` | microCMS APIキー |

## コンテンツ管理

### お知らせ（microCMS）

- 管理URL: https://touhokunedi.microcms.io/apis/news
- WordPress旧サイトから168件インポート済み（2026年5月）
- フィールド: タイトル / 日付 / カテゴリ / アイキャッチ画像 / 本文

### カテゴリ

- ニュース
- 製品情報
- 展示会
- イベント

## 旧サイトからの移行メモ

- 旧サイト: WordPress（別契約Xserver）
- DNS切り替え: 2026年5月31日夜間
- 旧サーバーの画像URL（wp-content/uploads/）は本文中に残存。旧サーバー契約終了前に移行要。

## ライセンス

© 2026 東北ネジ製造株式会社
