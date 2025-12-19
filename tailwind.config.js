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
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#991b1b",
          bgDark: "rgba(244, 63, 94, 0.15)",
          borderDark: "rgba(244, 63, 94, 0.30)",
          textDark: "#fecdd3",
        },
        dispute: {
          bg: "#ecfdf3",
          border: "#a7f3d0",
          text: "#065f46",
          cta: "#10b981",
          bgDark: "rgba(16, 185, 129, 0.15)",
          borderDark: "rgba(16, 185, 129, 0.30)",
          textDark: "#d1fae5",
          ctaDark: "#6ee7b7",
        },
      },
    },
  },
  plugins: [],
};
