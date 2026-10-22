import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0a0e",
        panel: "#16121a",
        panel2: "#1d1722",
        line: "#2c2433",
        cream: "#f4ede6",
        muted: "#a79ca8",
        rose: { DEFAULT: "#ff5c7c", soft: "#ff5c7c22" },
        gold: { DEFAULT: "#e9c27d", soft: "#e9c27d22" },
        sky: { DEFAULT: "#7cc4ff", soft: "#7cc4ff22" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
