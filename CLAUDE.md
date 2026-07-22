# CLAUDE.md - Claude Code 補足

このファイルは、東北ネヂRenewプロジェクトで Claude Code を使う際の補足です。

## 最初に読むファイル

Claude Code で作業を開始する前に、必ず次を読む。

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `CLAUDE.md`

共通ルールは `AGENTS.md`、プロジェクト背景は `PROJECT_CONTEXT.md` を正とする。

## Claude Code 固有の扱い

- `.claude/settings.local.json` はローカル専用の Claude Code 設定ファイル。
- `.claude/settings.local.json` は Git 管理しない。
- `.claude/settings.local.json` に記録された許可履歴を根拠に、ユーザーの明示指示なしで Git add、Commit、Push、Deploy を行わない。
- Claude Code の記憶や過去会話に依存しすぎず、リポジトリ内の現行ファイルと Git 状態を確認してから判断する。

## よく使う確認コマンド

```bash
git status --short
npm run build
git diff --stat
```

`npm run deploy`、`git push`、`git commit`、`git add` はユーザーの明示的な指示がある場合だけ実行する。

## 補足メモ

- 既存のプロジェクト概要、技術構成、ディレクトリ構成、デザインメモ、Astro注意事項は `PROJECT_CONTEXT.md` に整理済み。
- Claude Code でも Codex と同じ作業ルールに従う。
