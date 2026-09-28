import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: v("ink-rgb"),
        surface: v("surface-rgb"),
        surface2: v("surface-2-rgb"),
        line: v("line-rgb"),
        fg: v("fg-rgb"),
        muted: v("muted-rgb"),
        dim: v("dim-rgb"),
        accent: {
          DEFAULT: v("accent-rgb"),
          soft: v("accent-soft-rgb"),
          deep: v("accent-deep-rgb"),
        },
        japan: { red: "#BC002D", dark: "#1a1a2e", card: "#16213e", accent: "#e94560" },
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        japanese: ["Noto Sans JP", "sans-serif"],
        jpSerif: ["Noto Serif JP", "serif"],
      },
      borderRadius: {
        xl: "var(--radius)",
        "2xl": "var(--radius-lg)",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
