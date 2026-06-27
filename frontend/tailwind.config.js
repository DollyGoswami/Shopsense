/** @type {import('tailwindcss').Config} */
export default {
  content:  ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eeeeff",
          100: "#d4d4ff",
          400: "#8b7ff7",
          500: "#6c63ff",
          600: "#5550e0",
          700: "#3e3ab5",
        },
      },
      fontFamily: {
        sans:    ["Space Grotesk", "sans-serif"],
        display: ["Syne", "sans-serif"],
      },
      animation: {
        "fade-in":    "fadeIn .4s ease",
        "slide-up":   "slideUp .4s ease",
        "slide-in":   "slideIn .4s ease",
        "pulse-slow": "pulse 3s cubic-bezier(.4,0,.6,1) infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                      to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(20px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        slideIn: { from: { opacity: 0, transform: "translateX(40px)" }, to: { opacity: 1, transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
};
