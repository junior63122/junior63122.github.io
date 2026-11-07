#!/usr/bin/env node
// Usage :
//   node src/run.mjs auto   [preparer|publier]   → la publication prévue aujourd'hui dans le calendrier (ou rien)
//   node src/run.mjs mois                          → aperçu des 9 publications du mois (jamais publié)
//   node src/run.mjs <type>[:variante] [preparer|publier]
//        types : incontournables:commercial, incontournables:techno, bonplan:petits-prix, bonplan:a-reserver,
//                debat, reel:weekend, reel:techno, reel:petits-prix
// Options : --dry-run  --now=2026-11-09T12:00:00Z  --fixtures=tests/fixtures  --quoi (affiche seulement la publication du jour)
import { readFile, writeFile, rm, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectEvents, filterEvents } from './sources.mjs';
import { windowFor, rolling, isoLocal, plage, slotOfDay, daysOfMonth } from './dates.mjs';
import { isTechno } from './genres.mjs';
import { captionIncontournables, captionBonPlan, captionDebat, captionReel, rng, pick } from './captions.mjs';
import { igConfig, publishCarousel, publishSingle, publishReel, permalink } from './instagram.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const val = (n) => flag(n)?.split('=').slice(1).join('=');
const [cible = 'auto', etape = 'tout'] = args.filter((a) => !a.startsWith('--'));
const DRY = !!flag('dry-run') || process.env.DRY_RUN === 'true' || cible === 'mois';
const NOW = val('now') ? new Date(val('now')) : new Date();
const MEDIA_DIR = path.join(ROOT, 'media');
const MEDIA_BASE = (process.env.MEDIA_BASE_URL || 'https://junior63122.github.io/teufy-insta/media').replace(/\/$/, '');
const HIST_FILE = path.join(ROOT, 'historique.json');

const config = JSON.parse(await readFile(path.join(ROOT, 'config.json'), 'utf8'));
const R = config.reglages;
const hist = existsSync(HIST_FILE) ? JSON.parse(await readFile(HIST_FILE, 'utf8')) : [];
const usedHere = new Set(); // débats / bons plans déjà pris dans ce lancement (aperçu du mois)

// --- Quelle(s) publication(s) ? --------------------------------------------

const slotFor = (d) => { const s = slotOfDay(d); return config.calendrier.find((c) => c.jour === s.jour && c.rang === s.rang); };
const slotId = (s) => [s.type, s.variante].filter(Boolean).join('-');

let jobs;
if (cible === 'auto') {
  const s = slotFor(NOW);
  if (flag('quoi')) { await output('slot', s ? slotId(s) : ''); console.log(s ? slotId(s) : 'rien'); process.exit(0); }
  if (!s) { console.log(`Rien de prévu le ${slotOfDay(NOW).date} dans le calendrier.`); process.exit(0); }
  jobs = [{ slot: s, now: NOW }];
} else if (cible === 'mois') {
  jobs = daysOfMonth(NOW).map((d) => ({ slot: slotFor(d), now: d })).filter((j) => j.slot);
  console.log(`Aperçu du mois : ${jobs.length} publications`);
} else {
  const [type, variante] = cible.split(':');
  jobs = [{ slot: { type, variante }, now: NOW }];
}

let cache;
async function events() {
  if (!cache) {
    const fixtures = val('fixtures');
    cache = await collectEvents(config, { root: ROOT, debugDir: path.join(ROOT, 'out', 'debug'), fixturesDir: fixtures && path.resolve(fixtures) });
    console.log('Sources :');
    for (const r of cache.report) console.log(`  ${r.source.padEnd(8)} ${r.erreur ? '✗ ' + r.erreur : `${r.evenements} événement(s)`}  ${r.url || ''}`);
    console.log(`  → ${cache.events.length} événement(s) uniques au total`);
  }
  return cache.events;
}

if (cible === 'mois') await rm(MEDIA_DIR, { recursive: true, force: true });
const echecs = [];
for (const j of jobs) {
  const id = cible === 'mois' ? `${isoLocal(j.now)}-${slotId(j.slot)}` : slotId(j.slot);
  try {
    if (etape === 'preparer' || etape === 'tout') await prepare(j.slot, j.now, id);
    if (etape === 'publier' || etape === 'tout') await publishPrepared(id);
  } catch (err) {
    console.error(`[${id}] ✗ ${err.message}`);
    echecs.push(id);
  }
}
if (echecs.length) die(`Échec : ${echecs.join(', ')}`);

// --- Préparation ------------------------------------------------------------

async function prepare(slot, now, id) {
  const { renderPages, carouselPages, reelPages, debatPage, bonPlanManuelPage } = await import('./render.mjs');
  const dir = path.join(MEDIA_DIR, id);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const stamp = isoLocal(now);
  const seed = `${stamp}-${id}`;
  const villes = config.villes;
  const pickEv = async (win, pred = () => true) => filterEvents(await events(), { ...win, villes }).filter(pred);
  const cheap = (e) => e.price != null && e.price <= R.petit_prix_max;
  let pub;

  if (slot.type === 'debat') {
    const used = new Set([...hist.map((h) => h.debat).filter(Boolean), ...usedHere]);
    const all = JSON.parse(await readFile(path.join(ROOT, 'contenus', 'debats.json'), 'utf8'));
    let pool = all.filter((d) => !used.has(d.id));
    if (!pool.length) pool = all; // tout a été utilisé : on recommence
    const debat = pick(rng(seed), pool);
    usedHere.add(debat.id);
    const files = await renderPages(debatPage({ debat, config }), dir, `debat-${stamp}`, { width: 1080, height: 1350 });
    pub = { images: files, legende: captionDebat({ debat, seed }), debat: debat.id };
  } else if (slot.type === 'bonplan') {
    const manuel = await bonPlanManuel(now);
    if (manuel) {
      usedHere.add(manuel.titre);
      const files = await renderPages(bonPlanManuelPage({ bp: manuel, config }), dir, `bonplan-${stamp}`, { width: 1080, height: 1350 });
      pub = { images: files, legende: captionBonPlan({ manuel, seed }), bonplan: manuel.titre };
    } else {
      let variante = slot.variante;
      let win = rolling(now, 0, 10);
      let list = variante === 'petits-prix' ? await pickEv(win, cheap) : [];
      if (list.length < 3) { variante = 'a-reserver'; win = rolling(now, 7, 45); list = await pickEv(win); }
      if (list.length < 3) { win = rolling(now, 2, 45); list = await pickEv(win); }
      need(list, 2);
      const chosen = chrono(list.slice(0, R.soirees_par_carrousel));
      const reserve = variante === 'a-reserver';
      const pages = carouselPages({
        events: chosen, config,
        couverture: reserve
          ? { pastille: 'Bon plan', titre: 'À réserver\navant sold out', sousTitre: 'Les grosses dates des prochaines semaines', compte: 'Swipe →' }
          : { pastille: 'Bon plan', titre: 'Sortir\nsans se ruiner', sousTitre: `Gratuit ou moins de ${R.petit_prix_max} € · ${plage(win.from, win.to)}`, compte: 'Swipe →' },
        agenda: { titre: reserve ? 'Les dates' : 'Petits prix', avecMois: reserve },
        fin: reserve
          ? { titre: 'Prends\ntes places', question: 'Laquelle te tente le plus ? 👇', tag: '📌 Enregistre pour plus tard' }
          : { titre: 'Partage\nle bon plan', question: 'Tu connais d\'autres bons plans ? 👇', tag: '💸 Tag ton pote toujours fauché' },
      });
      const files = await renderPages(pages, dir, `bonplan-${stamp}`, { width: 1080, height: 1350 });
      pub = { images: files, legende: captionBonPlan({ variante, events: chosen, ...win, seed }), soirees: chosen };
    }
  } else if (slot.type === 'incontournables') {
    const techno = slot.variante === 'techno';
    const pred = techno ? isTechno : (e) => !isTechno(e);
    let win = windowFor([1, 2, 3, 4, 5, 6, 7], now);
    win.from = new Date(Math.max(win.from.getTime(), now.getTime() - 6 * 3600e3));
    let list = await pickEv(win, pred);
    let elargi = false;
    if (list.length < 3) { win = rolling(now, 0, 14); list = await pickEv(win, pred); elargi = true; }
    need(list, 2);
    const chosen = chrono(list.slice(0, R.soirees_par_carrousel));
    const periode = elargi ? 'des prochains jours' : 'de la semaine';
    const pages = carouselPages({
      events: chosen, config, theme: techno ? 'techno' : 'club',
      couverture: techno
        ? { pastille: plage(win.from, win.to), titre: 'Les incontournables\ntechno', sousTitre: `La sélection ${periode} sur la Côte`, compte: `${chosen.length} dates · swipe →` }
        : { pastille: plage(win.from, win.to), titre: `Les incontournables\n${periode}`, sousTitre: 'House · shatta · afro · électro', compte: `${chosen.length} soirées · swipe →` },
      agenda: { titre: techno ? 'Les dates' : 'Le programme' },
      fin: techno
        ? { titre: 'On se voit\nsur le dancefloor', question: 'Tu seras à laquelle ? 👇', tag: 'Tag ton binôme de rave' }
        : { titre: 'Tu sors\noù ?', question: 'Dis-nous en commentaire 👇', tag: '👯 Tag la personne qui vient avec toi' },
    });
    const files = await renderPages(pages, dir, `incontournables-${stamp}`, { width: 1080, height: 1350 });
    pub = { images: files, legende: captionIncontournables({ variante: slot.variante, events: chosen, ...win, seed, config }), soirees: chosen };
  } else if (slot.type === 'reel') {
    let variante = slot.variante;
    let win = windowFor([5, 6, 7], now);
    const preds = { weekend: () => true, techno: isTechno, 'petits-prix': cheap };
    let list = await pickEv(win, preds[variante]);
    let elargi = false;
    if (list.length < 3 && variante !== 'weekend') { win = rolling(now, 0, 9); list = await pickEv(win, preds[variante]); elargi = true; }
    if (list.length < 3) { variante = 'weekend'; win = windowFor([5, 6, 7], now); list = await pickEv(win); elargi = false; }
    need(list, 2);
    const chosen = pickReel(list, R.soirees_par_reel);
    const r = rng(seed);
    const hooks = {
      weekend: [
        { pre: 'POV :', titre: "t'as toujours\npas de plan\nce week-end", emoji: '👀' },
        { pre: 'Ce week-end', titre: 'tu sors\noù ?', emoji: '🪩' },
        { pre: 'Rappel :', titre: 'le canapé\npeut attendre', emoji: '🛋️' },
      ],
      techno: [
        { pre: 'TECHNO ONLY', titre: 'Ce week-end\nça tape', emoji: '' },
        { pre: 'Pour la famille', titre: 'techno de\nla Côte', emoji: '' },
        { pre: 'Rentrer avant 6h ?', titre: 'Non.', emoji: '' },
      ],
      'petits-prix': [
        { pre: 'BON PLAN', titre: `Le week-end\nà moins\nde ${R.petit_prix_max} €`, emoji: '💸' },
        { pre: 'Fin de mois ?', titre: 'Sors quand\nmême', emoji: '💸' },
      ],
    };
    const pages = reelPages({
      events: chosen, config, theme: variante === 'techno' ? 'techno' : 'club',
      // Période élargie : pas d'accroche qui parle du « week-end ».
      hook: pick(r, hooks[variante].filter((h) => !elargi || !/week-end/i.test(h.pre + h.titre))),
      sousHook: `${chosen.length} ${variante === 'techno' ? 'dates techno' : 'soirées'} sur la Côte ${plage(win.from, win.to)}`,
      question: variante === 'techno' ? 'Tu seras\noù ?' : variante === 'petits-prix' ? 'Laquelle\ntu prends ?' : 'Laquelle\ntu choisis ?',
    });
    const tmp = path.join(ROOT, 'out', `reel-${id}`);
    await rm(tmp, { recursive: true, force: true });
    const imgs = await renderPages(pages, tmp, 'reel', { width: 1080, height: 1920, png: true });
    const { buildReel } = await import('./reel.mjs');
    const durees = [2.4, ...chosen.map(() => R.secondes_par_soiree_reel), 2.6, 2.2];
    const video = path.join(dir, `reel-${stamp}.mp4`);
    const res = await buildReel(imgs, video, { root: ROOT, durees, genre: variante === 'techno' ? 'techno' : 'club' });
    const cover = path.join(dir, `reel-${stamp}-couverture.jpg`);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', imgs[0], '-q:v', '2', cover]);
    console.log(`[${id}] vidéo ${res.total.toFixed(1)} s${res.musique ? ` avec ${path.basename(res.musique)}` : ' (muette : ajoute des musiques dans assets/musiques/)'}`);
    pub = { video, couverture: cover, legende: captionReel({ variante, events: chosen, seed, elargi }), soirees: chosen };
  } else {
    throw new Error(`Type inconnu : ${slot.type}`);
  }

  const rel = (f) => path.basename(f);
  const out = { id, type: slot.type, variante: slot.variante || null, date: stamp, ...pub };
  if (out.images) out.images = out.images.map(rel);
  if (out.video) { out.video = rel(out.video); out.couverture = rel(out.couverture); }
  await writeFile(path.join(dir, 'publication.json'), JSON.stringify(out, null, 2));
  await writeFile(path.join(dir, 'legende.txt'), out.legende + '\n');
  console.log(`\n[${id}] prêt dans media/${id}/\n${out.legende.split('\n').map((l) => '   ' + l).join('\n')}`);
}

async function bonPlanManuel(now) {
  const f = path.join(ROOT, 'contenus', 'bons-plans.json');
  if (!existsSync(f)) return null;
  const used = new Set([...hist.map((h) => h.bonplan).filter(Boolean), ...usedHere]);
  const list = JSON.parse(await readFile(f, 'utf8'));
  const today = isoLocal(now);
  return list.find((b) => b.titre && b.texte && !used.has(b.titre) && (!b.du || b.du <= today) && (!b.au || b.au >= today)) || null;
}

// Pour le reel : les plus belles affiches, une soirée différente par jour si possible, ordre chronologique.
function pickReel(list, max) {
  const withImg = list.filter((e) => e.image);
  const pool = withImg.length >= 3 ? withImg : list;
  const out = [];
  const days = new Set();
  for (const e of pool) { const d = isoLocal(new Date(Date.parse(e.start) - 6 * 3600e3)); if (!days.has(d)) { out.push(e); days.add(d); } if (out.length >= max) break; }
  for (const e of pool) { if (out.length >= max) break; if (!out.includes(e)) out.push(e); }
  return chrono(out);
}

function chrono(l) { return [...l].sort((a, b) => a.start.localeCompare(b.start)); }
function need(list, n) {
  if (list.length < n) throw new Error(`Pas assez de soirées trouvées (${list.length}). Rien n'est publié. Voir out/debug/ pour les pages récupérées.`);
}

// --- Publication ------------------------------------------------------------

async function publishPrepared(id) {
  const dir = path.join(MEDIA_DIR, id);
  const f = path.join(dir, 'publication.json');
  if (!existsSync(f)) throw new Error(`Rien de préparé (media/${id}/publication.json absent).`);
  const p = JSON.parse(await readFile(f, 'utf8'));
  const ig = igConfig();
  if (DRY || !ig) { console.log(`[${id}] ${DRY ? 'Aperçu' : 'IG_ACCESS_TOKEN / IG_USER_ID absents'} : pas de publication Instagram.`); return; }
  if (hist.some((h) => h.id === id && h.date === p.date) && !process.env.FORCE) {
    console.log(`[${id}] Déjà publié le ${p.date}. (FORCE=1 pour republier)`);
    return;
  }

  let base = MEDIA_BASE;
  const url = (name) => `${base}/${id}/${name}`;
  const urls = () => (p.video ? [url(p.video), url(p.couverture)] : p.images.map(url));
  if (!(await waitOnline(urls(), 12 * 60e3))) {
    const fb = process.env.MEDIA_FALLBACK_URL;
    if (!fb) throw new Error(`Les fichiers ne sont pas en ligne sur ${MEDIA_BASE} après 12 min.`);
    console.log(`[${id}] GitHub Pages pas encore à jour, on utilise ${fb}`);
    base = fb.replace(/\/$/, '');
    if (!(await waitOnline(urls(), 3 * 60e3))) throw new Error(`Fichiers introuvables aussi sur ${fb}.`);
  }

  const res = p.video
    ? await publishReel(url(p.video), url(p.couverture), p.legende, ig)
    : p.images.length === 1
      ? await publishSingle(url(p.images[0]), p.legende, ig)
      : await publishCarousel(p.images.map(url), p.legende, ig);
  const link = await permalink(res.id, ig);
  console.log(`[${id}] ✅ publié : ${link || res.id}`);
  hist.push({ id, date: p.date, media: res.id, lien: link, debat: p.debat, bonplan: p.bonplan, le: new Date().toISOString() });
  await writeFile(HIST_FILE, JSON.stringify(hist.slice(-300), null, 2));
}

// GitHub Pages met 1 à 5 min à mettre les fichiers en ligne après le push.
async function waitOnline(urls, timeoutMs) {
  const t0 = Date.now();
  for (const u of urls) {
    for (;;) {
      const ok = await fetch(u, { method: 'HEAD', cache: 'no-store' }).then((r) => r.ok).catch(() => false);
      if (ok) break;
      if (Date.now() - t0 > timeoutMs) return false;
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  return true;
}

async function output(k, v) { if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); }
function die(msg) { console.error(msg); process.exit(1); }
