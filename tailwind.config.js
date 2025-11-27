/** @type {import('tailwindcss').Config} */
export default {
  content: ['./sidepanel.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#111111',
          accent: '#ffbd59',
          muted: '#9CA3AF'
        },
        surface: {
          base: '#ffffff',
          subtle: '#f7f7f7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'SF Pro Display', 'sans-serif']
      },
      boxShadow: {
        card: '0 12px 30px rgba(17,17,17,0.08)'
      }
    }
  },
  plugins: []
};
