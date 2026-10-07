const colors = require("tailwindcss/colors");

// Brand palette: tonal ramps generated from the 4 design-system colors
// (Primary #E65100, Secondary #37474F, Tertiary #048BFF, Neutral #88726B) —
// see src/theme/colors.js, which mirrors these same values for JS-side use
// (icon colors, ActivityIndicator, etc). `brand` carries the Neutral role,
// `info` carries the Tertiary role, so existing brand-*/info-* classNames
// across the app pick up the new colors without any per-screen changes.
// success/warning/danger stay as semantic status colors — see
// src/theme/status.js and .claude/skills/ui-design/skill.md.
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8f6",
          100: "#f1eeed",
          200: "#e3bfb2",
          300: "#c9c0bc",
          400: "#ae9f9a",
          500: "#998680",
          600: "#88726B",
          700: "#72605a",
          800: "#5c4e49",
          900: "#271813",
        },
        primary: {
          50: "#faf5f2",
          100: "#f4e7e0",
          200: "#e6c7b8",
          300: "#d6a58c",
          400: "#c17752",
          500: "#b15324",
          600: "#A43700",
          700: "#8a2e00",
          800: "#702500",
          900: "#591e00",
        },
        secondary: {
          50: "#f6f7f8",
          100: "#eaeced",
          200: "#ced3d5",
          300: "#b0b8bc",
          400: "#889499",
          500: "#69777e",
          600: "#506169",
          700: "#435158",
          800: "#364247",
          900: "#2b3439",
        },
        success: colors.emerald,
        warning: colors.amber,
        danger: {
          50: "#fcf4f4",
          100: "#f7e4e4",
          200: "#ecbfbf",
          300: "#e09898",
          400: "#d06363",
          500: "#c43a3a",
          600: "#BA1A1A",
          700: "#9c1616",
          800: "#7e1212",
          900: "#640e0e",
        },
        info: {
          50: "#f2f7fb",
          100: "#e0ebf6",
          200: "#b8d1eb",
          300: "#8cb5df",
          400: "#528fce",
          500: "#2471c1",
          600: "#005AB7",
          700: "#004c9a",
          800: "#003d7c",
          900: "#003163",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
