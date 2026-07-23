#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const DEFAULT_ENDPOINT = "news";
const DEFAULT_FIELDS = "id,title,date,category,createdAt,updatedAt,publishedAt,revisedAt";
const DEFAULT_SNAPSHOT = path.join(PROJECT_ROOT, "data", "microcms-news-snapshot.json");
const COMPARED_FIELDS = [
  "title",
  "date",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "revisedAt",
  "category",
];

function parseArgs(argv) {
  const args = {
    endpoint: DEFAULT_ENDPOINT,
    fields: DEFAULT_FIELDS,
    snapshot: DEFAULT_SNAPSHOT,
    fixture: "",
    json: false,
    failForTest: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--endpoint") args.endpoint = argv[++i] || DEFAULT_ENDPOINT;
    else if (arg === "--fields") args.fields = argv[++i] || DEFAULT_FIELDS;
    else if (arg === "--snapshot") args.snapshot = path.resolve(PROJECT_ROOT, argv[++i] || "");
    else if (arg === "--fixture") args.fixture = path.resolve(PROJECT_ROOT, argv[++i] || "");
    else if (arg === "--json") args.json = true;
    else if (arg === "--fail-for-test") args.failForTest = true;
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
  node scripts/maintenance-check-news.mjs

Options:
  --endpoint <endpoint>  microCMS endpoint. Default: news
  --fields <fields>      microCMS fields for GET.
  --snapshot <path>      Read-only comparison snapshot. Default: data/microcms-news-snapshot.json
  --fixture <path>       Read current news JSON from a local fixture instead of microCMS.
  --json                 Print JSON only.
`.trim());
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeContents(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.contents)) return json.contents;
  if (Array.isArray(json.news)) return json.news;
  throw new Error("Unsupported news JSON format.");
}

async function fetchMicrocmsNews(args) {
  const fileEnv = readEnvFile(path.join(PROJECT_ROOT, ".env"));
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN || fileEnv.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY || fileEnv.MICROCMS_API_KEY;

  if (!serviceDomain) throw new Error("MICROCMS_SERVICE_DOMAIN is not set.");
  if (!apiKey) throw new Error("MICROCMS_API_KEY is not set.");

  const all = [];
  for (let offset = 0; ; offset += 100) {
    const url = new URL(`https://${serviceDomain}.microcms.io/api/v1/${args.endpoint}`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("fields", args.fields);
    url.searchParams.set("orders", "-date");

    const response = await fetch(url, {
      headers: { "X-MICROCMS-API-KEY": apiKey },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`microCMS GET failed: HTTP ${response.status}`);
    }

    const json = JSON.parse(body);
    all.push(...normalizeContents(json));
    if (all.length >= (json.totalCount || all.length)) break;
  }

  return all;
}

async function loadCurrentNews(args) {
  if (args.fixture) {
    return normalizeContents(JSON.parse(fs.readFileSync(args.fixture, "utf8")));
  }
  return fetchMicrocmsNews(args);
}

function loadSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) return { exists: false, contents: [] };
  const json = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  return { exists: true, contents: normalizeContents(json) };
}

function categoriesOf(post) {
  return Array.isArray(post.category) ? post.category.map(String).sort() : [];
}

function comparableValue(post, field) {
  if (field === "category") return categoriesOf(post);
  return post[field] || "";
}

function changedFieldsOf(before, after) {
  return COMPARED_FIELDS.filter(
    (field) => JSON.stringify(comparableValue(before, field)) !== JSON.stringify(comparableValue(after, field)),
  );
}

function categoryCounts(posts) {
  const counts = {};
  for (const post of posts) {
    for (const category of categoriesOf(post)) {
      counts[category] = (counts[category] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, "ja")));
}

function categoryCountChanges(previous, current) {
  const previousCounts = categoryCounts(previous);
  const currentCounts = categoryCounts(current);
  const names = [...new Set([...Object.keys(previousCounts), ...Object.keys(currentCounts)])].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
  return names
    .map((category) => ({
      category,
      before: previousCounts[category] || 0,
      after: currentCounts[category] || 0,
    }))
    .filter((item) => item.before !== item.after);
}

function compareNews(previous, current) {
  const previousById = new Map(previous.map((post) => [post.id, post]));
  const currentById = new Map(current.map((post) => [post.id, post]));

  const newItems = current.filter((post) => !previousById.has(post.id));
  const missingItems = previous.filter((post) => !currentById.has(post.id));
  const updatedItems = [];
  const categoryChangedItems = [];

  for (const post of current) {
    const old = previousById.get(post.id);
    if (!old) continue;
    const changedFields = changedFieldsOf(old, post);
    if (changedFields.length > 0) updatedItems.push({ ...post, changedFields });
    if (JSON.stringify(categoriesOf(old)) !== JSON.stringify(categoriesOf(post))) {
      categoryChangedItems.push({ ...post, changedFields: ["category"] });
    }
  }

  return {
    newItems,
    updatedItems,
    missingItems,
    categoryChangedItems,
    categoryCountChanges: categoryCountChanges(previous, current),
    previousCategoryCounts: categoryCounts(previous),
    currentCategoryCounts: categoryCounts(current),
  };
}

function compactItems(items) {
  return items.slice(0, 20).map((post) => ({
    id: post.id,
    title: post.title || "",
    date: post.date || "",
    category: categoriesOf(post),
    changedFields: Array.isArray(post.changedFields) ? post.changedFields : undefined,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.failForTest) {
    throw new Error("Intentional maintenance check failure for test.");
  }

  const current = await loadCurrentNews(args);
  const snapshot = loadSnapshot(args.snapshot);
  const diff = compareNews(snapshot.contents, current);
  const result = snapshot.exists ? "success" : "success_no_snapshot";

  const summary = {
    result,
    snapshotPath: path.relative(PROJECT_ROOT, args.snapshot),
    snapshotExists: snapshot.exists,
    previousCount: snapshot.exists ? snapshot.contents.length : null,
    currentCount: current.length,
    newCount: snapshot.exists ? diff.newItems.length : 0,
    updatedCount: snapshot.exists ? diff.updatedItems.length : 0,
    missingCount: snapshot.exists ? diff.missingItems.length : 0,
    categoryChangedCount: snapshot.exists ? diff.categoryChangedItems.length : 0,
    previousCategoryCounts: snapshot.exists ? diff.previousCategoryCounts : {},
    currentCategoryCounts: snapshot.exists ? diff.currentCategoryCounts : categoryCounts(current),
    categoryCountChanges: snapshot.exists ? diff.categoryCountChanges : [],
    newItems: snapshot.exists ? compactItems(diff.newItems) : [],
    updatedItems: snapshot.exists ? compactItems(diff.updatedItems) : [],
    missingItems: snapshot.exists ? compactItems(diff.missingItems) : [],
    categoryChangedItems: snapshot.exists ? compactItems(diff.categoryChangedItems) : [],
    note: snapshot.exists
      ? ""
      : "Comparison snapshot was not found. Current count was checked, but post diffs were not calculated.",
  };

  if (args.json) {
    console.log(JSON.stringify(summary));
    return;
  }

  console.log("microCMS news maintenance check");
  console.log(`result: ${summary.result}`);
  console.log(`snapshot: ${summary.snapshotPath}`);
  console.log(`previousCount: ${summary.previousCount ?? "未確認"}`);
  console.log(`currentCount: ${summary.currentCount}`);
  console.log(`newCount: ${summary.newCount}`);
  console.log(`updatedCount: ${summary.updatedCount}`);
  console.log(`missingCount: ${summary.missingCount}`);
  console.log(`categoryChangedCount: ${summary.categoryChangedCount}`);
  if (summary.categoryCountChanges.length > 0) {
    console.log(`categoryCountChanges: ${JSON.stringify(summary.categoryCountChanges)}`);
  }
  if (summary.note) console.log(`note: ${summary.note}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
