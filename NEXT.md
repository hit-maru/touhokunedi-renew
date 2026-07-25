# NEXT.md

これは「次回作業開始時に最初に読むファイル」です。

作業開始時は

1. AGENTS.md
2. PROJECT_CONTEXT.md
3. NEXT.md

の順に確認してください。

作業終了時には、このファイルを必ず更新してください。

---

# 最終更新

2026-07-25

---

# 今日完了したこと

## AI投稿エディタ復旧（OpenAI一本化）

状態

✅ 完了

内容

- Browser
- ai-proxy-TN.php
- Google Apps Script
- OpenAI API

の構成へ一本化

GASはOpenAIレスポンスを既存互換形式

content[0].text

へ変換

投稿エディタ

動作確認済み

SNS生成

動作確認済み

commit

639db73

push済

---

## ニュース一覧UI改善

状態

✅ 完了

内容

- flex→grid
- カテゴリ表示改善
- サムネイルプレースホルダ追加
- createNewsItem同期

build成功

commit

83d3909

push済

---

# 現在のGit状態

正常

未追跡

tmp/

のみ

---

# 次回最初にやること

## ① tmp整理

目的

表示確認画像の整理

作業

- 必要なら保存
- 不要なら削除

---

## ② 保守開始

実行

npm run maintenance:start

↓

ニュース差分確認

---

## ③ 投稿エディタ

改善点確認

- UI
- SNS生成
- GAS

---

## ④ 次案件

（ここへ追記）

---

# 今回の重要メモ

OpenAI APIキー

コードへ書かない

Google Apps Script

スクリプトプロパティ

OPENAI_API_KEY

に保存

GAS変更後は

保存

↓

新バージョンでデプロイ

---

# コミット履歴

639db73

AI投稿エディタ復旧

83d3909

ニュース一覧UI改善

---

# 次回ChatGPTへ最初に伝えること

「AGENTS.md

PROJECT_CONTEXT.md

NEXT.md

を読んでから作業開始してください。」

---