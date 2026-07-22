# GA4 計測手順書：お問合せページ AIチャットボット導線

対象サイト: https://touhokunedi.com  
計測対象: `/contact` ページの「AIチャットボットに聞いてみる」ボタン（4箇所）

---

## 1. 実装内容

### イベント仕様

| 項目 | 値 |
|---|---|
| イベント名 | `contact_ai_chatbot_click` |
| パラメータ名 | `button_location` |
| パラメータ値 | `manufacture` / `sales` / `recruit` / `general` |
| 追加パラメータ | `page_path`（`/contact`） |

### 対象ボタン

| button_location | リンク先 |
|---|---|
| `manufacture` | `/ai/t-nedi-manufacture_nb` |
| `sales` | `/ai/t-nedi-sales_nb` |
| `recruit` | `/ai/t-nedi-recruit_nb` |
| `general` | `/ai/t-nedi-general_nb`（総合・その他セクション） |

### 実装ファイル

`src/pages/contact.astro`

- 各 `<a>` タグに `class="ai-chatbot-link"` と `data-ai-location="..."` を付与
- ページ末尾の `<script>` でクリック時に `gtag('event', 'contact_ai_chatbot_click', {...})` を発火
- `gtag` の存在チェック（`typeof (window as any).gtag === 'function'`）により、未読み込み時も安全に動作
- クリック時は遷移を一旦止め、`event_callback`（GA4送信完了時）または1秒タイムアウトのいずれか早い方でリンク先へ遷移する方式（計測の取りこぼし防止）

### 既知の不具合と対応済みの修正

- 初期実装では `Layout.astro` の `gtag` 初期化スクリプトに `is:inline` が付いておらず、`window.gtag` が未定義になりイベントが発火しない不具合があった
- `src/layouts/Layout.astro` の初期化スクリプトに `is:inline` を付与し、`window.gtag = gtag;` を明示することで解消済み（コミット `945bdf5`）
- 調査用に追加していた `console.log('[GA4debug] ...')` はデバッグ完了後に `src/pages/contact.astro` から削除済み

---

## 2. デプロイ手順

```bash
# 1. 差分確認
git diff src/pages/contact.astro

# 2. ステージング & コミット
git add src/pages/contact.astro
git commit -m "feat: お問合せページのAIチャットボットボタンにGA4計測を追加"

# 3. デプロイ
git push origin main && npm run deploy
```

---

## 3. 動作確認チェックリスト（デプロイ後）

### 3-1. リアルタイムレポートで発火確認

1. [GA4管理画面](https://analytics.google.com/) を開く
2. 左メニュー「レポート」→「リアルタイム」
3. 別タブで https://touhokunedi.com/contact を開く
4. 「AIチャットボットに聞いてみる」を1つクリック
5. GA4リアルタイムの **「イベント数：イベント名別」カード** に  
   `contact_ai_chatbot_click` が表示されればOK

> **注意**: リアルタイムの「イベント名別」カードはクリックしても  
> 詳細（button_location 別の内訳）は表示されません。  
> 内訳の確認は後述の「探索レポート」で行います。

### 3-2. 確認すべき4パターン

| ボタン | 確認方法 |
|---|---|
| 製造AI | 製造列の「AIチャットボットに聞いてみる」をクリック |
| 販売AI | 販売列の「AIチャットボットに聞いてみる」をクリック |
| 採用AI | 採用列の「AIチャットボットに聞いてみる」をクリック |
| 総合AI | 下部「その他」セクションのボタンをクリック |

---

## 4. GA4 カスタムディメンション登録手順

### 目的

`button_location` パラメータを探索レポートで使えるようにするため、  
GA4の「カスタムディメンション」として登録する。

> **データ反映のタイミング**: イベントが実際に届いてから登録できる。  
> デプロイ＋動作確認完了後に実施する。

### 手順

1. [GA4管理画面](https://analytics.google.com/) を開く
2. 左下の **「管理」**（歯車アイコン）をクリック
3. 「プロパティ」列 →「**カスタム定義**」をクリック
4. 「**カスタムディメンション**」タブを選択
5. 右上の「**カスタムディメンションを作成**」ボタンをクリック
6. 以下を入力：

   | 項目 | 入力値 |
   |---|---|
   | ディメンション名 | `AIボタン位置`（任意の日本語名でOK） |
   | スコープ | **イベント** |
   | イベントパラメータ | `button_location` |
   | 説明 | お問合せページのAIチャットボットボタン位置 |

7. 「**保存**」をクリック

---

## 5. 探索レポートで button_location 別クリック数を確認

### 前提

- カスタムディメンション登録後、**約24〜48時間**で探索レポートに反映
- 登録前に発生したイベントのデータは遡及して反映されない

### 手順

1. GA4左メニュー「**探索**」をクリック
2. 「**空白**」または「**自由形式**」を選択して新規作成
3. 「**変数**」パネルで以下を設定：

   **ディメンション（+ボタン）**
   - 「AIボタン位置」（＝`button_location`）を追加
   - 「イベント名」も追加（フィルタ用）

   **指標（+ボタン）**
   - 「イベント数」を追加

4. 「**設定**」パネルで以下を構成：

   | 設定項目 | 値 |
   |---|---|
   | 行 | 「AIボタン位置」をドラッグ |
   | 値 | 「イベント数」をドラッグ |

5. フィルタを追加（任意）：
   - 「イベント名」＝ `contact_ai_chatbot_click` で絞り込む

6. レポートに `manufacture` / `sales` / `recruit` / `general` ごとの  
   クリック数が表示されれば計測成功

---

## 6. 注意事項

- `gtag` は `Layout.astro` で全ページに読み込み済み（GA4 ID: `G-QP9YVYEB2M`）
- AIページ（`/ai/t-nedi-*_nb`）は `Layout` を使わないスタンドアロンHTMLのため、  
  GA4タグが含まれていない。これは意図的な設計。
- GA4の標準レポートへの反映は通常**24〜48時間**かかる。  
  当日中の確認はリアルタイムレポートで行う。
