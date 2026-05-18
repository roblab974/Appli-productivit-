import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        surface: "#0F172A",
        "surface-2": "#1E293B",
        border: "#334155",
        muted: "#475569",
        foreground: "#F8FAFC",
        "foreground-muted": "#94A3B8",
        accent: {
          blue: "#3B82F6",
          purple: "#8B5CF6",
          cyan: "#06B6D4",
          green: "#22C55E",
          amber: "#F59E0B",
          red: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        heading: ["Barlow Condensed", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)",
        "gradient-green": "linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(10px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        scaleIn: { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      boxShadow: {
        "glow-blue": "0 0 20px rgba(59,130,246,0.3)",
        "glow-purple": "0 0 20px rgba(139,92,246,0.3)",
        "glow-green": "0 0 20px rgba(34,197,94,0.3)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
      },
      borderRadius: {
        "xl": "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
