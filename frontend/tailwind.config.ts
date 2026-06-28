import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050608',
          card: 'rgba(13, 16, 23, 0.4)',
          border: 'rgba(0, 240, 255, 0.15)',
          blue: '#00f0ff',
          blueGlow: 'rgba(0, 240, 255, 0.3)',
          purple: '#bd00ff',
          purpleGlow: 'rgba(189, 0, 255, 0.3)',
          dark: '#0d1017',
          gray: '#171d2b',
          text: '#e2e8f0',
        }
      },
      backgroundImage: {
        'cyber-gradient': 'radial-gradient(circle at 50% 50%, #121824 0%, #050608 100%)',
        'glow-gradient': 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(189, 0, 255, 0.1) 100%)'
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.25)',
        'glow-purple': '0 0 15px rgba(189, 0, 255, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'glow-pulse': 'glow 3s infinite alternate'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }
        }
      }
    },
  },
  plugins: [],
};

export default config;
