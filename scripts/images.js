// scripts/images.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ▼▼▼ 対応表 (左: Astroで使う名前 / 右: 元ファイル名の特徴) ▼▼▼
// フォルダに入れたファイル名に「右側の文字」が含まれていれば、自動で「左側の名前.webp」に変換されます
const IMAGE_MAPPING = {
  // ■ トップページ (JP)
  "main-visual": "main",         // 例: "main_visual.jpg", "DSC_main.jpg"
  "news-placeholder": "logo",    // 例: "logo_square.png"

  // ■ 英語版 (EN)
  "en-hero-bg": "en-hero",       // 例: "En_Hero.jpg"
  "ceo-en": "ceo-en",            // 例: "CEO_En.jpg"

  // ■ 企業情報
  "concept-ring": "ring",
  "ceo": "ceo.",                 // ★重要: "ceo." (ドット付) にして ceo-sign と区別
  "ceo-sign": "sign",
  "vision-pyramid": "vision",
  "iso9001": "iso9001",
  "iso14001": "iso14001",
  "iso45001": "iso45001",
  "jis-1": "jis",               // 必要に応じて
  // ▼▼▼ ここを追加・修正 ▼▼▼
  "creed": "philosophy-text",  // "philosophy-text.jpg" を "creed.webp" に変換

  // ■ 製造・技術
  "process-cutting": "cutting",
  "process-forging": "forging",
  "process-heat": "heat",
  "process-rolling": "rolling",
  "factory-inner": "factory",
  "labo-1": "labo-1",
  "labo-2": "labo-2",

  // ■ 製品・販売
  "product-bolt": "bolt",
  "product-anchor": "anchor",
  "product-rail": "rail",
  "warehouse": "warehouse",
  "warehouse-bg": "warehouse-bg",

  // ■ 採用情報
  "recruit-main": "recruit-main",             // 例: "Recruit_Main.jpg"
  "recruit-interview-1": "interview-1",  // 例: "interview-1_suzuki.jpg"
  "recruit-interview-2": "interview-2",
  "recruit-interview-3": "interview-3",

  // ■ アイコン・その他
  "item-bolt": "item-bolt",
  "item-nut": "item-nut",
  "item-anchor": "item-anchor",
  "item-screw": "item-screw",
  "item-washer": "item-washer",
  "item-tool": "item-tool",
  "item-ubolt": "item-ubolt",

  // ▼▼▼ SDGsアイコン (ファイル名規則: sdg_icon_XX_ja_2.png に合わせる) ▼▼▼
  "sdg-3": "sdg_icon_03",   // "sdg_icon_03_ja_2.png" -> "sdg-3.webp"
  "sdg-4": "sdg_icon_04",
  "sdg-5": "sdg_icon_05",
  "sdg-7": "sdg_icon_07",
  "sdg-8": "sdg_icon_08",
  "sdg-9": "sdg_icon_09",
  "sdg-10": "sdg_icon_10",
  "sdg-11": "sdg_icon_11",
  "sdg-12": "sdg_icon_12",
  "sdg-13": "sdg_icon_13",
};

// パス設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_DIR = path.join(__dirname, '../raw_images');       // 元画像の置き場所
const PUBLIC_IMG_DIR = path.join(__dirname, '../public/images'); // 出力先
const SRC_DIR = path.join(__dirname, '../src');              // ソースコードの場所
const QUALITY = 80;                                          // 画質

// フォルダ作成
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR);
if (!fs.existsSync(PUBLIC_IMG_DIR)) fs.mkdirSync(PUBLIC_IMG_DIR, { recursive: true });

// --- 1. 画像変換処理 ---
async function processImages() {
  console.log(`🚀 [1/2] 画像変換をスタート...`);
  const rawFiles = fs.readdirSync(RAW_DIR);
  
  for (const [targetName, keyword] of Object.entries(IMAGE_MAPPING)) {
    // ファイル名にキーワードが含まれているか検索 (大文字小文字区別なし)
    const file = rawFiles.find(f => f.toLowerCase().includes(keyword.toLowerCase()));
    
    if (file) {
      const ext = path.extname(file).toLowerCase();
      // 対応形式のみ処理
      if (['.jpg', '.jpeg', '.png', '.webp', '.tiff'].includes(ext)) {
        try {
          await sharp(path.join(RAW_DIR, file))
            .webp({ quality: QUALITY })
            .toFile(path.join(PUBLIC_IMG_DIR, `${targetName}.webp`));
          console.log(`  ✅ 生成: ${targetName}.webp (元: ${file})`);
        } catch (e) { console.error(`  ❌ エラー: ${file}`, e); }
      }
    }
  }
}

// --- 2. ソースコード書き換え処理 ---
function updateSourceCode(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      updateSourceCode(fullPath); // 再帰的にフォルダの中へ
    } else if (file.endsWith('.astro') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      // "/images/..." で始まるパスの拡張子(.jpg/.png)を .webp に置換する
      const regex = /(\/images\/[\w\-\.\/]+)\.(jpg|jpeg|png)/gi;
      
      if (regex.test(content)) {
        content = content.replace(regex, '$1.webp');
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`  📝 コード書き換え完了: ${file}`);
      }
    }
  }
}

// 実行
(async () => {
  await processImages();
  
  console.log(`\n🚀 [2/2] ソースコードの拡張子を.webpに統一中...`);
  updateSourceCode(SRC_DIR);
  
  console.log('\n✨ 全工程完了!');
})();