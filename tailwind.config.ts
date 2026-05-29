import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { brand: { 50:"#ecfdf3", 500:"#22c55e", 600:"#16a34a", 700:"#15803d", 950:"#052e16" } } } },
  plugins: []
};
export default config;
