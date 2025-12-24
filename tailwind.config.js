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
       // D - DISPUTE (Now Emerald/Green - "Growth/Action")
        dispute: {
          bg: "#ecfdf5", // emerald-50
          border: "#a7f3d0", // emerald-200
          text: "#065f46", // emerald-800

          bgDark: "rgba(16, 185, 129, 0.20)", // emerald-500 base
          borderDark: "rgba(5, 150, 105, 0.30)", // emerald-600 base
          textDark: "#d1fae5", // emerald-100
          
          // Added CTA colors because Dispute is often used for buttons
          cta: "#059669",     // emerald-600
          ctaDark: "#34d399", // emerald-400
        },

        // E - ENERGY (Now Sky Blue - "Clarity/Vitality")
        energy: {
          bg: "#f0f9ff", // sky-50
          border: "#bae6fd", // sky-200
          text: "#0369a1", // sky-700

          bgDark: "rgba(14, 165, 233, 0.20)", // sky-500 base
          borderDark: "rgba(2, 132, 199, 0.30)", // sky-600 base
          textDark: "#e0f2fe", // sky-100
        },
      },
    },
  },
  plugins: [],
};