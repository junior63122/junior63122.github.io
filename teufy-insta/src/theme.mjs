// Charte graphique : lit contenus/da.json et produit les variables CSS selon
// la saison de la date de publication et l'univers (club ou techno).
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DA = JSON.parse(readFileSync(path.join(ROOT, 'contenus', 'da.json'), 'utf8'));

export function saison(date = new Date()) {
  const m = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', month: 'numeric' }).format(date);
  if (m === 12 || m <= 2) return 'hiver';
  if (m <= 5) return 'printemps';
  if (m <= 8) return 'ete';
  return 'automne';
}

let logoCache;
function logo() {
  if (logoCache !== undefined) return logoCache;
  logoCache = null;
  for (const [f, mime] of [['logo.svg', 'image/svg+xml'], ['logo.png', 'image/png'], ['logo.jpg', 'image/jpeg']]) {
    const p = path.join(ROOT, 'assets', f);
    if (existsSync(p)) { logoCache = `data:${mime};base64,${readFileSync(p).toString('base64')}`; break; }
  }
  return logoCache;
}

export function theme(date, univers = 'club') {
  const s = saison(date);
  const pal = DA.saisons[s];
  const techno = univers === 'techno';
  const accent = techno ? DA.techno.accents[s] : pal.accent;
  const vars = techno
    ? { fond: DA.techno.fond, texte: DA.techno.texte, accent, accent2: '#1a1a1a', accent3: accent, surAccent: '#050505' }
    : { fond: pal.fond, texte: pal.texte, accent: pal.accent, accent2: pal.accent2, accent3: pal.accent3, surAccent: '#ffffff' };
  const [l1, l2, l3] = pal.lueurs;
  return {
    saison: s, univers, logo: logo(), polices: DA.polices, arrondi: techno ? 4 : DA.arrondi,
    css: `:root{--fond:${vars.fond};--texte:${vars.texte};--accent:${vars.accent};--accent2:${vars.accent2};--accent3:${vars.accent3};--sur-accent:${vars.surAccent};--r:${techno ? 4 : DA.arrondi}px;
--l1:${techno ? 'transparent' : l1};--l2:${techno ? 'transparent' : l2};--l3:${techno ? hexA(accent, 0.12) : l3};
--f-titre:'${DA.polices.titre}',Impact,'DejaVu Sans Condensed',sans-serif;--f-texte:'${DA.polices.texte}','DejaVu Sans',sans-serif;--f-mono:'${DA.polices.techno}','DejaVu Sans Mono',monospace}`,
  };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
