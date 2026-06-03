// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://touhokunedi.com',
  integrations: [tailwind(), sitemap()],
  output: 'static',
  server: {
    host: true
  }
});
