import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(projectRoot, "tools-manifest.json");
const publicToolsDir = path.join(projectRoot, "public", "tools");
const distToolsDir = path.join(projectRoot, "dist", "tools");

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

function normalizeToolName(fileName) {
  return fileName.toLowerCase().replace(/[\s_-]+/g, "");
}

function findToolPhpReferences(html, dir) {
  const refs = new Set();
  const patterns = [
    /(?:https?:\/\/[^"'\s]+)?\/tools\/([^"'\s?#]+\.php)\b/g,
    /(?:^|["'(\s])tools\/([^"'\s?#]+\.php)\b/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      refs.add(decodeURIComponent(match[1]));
    }
  }

  return [...refs].filter((ref) => !fs.existsSync(path.join(dir, ref)));
}

export function validateToolsDeployment({ requireDist = true } = {}) {
  const errors = [];
  const manifest = readManifest();
  const requiredFiles = manifest.requiredFiles || [];
  const dirs = [
    { label: "public/tools", path: publicToolsDir, required: false },
    { label: "dist/tools", path: distToolsDir, required: requireDist },
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir.path)) {
      if (dir.required) errors.push(`${dir.label} が存在しません。`);
      continue;
    }

    const files = listFiles(dir.path);
    const spaced = files.filter((file) => /\s/.test(file));
    for (const file of spaced) {
      errors.push(`${dir.label} に空白を含むファイル名があります: ${file}`);
    }

    const groups = new Map();
    for (const file of files) {
      const key = normalizeToolName(file);
      const group = groups.get(key) || [];
      group.push(file);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      if (group.length > 1) {
        errors.push(`${dir.label} に大文字小文字・空白・ハイフン違いの重複候補があります: ${group.join(", ")}`);
      }
    }

    for (const file of files.filter((name) => name.toLowerCase().endsWith(".html"))) {
      const html = fs.readFileSync(path.join(dir.path, file), "utf8");
      const missingRefs = findToolPhpReferences(html, dir.path);
      for (const ref of missingRefs) {
        errors.push(`${dir.label}/${file} から参照されるPHPが存在しません: ${ref}`);
      }
    }
  }

  if (fs.existsSync(distToolsDir)) {
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(distToolsDir, file))) {
        errors.push(`dist/tools に必須ファイルがありません: ${file}`);
      }
    }
  } else if (requireDist) {
    errors.push("dist/tools が存在しないため必須ファイルを確認できません。");
  }

  if (errors.length > 0) {
    const message = ["tools deployment validation failed:", ...errors.map((error) => `- ${error}`)].join("\n");
    throw new Error(message);
  }

  return {
    requiredFiles,
    checkedDirs: dirs.filter((dir) => fs.existsSync(dir.path)).map((dir) => dir.label),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = validateToolsDeployment();
    console.log(`tools deployment validation passed: ${result.checkedDirs.join(", ")}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
