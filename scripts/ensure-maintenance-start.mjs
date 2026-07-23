#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const STATE_PATH = path.join(PROJECT_ROOT, "tmp", "maintenance-last-check.json");
const MAINTENANCE_LOG_PATH = path.join(PROJECT_ROOT, "docs", "SITE_MAINTENANCE_LOG.md");
const TIMEZONE = "Asia/Tokyo";

function parseArgs(argv) {
  const args = {
    now: "",
    checkArgs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--now") args.now = argv[++i] || "";
    else if (arg === "--check-arg") args.checkArgs.push(argv[++i] || "");
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function printUsage() {
  console.log(`
Usage:
  node scripts/ensure-maintenance-start.mjs

Options:
  --now <iso-date>        Override current time for verification.
  --check-arg <argument>  Pass one argument to maintenance:check-news.
`.trim());
}

function formatter(options) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, ...options });
}

function zonedDate(now) {
  return formatter({ year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function zonedTimestamp(now) {
  const parts = Object.fromEntries(
    formatter({
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function alreadyCheckedToday(state, today) {
  return state?.date === today && typeof state.result === "string" && state.result.startsWith("success");
}

function ensureMaintenanceLogExists() {
  if (!fs.existsSync(MAINTENANCE_LOG_PATH)) {
    throw new Error("docs/SITE_MAINTENANCE_LOG.md was not found.");
  }
  fs.readFileSync(MAINTENANCE_LOG_PATH, "utf8");
}

function runCheck(checkArgs) {
  const args = ["run", "maintenance:check-news", "--", "--json", ...checkArgs];
  return spawnSync("npm", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function printSummary(summary) {
  console.log("保守開始チェック結果:");
  console.log(`- 前回件数: ${summary.previousCount ?? "未確認"}`);
  console.log(`- 現在件数: ${summary.currentCount}`);
  console.log(`- 新規投稿: ${summary.newCount}`);
  console.log(`- 更新: ${summary.updatedCount}`);
  console.log(`- 削除・非公開候補: ${summary.missingCount}`);
  console.log(`- カテゴリ変化: ${summary.categoryChangedCount ?? 0}`);
  if (summary.note) console.log(`- 補足: ${summary.note}`);
}

function writeState(now, today, summary) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const state = {
    checkedAt: zonedTimestamp(now),
    timezone: TIMEZONE,
    date: today,
    previousCount: summary.previousCount,
    currentCount: summary.currentCount,
    newCount: summary.newCount,
    updatedCount: summary.updatedCount,
    missingCount: summary.missingCount,
    result: summary.result,
  };
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function extractJson(stdout) {
  const trimmed = stdout.trim();
  const line = trimmed
    .split(/\r?\n/)
    .reverse()
    .find((entry) => entry.trim().startsWith("{") && entry.trim().endsWith("}"));
  if (!line) throw new Error("maintenance:check-news did not return JSON.");
  return JSON.parse(line);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = args.now ? new Date(args.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("--now must be a valid date.");

  ensureMaintenanceLogExists();

  const today = zonedDate(now);
  const state = readJson(STATE_PATH);
  if (alreadyCheckedToday(state, today)) {
    console.log("本日の保守開始チェックは実施済みです。通常作業へ進めます。");
    console.log(`- 実施日: ${state.date}`);
    console.log(`- 現在件数: ${state.currentCount}`);
    console.log(`- 新規投稿: ${state.newCount}`);
    console.log(`- 更新: ${state.updatedCount}`);
    console.log(`- 削除・非公開候補: ${state.missingCount}`);
    return;
  }

  console.log("本日の保守開始チェックが未実施です。最初に npm run maintenance:check-news を実行してください。");
  console.log("保守開始チェックを実行します");

  const result = runCheck(args.checkArgs);
  if (result.status !== 0) {
    if (result.stdout.trim()) console.log(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
    throw new Error(`maintenance:check-news failed with exit code ${result.status ?? "unknown"}.`);
  }

  const summary = extractJson(result.stdout);
  printSummary(summary);
  writeState(now, today, summary);
  console.log(`状態ファイルを更新しました: ${path.relative(PROJECT_ROOT, STATE_PATH)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
