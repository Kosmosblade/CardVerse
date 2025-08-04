const plugin = require('tailwindcss/plugin');

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0b1120',
        'neon-pink': '#ff4ecd',
        'neon-purple': '#a78bfa',
        'electric-blue': '#38bdf8',
        'glow-blue': '#3b82f6',
        glass: 'rgba(255, 255, 255, 0.05)',
        'cardverse-dark': '#0e0e16',
        'cardverse-accent': '#6f3ab5',
        'cardverse-highlight': '#ff79c6',
        'commander-gold': '#e6c35d',
      },
      borderRadius: {
        'xl-2': '1.25rem',
        cardverse: '1.75rem',
      },
      boxShadow: {
        'glow-blue': '0 0 12px rgba(59, 130, 246, 0.6)',
        'glow-purple': '0 0 12px rgba(167, 139, 250, 0.6)',
        'glow-gold': '0 0 12px rgba(230, 195, 93, 0.6)',
        'glass-inner': 'inset 0 0 10px rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'animated-gradient': 'linear-gradient(270deg, #4f46e5, #3b82f6, #06b6d4, #4f46e5)',
        'hero-pattern': "url('/images/mtg-dark-bg.webp')",
        'commander-frame': "url('/images/commander-border.svg')",
      },
      backgroundSize: {
        'size-400': '400% 400%',
      },
      animation: {
        'gradient-move': 'gradientMove 15s ease infinite',
        'flip-card': 'flipCard 0.6s ease-in-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-glow': 'pulse-glow 2s infinite',
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
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
        },
      },
    },
  },
  plugins: [
    // Add pseudo-elements plugin first
    require('tailwindcss-pseudo-elements'),
    
    // Your existing custom utilities
    plugin(function ({ addComponents, theme }) {
      addComponents({
        '.btn-glow': {
          backgroundColor: theme('colors.glow-blue'),
          borderRadius: theme('borderRadius.xl-2'),
          color: '#fff',
          fontWeight: 'bold',
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          transition: 'all 0.3s ease',
          boxShadow: theme('boxShadow.glow-blue'),
          '&:hover': {
            boxShadow: '0 0 16px rgba(59, 130, 246, 0.8)',
            transform: 'scale(1.05)',
          },
        },
        '.input-glass': {
          backgroundColor: theme('colors.glass'),
          borderRadius: theme('borderRadius.xl-2'),
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          color: '#fff',
          outline: 'none',
          '&::placeholder': {
            color: 'rgba(255, 255, 255, 0.4)',
          },
          '&:focus': {
            borderColor: theme('colors.glow-blue'),
            boxShadow: theme('boxShadow.glow-blue'),
          },
        },
      });
    }),
  ],
};
