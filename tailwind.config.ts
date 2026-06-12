import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b1117",
          900: "#111923",
          800: "#1a2533",
          700: "#243345",
          600: "#33465e",
        },
        flame: {
          400: "#5eb8ff",
          500: "#2f9bff",
          600: "#1d7fe0",
        },
        gold: "#e8b339",
        paddock: "#7fb069",
      },
    },
  },
  plugins: [],
};
export default config;
