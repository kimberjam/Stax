import type { Config } from "tailwindcss";

// Stax brand tokens — keep these in sync with /design/palette.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: "#0B0F14",
        slate800: "#1A2230",
        lime: { DEFAULT: "#C8FF3E", dark: "#9CD314" },
        cream: "#F4EFE5",
        mint: "#5EE6A8",
        amber: "#FFB547",
        coral: "#FF6B6B",
        violet: "#A28BFF",
        steel: "#7A8699",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        glow: "0 0 0 1px #ffffff15, 0 16px 40px #00000060",
      },
    },
  },
  plugins: [],
};

export default config;
