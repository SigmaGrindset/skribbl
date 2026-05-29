import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pop / cartoon palette: flat, saturated, on a light paper background
        // with a hard black ink outline. `ink` is the universal border/text.
        ink: "#16110d",
        paper: "#fff7e6",
        canvas: "#ffffff",
        pop: {
          yellow: "#ffd23f",
          pink: "#ff5d8f",
          cyan: "#3ad6e8",
          green: "#5fd068",
          orange: "#ff8c42",
          purple: "#9b5de5",
          blue: "#4d96ff",
          red: "#ff5252",
        },
        // brand keeps the old name so stray references still resolve.
        brand: {
          DEFAULT: "#9b5de5",
          dark: "#7c3aed",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Hard, blur-less offset shadows — the signature of the cartoon look.
        "pop-sm": "2px 2px 0 0 #16110d",
        pop: "4px 4px 0 0 #16110d",
        "pop-lg": "6px 6px 0 0 #16110d",
        "pop-xl": "8px 8px 0 0 #16110d",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.85) rotate(-2deg)", opacity: "0" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        pop: "pop 0.22s ease-out",
        wiggle: "wiggle 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
