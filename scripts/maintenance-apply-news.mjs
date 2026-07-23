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
const SNAPSHOT_PATH = path.join(PROJECT_ROOT, "data", "microcms-news-snapshot.json");

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
  throw new Error("Unsupported microCMS response format.");
}

async function fetchNews() {
  const fileEnv = readEnvFile(path.join(PROJECT_ROOT, ".env"));
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN || fileEnv.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY || fileEnv.MICROCMS_API_KEY;

  if (!serviceDomain) throw new Error("MICROCMS_SERVICE_DOMAIN is not set.");
  if (!apiKey) throw new Error("MICROCMS_API_KEY is not set.");

  const all = [];
  for (let offset = 0; ; offset += 100) {
    const url = new URL(`https://${serviceDomain}.microcms.io/api/v1/${DEFAULT_ENDPOINT}`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("fields", DEFAULT_FIELDS);
    url.searchParams.set("orders", "-date");

    const response = await fetch(url, {
      headers: { "X-MICROCMS-API-KEY": apiKey },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`microCMS GET failed: HTTP ${response.status}`);

    const json = JSON.parse(body);
    all.push(...normalizeContents(json));
    if (all.length >= (json.totalCount || all.length)) break;
  }
  return all;
}

async function main() {
  const news = (await fetchNews())
    .map((post) => ({
      id: post.id,
      title: post.title,
      date: post.date,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
      revisedAt: post.revisedAt,
      category: Array.isArray(post.category) ? post.category : [],
    }))
    .sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(
    SNAPSHOT_PATH,
    `${JSON.stringify(
      {
        snapshotCreatedAt: new Date().toISOString(),
        endpoint: DEFAULT_ENDPOINT,
        fields: DEFAULT_FIELDS,
        totalCount: news.length,
        contents: news,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`maintenance news snapshot saved: ${path.relative(PROJECT_ROOT, SNAPSHOT_PATH)}`);
  console.log(`currentCount: ${news.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
