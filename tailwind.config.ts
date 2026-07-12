import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#fffaf0",
        ink: "#241f1f",
        mahogany: "#5a2e25",
        rust: "#9f4f37",
        marigold: "#b99049",
        sage: "#64705b",
        rosewood: "#7a2f2f"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(36, 31, 31, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
