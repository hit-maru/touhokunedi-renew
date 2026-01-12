// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  // ★重要：Xserver（レンタルサーバー）では必ず 'static' にします
  output: 'static', 
  // ★重要：サブディレクトリを指定します
  base: '/test',
});