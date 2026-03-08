import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "vs-bg": "var(--vs-bg)",
        "vs-surface": "var(--vs-surface)",
        "vs-surface-2": "var(--vs-surface-2)",
        "vs-border": "var(--vs-border)",
        "vs-accent": "var(--vs-accent)",
        "vs-text": "var(--vs-text)",
        "vs-text-2": "var(--vs-text-2)",
        "vs-text-3": "var(--vs-text-3)",
        "vs-error": "var(--vs-error)",
        "vs-warning": "var(--vs-warning)",
        "vs-success": "var(--vs-success)",
        "vs-sidebar": "var(--vs-sidebar)",
      },
      fontFamily: {
        display: ["Cabinet Grotesk", "sans-serif"],
        mono: ["Cabinet Grotesk", "sans-serif"],
        serif: ["Lora", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
