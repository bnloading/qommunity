module.exports = {
  darkMode: "class", // Enable class-based dark mode
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1F2937",
        secondary: "#3B82F6",
        accent: "#10B981",
        border: "#E5E7EB",
        light: "#F9FAFB",
        dark: "#111827",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0, 0, 0, 0.1)",
        card: "0 4px 6px rgba(0, 0, 0, 0.07)",
        hover: "0 10px 15px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
