/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            fontFamily: {
                // セリフ系：EB Garamond (欧文数字・英文タイトル用)
                serif: ['"EB Garamond"', 'serif'],
                // サンセリフ系：和文用 (Gothic MB101)
                mb101: ['"Gothic MB101"', 'sans-serif'],
                sans: ['"Noto Sans JP"', 'sans-serif'],
            },
            // 丸さんの「数理美学」：絶対に削除禁止
            spacing: {
                '0': '0px', '0.5': '2px', '1': '4px', '2': '8px', '3': '12px', '4': '16px',
                '6': '24px', '8': '32px',
                'fibo-21': '21px', 'fibo-34': '34px', 'fibo-55': '55px',
                'fibo-89': '89px', 'fibo-144': '144px',
                'golden-sm': '10px', 'golden-md': '16px', 'golden-lg': '26px', 'golden-xl': '42px',
            },
            colors: {
                primary: '#008B9B', // 東北ネヂ・グリーン
                accent: '#E64A19',  // 鍛造レッド
                'paper-white': '#F9FAFB', 
                'ink': '#1A1A1A',   // 墨文字
            }
        },
    },
    plugins: [],
}