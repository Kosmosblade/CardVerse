module.exports = {
  darkMode: 'class', // good for toggling dark mode manually via class
  content: ['./src/**/*.{js,jsx,ts,tsx}'], // scanning your source files
  theme: {
    extend: {
      colors: {
        midnight: '#0b1120', // custom dark color
      },
      backgroundImage: {
        'animated-gradient': 'linear-gradient(270deg, #4f46e5, #3b82f6, #06b6d4, #4f46e5)',
      },
      backgroundSize: {
        'size-400': '400% 400%',
      },
      animation: {
        'gradient-move': 'gradientMove 15s ease infinite',
        'flip-card': 'flipCard 0.6s ease-in-out',
      },
      keyframes: {
        gradientMove: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        flipCard: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/line-clamp')],
};
