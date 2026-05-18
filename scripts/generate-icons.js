// Generates simple SVG-based PNG icons for PWA
// Run: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");

const iconDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });

// Create SVG icon
const svgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#g)"/>
  <text x="50%" y="56%" font-family="system-ui" font-weight="bold" font-size="${size * 0.45}" fill="white" text-anchor="middle" dominant-baseline="middle">D</text>
</svg>`;

// Write SVG files (browsers accept SVG for PWA in some cases)
// For proper PNG, you'd use sharp or canvas — this creates placeholder SVGs
fs.writeFileSync(path.join(iconDir, "icon-192.png"), svgIcon(192));
fs.writeFileSync(path.join(iconDir, "icon-512.png"), svgIcon(512));
fs.writeFileSync(path.join(iconDir, "icon.svg"), svgIcon(512));

console.log("Icons generated in public/icons/");
console.log("Note: These are SVG files saved as .png — for production, replace with actual PNG files.");
