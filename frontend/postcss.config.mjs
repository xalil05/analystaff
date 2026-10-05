// Tailwind v4 : le plugin PostCSS s'appelle @tailwindcss/postcss.
// `tailwindcss` + `autoprefixer` (syntaxe v3) ne produisent aucun CSS en v4.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
