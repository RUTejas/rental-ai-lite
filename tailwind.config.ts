import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18251f",
        cream: "#f7f3eb",
        brass: "#c89b5e",
        forest: "#2f7d5c"
      }
    }
  },
  plugins: []
};

export default config;
