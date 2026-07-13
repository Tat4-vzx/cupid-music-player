/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'marquee': 'marquee 15s linear infinite',
        'music-bar-1': 'music-bar 0.8s ease-in-out infinite alternate',
        'music-bar-2': 'music-bar 1.2s ease-in-out infinite alternate',
        'music-bar-3': 'music-bar 0.9s ease-in-out infinite alternate',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'music-bar': {
          '0%': { height: '10%' },
          '100%': { height: '100%' },
        }
      }
    },
  },
  plugins: [],
}
