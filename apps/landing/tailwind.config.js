const uiPreset = require('../../packages/ui/tailwind.preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  presets: [uiPreset],
  plugins: [],
};
