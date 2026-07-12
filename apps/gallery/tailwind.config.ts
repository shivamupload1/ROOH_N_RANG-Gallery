import type { Config } from "tailwindcss";
import base from "../../tailwind.config";

export default { ...base, content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"] } satisfies Config;
