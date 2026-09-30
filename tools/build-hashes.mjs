// Bygger kortindex med bildfingeravtryck: www/hashes.json (id-lista) + www/hashes.bin (en vektor per kort).
// Körs av GitHub Actions (Bygg kortindex). Kräver: npm i --no-save sharp. Alla källor är gratis (TCGdex).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
const FP = require('../www/fingerprint.js');
const LANG = 'en', CONC = 24;

const list = await (await fetch(`https://api.tcgdex.net/v2/${LANG}/cards`)).json();
const cards = list.filter(c => c.image);
console.log(`${cards.length} kort med bild`);
const ids = [], vecs = [];
let done = 0, failed = 0;

async function one(c){
  for (let t = 0; t < 3; t++){
    try {
      const r = await fetch(c.image + '/low.webp');
      if (!r.ok) throw new Error(r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const { data } = await sharp(buf).resize(FP.CW, FP.CH, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      return FP.vector(FP.describe(data, FP.CW, FP.CH, 3));
    } catch { await new Promise(r => setTimeout(r, 500 * (t + 1))); }
  }
  return null;
}
let next = 0;
const results = new Array(cards.length);
await Promise.all(Array.from({ length: CONC }, async () => {
  while (next < cards.length){
    const i = next++; results[i] = await one(cards[i]);
    if (!results[i]) failed++;
    if (++done % 1000 === 0) console.log(`${done}/${cards.length} (misslyckade: ${failed})`);
  }
}));
for (let i = 0; i < cards.length; i++) if (results[i]){ ids.push(cards[i].id); vecs.push(results[i]); }
if (ids.length < cards.length * 0.9) throw new Error(`För många misslyckade: ${ids.length}/${cards.length}`);
const bin = Buffer.alloc(ids.length * FP.LEN);
vecs.forEach((v, i) => Buffer.from(v.buffer).copy(bin, i * FP.LEN));
fs.writeFileSync(new URL('../www/hashes.bin', import.meta.url), bin);
fs.writeFileSync(new URL('../www/hashes.json', import.meta.url), JSON.stringify({ len: FP.LEN, n: ids.length, ids }));
console.log(`Klart: ${ids.length} kort, ${(bin.length / 1e6).toFixed(1)} MB`);
