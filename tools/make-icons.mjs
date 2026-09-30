// Skapar appens ikoner och startbilder från SVG-mallen i koden. Kräver: npm i --no-save sharp
import fs from 'node:fs';
import sharp from 'sharp';

const BG = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4cca"/><stop offset="1" stop-color="#141a4d"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/>`;
// Kort + sökarhörn. s = skala runt mitten (så ikonen håller sig inom Androids säkra yta)
const mark = (s = 1) => `<g transform="translate(512 512) scale(${s}) translate(-512 -512)">
  <g fill="none" stroke="#ffcb05" stroke-width="44" stroke-linecap="round" stroke-linejoin="round">
    <path d="M190 330V220a30 30 0 0 1 30-30h110"/><path d="M694 190h110a30 30 0 0 1 30 30v110"/>
    <path d="M834 694v110a30 30 0 0 1-30 30H694"/><path d="M330 834H220a30 30 0 0 1-30-30V694"/>
  </g>
  <g transform="rotate(-7 512 512)">
    <rect x="322" y="236" width="380" height="552" rx="36" fill="#fff6dc" stroke="#ffcb05" stroke-width="22"/>
    <rect x="356" y="276" width="312" height="262" rx="18" fill="url(#art)"/>
    <path d="M512 322l22 70 70 22-70 22-22 70-22-70-70-22 70-22z" fill="#fff" opacity=".95"/>
    <rect x="356" y="572" width="240" height="26" rx="13" fill="#b9bfe2"/><rect x="356" y="622" width="312" height="18" rx="9" fill="#d7dbef"/><rect x="356" y="660" width="270" height="18" rx="9" fill="#d7dbef"/>
  </g></g>`;
const ART = `<defs><linearGradient id="art" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#f85888"/></linearGradient></defs>`;
const svg = (body, w = 1024, h = 1024) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1024 1024">${ART}${body}</svg>`);
const png = (buf, size, out) => sharp(buf).resize(size, size).png().toFile(out);

fs.mkdirSync('assets/src', { recursive: true });
fs.writeFileSync('assets/src/icon.svg', svg(BG + mark(1)));
await png(svg(BG + mark(1)), 1024, 'assets/icon-only.png');
await png(svg(mark(.78)), 1024, 'assets/icon-foreground.png');       // genomskinlig, inom säkra ytan
await png(svg(BG), 1024, 'assets/icon-background.png');
// Startbild: mörkblå botten med märket i mitten
for (const out of ['assets/splash.png', 'assets/splash-dark.png']){
  const s = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">${ART}<rect width="2732" height="2732" fill="#1b2366"/><g transform="translate(866 866) scale(1)">${mark(1).replace('<g transform="translate(512 512) scale(1) translate(-512 -512)">', '<g>')}</g></svg>`);
  await sharp(s).png().toFile(out);
}
await png(svg(BG + mark(1)), 512, 'www/icon-512.png');
await png(svg(BG + mark(1)), 192, 'www/icon-192.png');
await png(svg(BG + mark(1)), 180, 'www/apple-touch-icon.png');
await png(svg(BG + mark(.72)), 512, 'www/icon-maskable-512.png');
console.log('Ikoner klara');
