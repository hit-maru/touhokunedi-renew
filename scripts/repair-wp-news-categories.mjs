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
const DEFAULT_XML_CANDIDATES = [
  "/Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml",
  path.join(PROJECT_ROOT, "WordPress.2026-05-29.xml"),
  path.join(PROJECT_ROOT, "tmp", "WordPress.2026-05-29.xml"),
];
const RESULT_PATH = path.join(PROJECT_ROOT, "tmp", "wp-import-repair", "wp-news-category-repair-results.json");
const REPORT_PATH = path.join(PROJECT_ROOT, "reports", "wp-news-category-repair-report.md");
const MICROCMS_FIELDS = "id,title,date,category,createdAt,updatedAt,publishedAt,revisedAt";
const CANONICAL_CATEGORIES = ["製品情報", "展示会", "イベント", "ニュース"];

const CATEGORY_MAP = new Map([
  ["お知らせ\tnews", "ニュース"],
]);

const USAGE = `
Usage:
  node scripts/repair-wp-news-categories.mjs --dry-run
  node scripts/repair-wp-news-categories.mjs --xml /path/to/WordPress.xml --dry-run

Options:
  --xml <path>              WordPress WXR XML file. Optional; auto-detected when omitted.
  --dry-run                Required. Do not PATCH microCMS.
  --endpoint <endpoint>    microCMS endpoint. Default: news.
  --report <path>          Markdown report path. Default: reports/wp-news-category-repair-report.md
  --result <path>          JSON result path. Default: tmp/wp-import-repair/wp-news-category-repair-results.json
`;

function parseArgs(argv) {
  const args = {
    xml: "",
    dryRun: false,
    endpoint: DEFAULT_ENDPOINT,
    reportPath: REPORT_PATH,
    resultPath: RESULT_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--xml") args.xml = argv[++i] || "";
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--endpoint") args.endpoint = argv[++i] || DEFAULT_ENDPOINT;
    else if (arg === "--report") args.reportPath = path.resolve(PROJECT_ROOT, argv[++i] || "");
    else if (arg === "--result") args.resultPath = path.resolve(PROJECT_ROOT, argv[++i] || "");
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE.trim());
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!args.dryRun) {
    throw new Error("This script is dry-run only. Pass --dry-run; PATCH is intentionally not implemented.");
  }

  args.xml = args.xml ? path.resolve(PROJECT_ROOT, args.xml) : findXmlPath();
  if (!args.xml) {
    throw new Error(
      [
        "WordPress XML file was not found.",
        "Checked:",
        ...DEFAULT_XML_CANDIDATES.map((candidate) => `- ${candidate}`),
        "- workspace XML/WXR files via rg/find",
        "- /tmp and /private/tmp XML/WXR files via find",
      ].join("\n"),
    );
  }

  return args;
}

function findXmlPath() {
  for (const candidate of DEFAULT_XML_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const found = [];
  for (const root of [PROJECT_ROOT, "/tmp", "/private/tmp"]) {
    collectXmlFiles(root, found, 5);
  }
  return found.find((file) => /wordpress/i.test(path.basename(file))) || "";
}

function collectXmlFiles(root, found, maxDepth, depth = 0) {
  if (depth > maxDepth || found.length > 50) return;
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      collectXmlFiles(fullPath, found, maxDepth, depth + 1);
    } else if (/\.(xml|wxr)$/i.test(entry.name)) {
      found.push(fullPath);
    }
  }
}

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&");
}

function textOf(xml, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function attrsOf(openingTag) {
  const attrs = {};
  const regex = /([\w:-]+)=["']([^"']*)["']/g;
  for (const match of openingTag.matchAll(regex)) attrs[match[1]] = decodeXml(match[2]);
  return attrs;
}

function splitItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
}

function categoriesOf(itemXml) {
  const regex = /<category\b([^>]*)>([\s\S]*?)<\/category>/gi;
  const categories = [];
  for (const match of itemXml.matchAll(regex)) {
    const attrs = attrsOf(match[1]);
    if (attrs.domain && attrs.domain !== "category") continue;
    const name = decodeXml(match[2]).trim();
    if (!name || name === "Uncategorized") continue;
    categories.push({
      name,
      nicename: attrs.nicename || "",
      domain: attrs.domain || "",
    });
  }
  return uniqueCategories(categories);
}

function uniqueCategories(categories) {
  const seen = new Set();
  return categories.filter((category) => {
    const key = `${category.name}\t${category.nicename}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseWxr(xml) {
  const posts = [];
  const excluded = { attachment: 0, page: 0, other: 0, status: 0 };

  for (const itemXml of splitItems(xml)) {
    const postType = textOf(itemXml, "wp:post_type");
    const status = textOf(itemXml, "wp:status");

    if (postType === "attachment") {
      excluded.attachment += 1;
      continue;
    }
    if (postType === "page") {
      excluded.page += 1;
      continue;
    }
    if (postType && postType !== "post") {
      excluded.other += 1;
      continue;
    }
    if (status && !["publish", "future"].includes(status)) {
      excluded.status += 1;
      continue;
    }

    const pubDate = textOf(itemXml, "pubDate");
    const postDateGmt = textOf(itemXml, "wp:post_date_gmt");
    const categories = categoriesOf(itemXml);
    posts.push({
      wpPostId: textOf(itemXml, "wp:post_id"),
      title: textOf(itemXml, "title"),
      date: toIsoDate(postDateGmt, pubDate),
      slug: textOf(itemXml, "wp:post_name"),
      categories,
      categoryNames: categories.map((category) => category.name),
      categoryNicenames: categories.map((category) => category.nicename),
      postType,
      status,
    });
  }

  return { posts, excluded };
}

function toIsoDate(postDateGmt, pubDate) {
  if (postDateGmt && postDateGmt !== "0000-00-00 00:00:00") {
    const date = new Date(`${postDateGmt.replace(" ", "T")}Z`);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (pubDate) {
    const date = new Date(pubDate);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return "";
}

function normalizeTitle(value = "") {
  return decodeXml(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function dateKey(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function titleDateKey(title, date) {
  return `${normalizeTitle(title)}::${dateKey(date)}`;
}

function slugKey(value = "") {
  return String(value || "").trim();
}

function currentCategoryValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("|");
  return value || "";
}

function normalizeWpCategory(categories) {
  if (categories.length === 0) {
    return {
      normalized: "",
      status: "unconfirmed",
      reason: "wordpress_category_missing",
    };
  }
  if (categories.length > 1) {
    return {
      normalized: "",
      status: "needs_review",
      reason: "multiple_wordpress_categories",
    };
  }

  const category = categories[0];
  const mapped = CATEGORY_MAP.get(`${category.name}\t${category.nicename}`);
  if (!mapped) {
    return {
      normalized: "",
      status: "unconfirmed",
      reason: "category_mapping_not_defined",
    };
  }
  return {
    normalized: mapped,
    status: "mapped",
    reason: "",
  };
}

function countBy(rows, getKey) {
  const counts = Object.fromEntries(CANONICAL_CATEGORIES.map((category) => [category, 0]));
  for (const row of rows) {
    const key = getKey(row);
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

function countWpCategories(posts) {
  const counts = new Map();
  for (const post of posts) {
    for (const category of post.categories) {
      const key = `${category.name}\t${category.nicename}`;
      const current = counts.get(key) || { name: category.name, nicename: category.nicename, count: 0 };
      current.count += 1;
      counts.set(key, current);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function findLatestExistingPlan() {
  const dir = path.join(PROJECT_ROOT, "tmp", "wp-import-repair");
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return "";
  }
  return entries
    .filter((entry) => entry.isFile() && /^plan-.*\.json$/.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || "";
}

function loadExistingCorrespondence() {
  const planPath = findLatestExistingPlan();
  if (!planPath) return { planPath: "", byMicrocmsId: new Map(), duplicateWpPostIds: new Set() };

  const data = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const byMicrocmsId = new Map();
  const wpPostIdCounts = new Map();
  for (const row of data.rows || []) {
    if (!row.id || !row.wpPostId) continue;
    byMicrocmsId.set(row.id, {
      microcmsId: row.id,
      wpPostId: String(row.wpPostId),
      title: row.title || "",
      date: row.date || "",
      source: path.relative(PROJECT_ROOT, planPath),
    });
    wpPostIdCounts.set(String(row.wpPostId), (wpPostIdCounts.get(String(row.wpPostId)) || 0) + 1);
  }
  const duplicateWpPostIds = new Set(
    [...wpPostIdCounts.entries()].filter(([, count]) => count > 1).map(([wpPostId]) => wpPostId),
  );
  return { planPath, byMicrocmsId, duplicateWpPostIds };
}

function buildIndexes(posts) {
  const byWpPostId = new Map();
  const byTitleDate = new Map();
  const duplicateTitleDateKeys = new Set();
  const bySlug = new Map();
  const duplicateSlugKeys = new Set();

  for (const post of posts) {
    if (post.wpPostId) byWpPostId.set(post.wpPostId, post);

    const key = titleDateKey(post.title, post.date);
    if (key !== "::") {
      if (byTitleDate.has(key)) duplicateTitleDateKeys.add(key);
      else byTitleDate.set(key, post);
    }

    const slug = slugKey(post.slug);
    if (slug) {
      if (bySlug.has(slug)) duplicateSlugKeys.add(slug);
      else bySlug.set(slug, post);
    }
  }

  return { byWpPostId, byTitleDate, duplicateTitleDateKeys, bySlug, duplicateSlugKeys };
}

function matchPost(item, indexes, correspondence) {
  const existing = correspondence.byMicrocmsId.get(item.id);
  if (existing) {
    const post = indexes.byWpPostId.get(existing.wpPostId);
    if (post) {
      const titleDateMatches = titleDateKey(item.title, item.date) === titleDateKey(post.title, post.date);
      return {
        post,
        method: titleDateMatches ? "existing_correspondence_title_date_verified" : "existing_correspondence_wp_post_id",
        confidence: titleDateMatches ? "high" : "medium",
        duplicate: correspondence.duplicateWpPostIds.has(existing.wpPostId),
        reason: titleDateMatches ? "" : "existing_correspondence_title_or_date_mismatch",
      };
    }
  }

  const titleDate = titleDateKey(item.title, item.date);
  if (indexes.duplicateTitleDateKeys.has(titleDate)) {
    return {
      post: null,
      method: "title_date",
      confidence: "low",
      duplicate: true,
      reason: "duplicate_wordpress_title_date_candidates",
    };
  }
  const post = indexes.byTitleDate.get(titleDate);
  if (post) {
    return {
      post,
      method: "normalized_title_and_date",
      confidence: "high",
      duplicate: false,
      reason: "",
    };
  }

  return {
    post: null,
    method: "none",
    confidence: "none",
    duplicate: false,
    reason: "wordpress_match_not_found",
  };
}

async function fetchAllMicrocmsContents({ serviceDomain, apiKey, endpoint }) {
  const contents = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const url = new URL(`https://${serviceDomain}.microcms.io/api/v1/${endpoint}`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("fields", MICROCMS_FIELDS);
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

function buildDryRun({ microcmsContents, wxrPosts, correspondence }) {
  const indexes = buildIndexes(wxrPosts);
  const rows = [];
  const duplicateCandidateRows = [];

  for (const item of microcmsContents) {
    const match = matchPost(item, indexes, correspondence);
    const post = match.post;
    const wpCategory = post ? normalizeWpCategory(post.categories) : { normalized: "", status: "", reason: "" };
    const before = currentCategoryValue(item.category);
    const after = wpCategory.normalized || before;
    const reviewReasons = [];

    if (!post) reviewReasons.push(match.reason);
    if (match.reason && post) reviewReasons.push(match.reason);
    if (match.duplicate) reviewReasons.push("duplicate_match_candidate");
    if (wpCategory.reason) reviewReasons.push(wpCategory.reason);
    if (wpCategory.normalized && !CANONICAL_CATEGORIES.includes(wpCategory.normalized)) {
      reviewReasons.push("normalized_category_out_of_scope");
    }

    const patchTarget =
      Boolean(post) &&
      match.confidence === "high" &&
      wpCategory.status === "mapped" &&
      before !== wpCategory.normalized &&
      reviewReasons.length === 0;

    const row = {
      microcmsContentId: item.id,
      title: item.title,
      date: item.date,
      microcmsCurrentCategory: before,
      before,
      after,
      wpPostId: post?.wpPostId || "",
      wpTitle: post?.title || "",
      wpDate: post?.date || "",
      wpSlug: post?.slug || "",
      wpPostType: post?.postType || "",
      wpStatus: post?.status || "",
      wpOriginalCategories: post?.categories || [],
      wpOriginalCategoryNames: post?.categoryNames || [],
      wpOriginalCategoryNicenames: post?.categoryNicenames || [],
      normalizedCategory: wpCategory.normalized,
      matchMethod: match.method,
      confidence: match.confidence,
      patchTarget,
      reviewRequired: reviewReasons.length > 0,
      reviewReasons,
    };

    rows.push(row);
    if (match.duplicate) duplicateCandidateRows.push(row);
  }

  return { rows, duplicateCandidateRows };
}

function summarize({ microcmsContents, wxrPosts, rows }) {
  const matched = rows.filter((row) => row.wpPostId).length;
  const unmatched = rows.filter((row) => !row.wpPostId).length;
  const duplicateCandidates = rows.filter((row) => row.reviewReasons.includes("duplicate_match_candidate")).length;
  const needsReview = rows.filter((row) => row.reviewRequired).length;
  const patchTargets = rows.filter((row) => row.patchTarget).length;
  const unchanged = rows.filter((row) => row.wpPostId && !row.patchTarget && row.before === row.after).length;

  return {
    microcmsCount: microcmsContents.length,
    wordpressTargetCount: wxrPosts.length,
    matchedCount: matched,
    unmatchedCount: unmatched,
    duplicateCandidateCount: duplicateCandidates,
    needsReviewCount: needsReview,
    patchTargetCount: patchTargets,
    unchangedCount: unchanged,
    currentCategoryCounts: countBy(rows, (row) => row.before),
    plannedCategoryCounts: countBy(rows, (row) => row.after),
  };
}

function table(headers, rows) {
  if (rows.length === 0) return "_なし_\n";
  return [
    `| ${headers.join(" |")} |`,
    `| ${headers.map(() => "---").join(" |")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeMd(row[header] ?? "")).join(" |")} |`),
  ].join("\n") + "\n";
}

function escapeMd(value) {
  return String(value)
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function categoryLabel(categories) {
  return categories.map((category) => `${category.name} (${category.nicename})`).join("<br>");
}

function writeJson({ args, xmlPath, correspondence, wxr, microcmsContents, rows, summary, wpCategoryCounts }) {
  fs.mkdirSync(path.dirname(args.resultPath), { recursive: true });
  fs.writeFileSync(
    args.resultPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "dry-run",
        safety: {
          patchedMicrocms: false,
          changedFields: [],
          patchImplemented: false,
        },
        inputs: {
          xmlPath,
          endpoint: args.endpoint,
          existingCorrespondencePath: correspondence.planPath
            ? path.relative(PROJECT_ROOT, correspondence.planPath)
            : "",
        },
        wordpress: {
          targetPosts: wxr.posts,
          excluded: wxr.excluded,
          categoryCounts: wpCategoryCounts,
        },
        microcms: {
          count: microcmsContents.length,
          contents: microcmsContents.map((item) => ({
            id: item.id,
            title: item.title,
            date: item.date,
            category: item.category || [],
          })),
        },
        categoryMapping: [...CATEGORY_MAP.entries()].map(([source, target]) => {
          const [name, nicename] = source.split("\t");
          return { wordpressCategoryName: name, wordpressNicename: nicename, normalizedCategory: target };
        }),
        summary,
        rows,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function writeReport({ args, xmlPath, correspondence, rows, summary, wpCategoryCounts }) {
  fs.mkdirSync(path.dirname(args.reportPath), { recursive: true });

  const diffRows = rows.map((row) => ({
    ID: row.microcmsContentId,
    タイトル: row.title,
    公開日: dateKey(row.date),
    "WP元カテゴリ": categoryLabel(row.wpOriginalCategories),
    正規化後: row.normalizedCategory,
    現在値: row.microcmsCurrentCategory,
    変更前: row.before,
    変更後: row.after,
    照合方法: row.matchMethod,
    確信度: row.confidence,
    PATCH対象: row.patchTarget ? "yes" : "no",
    要確認理由: row.reviewReasons.join(", "),
  }));
  const unmatchedRows = rows
    .filter((row) => !row.wpPostId)
    .map((row) => ({
      ID: row.microcmsContentId,
      タイトル: row.title,
      公開日: dateKey(row.date),
      理由: row.reviewReasons.join(", "),
    }));
  const duplicateRows = rows
    .filter((row) => row.reviewReasons.includes("duplicate_match_candidate"))
    .map((row) => ({
      ID: row.microcmsContentId,
      タイトル: row.title,
      公開日: dateKey(row.date),
      照合方法: row.matchMethod,
      理由: row.reviewReasons.join(", "),
    }));
  const multiCategoryRows = rows
    .filter((row) => row.reviewReasons.includes("multiple_wordpress_categories"))
    .map((row) => ({
      ID: row.microcmsContentId,
      タイトル: row.title,
      "WP元カテゴリ": categoryLabel(row.wpOriginalCategories),
    }));
  const unconfirmedCategoryRows = rows
    .filter((row) => row.reviewReasons.includes("category_mapping_not_defined") || row.reviewReasons.includes("wordpress_category_missing"))
    .map((row) => ({
      ID: row.microcmsContentId,
      タイトル: row.title,
      "WP元カテゴリ": categoryLabel(row.wpOriginalCategories),
      理由: row.reviewReasons.join(", "),
    }));

  const categoryCountRows = wpCategoryCounts.map((item) => ({
    カテゴリ名: item.name,
    slug: item.nicename,
    件数: item.count,
  }));
  const mappingRows = [...CATEGORY_MAP.entries()].map(([source, target]) => {
    const [name, nicename] = source.split("\t");
    return { "WPカテゴリ名": name, slug: nicename, 正規化後: target, 根拠: "WXR実データで唯一の投稿カテゴリ" };
  });
  const countRows = CANONICAL_CATEGORIES.map((category) => ({
    カテゴリ: category,
    復旧前: summary.currentCategoryCounts[category],
    復旧後予定: summary.plannedCategoryCounts[category],
  }));

  const shouldStopPatch =
    summary.patchTargetCount === 0 ||
    (summary.plannedCategoryCounts["製品情報"] === 0 &&
      summary.plannedCategoryCounts["展示会"] === 0 &&
      summary.plannedCategoryCounts["イベント"] === 0);

  const markdown = `# WordPressニュースカテゴリ復旧 dry-run レポート

## 原因

microCMS側のカテゴリは現在すべて「ニュース」ですが、今回確認したWordPress XML側の投稿カテゴリも対象168記事すべて「お知らせ / news」のみでした。
そのため、このXMLだけでは「製品情報」「展示会」「イベント」へ分類する根拠がありません。

## 使用したデータ

- WordPress XML: \`${xmlPath}\`
- microCMS endpoint: \`${args.endpoint}\`
- 既存対応表: \`${correspondence.planPath ? path.relative(PROJECT_ROOT, correspondence.planPath) : "未検出"}\`
- 実行モード: dry-run only

## 照合方法

1. 既存の本文復旧 plan JSON の \`microCMS content ID -> WordPress post ID\` 対応を最優先
2. 対応表の WordPress post ID が存在する場合、タイトル・日付キーも検証
3. 対応表がない場合のみ、HTMLエンティティ正規化済みタイトル + 公開日で完全一致
4. タイトル単独の曖昧一致は未使用

## WordPress側のカテゴリ名・slug一覧と件数

${table(["カテゴリ名", "slug", "件数"], categoryCountRows)}
## 4カテゴリへの対応表

${table(["WPカテゴリ名", "slug", "正規化後", "根拠"], mappingRows)}
## 復旧前カテゴリ件数 / 復旧後予定カテゴリ件数

${table(["カテゴリ", "復旧前", "復旧後予定"], countRows)}
## 集計

- microCMS記事数: ${summary.microcmsCount}
- WordPress対象記事数: ${summary.wordpressTargetCount}
- 一致数: ${summary.matchedCount}
- 未一致数: ${summary.unmatchedCount}
- 重複候補数: ${summary.duplicateCandidateCount}
- 要確認数: ${summary.needsReviewCount}
- 変更対象数: ${summary.patchTargetCount}
- 変更不要数: ${summary.unchangedCount}
- PATCH可能件数: ${summary.patchTargetCount}

## 記事ごとの差分一覧

${table(["ID", "タイトル", "公開日", "WP元カテゴリ", "正規化後", "現在値", "変更前", "変更後", "照合方法", "確信度", "PATCH対象", "要確認理由"], diffRows)}
## 未一致一覧

${table(["ID", "タイトル", "公開日", "理由"], unmatchedRows)}
## 複数候補一覧

${table(["ID", "タイトル", "公開日", "照合方法", "理由"], duplicateRows)}
## 複数カテゴリ記事一覧

${table(["ID", "タイトル", "WP元カテゴリ"], multiCategoryRows)}
## 未確定カテゴリ一覧

${table(["ID", "タイトル", "WP元カテゴリ", "理由"], unconfirmedCategoryRows)}
## PATCHを止めるべき問題の有無

${shouldStopPatch ? "あり。WordPress XMLに4分類の元データがなく、カテゴリ復旧PATCHで「製品情報」「展示会」「イベント」を復元できません。" : "なし。"}
`;

  fs.writeFileSync(args.reportPath, markdown, "utf8");
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
  const wxr = parseWxr(xml);
  const correspondence = loadExistingCorrespondence();
  const microcmsContents = await fetchAllMicrocmsContents({
    serviceDomain,
    apiKey,
    endpoint: args.endpoint,
  });
  const { rows } = buildDryRun({
    microcmsContents,
    wxrPosts: wxr.posts,
    correspondence,
  });
  const wpCategoryCounts = countWpCategories(wxr.posts);
  const summary = summarize({ microcmsContents, wxrPosts: wxr.posts, rows });

  writeJson({
    args,
    xmlPath: args.xml,
    correspondence,
    wxr,
    microcmsContents,
    rows,
    summary,
    wpCategoryCounts,
  });
  writeReport({
    args,
    xmlPath: args.xml,
    correspondence,
    rows,
    summary,
    wpCategoryCounts,
  });

  console.log("WordPress news category repair dry-run");
  console.log(`xml: ${args.xml}`);
  console.log(`microCMS articles: ${summary.microcmsCount}`);
  console.log(`WordPress target posts: ${summary.wordpressTargetCount}`);
  console.log(`matched: ${summary.matchedCount}`);
  console.log(`unmatched: ${summary.unmatchedCount}`);
  console.log(`duplicate candidates: ${summary.duplicateCandidateCount}`);
  console.log(`needs review: ${summary.needsReviewCount}`);
  console.log(`patch targets: ${summary.patchTargetCount}`);
  console.log(`report: ${path.relative(PROJECT_ROOT, args.reportPath)}`);
  console.log(`result json: ${path.relative(PROJECT_ROOT, args.resultPath)}`);
}

main().catch((error) => {
  console.error(error.message);
  console.error(USAGE.trim());
  process.exit(1);
});
