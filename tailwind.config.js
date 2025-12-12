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
    "./test-utils/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        borderStrong: "var(--border-strong)",
        
        // Semantic Groups
        card: {
          DEFAULT: "var(--card-bg)",
          grey: "var(--card-grey)",
          input: "var(--card-input)",
          border: "var(--card-input-border)",
        },
        
        text: {
          DEFAULT: "var(--text)",
          subtle: "var(--text-subtle)",
          hint: "var(--hint)",
          menu: "var(--menu-text)",
          muted: "var(--muted-icon)",
        },

        // Brand & Actions
        delete: "var(--delete)",
        cta: "var(--cta)",
        ctaText: "var(--cta-text)",
        
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

        overlay: "var(--overlay)",
      },
    },
  },
  plugins: [],
};
