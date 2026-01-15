/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        // UI / 本文
        sans: ['"Noto Sans JP"', 'sans-serif'],

        // 英語見出し（EB Garamond）
        gara: ['"EB Garamond"', 'serif'],

        // ロゴ / ヒーロー（Cormorant Garamond）
        cormo: ['"Cormorant Garamond"', 'serif'],

        // JP専用（必要なら）
        mb101: ['"Gothic MB101"', 'sans-serif'],

        // ★ 追加：新ゴB（注記・規格表記用）
        shingo: ['"Shin Go B"', '"Gothic MB101"', 'sans-serif'],
      },

      spacing: {
        '0': '0px', '0.5': '2px', '1': '4px', '2': '8px', '3': '12px', '4': '16px',
        '6': '24px', '8': '32px',
        'fibo-21': '21px', 'fibo-34': '34px', 'fibo-55': '55px',
        'fibo-89': '89px', 'fibo-144': '144px',
        'golden-sm': '10px', 'golden-md': '16px', 'golden-lg': '26px', 'golden-xl': '42px',
      },

      colors: {
        primary: '#008B9B',
        accent: '#E64A19',
        'paper-white': '#F9FAFB',
        ink: '#1A1A1A',
      },
    },
  },
  plugins: [],
}
