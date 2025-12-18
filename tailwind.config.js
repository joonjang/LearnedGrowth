/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "./providers/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./theme/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}",
    "./models/**/*.{js,jsx,ts,tsx}",
    "./__test__/test-utils/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        belief: {
          bg: "var(--accent-belief-bg)",
          border: "var(--accent-belief-border)",
          text: "var(--accent-belief-text)",
        },
        
        dispute: {
          bg: "var(--accent-dispute-bg)",
          border: "var(--accent-dispute-border)",
          text: "var(--accent-dispute-text)",
          cta: "var(--dispute-cta)",
        },
      },
    },
  },
  plugins: [],
};
