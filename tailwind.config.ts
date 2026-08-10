import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#50427E",
        secondary: "#C1BAD8",
        background: "#FFFFFF",
        sidebar: "#F8FAFC",
        easy: "#20DC7E",
        medium: "#EFD01E",
        hard: "#DC2023",
      },
    },
  },
  plugins: [],
};
export default config;