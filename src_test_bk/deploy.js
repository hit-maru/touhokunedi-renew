// deploy.js
import FtpDeploy from "ftp-deploy";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const ftpDeploy = new FtpDeploy();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    host: process.env.FTP_HOST,
    port: 21,
    localRoot: path.join(__dirname, "dist"),
    // ★ .env で設定した FTP_PATH を使う
    remoteRoot: process.env.FTP_PATH, 
    include: ["*", "**/*"],
    deleteRemote: false, 
    forcePasv: true,
};

console.log(`🚀 ${config.remoteRoot} へアップロードを開始します...`);

ftpDeploy
    .deploy(config)
    .then(() => console.log("✅ 完了！ブラウザで確認してください"))
    .catch((err) => console.log("❌ エラー:", err));