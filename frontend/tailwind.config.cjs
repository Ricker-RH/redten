module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        table: {
          bg: "#06111c",
          felt: "#0b3b3c"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(56,189,248,0.7)"
      }
    }
  },
  plugins: []
}

