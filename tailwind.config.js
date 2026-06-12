/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        base:     '#0d0d14',
        surface:  '#13131e',
        panel:    '#17172a',
        elevated: '#1e1e30',
        hover:    '#242438',
        'ui-active': '#2a2a45',
        // Accent
        accent: {
          DEFAULT: '#7c5cfc',
          light:   '#9b7fff',
        },
        // Text
        primary: '#f0f0f8',
        muted:   '#7a7a9e',
        dim:     '#4a4a6a',
        // Status
        danger:  '#ef4444',
        success: '#22c55e',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '22px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
        md: '0 8px 32px rgba(0, 0, 0, 0.4)',
        lg: '0 20px 60px rgba(0, 0, 0, 0.5)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      gridTemplateColumns: {
        editor: '56px 1fr 300px',
        layer:  '18px 22px 1fr auto',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInSimple: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        slideUp:       'slideUp 0.2s ease',
        fadeIn:        'fadeIn 0.15s ease',
        fadeInSimple:  'fadeInSimple 0.15s ease',
      },
    },
  },
  plugins: [],
};
