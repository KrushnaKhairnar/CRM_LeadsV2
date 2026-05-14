/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
        },
        accent: {
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(26,31,54,0.07)",
        card: "0 20px 55px rgba(26,31,54,0.12)",
        hover: "0 18px 38px rgba(67,56,202,0.14)",
      },
      backgroundImage: {
        'brand-radial': 'linear-gradient(135deg, #eef2ff 0%, #f8fbff 48%, #f1f5ff 100%)',
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
