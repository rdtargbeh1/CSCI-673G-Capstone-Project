// tailwind.config.cjs

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1D4ED8",
        neutral: "#F3F4F6",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
