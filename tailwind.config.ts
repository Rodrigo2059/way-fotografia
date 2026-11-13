import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { way: { yellow: "#FFB900", black: "#171717", gray: "#292929", line: "#3a3a3a" } },
      fontFamily: { sans: ["var(--font-outfit)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
