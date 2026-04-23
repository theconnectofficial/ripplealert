/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "'IBM Plex Mono'", "monospace"],
        sans: ["'Inter'", "-apple-system", "sans-serif"],
      },
      colors: {
        bg:     "#05060f",
        bg1:    "#090a15",
        bg2:    "#0e0f1c",
        bg3:    "#141527",
        bg4:    "#1b1c30",
        accent: "#6366f1",
        red:    "#f03e3e",
        orange: "#f76707",
        yellow: "#f59f00",
        green:  "#51cf66",
        blue:   "#4dabf7",
        purple: "#845ef7",
      },
    },
  },
  plugins: [],
};
