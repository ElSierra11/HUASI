/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ucc: {
          navy: '#1a3a5c',      // Deep navy blue
          cyan: '#00a8e0',      // UCC cyan / secondary
          green: '#0d7c3d',     // UCC green / accent
          'green-hover': '#0a6432',
          'green-light': '#d4f0e0',
          'cyan-light': '#e0f4ff',
          bg: '#f0f6f2',        // UCC background tint
          card: '#ffffff',
          text: '#1a2e1f',
          muted: '#4a6358',
          border: '#c8ddd2'
        }
      },
      fontFamily: {
        heading: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg-custom': '18px',
        'xl-custom': '28px',
      },
      boxShadow: {
        'custom-sm': '0 1px 3px rgba(13,124,61,0.08)',
        'custom': '0 4px 12px rgba(13,124,61,0.12), 0 2px 4px rgba(13,124,61,0.08)',
        'custom-md': '0 10px 30px rgba(13,124,61,0.15), 0 4px 8px rgba(13,124,61,0.10)',
        'custom-lg': '0 20px 50px rgba(26,58,92,0.20), 0 8px 16px rgba(13,124,61,0.12)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.7)' },
        },
        'blob-float-1': {
          '0%': { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
          '50%': { transform: 'translate(50px, 30px) scale(1.1) rotate(90deg)' },
          '100%': { transform: 'translate(-30px, 60px) scale(0.9) rotate(180deg)' },
        },
        'blob-float-2': {
          '0%': { transform: 'translate(0px, 0px) scale(0.9) rotate(0deg)' },
          '50%': { transform: 'translate(-60px, -40px) scale(1.15) rotate(-90deg)' },
          '100%': { transform: 'translate(20px, 20px) scale(1) rotate(-180deg)' },
        }
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s infinite',
        'float-1': 'blob-float-1 20s ease-in-out infinite alternate',
        'float-2': 'blob-float-2 25s ease-in-out infinite alternate',
      }
    },
  },
  plugins: [],
}
