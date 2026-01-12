// check-unused-images.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const IMAGE_DIR = path.join(__dirname, 'public', 'images');
const SRC_DIR = path.join(__dirname, 'src');

// 画像ファイルを取得
function getImageFiles() {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const imageFiles = fs.readdirSync(IMAGE_DIR)
    .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()));
  return imageFiles;
}

// ソースコード内で使用されている画像を検出
async function getUsedImages() {
  const usedImages = new Set();
  
  // Astroファイルを全て取得
  const astroFiles = await glob('src/**/*.astro');
  
  // 各ファイルを読み込んで画像参照を探す
  for (const file of astroFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // 画像パスのパターンを検索
    const patterns = [
      /\/image\/([^"')\s]+)/g,  // /image/filename.jpg
      /\/images\/([^"')\s]+)/g, // /images/filename.jpg
      /src=["']([^"']+\.(jpg|jpeg|png|gif|webp|svg))["']/gi, // src="filename.jpg"
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const imageName = path.basename(match[1]);
        usedImages.add(imageName);
      }
    });
  }
  
  return usedImages;
}

// メイン処理
async function main() {
  console.log('🔍 未使用画像を検出中...\n');
  
  // 画像ファイル一覧を取得
  const allImages = getImageFiles();
  console.log(`📁 画像フォルダ内のファイル数: ${allImages.length}`);
  
  // 使用中の画像を取得
  const usedImages = await getUsedImages();
  console.log(`✅ 使用中の画像: ${usedImages.size}件`);
  
  // 未使用の画像を抽出
  const unusedImages = allImages.filter(img => !usedImages.has(img));
  
  console.log(`\n❌ 未使用の画像: ${unusedImages.length}件\n`);
  
  if (unusedImages.length === 0) {
    console.log('✨ 未使用の画像はありません！');
    return;
  }
  
  // 未使用画像のリストを表示
  console.log('【未使用画像一覧】');
  unusedImages.forEach((img, index) => {
    const filePath = path.join(IMAGE_DIR, img);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`${index + 1}. ${img} (${sizeKB} KB)`);
  });
  
  // 合計サイズを計算
  const totalSize = unusedImages.reduce((sum, img) => {
    const filePath = path.join(IMAGE_DIR, img);
    return sum + fs.statSync(filePath).size;
  }, 0);
  const totalMB = (totalSize / 1024 / 1024).toFixed(2);
  
  console.log(`\n📊 削除可能な容量: ${totalMB} MB`);
  
  // 削除リストをファイルに出力
  const outputFile = 'unused-images.txt';
  fs.writeFileSync(outputFile, unusedImages.join('\n'));
  console.log(`\n📄 未使用画像リストを ${outputFile} に保存しました`);
  
  // 削除スクリプトも生成
  const deleteScript = unusedImages.map(img => 
    `rm "public/images/${img}"`
  ).join('\n');
  fs.writeFileSync('delete-unused-images.sh', deleteScript);
  console.log(`📄 削除スクリプトを delete-unused-images.sh に保存しました`);
  console.log(`\n⚠️  削除する前に必ずバックアップを取ってください！`);
  console.log(`実行方法: bash delete-unused-images.sh`);
}

main().catch(console.error);