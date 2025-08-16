import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  plugins: [animatePlugin],
  important: true,
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
};
export default config;
