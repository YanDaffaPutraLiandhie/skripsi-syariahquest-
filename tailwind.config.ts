import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito)", "sans-serif"],
      },
      colors: {
        primary: "#50427E",
        secondary: "#C1BAD8",
        background: "#FFFFFF",
        sidebar: "#F8FAFC",
        easy: "#20DC7E",
        medium: "#EFD01E",
        hard: "#DC2023",
      },
      boxShadow: {
        'game': '0 6px 0 rgba(0, 0, 0, 0.1)',
        'game-hover': '0 2px 0 rgba(0, 0, 0, 0.1)',
        'game-press': '0 0px 0 rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};
export default config;