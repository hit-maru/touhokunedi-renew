// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static', // ★ 'server' から 'static' に変更
  // adapter も不要なので削除してOKです
});