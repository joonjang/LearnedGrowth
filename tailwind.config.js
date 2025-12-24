const colors = require('tailwindcss/colors');

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
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        none: 'none',
      },
      colors: {
        // --- 1. RESTORE STANDARD COLORS ---
        // Adding these ensures standard classes like 'bg-slate-50' or 'text-blue-500' work
        slate: colors.slate,
        gray: colors.gray,
        neutral: colors.neutral,
        stone: colors.stone,
        red: colors.red,
        orange: colors.orange,
        amber: colors.amber,
        yellow: colors.yellow,
        lime: colors.lime,
        green: colors.green,
        emerald: colors.emerald,
        teal: colors.teal,
        cyan: colors.cyan,
        sky: colors.sky,
        blue: colors.blue,
        indigo: colors.indigo,
        violet: colors.violet,
        purple: colors.purple,
        fuchsia: colors.fuchsia,
        pink: colors.pink,
        rose: colors.rose,

        // --- 2. YOUR CUSTOM SEMANTIC COLORS ---
        // B - BELIEF (Orange - "Caution")
        belief: {
          bg: "#fff7ed", // orange-50
          border: "#fed7aa", // orange-200
          text: "#9a3412", // orange-800
          bgDark: "rgba(234, 88, 12, 0.15)", // orange-600 @ 15% opacity
          borderDark: "rgba(234, 88, 12, 0.30)",
          textDark: "#ffedd5", // orange-100
        },
        // D - DISPUTE (Indigo - "Logic")
        dispute: {
          bg: "#eef2ff", // indigo-50
          border: "#c7d2fe", // indigo-200
          text: "#3730a3", // indigo-800

          bgDark: "rgba(99, 102, 241, 0.20)", // indigo-500 base
          borderDark: "rgba(79, 70, 229, 0.30)",
          textDark: "#e0e7ff",
          cta: "#4f46e5",
          ctaDark: "#818cf8",
        },
        // E - ENERGY (Emerald - "Growth")
        energy: {
          bg: "#ecfdf5", // emerald-50
          border: "#a7f3d0", // emerald-200
          text: "#065f46", // emerald-800

          borderDark: "rgba(5, 150, 105, 0.30)",
          bgDark: "rgba(16, 185, 129, 0.20)", // emerald-500 base
          textDark: "#d1fae5",
        },
      },
    },
  },
  plugins: [],
};