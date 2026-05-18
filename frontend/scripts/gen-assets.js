const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');
const iconSvgPath = path.join(assetsDir, 'icon.svg');
const iconPngPath = path.join(assetsDir, 'icon.png');
const splashSvgPath = path.join(assetsDir, 'splash.svg');
const splashPngPath = path.join(assetsDir, 'splash.png');

const runMagick = (args) => {
  execFileSync('magick', args, { stdio: 'inherit' });
};

// Generate icon.png (1024x1024)
runMagick([
  '-background',
  'none',
  '-density',
  '384',
  iconSvgPath,
  '-resize',
  '1024x1024',
  iconPngPath,
]);
console.log('icon.png generated');

// Generate splash.png (1284x2778 — standard splash size)
// Splash: purple bg, centered icon + wordmark
const svgSplash = `
<svg xmlns="http://www.w3.org/2000/svg" 
     width="1284" height="2778" viewBox="0 0 1284 2778">
  <rect width="1284" height="2778" fill="#4F46B8"/>
  <circle cx="572" cy="1320" r="130" fill="none" 
          stroke="white" stroke-width="38" opacity="0.92"/>
  <circle cx="712" cy="1320" r="130" fill="none" 
          stroke="white" stroke-width="38" opacity="0.92"/>
  <clipPath id="lc2">
    <circle cx="572" cy="1320" r="128"/>
  </clipPath>
  <circle cx="712" cy="1320" r="128" 
          fill="white" opacity="0.15" clip-path="url(#lc2)"/>
  <text x="642" y="1510" 
        font-family="system-ui, sans-serif"
        font-size="96" font-weight="700"
        fill="white" text-anchor="middle">TwoSpace</text>
  <text x="642" y="1600"
        font-family="system-ui, sans-serif"  
        font-size="48" font-weight="400"
        fill="white" opacity="0.7" 
        text-anchor="middle">Your private space</text>
</svg>
`;

fs.writeFileSync(splashSvgPath, svgSplash.trim(), 'utf8');

runMagick([
  '-background',
  'none',
  '-density',
  '384',
  splashSvgPath,
  '-resize',
  '1284x2778',
  splashPngPath,
]);
console.log('splash.png generated');

