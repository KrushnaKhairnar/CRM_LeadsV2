/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Baloo 2"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#ecfdf5",   // emerald-50
          100: "#d1fae5",
          200: "#a7f3d0",
          500: "#10b981",  // emerald-500
          600: "#059669",  // emerald-600
          700: "#047857",  // emerald-700
        },
        accent: {
          500: "#14b8a6",  // teal-500
          600: "#0d9488",
          700: "#0f766e",
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.06)",
        card: "0 6px 20px rgba(16,185,129,0.08)",
        hover: "0 10px 30px rgba(16,185,129,0.12)",
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(1200px circle at 20% 0%, rgba(20,184,166,0.10), transparent 60%), radial-gradient(1000px circle at 80% 20%, rgba(16,185,129,0.08), transparent 60%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'in-fade': 'fade-in .4s ease-out',
        'in-up': 'fade-in-up .4s ease-out',
        'in-pop': 'pop .3s ease-out',
        'in-down': 'slide-down .35s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
