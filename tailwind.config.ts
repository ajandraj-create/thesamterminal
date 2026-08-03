import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070A08",        // near-black with a green-tinged depth
        panel: "#0D120F",
        card: "#121813",
        edge: "rgba(34,229,101,0.16)",
        edgesoft: "rgba(184,184,184,0.10)",
        bull: "#2EBD85",
        bear: "#E5484D",
        warn: "#FACC15",
        gold: "#22E565",      // neon green accent (was gold)
        goldsoft: "#7CFFB0",  // soft mint highlight
        bronze: "#0F9E4A",   // deep green
        ai: "#22E565",
        muted: "#B8B8B8",
        dim: "#7A7A82",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "JetBrains Mono", "monospace"],
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        gridDrift: { "0%": { backgroundPosition: "0 0" }, "100%": { backgroundPosition: "48px 48px" } },
        tape: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        flashUp: { "0%": { color: "#10B981" }, "100%": { color: "#E6EAF2" } },
        flashDown: { "0%": { color: "#F43F5E" }, "100%": { color: "#E6EAF2" } },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.55s ease-out both",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        gridDrift: "gridDrift 14s linear infinite",
        tape: "tape 40s linear infinite",
        flashUp: "flashUp 0.6s ease-out",
        flashDown: "flashDown 0.6s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
