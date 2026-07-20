import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "electric-cyan": "#00F0FF",
        "neon-blue": "#0066FF",
        "slate-gray": "#3A3D40",
        "midnight-blue": "#0A0E1A",
        "deep-onyx": "#05070D",
      },
    },
  },
  plugins: [],
};

export default config;
