/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bgDeep: "#0B0F19",
        bgPanel: "#121826",
        bgLight: "#1B2233",
        accent: {
          DEFAULT: "#4F8CFF",
          hover: "#6EA8FE",
          light: "#8CB9FF",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass-glow': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'accent-glow': '0 0 20px 2px rgba(79, 140, 255, 0.25)',
      },
    },
  },
  plugins: [],
}
