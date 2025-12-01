/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mixed Theme colors
        'sidebar-bg': '#1e293b', // slate-800
        'sidebar-text': '#cbd5e1', // slate-300
        'sidebar-hover': '#334155', // slate-700
        'content-bg': '#f9fafb', // gray-50
        'card-bg': '#ffffff', // white
        'text-primary': '#111827', // gray-900
        'text-secondary': '#4b5563', // gray-600
        'border-color': '#e5e7eb', // gray-200
      },
    },
  },
  plugins: [],
}

