#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

const DEFAULT_UPLOADS_DIR =
  "/Users/maruokahitoshimacbookpro/Desktop/東北ネヂRenew_本番バックアップ/uploads";
const DEFAULT_REPORT_PATH = path.join(PROJECT_ROOT, "reports", "image-repair-report.md");
const DEFAULT_ENDPOINT = "news";
const DEFAULT_OLD_UPLOADS_URL = "https://touhokunedi.com/wp/wp-content/uploads/";
const DEFAULT_PUBLIC_BASE_URL = "https://touhokunedi.com/wp/wp-content/uploads/";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);
const BODY_FIELDS = ["content", "body", "text", "html", "main", "article", "bodyHtml", "contentHtml"];

const USAGE = `
Usage:
  node scripts/repair-wp-images.mjs
  node scripts/repair-wp-images.mjs --uploads "/path/to/uploads"
  node scripts/repair-wp-images.mjs --microcms-json ./news.json

Options:
  --uploads <path>              Image master uploads directory.
                                Default: ${DEFAULT_UPLOADS_DIR}
  --microcms-json <path>        Read microCMS news JSON from file instead of Content API GET.
  --endpoint <endpoint>         microCMS endpoint. Default: news
  --old-uploads-url <url>       Old WordPress uploads URL prefix.
                                Default: ${DEFAULT_OLD_UPLOADS_URL}
  --public-base-url <url>       New public URL prefix for matched images.
                                Default: ${DEFAULT_PUBLIC_BASE_URL}
  --report <path>               Markdown report output path.
                                Default: reports/image-repair-report.md
  --help, -h                    Show this help.

This script is dry-run only. It does not PATCH microCMS, upload files, or deploy.
`;

function parseArgs(argv) {
  const args = {
    uploads: DEFAULT_UPLOADS_DIR,
    microcmsJson: "",
    endpoint: DEFAULT_ENDPOINT,
    oldUploadsUrl: DEFAULT_OLD_UPLOADS_URL,
    publicBaseUrl: DEFAULT_PUBLIC_BASE_URL,
    report: DEFAULT_REPORT_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--uploads") args.uploads = argv[++i] || "";
    else if (arg === "--microcms-json") args.microcmsJson = argv[++i] || "";
    else if (arg === "--endpoint") args.endpoint = argv[++i] || DEFAULT_ENDPOINT;
    else if (arg === "--old-uploads-url") args.oldUploadsUrl = argv[++i] || DEFAULT_OLD_UPLOADS_URL;
    else if (arg === "--public-base-url") args.publicBaseUrl = argv[++i] || DEFAULT_PUBLIC_BASE_URL;
    else if (arg === "--report") args.report = argv[++i] || DEFAULT_REPORT_PATH;
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE.trim());
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!args.uploads) throw new Error("--uploads is required.");

  args.uploads = path.resolve(args.uploads);
  args.report = path.resolve(PROJECT_ROOT, args.report);
  if (args.microcmsJson) args.microcmsJson = path.resolve(PROJECT_ROOT, args.microcmsJson);
  args.oldUploadsUrl = ensureTrailingSlash(args.oldUploadsUrl);
  args.publicBaseUrl = ensureTrailingSlash(args.publicBaseUrl);
  return args;
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
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

function getBodyHtml(news) {
  for (const field of BODY_FIELDS) {
    if (typeof news[field] === "string" && news[field].trim()) return news[field];
  }
  return "";
}

function normalizeRelativePath(value) {
  return value.split(path.sep).join("/");
}

function getExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.has(getExtension(filePath));
}

function indexUploads(uploadsDir) {
  const entries = [];
  const byYearMonthFile = new Map();

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
      const relativePath = normalizeRelativePath(path.relative(uploadsDir, fullPath));
      const filename = path.basename(fullPath);
      const extension = getExtension(fullPath);
      const key = keyFromRelativePath(relativePath);
      const entry = {
        fullPath,
        relativePath,
        filename,
        extension,
        size: stats.size,
        key,
      };
      entries.push(entry);
      if (!byYearMonthFile.has(key)) byYearMonthFile.set(key, []);
      byYearMonthFile.get(key).push(entry);
    }
  }

  visit(uploadsDir);
  return { entries, byYearMonthFile };
}

function keyFromRelativePath(relativePath) {
  const parts = normalizeRelativePath(relativePath).split("/");
  if (parts.length >= 3 && /^\d{4}$/.test(parts.at(-3)) && /^\d{2}$/.test(parts.at(-2))) {
    return `${parts.at(-3)}/${parts.at(-2)}/${parts.at(-1)}`;
  }
  return parts.at(-1) || "";
}

function oldUploadRelativePath(src, oldUploadsUrl) {
  if (!src.startsWith(oldUploadsUrl)) return "";
  return decodeURIComponent(src.slice(oldUploadsUrl.length).split(/[?#]/)[0]);
}

function extractTargetImages(news, oldUploadsUrl) {
  const html = getBodyHtml(news);
  const images = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const attrs = attrsOf(tag);
    const src = attrs.src || "";
    const relativePath = oldUploadRelativePath(src, oldUploadsUrl);
    if (!relativePath) continue;
    images.push({
      contentId: news.id,
      title: news.title || "",
      date: news.date || "",
      src,
      relativePath,
      key: keyFromRelativePath(relativePath),
      filename: path.basename(relativePath),
      tag,
    });
  }
  return images;
}

function normalizeNewsJson(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.contents)) return json.contents;
  if (Array.isArray(json.news)) return json.news;
  if (Array.isArray(json.allArticleSummaries)) return json.allArticleSummaries;
  throw new Error("Unsupported microCMS JSON format. Expected array or { contents: [...] }.");
}

async function fetchAllMicrocmsContents(endpoint) {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  if (!serviceDomain || !apiKey) {
    throw new Error("MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY are required for Content API GET.");
  }

  const contents = [];
  for (let offset = 0; ; offset += 100) {
    const url = new URL(`https://${serviceDomain}.microcms.io/api/v1/${endpoint}`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set(
      "fields",
      ["id", "title", "date", ...BODY_FIELDS].join(","),
    );
    url.searchParams.set("orders", "-date");

    const res = await fetch(url, {
      method: "GET",
      headers: { "X-MICROCMS-API-KEY": apiKey },
    });
    if (!res.ok) throw new Error(`microCMS GET failed: HTTP ${res.status}`);
    const json = await res.json();
    contents.push(...json.contents);
    if (contents.length >= json.totalCount) return contents;
  }
}

async function loadNews(args) {
  if (!args.microcmsJson) return await fetchAllMicrocmsContents(args.endpoint);

  const json = JSON.parse(fs.readFileSync(args.microcmsJson, "utf8"));
  return normalizeNewsJson(json);
}

function buildPlan(images, uploadsIndex, publicBaseUrl) {
  return images.map((image) => {
    const candidates = uploadsIndex.byYearMonthFile.get(image.key) || [];
    const status =
      candidates.length === 0 ? "missing" : candidates.length === 1 ? "matched" : "duplicate";
    return {
      ...image,
      status,
      candidates,
      newUrl: candidates.length === 1 ? `${publicBaseUrl}${candidates[0].relativePath}` : "",
    };
  });
}

function markdownTable(headers, rows) {
  const escapeCell = (value) =>
    String(value ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\r?\n/g, "<br>");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

function summarize(plan) {
  const matched = plan.filter((item) => item.status === "matched");
  const missing = plan.filter((item) => item.status === "missing");
  const duplicates = plan.filter((item) => item.status === "duplicate");
  const articleIds = new Set(plan.map((item) => item.contentId));
  return {
    totalImages: plan.length,
    articleCount: articleIds.size,
    matchedCount: matched.length,
    missingCount: missing.length,
    duplicateCount: duplicates.length,
    matched,
    missing,
    duplicates,
  };
}

function buildReport({ args, uploadsIndex, newsCount, plan }) {
  const summary = summarize(plan);
  const duplicateRows = summary.duplicates.map((item) => [
    item.contentId,
    item.title,
    item.src,
    item.key,
    item.candidates.map((candidate) => candidate.relativePath).join("<br>"),
  ]);
  const missingRows = summary.missing.map((item) => [
    item.contentId,
    item.title,
    item.src,
    item.key,
  ]);
  const newUrlRows = summary.matched.map((item) => [
    item.contentId,
    item.title,
    item.src,
    item.newUrl,
    item.candidates[0].relativePath,
    item.candidates[0].size,
  ]);

  return `# WordPress本文画像 復旧Dry Runレポート

Generated: ${new Date().toISOString()}

## 前提

- 画像マスター: \`${args.uploads}\`
- microCMS endpoint: \`${args.endpoint}\`
- 旧URL prefix: \`${args.oldUploadsUrl}\`
- 新URL prefix: \`${args.publicBaseUrl}\`
- 実行モード: Dry Run only
- microCMS更新: なし
- FTP転送: なし
- deploy: なし

## 集計

- microCMS記事数: ${newsCount}
- uploads内画像ファイル数: ${uploadsIndex.entries.length}
- 対象本文画像数: ${summary.totalImages}
- 対象画像を含む記事数: ${summary.articleCount}
- 一致数: ${summary.matchedCount}
- 未一致数: ${summary.missingCount}
- 重複候補数: ${summary.duplicateCount}

## 重複候補

${duplicateRows.length ? markdownTable(["Content ID", "Title", "Old URL", "Key", "Candidates"], duplicateRows) : "なし"}

## 未検出一覧

${missingRows.length ? markdownTable(["Content ID", "Title", "Old URL", "Key"], missingRows) : "なし"}

## 新URL一覧

${newUrlRows.length ? markdownTable(["Content ID", "Title", "Old URL", "New URL", "Matched file", "Size"], newUrlRows) : "なし"}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.uploads) || !fs.statSync(args.uploads).isDirectory()) {
    throw new Error(`uploads directory not found: ${args.uploads}`);
  }

  const uploadsIndex = indexUploads(args.uploads);
  const news = await loadNews(args);
  const images = news.flatMap((item) => extractTargetImages(item, args.oldUploadsUrl));
  const plan = buildPlan(images, uploadsIndex, args.publicBaseUrl);
  const report = buildReport({ args, uploadsIndex, newsCount: news.length, plan });

  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(args.report, report);

  const summary = summarize(plan);
  console.log(
    JSON.stringify(
      {
        report: path.relative(PROJECT_ROOT, args.report),
        uploads: args.uploads,
        microcmsArticles: news.length,
        uploadsImages: uploadsIndex.entries.length,
        totalImages: summary.totalImages,
        matched: summary.matchedCount,
        missing: summary.missingCount,
        duplicates: summary.duplicateCount,
        dryRunOnly: true,
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
