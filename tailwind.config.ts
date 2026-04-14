/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#13131a',
        border: 'rgba(255,255,255,0.08)',
        primary: '#6c5ce7',
        'primary-light': '#a29bfe',
        'text-primary': '#f0f0ff',
        'text-muted': '#8888aa',
        success: '#00b894',
        warning: '#fdcb6e',
        error: '#e17055',
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        dm: ['var(--font-dm-sans)', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(108, 92, 231, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(108, 92, 231, 0.6)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.7s ease forwards',
        'fadeUp-delay-1': 'fadeUp 0.7s 0.1s ease forwards',
        'fadeUp-delay-2': 'fadeUp 0.7s 0.2s ease forwards',
        'fadeUp-delay-3': 'fadeUp 0.7s 0.3s ease forwards',
        'fadeUp-delay-4': 'fadeUp 0.7s 0.5s ease forwards',
        fadeIn: 'fadeIn 0.5s ease forwards',
        scaleIn: 'scaleIn 0.4s ease forwards',
        float: 'float 4s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
