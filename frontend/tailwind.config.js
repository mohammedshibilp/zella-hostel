/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3F2576",
          50: "#F5F2FC",
          100: "#EAE3F9",
          200: "#D6C7F3",
          300: "#B89FEB",
          400: "#9670DF",
          500: "#7545D0",
          600: "#5D32B8",
          700: "#4D2799",
          800: "#3F2576", // Base Primary
          900: "#321E5C",
          950: "#1F123C",
        },
        secondary: {
          DEFAULT: "#F7941D",
          50: "#FFF8ED",
          100: "#FEEDD5",
          200: "#FDD9AA",
          300: "#FBC075",
          400: "#F9A23E",
          500: "#F7941D", // Base Secondary / Accent
          600: "#D9750E",
          700: "#B4550F",
          800: "#904313",
          900: "#763914",
        },
        background: "#F8F9FB",
        surface: "#FFFFFF",
        navy: {
          DEFAULT: "#1E1B4B",
          50: "#EEF2F6",
          100: "#E2E8F0",
          500: "#64748B",
          800: "#334155",
          900: "#1E1B4B",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        montserrat: ["Montserrat", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        button: "12px",
      },
      boxShadow: {
        soft: "0 2px 12px rgba(63, 37, 118, 0.06)",
        card: "0 4px 20px rgba(30, 27, 75, 0.05)",
        cardHover: "0 8px 30px rgba(63, 37, 118, 0.12)",
      },
    },
  },
  plugins: [],
}
