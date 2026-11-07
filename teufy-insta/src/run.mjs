#!/usr/bin/env node
// Usage :
//   node src/run.mjs <semaine|weekend|reel|tout> [preparer|publier] [--dry-run] [--fixtures=dir] [--now=2026-11-09T10:00:00Z]
//
//  preparer : récupère les soirées (Shotgun, DICE, evenements-manuels.json), génère visuels + légende
//             dans media/<type>/ et écrit media/<type>/publication.json
//  publier  : publie sur Instagram ce qui a été préparé (les fichiers doivent être en ligne)
//  sans étape : enchaîne les deux (utile en local avec --dry-run)
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectEvents, filterEvents } from './sources.mjs';
import { windowFor, isoLocal } from './dates.mjs';
import { carouselPages, reelPages, renderPages } from './render.mjs';
import { buildReel } from './reel.mjs';
import { captionCarousel, captionReel } from './captions.mjs';
import { igConfig, publishCarousel, publishReel, permalink } from './instagram.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a.startsWith(`--${n}`));
const val = (n) => flag(n)?.split('=').slice(1).join('=');
const [kindArg = 'tout', step = 'tout'] = args.filter((a) => !a.startsWith('--'));
const DRY = !!flag('dry-run') || process.env.DRY_RUN === 'true';
const NOW = val('now') ? new Date(val('now')) : new Date();
const MEDIA_DIR = path.join(ROOT, 'media');
const MEDIA_BASE = (process.env.MEDIA_BASE_URL || 'https://junior63122.github.io/teufy-insta/media').replace(/\/$/, '');

const config = JSON.parse(await readFile(path.join(ROOT, 'config.json'), 'utf8'));
const kinds = kindArg === 'tout' ? ['semaine', 'weekend', 'reel'] : [kindArg];
if (!kinds.every((k) => config.publications[k])) die(`Type inconnu : ${kindArg} (semaine, weekend, reel ou tout)`);

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

for (const kind of kinds) {
  if (step === 'preparer' || step === 'tout') await prepare(kind);
  if (step === 'publier' || step === 'tout') await publishPrepared(kind);
}

async function prepare(kind) {
  const pub = config.publications[kind];
  const { from, to } = windowFor(pub.jours, NOW);
  const list = filterEvents(await events(), { from, to, villes: config.villes });
  console.log(`\n[${kind}] ${from.toISOString()} → ${to.toISOString()} : ${list.length} soirée(s) retenue(s)`);
  const min = kind === 'reel' ? 2 : 1;
  if (list.length < min) die(`[${kind}] Pas assez de soirées trouvées (${list.length}). Rien n'est publié. Voir out/debug/ pour les pages récupérées.`);

  const dir = path.join(MEDIA_DIR, kind);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const stamp = isoLocal(from);
  let publication;

  if (kind === 'reel') {
    const chosen = pickReel(list, pub.max);
    const pages = reelPages({ events: chosen, from, to, config });
    const tmp = path.join(ROOT, 'out', 'reel-images');
    await rm(tmp, { recursive: true, force: true });
    const imgs = await renderPages(pages, tmp, 'reel', { width: 1080, height: 1920 });
    const durees = [2.4, ...chosen.map(() => pub.secondes_par_soiree), 2.6, 2.2];
    const video = path.join(dir, `reel-${stamp}.mp4`);
    const r = await buildReel(imgs, video, { root: ROOT, durees });
    const cover = path.join(dir, `reel-${stamp}-couverture.jpg`);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', imgs[0], '-q:v', '2', cover]);
    console.log(`[reel] vidéo ${r.total.toFixed(1)} s${r.musique ? ` avec ${path.basename(r.musique)}` : ' (silencieuse : ajoute une musique dans assets/musiques/)'}`);
    publication = { kind, semaine: stamp, video: path.basename(video), couverture: path.basename(cover), legende: captionReel({ events: chosen, from, to, config }), soirees: chosen };
  } else {
    const chosen = list.slice(0, pub.max).sort((a, b) => a.start.localeCompare(b.start));
    const pages = carouselPages({ titre: pub.titre, sousTitre: pub.sous_titre, from, to, events: chosen, config });
    const files = await renderPages(pages, dir, `${kind}-${stamp}`, { width: 1080, height: 1350 });
    publication = { kind, semaine: stamp, images: files.map((f) => path.basename(f)), legende: captionCarousel({ kind, events: chosen, from, to, config }), soirees: chosen };
  }
  await writeFile(path.join(dir, 'publication.json'), JSON.stringify(publication, null, 2));
  console.log(`[${kind}] prêt dans media/${kind}/ :\n${publication.legende.split('\n').map((l) => '   ' + l).join('\n')}`);
}

// Pour le reel : les plus belles affiches, une soirée différente par jour si possible, ordre chronologique.
function pickReel(list, max) {
  const withImg = list.filter((e) => e.image);
  const pool = withImg.length >= 2 ? withImg : list;
  const out = [];
  const days = new Set();
  for (const e of pool) { const d = e.start.slice(0, 10); if (!days.has(d)) { out.push(e); days.add(d); } if (out.length >= max) break; }
  for (const e of pool) { if (out.length >= max) break; if (!out.includes(e)) out.push(e); }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

async function publishPrepared(kind) {
  const dir = path.join(MEDIA_DIR, kind);
  const f = path.join(dir, 'publication.json');
  if (!existsSync(f)) die(`[${kind}] Rien de préparé (media/${kind}/publication.json absent).`);
  const p = JSON.parse(await readFile(f, 'utf8'));
  const ig = igConfig();
  if (DRY || !ig) {
    console.log(`[${kind}] ${DRY ? 'Mode test' : 'IG_ACCESS_TOKEN / IG_USER_ID absents'} : pas de publication Instagram.`);
    return;
  }
  const histFile = path.join(ROOT, 'historique.json');
  const hist = existsSync(histFile) ? JSON.parse(await readFile(histFile, 'utf8')) : [];
  if (hist.some((h) => h.kind === kind && h.semaine === p.semaine) && !process.env.FORCE) {
    console.log(`[${kind}] Déjà publié pour la semaine du ${p.semaine}. (FORCE=1 pour republier)`);
    return;
  }
  let base = MEDIA_BASE;
  const url = (name) => `${base}/${kind}/${name}`;
  const urls = () => (p.video ? [url(p.video), url(p.couverture)] : p.images.map(url));
  if (!(await waitOnline(urls(), 12 * 60e3))) {
    const fb = process.env.MEDIA_FALLBACK_URL;
    if (!fb) die(`[${kind}] Les fichiers ne sont pas en ligne sur ${MEDIA_BASE} après 12 min.`);
    console.log(`[${kind}] GitHub Pages pas encore à jour, on utilise ${fb}`);
    base = fb.replace(/\/$/, '');
    if (!(await waitOnline(urls(), 3 * 60e3))) die(`[${kind}] Fichiers introuvables aussi sur ${fb}.`);
  }

  const res = p.video
    ? await publishReel(url(p.video), url(p.couverture), p.legende, ig)
    : await publishCarousel(p.images.map(url), p.legende, ig);
  const link = await permalink(res.id, ig);
  console.log(`[${kind}] ✅ publié : ${link || res.id}`);
  hist.push({ kind, semaine: p.semaine, id: res.id, lien: link, le: new Date().toISOString() });
  await writeFile(histFile, JSON.stringify(hist.slice(-200), null, 2));
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

function die(msg) { console.error(msg); process.exit(1); }
