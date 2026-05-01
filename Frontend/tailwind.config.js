/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#137fec",
                "background": "hsl(var(--background))",
                "foreground": "hsl(var(--foreground))",
                "hero-sub": "hsl(var(--hero-sub))",
                "background-light": "#f6f7f8",
                "background-dark": "#101922",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"],
                "geist": ["Geist Sans", "sans-serif"],
                "general": ["General Sans", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.25rem",
                lg: "0.5rem",
                xl: "0.75rem",
                full: "9999px",
            },
        },
    },
    plugins: [],
}
