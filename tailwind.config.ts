import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Primary Colors
        'forest-green': '#2D5B3D',
        'earth-brown': '#8B4513',
        'sky-blue': '#87CEEB',
        'sunflower-yellow': '#FFD700',
        // Background Colors
        'cream-white': '#FFF8DC',
        'sage-gray': '#9CAF88',
        'bark-brown': '#4A4A3A',
        'stone-beige': '#F5F5DC',
        // Accent Colors
        'moss-green': '#8FBC8F',
        'clay-orange': '#CC7722',
        'ocean-teal': '#5F8A8B',
        'sunset-coral': '#FF6B6B',
      },
      fontFamily: {
        'serif': ['Merriweather', 'Georgia', 'serif'],
        'sans': ['Open Sans', 'Lato', 'sans-serif'],
        'cursive': ['Pacifico', 'Dancing Script', 'cursive'],
      },
      borderRadius: {
        'organic': '20px',
        'leaf': '30% 70% 70% 30% / 30% 30% 70% 70%',
        'stone': '40% 60% 60% 40% / 60% 40% 60% 40%',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
export default config;
