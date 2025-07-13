/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // all files in src folder
    "./public/index.html", // add this to ensure HTML is included
  ],
  theme: {
    extend: {
      backgroundImage: {
        'animated-gradient': 'linear-gradient(270deg, #4f46e5, #3b82f6, #06b6d4, #4f46e5)',
      },
      backgroundSize: {
        'size-400': '400% 400%',
      },
      animation: {
        'gradient-move': 'gradientMove 15s ease infinite',
      },
      keyframes: {
        gradientMove: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
};
