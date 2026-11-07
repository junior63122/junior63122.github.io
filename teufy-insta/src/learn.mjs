// Apprentissage : le bot mesure chaque publication et s'en sert pour choisir la suite.
//
// 1. Mesure : statistiques Instagram de chaque post (portée, likes, commentaires,
//    enregistrements, partages, abonnements gagnés, visites du profil, temps de
//    visionnage des reels) + nombre d'abonnés chaque jour → apprentissage.json
// 2. Score : (likes + 2·commentaires + 3·enregistrements + 4·partages + 10·abonnements)
//    ÷ portée, comparé à la médiane du même format (carrousel, image, reel), avec un
//    bonus portée (nouveaux publics) et rétention (reels regardés jusqu'au bout).
// 3. Choix : pour chaque décision (accroche, intro, question, sujet de débat, heure,
//    soirées mises en avant…) on tire au sort en favorisant ce qui a marché, tout en
//    continuant à tester les options peu essayées (échantillonnage de Thompson).
import { readFileSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { genreOf, styleLabel } from './genres.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_FILE = path.join(ROOT, 'apprentissage.json');

export function loadData() {
  return existsSync(DATA_FILE) ? JSON.parse(readFileSync(DATA_FILE, 'utf8')) : { posts: [], abonnes: [] };
}

export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}

// --- Score d'une publication -------------------------------------------------

function rawRate(m) {
  const reach = Math.max(m.reach || 0, 50);
  const inter = (m.likes || 0) + 2 * (m.comments || 0) + 3 * (m.saved || 0) + 4 * (m.shares || 0) + 10 * (m.follows || 0) + 0.5 * (m.profile_visits || 0);
  let r = inter / reach;
  if (m.ig_reels_avg_watch_time && m.duree) r *= 0.6 + 0.8 * Math.min(1, m.ig_reels_avg_watch_time / 1000 / m.duree);
  return r;
}
const median = (a) => { if (!a.length) return 1; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 1; };
const format = (p) => (p.type === 'reel' ? 'reel' : p.nb_images === 1 ? 'image' : 'carrousel');

// Score normalisé : 1 = performance habituelle du format, 2 = deux fois mieux.
export function scorePosts(data) {
  const measured = data.posts.filter((p) => p.metrics && p.metrics.reach);
  const byFmt = {};
  for (const p of measured) (byFmt[format(p)] ||= []).push(p);
  for (const list of Object.values(byFmt)) {
    const mr = median(list.map((p) => rawRate(p.metrics)));
    const mreach = median(list.map((p) => p.metrics.reach));
    for (const p of list) p.score = +(0.7 * (rawRate(p.metrics) / mr) + 0.3 * (p.metrics.reach / mreach)).toFixed(3);
  }
  return measured;
}

// --- Modèle ----------------------------------------------------------------

export function buildModel(data = loadData()) {
  const posts = scorePosts(data);
  const arms = {}; // "pool:option" → { n, sum }
  const feats = {}; // caractéristique de soirée → { n, sum }
  const add = (map, k, v) => { const s = (map[k] ||= { n: 0, sum: 0 }); s.n++; s.sum += v; };
  for (const p of posts) {
    for (const [pool, opt] of Object.entries(p.choix || {})) add(arms, `${pool}:${opt}`, p.score);
    for (const f of new Set(p.features || [])) add(feats, f, p.score);
  }
  return { arms, feats, nPosts: posts.length };
}

const PRIOR = 1, K = 2;
const shrunk = (s) => (s ? (s.sum + PRIOR * K) / (s.n + K) : PRIOR);
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// Sélecteur : choisit une option dans une liste en favorisant ce qui marche.
export function chooser(model, r) {
  const choix = {};
  return {
    choix,
    pick(pool, options, idOf = (o) => hash(typeof o === 'string' ? o : JSON.stringify(o))) {
      if (!options.length) return undefined;
      let best, bestV = -Infinity;
      for (const o of options) {
        const s = model.arms[`${pool}:${idOf(o)}`];
        const v = shrunk(s) + gauss(r) * 0.35 / Math.sqrt((s?.n || 0) + 1);
        if (v > bestV) { bestV = v; best = o; }
      }
      choix[pool] = idOf(best);
      return best;
    },
  };
}

// --- Soirées : caractéristiques et classement -------------------------------

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function eventFeatures(e) {
  const f = [`genre:${genreOf(e)}`, `source:${e.source}`];
  for (const s of styleLabel(e).split(' · ').filter(Boolean)) f.push(`style:${slug(s)}`);
  if (e.venue) f.push(`lieu:${slug(e.venue)}`);
  if (e.city) f.push(`ville:${slug(e.city)}`);
  f.push(`prix:${e.price == null ? 'inconnu' : e.price === 0 ? 'gratuit' : e.price <= 10 ? 'petit' : e.price <= 25 ? 'moyen' : 'cher'}`);
  const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23' }).format(new Date(e.start));
  f.push(`horaire:${h >= 6 && h < 20 ? 'jour' : 'nuit'}`);
  return f;
}

// Note d'une soirée : qualité des infos + popularité + ce que le public a aimé.
export function scoreEvent(e, model, r) {
  let s = 0;
  if (e.manuel) s += 10;
  if (e.mise_en_avant) s += 5;
  if (e.image) s += 3;
  if (e.venue) s += 1;
  if (styleLabel(e)) s += 1;
  if (e.price != null) s += 0.5;
  if (e.sources) s += 1.5; // en vente sur Shotgun ET DICE : soirée importante
  if (e.popularite) s += Math.log10(1 + e.popularite) * 1.5;
  for (const f of eventFeatures(e)) {
    const st = model.feats[f];
    if (st) s += 2 * Math.log(shrunk(st)) + (r ? gauss(r) * 0.3 / Math.sqrt(st.n + 1) : 0);
  }
  return s;
}

// Les meilleures soirées, avec un peu de diversité (2 max par lieu).
export function selectBest(list, n, model, r) {
  const ranked = list.map((e) => ({ e, s: scoreEvent(e, model, r) })).sort((a, b) => b.s - a.s);
  const out = [];
  const lieux = {};
  for (const { e } of ranked) {
    const k = slug(e.venue) || e.name;
    if ((lieux[k] || 0) >= 2) continue;
    lieux[k] = (lieux[k] || 0) + 1;
    out.push(e);
    if (out.length >= n) break;
  }
  return out;
}

// --- Collecte des statistiques ------------------------------------------------

export async function collect({ hist, ig, api, now = new Date() }) {
  const data = loadData();
  const byMedia = new Map(data.posts.map((p) => [p.media, p]));
  for (const h of hist) {
    if (!h.media || !h.publication) continue;
    if (!byMedia.has(h.media)) {
      const p = { media: h.media, ...h.publication, publie_le: h.le };
      data.posts.push(p);
      byMedia.set(h.media, p);
    }
  }
  let n = 0;
  for (const p of data.posts) {
    const age = (now - new Date(p.publie_le)) / 86400e3;
    if (age < 0.9 || age > 21) continue; // on suit chaque post de J+1 à J+21
    if (p.mesure_le && (now - new Date(p.mesure_le)) / 86400e3 < 0.9) continue;
    const m = await api.insights(p.media, p.type === 'reel', ig);
    if (m) { p.metrics = { ...m, duree: p.duree }; p.mesure_le = now.toISOString(); n++; }
  }
  const followers = await api.followers(ig).catch(() => null);
  const jour = now.toISOString().slice(0, 10);
  if (followers != null && !data.abonnes.some((a) => a.date === jour)) data.abonnes.push({ date: jour, n: followers });
  data.abonnes = data.abonnes.slice(-400);
  scorePosts(data);
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  await writeFile(path.join(ROOT, 'RAPPORT.md'), rapport(data));
  return n;
}

// --- Rapport lisible ----------------------------------------------------------

export function rapport(data) {
  const posts = scorePosts(data).sort((a, b) => b.score - a.score);
  const model = buildModel(data);
  const lignes = (arr) => arr.map((p) => `| ${p.date} | ${p.id} | ${p.metrics.reach} | ${p.metrics.likes ?? '-'} | ${p.metrics.comments ?? '-'} | ${p.metrics.saved ?? '-'} | ${p.metrics.shares ?? '-'} | ${p.metrics.follows ?? '-'} | ${p.score} |`).join('\n');
  const ab = data.abonnes;
  const gain = ab.length > 1 ? ab[ab.length - 1].n - (ab.find((a) => a.date >= new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10)) || ab[0]).n : null;
  const top = Object.entries(model.feats).filter(([, s]) => s.n >= 2).map(([k, s]) => [k, shrunk(s)]).sort((a, b) => b[1] - a[1]);
  return `# Teufy · ce qui marche sur Instagram

Mis à jour automatiquement chaque jour. Score 1 = performance habituelle du format, 2 = deux fois mieux.

**Abonnés** : ${ab.at(-1)?.n ?? '?'}${gain != null ? ` (${gain >= 0 ? '+' : ''}${gain} sur 30 jours)` : ''} · **Publications mesurées** : ${posts.length}

## Meilleures publications

| Date | Type | Portée | Likes | Comm. | Enreg. | Partages | Abonnements | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${lignes(posts.slice(0, 10))}

${posts.length > 10 ? `## Moins bonnes

| Date | Type | Portée | Likes | Comm. | Enreg. | Partages | Abonnements | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${lignes(posts.slice(-5).reverse())}
` : ''}
## Ce que le public préfère (soirées)

${top.slice(0, 12).map(([k, v]) => `- ${k} : ${v.toFixed(2)}`).join('\n') || '- Pas encore assez de données (il faut quelques semaines).'}

## Ce qui marche moins

${top.slice(-6).reverse().map(([k, v]) => `- ${k} : ${v.toFixed(2)}`).join('\n') || '-'}
`;
}
