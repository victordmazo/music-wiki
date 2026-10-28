/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Matches MediaWiki's Vector skin: serif article titles, sans-serif body/chrome.
        serif: ['Georgia', '"Times New Roman"', 'Times', 'serif'],
        sans: ['-apple-system', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        wikiblue: '#0645ad',
        'wikiblue-dark': '#3366cc',
        wikired: '#d33',
        wikiborder: '#a2a9b1',
        'wikiborder-light': '#c8ccd1',
        wikigray: '#f8f9fa',
        wikibg: '#f6f6f6',
        wikitext: '#202122',
        wikisubtle: '#54595d',
        // Semantic status tokens (pending/suspended, approved/active) so badge
        // colors live in one place instead of being hand-picked per page.
        wikiwarn: '#92400e',
        'wikiwarn-bg': '#fffbeb',
        'wikiwarn-border': '#d97706',
        wikiok: '#166534',
        'wikiok-bg': '#f0fdf4',
        'wikiok-border': '#15803d',
      },
    },
  },
  plugins: [],
};
