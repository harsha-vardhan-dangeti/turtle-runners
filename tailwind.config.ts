import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

/**
 * Turtle Runners design system.
 * Every colour, shadow and gradient the app is allowed to use lives here.
 */
const config: Config = {
  future: {
    // `hover:` only applies where a real pointer can hover. On phones and
    // iPads a tap otherwise leaves the hover state stuck on: cards stay
    // lifted and buttons stay raised until the next tap somewhere else.
    hoverOnlyWhenSupported: true,
  },
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAFDFB',
        ink: {
          DEFAULT: '#0A0F0C',
          muted: '#5C6B62',
        },
        hairline: '#E2EAE5',
        green: {
          primary: '#12A150',
          bright: '#2ED573',
          deep: '#0B6B36',
          forest: '#0A3D22',
          tint: '#E3F5EB',
        },
      },
      fontFamily: {
        display: ['var(--font-anton)', 'Impact', 'sans-serif'],
        sans: ['var(--font-grotesk)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        turtle: '0 14px 34px rgba(18,161,80,0.16)',
        'turtle-lg': '0 24px 60px rgba(18,161,80,0.22)',
        hairline: '0 1px 0 0 #E2EAE5',
      },
      backgroundImage: {
        accent: 'linear-gradient(135deg,#12A150,#0B6B36)',
        'dark-section': 'linear-gradient(165deg,#0A0F0C 0%,#0E2417 55%,#0A3D22 130%)',
        'paper-wash':
          'radial-gradient(900px 500px at 85% -5%, rgba(18,161,80,0.09), transparent 60%), radial-gradient(700px 420px at -10% 30%, rgba(46,213,115,0.07), transparent 60%)',
        'tape-stripe':
          'repeating-linear-gradient(90deg,#12A150 0 24px,#2ED573 24px 48px)',
      },
      letterSpacing: {
        display: '-0.01em',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        dashflow: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-360' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'accordion-down': {
          '0%': { height: '0', opacity: '0' },
          '100%': { height: 'var(--accordion-height)', opacity: '1' },
        },
        pulseglow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.16,1,0.3,1) both',
        marquee: 'marquee 34s linear infinite',
        dashflow: 'dashflow 14s linear infinite',
        'toast-in': 'toast-in 0.28s cubic-bezier(0.16,1,0.3,1) both',
        pulseglow: 'pulseglow 2.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        turtle: 'cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [
    // Touch screens (phones, iPads). Used to grow tap targets to thumb size
    // without changing how the site looks with a mouse.
    plugin(({ addVariant }) => {
      addVariant('pointer-coarse', '@media (pointer: coarse)');
    }),
  ],
};

export default config;
