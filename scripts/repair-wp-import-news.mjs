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

const DEFAULT_ENDPOINT = "news";
const DEFAULT_FIELDS =
  "id,title,date,category,content,thumbnail,createdAt,updatedAt,publishedAt,revisedAt";

const USAGE = `
Usage:
  node scripts/repair-wp-import-news.mjs --xml ./wordpress.xml --dry-run
  node scripts/repair-wp-import-news.mjs --xml ./wordpress.xml --apply --limit 1
  node scripts/repair-wp-import-news.mjs --xml ./wordpress.xml --apply --limit 10
  node scripts/repair-wp-import-news.mjs --xml ./wordpress.xml --apply --all

Options:
  --xml <path>              WordPress WXR XML file. Required.
  --dry-run                Do not PATCH microCMS. Default.
  --apply                  PATCH existing microCMS contents.
  --limit <number>         Limit update candidates. Use 1 or 10 for tests.
  --all                    Process all update candidates.
  --id <contentId>         Process only one existing microCMS content ID.
  --endpoint <endpoint>    microCMS endpoint. Default: news.
  --report-dir <path>      Output report directory. Default: tmp/wp-import-repair.
  --with-thumbnail         Also send thumbnail field. Default is content only.
  --force-content          Send content even when microCMS already has content.
  --force-thumbnail        Send thumbnail even when microCMS already has thumbnail.
`;

function parseArgs(argv) {
  const args = {
    xml: "",
    dryRun: true,
    apply: false,
    limit: null,
    all: false,
    id: "",
    endpoint: DEFAULT_ENDPOINT,
    reportDir: path.join(PROJECT_ROOT, "tmp", "wp-import-repair"),
    thumbnail: false,
    forceContent: false,
    forceThumbnail: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--xml") args.xml = argv[++i] || "";
    else if (arg === "--dry-run") {
      args.dryRun = true;
      args.apply = false;
    } else if (arg === "--apply") {
      args.apply = true;
      args.dryRun = false;
    } else if (arg === "--limit") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--limit must be a positive integer.");
      }
      args.limit = value;
    } else if (arg === "--all") args.all = true;
    else if (arg === "--id") args.id = argv[++i] || "";
    else if (arg === "--endpoint") args.endpoint = argv[++i] || DEFAULT_ENDPOINT;
    else if (arg === "--report-dir") {
      args.reportDir = path.resolve(PROJECT_ROOT, argv[++i] || "");
    } else if (arg === "--with-thumbnail") args.thumbnail = true;
    else if (arg === "--force-content") args.forceContent = true;
    else if (arg === "--force-thumbnail") args.forceThumbnail = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE.trim());
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!args.xml) throw new Error("--xml is required.");
  if (args.apply && !args.limit && !args.all && !args.id) {
    throw new Error("--apply requires --limit, --all, or --id.");
  }
  if (args.all && args.limit) throw new Error("Use either --all or --limit, not both.");

  args.xml = path.resolve(PROJECT_ROOT, args.xml);
  return args;
}

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&");
}

function textOf(xml, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function textsOf(xml, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "gi");
  const values = [];
  for (const match of xml.matchAll(regex)) values.push(decodeXml(match[1]).trim());
  return values;
}

function attrsOf(openingTag) {
  const attrs = {};
  const regex = /([\w:-]+)=["']([^"']*)["']/g;
  for (const match of openingTag.matchAll(regex)) attrs[match[1]] = decodeXml(match[2]);
  return attrs;
}

function categoriesOf(itemXml) {
  const regex = /<category\b([^>]*)>([\s\S]*?)<\/category>/gi;
  const categories = [];
  for (const match of itemXml.matchAll(regex)) {
    const attrs = attrsOf(match[1]);
    if (attrs.domain && attrs.domain !== "category") continue;
    const value = decodeXml(match[2]).trim();
    if (value && value !== "Uncategorized") categories.push(value);
  }
  return [...new Set(categories)];
}

function postMetaOf(itemXml) {
  const metas = [];
  const regex = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/gi;
  for (const match of itemXml.matchAll(regex)) {
    metas.push({
      key: textOf(match[1], "wp:meta_key"),
      value: textOf(match[1], "wp:meta_value"),
    });
  }
  return metas;
}

function splitItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
}

function parseWxr(xml) {
  const posts = [];
  const attachments = new Map();

  for (const itemXml of splitItems(xml)) {
    const postType = textOf(itemXml, "wp:post_type");
    const status = textOf(itemXml, "wp:status");
    const wpPostId = textOf(itemXml, "wp:post_id");

    if (postType === "attachment") {
      const attachmentUrl = textOf(itemXml, "wp:attachment_url") || textOf(itemXml, "guid");
      if (wpPostId && attachmentUrl) attachments.set(wpPostId, attachmentUrl);
      continue;
    }

    if (postType && postType !== "post") continue;
    if (status && !["publish", "future"].includes(status)) continue;

    const content = textOf(itemXml, "content:encoded");
    const title = textOf(itemXml, "title");
    const postDateGmt = textOf(itemXml, "wp:post_date_gmt");
    const pubDate = textOf(itemXml, "pubDate");
    const metas = postMetaOf(itemXml);
    const thumbnailId = metas.find((meta) => meta.key === "_thumbnail_id")?.value || "";

    posts.push({
      wpPostId,
      title,
      date: toIsoDate(postDateGmt, pubDate),
      content,
      categories: categoriesOf(itemXml),
      thumbnailId,
      imageUrls: extractImageUrls(content),
      rawMetaKeys: metas.map((meta) => meta.key).filter(Boolean),
    });
  }

  for (const post of posts) {
    post.thumbnailUrl = post.thumbnailId ? attachments.get(post.thumbnailId) || "" : "";
    if (!post.thumbnailUrl && post.imageUrls.length > 0) post.thumbnailUrl = post.imageUrls[0];
  }

  return { posts, attachments };
}

function toIsoDate(postDateGmt, pubDate) {
  if (postDateGmt && postDateGmt !== "0000-00-00 00:00:00") {
    const normalized = postDateGmt.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  if (pubDate) {
    const date = new Date(pubDate);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return "";
}

function extractImageUrls(html) {
  const urls = [];
  const regex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(regex)) urls.push(decodeXml(match[1]));
  return [...new Set(urls)];
}

function normalizeTitle(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function dateKey(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function matchKey(title, date) {
  return `${normalizeTitle(title)}::${dateKey(date)}`;
}

function hasContent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasThumbnail(value) {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") return typeof value.url === "string" && value.url.length > 0;
  return false;
}

async function fetchAllMicrocmsContents({ serviceDomain, apiKey, endpoint }) {
  const contents = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const url = new URL(`https://${serviceDomain}.microcms.io/api/v1/${endpoint}`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("fields", DEFAULT_FIELDS);
    url.searchParams.set("orders", "-date");
    const response = await fetch(url, {
      headers: { "X-MICROCMS-API-KEY": apiKey },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Failed to fetch microCMS contents: ${response.status} ${body}`);
    }
    const data = JSON.parse(body);
    contents.push(...(data.contents || []));
    if (contents.length >= data.totalCount || (data.contents || []).length === 0) break;
  }
  return contents;
}

function buildPlan({ microcmsContents, wxrPosts, args }) {
  const wxrByKey = new Map();
  const duplicateKeys = new Set();

  for (const post of wxrPosts) {
    const key = matchKey(post.title, post.date);
    if (!key || key === "::") continue;
    if (wxrByKey.has(key)) duplicateKeys.add(key);
    else wxrByKey.set(key, post);
  }

  const rows = [];
  for (const item of microcmsContents) {
    if (args.id && item.id !== args.id) continue;
    const key = matchKey(item.title, item.date);
    const post = wxrByKey.get(key);
    const currentHasContent = hasContent(item.content);
    const currentHasThumbnail = hasThumbnail(item.thumbnail);
    const patch = {};
    const reasons = [];

    if (!post) {
      rows.push({
        id: item.id,
        title: item.title,
        date: item.date,
        action: "skip",
        reason: "xml_match_not_found",
        currentHasContent,
        currentHasThumbnail,
      });
      continue;
    }

    if (duplicateKeys.has(key)) reasons.push("duplicate_xml_match_key");
    if (post.content && (!currentHasContent || args.forceContent)) patch.content = post.content;
    if (args.thumbnail && post.thumbnailUrl && (!currentHasThumbnail || args.forceThumbnail)) {
      patch.thumbnail = post.thumbnailUrl;
    }

    if (Object.keys(patch).length === 0) {
      rows.push({
        id: item.id,
        wpPostId: post.wpPostId,
        title: item.title,
        date: item.date,
        action: "skip",
        reason: "nothing_to_update",
        currentHasContent,
        currentHasThumbnail,
        xmlContentLength: post.content.length,
        xmlThumbnailUrl: post.thumbnailUrl || "",
        xmlImageCount: post.imageUrls.length,
      });
      continue;
    }

    rows.push({
      id: item.id,
      wpPostId: post.wpPostId,
      title: item.title,
      date: item.date,
      action: "update",
      reason: reasons.join(",") || "matched_by_title_and_date",
      currentHasContent,
      currentHasThumbnail,
      patchFields: Object.keys(patch),
      patch,
      xmlContentLength: post.content.length,
      xmlThumbnailUrl: post.thumbnailUrl || "",
      xmlImageCount: post.imageUrls.length,
      xmlMetaKeys: [...new Set(post.rawMetaKeys)].join("|"),
    });
  }

  const updates = rows.filter((row) => row.action === "update");
  const selectedUpdates = args.id
    ? updates
    : args.all
      ? updates
      : updates.slice(0, args.limit || updates.length);

  const selectedIds = new Set(selectedUpdates.map((row) => row.id));
  return rows.map((row) => ({ ...row, selected: selectedIds.has(row.id) }));
}

async function patchContent({ serviceDomain, apiKey, endpoint, row }) {
  const response = await fetch(`https://${serviceDomain}.microcms.io/api/v1/${endpoint}/${row.id}`, {
    method: "PATCH",
    headers: {
      "X-MICROCMS-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(row.patch),
  });
  const body = await response.text();
  return {
    id: row.id,
    ok: response.ok,
    status: response.status,
    body,
  };
}

function writeReports({ reportDir, plan, results, args }) {
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(reportDir, `plan-${stamp}.json`);
  const csvPath = path.join(reportDir, `plan-${stamp}.csv`);
  const selectedPath = path.join(reportDir, `selected-diff-${stamp}.json`);
  const resultPath = path.join(reportDir, `results-${stamp}.json`);

  const publicRows = plan.map(({ patch, ...row }) => ({
    ...row,
    patchContentLength: patch?.content?.length || 0,
    patchThumbnail: patch?.thumbnail || "",
  }));
  const selectedRows = plan
    .filter((row) => row.selected)
    .map((row) => ({
      id: row.id,
      wpPostId: row.wpPostId,
      title: row.title,
      date: row.date,
      reason: row.reason,
      patchFields: row.patchFields || [],
      before: {
        hasContent: row.currentHasContent,
        hasThumbnail: row.currentHasThumbnail,
      },
      after: {
        hasContent: Boolean(row.patch?.content) || row.currentHasContent,
        contentLength: row.patch?.content?.length || row.xmlContentLength || 0,
        contentHead200: (row.patch?.content || "").slice(0, 200),
      },
      diff: {
        contentChanged: Boolean(row.patch?.content),
        thumbnailChanged: Boolean(row.patch?.thumbnail),
      },
      patch: row.patch || {},
    }));

  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), args: safeArgs(args), rows: publicRows }, null, 2),
    "utf8",
  );

  fs.writeFileSync(csvPath, toCsv(publicRows), "utf8");
  fs.writeFileSync(
    selectedPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), args: safeArgs(args), rows: selectedRows }, null, 2),
    "utf8",
  );
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), "utf8");
  return { jsonPath, csvPath, selectedPath, resultPath };
}

function safeArgs(args) {
  return {
    xml: args.xml,
    dryRun: args.dryRun,
    apply: args.apply,
    limit: args.limit,
    all: args.all,
    id: args.id,
    endpoint: args.endpoint,
    thumbnail: args.thumbnail,
    forceContent: args.forceContent,
    forceThumbnail: args.forceThumbnail,
  };
}

function toCsv(rows) {
  const headers = [
    "selected",
    "action",
    "id",
    "wpPostId",
    "title",
    "date",
    "reason",
    "currentHasContent",
    "currentHasThumbnail",
    "patchFields",
    "patchContentLength",
    "patchThumbnail",
    "xmlContentLength",
    "xmlThumbnailUrl",
    "xmlImageCount",
  ];
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = Array.isArray(row[header]) ? row[header].join("|") : row[header] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");
}

function printSummary({ plan, results, args, reports }) {
  const total = plan.length;
  const matched = plan.filter((row) => row.wpPostId).length;
  const updateCandidates = plan.filter((row) => row.action === "update").length;
  const selected = plan.filter((row) => row.selected).length;
  const missingMatch = plan.filter((row) => row.reason === "xml_match_not_found").length;

  console.log("");
  console.log("WordPress import repair plan");
  console.log(`mode: ${args.dryRun ? "dry-run" : "apply"}`);
  console.log(`endpoint: ${args.endpoint}`);
  console.log(`microCMS contents checked: ${total}`);
  console.log(`matched XML posts: ${matched}`);
  console.log(`update candidates: ${updateCandidates}`);
  console.log(`selected this run: ${selected}`);
  console.log(`missing XML match: ${missingMatch}`);
  if (results.length > 0) {
    console.log(`PATCH results: ok=${results.filter((r) => r.ok).length}, failed=${results.filter((r) => !r.ok).length}`);
  }
  console.log(`report json: ${path.relative(PROJECT_ROOT, reports.jsonPath)}`);
  console.log(`report csv: ${path.relative(PROJECT_ROOT, reports.csvPath)}`);
  console.log(`selected diff json: ${path.relative(PROJECT_ROOT, reports.selectedPath)}`);
  console.log(`result json: ${path.relative(PROJECT_ROOT, reports.resultPath)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    throw new Error("MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY are required.");
  }
  if (!fs.existsSync(args.xml)) throw new Error(`XML file not found: ${args.xml}`);

  const xml = fs.readFileSync(args.xml, "utf8");
  const { posts, attachments } = parseWxr(xml);
  const microcmsContents = await fetchAllMicrocmsContents({
    serviceDomain,
    apiKey,
    endpoint: args.endpoint,
  });
  const plan = buildPlan({ microcmsContents, wxrPosts: posts, args });
  const selectedRows = plan.filter((row) => row.selected);
  const results = [];

  if (!args.dryRun) {
    for (const row of selectedRows) {
      results.push(await patchContent({ serviceDomain, apiKey, endpoint: args.endpoint, row }));
    }
  }

  const reports = writeReports({
    reportDir: args.reportDir,
    plan,
    results: {
      generatedAt: new Date().toISOString(),
      mode: args.dryRun ? "dry-run" : "apply",
      parsedXmlPosts: posts.length,
      parsedAttachments: attachments.size,
      results,
    },
    args,
  });

  printSummary({ plan, results, args, reports });
}

main().catch((error) => {
  console.error(error.message);
  console.error(USAGE.trim());
  process.exit(1);
});
