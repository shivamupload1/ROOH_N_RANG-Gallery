import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      ".pnpm-store/**",
      "outputs/**",
      "assets/**",
      "css/**",
      "js/**",
      "dist/**",
      "server.js",
      "scripts/build-static.js"
    ]
  }
];

export default eslintConfig;
