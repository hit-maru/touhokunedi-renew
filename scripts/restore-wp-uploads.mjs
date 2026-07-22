#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
const PromiseFtp = require("promise-ftp");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_PARENT = path.dirname(PROJECT_ROOT);
const WORKSPACE_GRANDPARENT = path.dirname(WORKSPACE_PARENT);

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

const UPLOADS_DIR_NAME = "東北ネヂRenew_本番バックアップ/uploads";
const DEFAULT_REPORT_PATH = path.join(PROJECT_ROOT, "reports", "wp-uploads-restore-report.md");
const DEFAULT_RESULTS_PATH = path.join(PROJECT_ROOT, "tmp", "wp-import-repair", "wp-uploads-restore-results.json");
const DEFAULT_ENDPOINT = "news";
const OLD_UPLOADS_URL = "https://touhokunedi.com/wp/wp-content/uploads/";
const REMOTE_UPLOADS_SUFFIX = "/wp/wp-content/uploads";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);
const BODY_FIELDS = ["content", "body", "text", "html", "main", "article", "bodyHtml", "contentHtml"];
const HTTP_TIMEOUT_MS = 12000;
const HTTP_CONCURRENCY = 8;

const USAGE = `
Usage:
  node scripts/restore-wp-uploads.mjs
  node scripts/restore-wp-uploads.mjs --uploads "/path/to/uploads"

Options:
  --uploads <path>       Source uploads directory. Auto-detected when omitted.
  --endpoint <endpoint>  microCMS endpoint used for GET-only URL extraction. Default: news
  --report <path>        Markdown report output path. Default: reports/wp-uploads-restore-report.md
  --results <path>       JSON results output path. Default: tmp/wp-import-repair/wp-uploads-restore-results.json
  --help, -h             Show this help.

This script uploads only WordPress uploads files to the existing FTP site root + /wp/wp-content/uploads.
It does not PATCH microCMS, update thumbnails, run a site deploy, delete remote files, or add images to Git.
`;

function parseArgs(argv) {
  const args = {
    uploads: "",
    endpoint: DEFAULT_ENDPOINT,
    report: DEFAULT_REPORT_PATH,
    results: DEFAULT_RESULTS_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--uploads") args.uploads = argv[++i] || "";
    else if (arg === "--endpoint") args.endpoint = argv[++i] || DEFAULT_ENDPOINT;
    else if (arg === "--report") args.report = argv[++i] || DEFAULT_REPORT_PATH;
    else if (arg === "--results") args.results = argv[++i] || DEFAULT_RESULTS_PATH;
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE.trim());
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  args.report = path.resolve(PROJECT_ROOT, args.report);
  args.results = path.resolve(PROJECT_ROOT, args.results);
  if (args.uploads) args.uploads = path.resolve(args.uploads);
  return args;
}

function normalizeLocalPath(value) {
  return value.split(path.sep).join("/");
}

function joinRemote(...parts) {
  const joined = parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
  return joined.startsWith("/") ? joined : `/${joined}`;
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function findUploadsDir() {
  const searchRoots = [
    PROJECT_ROOT,
    WORKSPACE_PARENT,
    WORKSPACE_GRANDPARENT,
    path.join(process.env.HOME || "", "Desktop"),
  ].filter(Boolean);
  const visited = new Set();
  const explored = [];

  function visit(dir, depth) {
    if (depth > 5 || visited.has(dir)) return "";
    visited.add(dir);
    explored.push(dir);
    const expected = path.join(dir, UPLOADS_DIR_NAME);
    if (fs.existsSync(expected) && fs.statSync(expected).isDirectory()) return expected;

    let dirents;
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return "";
    }

    for (const dirent of dirents) {
      if (!dirent.isDirectory()) continue;
      if (["node_modules", ".git", "dist", "Library"].includes(dirent.name)) continue;
      const found = visit(path.join(dir, dirent.name), depth + 1);
      if (found) return found;
    }
    return "";
  }

  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;
    const found = visit(root, 0);
    if (found) return { uploadsDir: found, explored };
  }
  return { uploadsDir: "", explored };
}

function collectFiles(uploadsDir) {
  const files = [];
  function visit(dir) {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (!dirent.isFile() || !isImageFile(fullPath)) continue;
      const stats = fs.statSync(fullPath);
      files.push({
        fullPath,
        relativePath: normalizeLocalPath(path.relative(uploadsDir, fullPath)),
        size: stats.size,
      });
    }
  }
  visit(uploadsDir);
  return files;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function ftpConfig() {
  return {
    host: requireEnv("FTP_HOST"),
    user: requireEnv("FTP_USER"),
    password: requireEnv("FTP_PASSWORD"),
    port: Number(process.env.FTP_PORT || 21),
    connTimeout: 20000,
    pasvTimeout: 20000,
    keepalive: 10000,
  };
}

function remoteUploadsRoot() {
  const ftpPath = requireEnv("FTP_PATH").replace(/\/+$/, "");
  return joinRemote(ftpPath, REMOTE_UPLOADS_SUFFIX);
}

async function ensureRemoteDir(ftp, remoteDir, cache) {
  if (cache.has(remoteDir)) return;
  await ftp.mkdir(remoteDir, true);
  cache.add(remoteDir);
}

async function remoteSizeOrNull(ftp, remotePath) {
  try {
    return await ftp.size(remotePath);
  } catch (error) {
    if (["550", 550].includes(error?.code)) return null;
    return null;
  }
}

async function uploadFiles({ files, remoteRoot }) {
  const ftp = new PromiseFtp();
  const results = [];
  const dirCache = new Set();
  await ftp.connect(ftpConfig());
  await ftp.binary();

  try {
    await ensureRemoteDir(ftp, remoteRoot, dirCache);
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const remotePath = joinRemote(remoteRoot, file.relativePath);
      const remoteDir = remotePath.split("/").slice(0, -1).join("/") || "/";
      const result = {
        index: i + 1,
        localPath: file.fullPath,
        relativePath: file.relativePath,
        remotePath,
        size: file.size,
        action: "",
        error: "",
      };

      try {
        await ensureRemoteDir(ftp, remoteDir, dirCache);
        const remoteSize = await remoteSizeOrNull(ftp, remotePath);
        if (remoteSize === file.size) {
          result.action = "skipped_same_size";
        } else {
          await ftp.put(file.fullPath, remotePath);
          result.action = "uploaded";
        }
      } catch (error) {
        result.action = "failed";
        result.error = error.message || String(error);
      }

      results.push(result);
      if ((i + 1) % 100 === 0 || i + 1 === files.length) {
        console.log(`processed ${i + 1}/${files.length}`);
      }
    }
  } finally {
    await ftp.end().catch(() => {});
  }

  return results;
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attrsOf(tag) {
  const attrs = {};
  const regex = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(regex)) {
    const key = match[1].toLowerCase();
    if (key === "img") continue;
    attrs[key] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function bodyHtmlOf(news) {
  for (const field of BODY_FIELDS) {
    if (typeof news[field] === "string" && news[field].trim()) return news[field];
  }
  return "";
}

async function fetchNews(endpoint) {
  const serviceDomain = requireEnv("MICROCMS_SERVICE_DOMAIN");
  const apiKey = requireEnv("MICROCMS_API_KEY");
  const contents = [];
  for (let offset = 0; ; offset += 100) {
    const url = new URL(`https://${serviceDomain}.microcms.io/api/v1/${endpoint}`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("fields", ["id", "title", "date", ...BODY_FIELDS].join(","));
    url.searchParams.set("orders", "-date");

    const res = await fetch(url, { headers: { "X-MICROCMS-API-KEY": apiKey } });
    if (!res.ok) throw new Error(`microCMS GET failed: HTTP ${res.status}`);
    const json = await res.json();
    contents.push(...json.contents);
    if (contents.length >= json.totalCount) return contents;
  }
}

function extractTargetImageUrls(news) {
  const rows = [];
  for (const item of news) {
    const html = bodyHtmlOf(item);
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      const src = attrsOf(match[0]).src || "";
      if (!src.startsWith(OLD_UPLOADS_URL)) continue;
      rows.push({
        contentId: item.id,
        title: item.title || "",
        src,
      });
    }
  }
  return rows;
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function checkUrl(row) {
  try {
    const res = await fetch(row.src, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 wp-upload-restore-check",
      },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    return { ...row, status: res.status, ok: res.status === 200, error: "" };
  } catch (error) {
    return { ...row, status: null, ok: false, error: error.name === "TimeoutError" ? "timeout" : error.message };
  }
}

function countByAction(results) {
  return results.reduce(
    (acc, result) => {
      if (result.action === "uploaded") acc.uploaded += 1;
      else if (result.action === "skipped_same_size") acc.skipped += 1;
      else if (result.action === "failed") acc.failed += 1;
      return acc;
    },
    { uploaded: 0, skipped: 0, failed: 0 },
  );
}

function httpSummary(checks) {
  const summary = { ok200: 0, notFound404: 0, otherStatus: 0, unreadable: 0 };
  for (const check of checks) {
    if (check.status === 200) summary.ok200 += 1;
    else if (check.status === 404) summary.notFound404 += 1;
    else if (check.status == null) summary.unreadable += 1;
    else summary.otherStatus += 1;
  }
  return summary;
}

function markdownTable(headers, rows) {
  const esc = (value) =>
    String(value ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\r?\n/g, "<br>");
  return [
    `| ${headers.map(esc).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(esc).join(" | ")} |`),
  ].join("\n");
}

function writeReport({ args, uploadsDir, remoteRoot, files, transferResults, targetUrls, httpChecks }) {
  const transferSummary = countByAction(transferResults);
  const http = httpSummary(httpChecks);
  const failedRows = transferResults
    .filter((result) => result.action === "failed")
    .map((result) => [result.relativePath, result.remotePath, result.error]);
  const notFoundRows = httpChecks
    .filter((check) => check.status === 404)
    .map((check) => [check.contentId, check.title, check.src]);
  const otherRows = httpChecks
    .filter((check) => check.status !== 200 && check.status !== 404)
    .map((check) => [check.contentId, check.title, check.src, check.status ?? "", check.error]);
  const representative = httpChecks.filter(
    (check) =>
      check.contentId === "7o3aqoc7t03" &&
      (check.src.endsWith("/IMG_4190-1024x768.jpg") || check.src.endsWith("/IMG_4188-1024x768.jpg")),
  );
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const report = `# WordPress uploads 本番復旧レポート

Generated: ${new Date().toISOString()}

## 実施内容

- コピー元: \`${uploadsDir}\`
- 本番配置先: \`${remoteRoot}\`
- microCMS本文PATCH: なし
- thumbnail更新: なし
- WordPress XML再処理: なし
- 通常サイト全体deploy: なし

## ローカル画像

- ローカル画像ファイル数: ${files.length}
- ローカル合計容量: ${totalSize} bytes

## FTP転送結果

- 転送成功数: ${transferSummary.uploaded}
- スキップ数: ${transferSummary.skipped}
- 失敗数: ${transferSummary.failed}

${failedRows.length ? markdownTable(["Relative Path", "Remote Path", "Error"], failedRows) : "FTP転送失敗なし"}

## 242件HTTP確認結果

- 確認対象URL数: ${targetUrls.length}
- HTTP 200件数: ${http.ok200}
- 404件数: ${http.notFound404}
- その他ステータス件数: ${http.otherStatus}
- 読み込み不能URL: ${http.unreadable}

## 404が残ったURL

${notFoundRows.length ? markdownTable(["Content ID", "Title", "URL"], notFoundRows) : "なし"}

## その他ステータス / 読み込み不能

${otherRows.length ? markdownTable(["Content ID", "Title", "URL", "Status", "Error"], otherRows) : "なし"}

## 代表記事「第30回QCサークル発表会」2画像

${representative.length ? markdownTable(["Content ID", "Title", "URL", "Status", "Error"], representative.map((row) => [row.contentId, row.title, row.src, row.status ?? "", row.error])) : "対象画像が見つかりません"}
`;

  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(args.report, report);
  fs.mkdirSync(path.dirname(args.results), { recursive: true });
  fs.writeFileSync(
    args.results,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        uploadsDir,
        remoteRoot,
        localFiles: { count: files.length, totalSize },
        transferSummary,
        httpSummary: http,
        representative,
        transferResults,
        httpChecks,
      },
      null,
      2,
    ),
  );

  return { transferSummary, http, representative };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let uploadsDir = args.uploads;
  if (!uploadsDir) {
    const detected = findUploadsDir();
    uploadsDir = detected.uploadsDir;
    if (!uploadsDir) {
      throw new Error(`uploads directory not found. Explored:\n${detected.explored.join("\n")}`);
    }
  }
  if (!fs.existsSync(uploadsDir) || !fs.statSync(uploadsDir).isDirectory()) {
    throw new Error(`uploads directory not found: ${uploadsDir}`);
  }

  const files = collectFiles(uploadsDir);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const remoteRoot = remoteUploadsRoot();

  console.log(
    JSON.stringify(
      {
        uploadsDir,
        remoteTarget: remoteRoot,
        localFileCount: files.length,
        localTotalBytes: totalSize,
      },
      null,
      2,
    ),
  );

  const transferResults = await uploadFiles({ files, remoteRoot });
  const news = await fetchNews(args.endpoint);
  const targetUrls = extractTargetImageUrls(news);
  const httpChecks = await mapLimit(targetUrls, HTTP_CONCURRENCY, checkUrl);
  const finalSummary = writeReport({ args, uploadsDir, remoteRoot, files, transferResults, targetUrls, httpChecks });

  console.log(
    JSON.stringify(
      {
        report: path.relative(PROJECT_ROOT, args.report),
        results: path.relative(PROJECT_ROOT, args.results),
        transfer: finalSummary.transferSummary,
        http: finalSummary.http,
        representative: finalSummary.representative.map((row) => ({
          url: row.src,
          status: row.status,
          error: row.error,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
