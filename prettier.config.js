/** @type {import('prettier').Config} */
export default {
  arrowParens: 'avoid',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: 'src/styles.css',
  tailwindFunctions: ['cn', 'cva'],
  printWidth: 80,
  singleQuote: true,
  tabWidth: 2,
};
