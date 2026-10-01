// Dagliga priser för alla kort: hämtas en gång per dygn av GitHub Actions (Uppdatera priser) och sparas på grenen "prices".
// Källor (alla gratis, inga nycklar krävs): pokemontcg.io (Cardmarket EUR + TCGplayer USD) och TCGCSV (TCGplayer USD, dagligen, nya set först).
// Ut: latest.json (senaste pris per TCGdex-id) och hist/<set>.json (ett pris per dag, de senaste HIST_DAYS dagarna).
//   latest.json: { d: "2026-10-01", k: [...fältnamn], c: { "sv10-109": [e, e7, e30, eh, u, uh, ur, u1] } }  (0 = saknas)
//   hist/<set>.json: { d: ["2026-09-30", ...], c: { "sv10-109": [[eur-cent per dag], [usd-cent per dag]] } }
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'pb', HIST_DAYS = 180, TODAY = new Date().toISOString().slice(0, 10);
const TCGDEX = 'https://api.tcgdex.net/v2/en', PTCG = 'https://api.pokemontcg.io/v2', TCSV = 'https://tcgcsv.com/tcgplayer/3';
const KEY = process.env.POKEMONTCG_API_KEY || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function json(url, headers = {}, tries = 5){
  for (let t = 0; t < tries; t++){
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 60000);
      const r = await fetch(url, { headers: { 'user-agent': 'KortKoll-prisuppdatering (github.com/macacan/Pokescan)', ...headers }, signal: ctl.signal }).finally(() => clearTimeout(to));
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e){ console.log(`  försök ${t + 1} misslyckades: ${url} (${e.message})`); await sleep(2000 * (t + 1)); }
  }
  return null;
}
const normName = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const numKey = n => String(n || '').split('/')[0].trim().replace(/^0+(?=\d)/, '').toLowerCase();
const setOf = id => id.slice(0, id.lastIndexOf('-'));
const r2 = v => (v > 0 ? Math.round(v * 100) / 100 : 0);

// 1) TCGdex: alla kort och set (id:n som appen använder)
const sets = await json(`${TCGDEX}/sets`), cards = await json(`${TCGDEX}/cards`);
if (!Array.isArray(sets) || !Array.isArray(cards)) throw new Error('TCGdex svarade inte');
console.log(`TCGdex: ${cards.length} kort, ${sets.length} set`);
const setName = new Map(sets.map(s => [s.id, s.name]));
const bySetNum = new Map();          // "setnamn|nummer" -> [kort]
const byPtcgId = new Map();          // pokemontcg.io-id -> TCGdex-id
for (const c of cards){
  const sid = setOf(c.id), k = normName(setName.get(sid)) + '|' + numKey(c.localId);
  if (!bySetNum.has(k)) bySetNum.set(k, []); bySetNum.get(k).push(c);
  const s2 = sid.replace(/^([a-z]+)0+(\d)/i, '$1$2').replace(/\./g, 'pt');
  byPtcgId.set(`${s2}-${numKey(c.localId)}`, c.id); byPtcgId.set(`${sid}-${numKey(c.localId)}`, c.id);
}
const pickByName = (list, name) => list.length === 1 ? list[0] : list.find(c => normName(c.name) === normName(name)) || list.find(c => normName(name).startsWith(normName(c.name))) || null;

const P = new Map();                 // TCGdex-id -> { e, e7, e30, eh, u, uh, ur, u1 } från pokemontcg.io
const T = new Map();                 // TCGdex-id -> { u, uh, ur, u1 } från TCGCSV (vinner över pokemontcg.io för TCGplayer)
const entry = id => { if (!P.has(id)) P.set(id, {}); return P.get(id); };
const IMG_P = new Map(), IMG_T = new Map();   // reservbilder: pokemontcg.io-sökväg och TCGplayer-produkt-id per TCGdex-id
const t0 = Date.now(), PTCG_BUDGET = 30 * 60e3;   // pokemontcg.io kan vara mycket långsamt: sluta efter 30 min och använd det som hunnits hämtas

// 2) pokemontcg.io: alla kort, 250 per sida (körs samtidigt som TCGCSV)
async function ptcgAll(){
let page = 1, total = Infinity, ptcgHits = 0;
const ptHead = KEY ? { 'X-Api-Key': KEY } : {};
while ((page - 1) * 250 < total && Date.now() - t0 < PTCG_BUDGET){
  const j = await json(`${PTCG}/cards?page=${page}&pageSize=250&select=id,name,number,set,images,cardmarket,tcgplayer`, ptHead);
  if (!j || !Array.isArray(j.data)){ console.log(`pokemontcg.io: sida ${page} saknas, hoppar vidare`); if (page > 200) break; page++; continue; }
  total = j.totalCount || 0;
  for (const d of j.data){
    let id = byPtcgId.get(`${d.set?.id}-${numKey(d.number)}`);
    if (!id){ const l = bySetNum.get(normName(d.set?.name) + '|' + numKey(d.number)); const hit = l && pickByName(l, d.name); if (hit) id = hit.id; }
    if (!id) continue;
    const im = String(d.images?.small || '').match(/images\.pokemontcg\.io\/(.+)\.png$/); if (im) IMG_P.set(id, im[1]);
    const e = entry(id), cm = d.cardmarket?.prices, tp = d.tcgplayer?.prices;
    if (cm){ e.e = r2(cm.trendPrice || cm.averageSellPrice || cm.lowPrice); e.e7 = r2(cm.avg7); e.e30 = r2(cm.avg30); e.eh = r2(cm.reverseHoloTrend || cm.reverseHoloSell); }
    if (tp){
      const m = v => r2(v && (v.market || v.mid || v.low));
      e.u = m(tp.normal || tp.unlimited); e.uh = m(tp.holofoil || tp.unlimitedHolofoil); e.ur = m(tp.reverseHolofoil); e.u1 = m(tp['1stEditionHolofoil'] || tp['1stEditionNormal'] || tp['1stEdition']);
    }
    ptcgHits++;
  }
  if (page % 10 === 0) console.log(`pokemontcg.io: sida ${page}, ${ptcgHits} kort kopplade`);
  page++; await sleep(KEY ? 150 : 1200);
}
console.log(`pokemontcg.io: ${ptcgHits} kort kopplade (${page - 1} sidor, ${Math.round((Date.now() - t0) / 1000)} s)`);
}

// 3) TCGCSV: TCGplayers priser för varje set (nyare och dagligen uppdaterade, skriver över TCGplayer-delen)
async function tcsvAll(){
const tcsvKey = n => normName(String(n || '').replace(/^[^:]*:\s*/, ''));
const groups = (await json(`${TCSV}/groups`))?.results || [];
const setKeys = sets.map(s => ({ id: s.id, k: normName(s.name) }));
let tcsvHits = 0;
const sub = n => String(n || '').toLowerCase();
for (const g of groups){
  const gk = tcsvKey(g.name); if (!gk) continue;
  const s = setKeys.find(x => x.k === gk) || setKeys.filter(x => gk.includes(x.k) && x.k.length >= 5).sort((a, b) => b.k.length - a.k.length)[0];
  if (!s) continue;
  const [prods, prs] = await Promise.all([json(`${TCSV}/${g.groupId}/products`), json(`${TCSV}/${g.groupId}/prices`)]);
  if (!prods?.results || !prs?.results) continue;
  const price = new Map();
  for (const x of prs.results){ if (!price.has(x.productId)) price.set(x.productId, []); price.get(x.productId).push(x); }
  for (const p of prods.results){
    const num = (p.extendedData || []).find(e => e.name === 'Number')?.value; if (!num) continue;
    const l = bySetNum.get(s.k + '|' + numKey(num)); const hit = l && pickByName(l, p.cleanName || p.name); if (!hit) continue;
    if (!IMG_T.has(hit.id)) IMG_T.set(hit.id, p.productId);
    const rows = price.get(p.productId) || [];
    const v = re => { const x = rows.find(r => re.test(sub(r.subTypeName))); return x ? r2(x.marketPrice || x.midPrice || x.lowPrice) : 0; };
    const u = v(/^normal$|^unlimited$/), uh = v(/^holofoil$|^unlimited holofoil$/), ur = v(/reverse/), u1 = v(/1st edition/);
    if (u || uh || ur || u1){ T.set(hit.id, { u, uh, ur, u1 }); tcsvHits++; }
  }
  await sleep(150);
}
console.log(`TCGCSV: ${tcsvHits} kort med pris (${groups.length} grupper, ${Math.round((Date.now() - t0) / 1000)} s)`);
}
await Promise.all([ptcgAll(), tcsvAll()]);
for (const [id, t] of T){ const e = entry(id); for (const k of ['u', 'uh', 'ur', 'u1']) if (t[k]) e[k] = t[k]; }
if (P.size < cards.length * 0.3) throw new Error(`För få priser (${P.size}/${cards.length}), sparar inte`);

// 4) Skriv latest.json
const K = ['e', 'e7', 'e30', 'eh', 'u', 'uh', 'ur', 'u1'];
const latest = { d: TODAY, k: K, c: {} };
for (const [id, e] of P){
  const a = K.map(k => e[k] || 0); while (a.length && !a[a.length - 1]) a.pop();
  if (a.length) latest.c[id] = a;
}
fs.mkdirSync(path.join(OUT, 'hist'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify(latest));
console.log(`latest.json: ${Object.keys(latest.c).length} kort med pris`);

// 4b) Reservbilder för kort som saknar bild hos TCGdex (nya set får ofta bilder sent): img.json { c: { id: ["sv9/1", 123456] } }
const img = { d: TODAY, c: {} };
for (const c of cards) if (!c.image){ const p = IMG_P.get(c.id) || 0, t = IMG_T.get(c.id) || 0; if (p || t) img.c[c.id] = [p, t]; }
fs.writeFileSync(path.join(OUT, 'img.json'), JSON.stringify(img));
console.log(`img.json: ${Object.keys(img.c).length} kort utan TCGdex-bild fick reservbild (av ${cards.filter(c => !c.image).length})`);

// 5) Historik per set: lägg till dagens pris (ett värde i EUR och ett i USD, i cent) och behåll de senaste HIST_DAYS dagarna
const bySet = new Map();
for (const id of Object.keys(latest.c)){ const s = setOf(id); if (!bySet.has(s)) bySet.set(s, []); bySet.get(s).push(id); }
for (const [sid, ids] of bySet){
  const f = path.join(OUT, 'hist', sid.replace(/[^a-zA-Z0-9.\-_]/g, '_') + '.json');
  let h = { d: [], c: {} };
  try { h = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  let di = h.d.indexOf(TODAY);
  if (di < 0){ h.d.push(TODAY); di = h.d.length - 1; }
  const n = h.d.length;
  for (const id of ids){
    const e = P.get(id), eur = Math.round((e.e || e.eh || 0) * 100), usd = Math.round((e.u || e.uh || e.ur || e.u1 || 0) * 100);
    const s = h.c[id] || [[], []];
    for (const a of s){ while (a.length < n) a.push(0); }
    s[0][di] = eur; s[1][di] = usd; h.c[id] = s;
  }
  for (const s of Object.values(h.c)) for (const a of s){ while (a.length < n) a.push(0); }
  const cut = Math.max(0, h.d.length - HIST_DAYS);
  if (cut){ h.d = h.d.slice(cut); for (const s of Object.values(h.c)){ s[0] = s[0].slice(cut); s[1] = s[1].slice(cut); } }
  fs.writeFileSync(f, JSON.stringify(h));
}
console.log(`Historik: ${bySet.size} set, dag ${TODAY}`);
