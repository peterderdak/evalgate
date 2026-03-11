import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        sand: "#f5efe3",
        signal: "#d97706",
        forest: "#235347",
        mist: "#dae7e1"
      },
      boxShadow: {
        card: "0 12px 40px rgba(17,17,17,0.08)"
      }
    }
  },
  plugins: []
};

export default config;
