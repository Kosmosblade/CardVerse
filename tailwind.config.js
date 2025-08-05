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

        // New magical colors
        'arcane-purple': '#6b21a8',     // deep purple magic
        'enchanted-teal': '#0d9488',    // mystical teal glow
        'eldritch-gold': '#d4af37',     // antique gold shimmer
        'rune-gray': '#2e2a38',         // stone rune color
        'spellfire-red': '#dc2626',     // fiery red accent
      },
      fontFamily: {
        // Add a magical serif vibe, fallback to system
        magic: ["'Cinzel', serif", 'Georgia', 'serif'],
        wizard: ["'Uncial Antiqua', cursive", 'serif'],
        sans: ["'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"],
      },
      borderRadius: {
        'xl-2': '1.25rem',
        cardverse: '1.75rem',
        'magic-md': '0.9rem',
        'magic-lg': '2rem',
      },
      boxShadow: {
        'glow-blue': '0 0 14px rgba(59, 130, 246, 0.8)',
        'glow-purple': '0 0 18px rgba(167, 139, 250, 0.8)',
        'glow-gold': '0 0 22px rgba(230, 195, 93, 0.8)',
        'glass-inner': 'inset 0 0 10px rgba(255, 255, 255, 0.07)',
        'rune-shadow': '0 0 12px 2px rgba(107, 33, 168, 0.7)',
        'spellfire-shadow': '0 0 10px 3px rgba(220, 38, 38, 0.7)',
      },
      backgroundImage: {
        'animated-gradient': 'linear-gradient(270deg, #4f46e5, #3b82f6, #06b6d4, #4f46e5)',
        'hero-pattern': "url('/images/mtg-dark-bg.webp')",
        'commander-frame': "url('/images/commander-border.svg')",
        'arcane-scroll': "url('/images/arcane-scroll-texture.png')",
      },
      backgroundSize: {
        'size-400': '400% 400%',
      },
      animation: {
        'gradient-move': 'gradientMove 15s ease infinite',
        'flip-card': 'flipCard 0.6s ease-in-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-glow': 'pulse-glow 2s infinite',
        'magic-wisp': 'magicWisp 6s ease-in-out infinite',
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
        magicWisp: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)', opacity: 0.8 },
          '50%': { transform: 'translateY(-10px) translateX(5px)', opacity: 1 },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-pseudo-elements'),

    plugin(function ({ addComponents, theme }) {
      addComponents({
        '.btn-glow': {
          backgroundColor: theme('colors.glow-blue'),
          borderRadius: theme('borderRadius.xl-2'),
          color: '#fff',
          fontWeight: '700',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: theme('boxShadow.glow-blue'),
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.9)',
            transform: 'scale(1.07) rotate(-1deg)',
          },
        },
        '.input-glass': {
          backgroundColor: theme('colors.glass'),
          borderRadius: theme('borderRadius.xl-2'),
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          padding: `${theme('spacing.3')} ${theme('spacing.5')}`,
          color: '#fff',
          fontWeight: '600',
          fontSize: '1rem',
          outline: 'none',
          letterSpacing: '0.02em',
          '&::placeholder': {
            color: 'rgba(255, 255, 255, 0.35)',
            fontStyle: 'italic',
          },
          '&:focus': {
            borderColor: theme('colors.glow-purple'),
            boxShadow: theme('boxShadow.glow-purple'),
          },
        },
        '.rune-text': {
          fontFamily: "'Uncial Antiqua', cursive, serif",
          fontWeight: '400',
          fontSize: '1.1rem',
          color: theme('colors.arcane-purple'),
          textShadow: '0 0 6px rgba(168, 132, 33, 0.8)',
        },
        '.magic-card': {
          backgroundColor: 'rgba(40, 27, 60, 0.6)',
          borderRadius: theme('borderRadius.magic-lg'),
          boxShadow: theme('boxShadow.rune-shadow'),
          padding: theme('spacing.6'),
          border: `1.5px solid ${theme('colors.arcane-purple')}`,
          backdropFilter: 'blur(14px)',
          transition: 'transform 0.3s ease',
          '&:hover': {
            transform: 'scale(1.03)',
            boxShadow: theme('boxShadow.glow-purple'),
          },
        },
      });
    }),
  ],
};
