// Génère les visuels (JPEG/PNG) à partir de gabarits HTML, rendus par Chromium (Playwright).
// Couleurs, polices et logo viennent de contenus/da.json (src/theme.mjs) et changent avec la saison.
// Priorité à l'info : affiche Shotgun/DICE en entier, style musical, date, lieu, prix.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { jourCourt, jourNum, moisCourt, heure } from './dates.mjs';
import { styleLabel } from './genres.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const srcLabel = (e) => (e.manuel ? 'Teufy' : e.source === 'dice' ? 'DICE' : e.source === 'shotgun' ? 'Shotgun' : e.source);
const prix = (e) => (e.price == null ? '' : e.price === 0 ? 'Gratuit' : `dès ${String(Math.round(e.price * 100) / 100).replace('.', ',')} €`);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lieu = (e) => [e.venue, e.city && !norm(e.venue).includes(norm(e.city)) ? e.city : ''].filter(Boolean).join(' · ');
const nl = (s) => esc(s).replace(/\n/g, '<br>');
const bg = (url) => `background-image:url('${esc(url)}')`;

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
h1{max-width:100%}
html,body{width:var(--w);height:var(--h);overflow:hidden;background:var(--fond);color:var(--texte);font-family:var(--f-texte)}
.titre{font-family:var(--f-titre);text-transform:uppercase;line-height:.92;letter-spacing:.5px}
.mono{font-family:var(--f-mono)}
.fond{position:absolute;inset:0;background:
 radial-gradient(60% 45% at 15% 10%,var(--l1),transparent 70%),
 radial-gradient(55% 45% at 90% 85%,var(--l2),transparent 70%),
 radial-gradient(40% 30% at 80% 20%,var(--l3),transparent 70%),var(--fond)}
.grain{position:absolute;inset:0;opacity:.08;background-image:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)}
.flou{position:absolute;inset:-80px;background-size:cover;background-position:center;filter:blur(50px) brightness(.4) saturate(1.3)}
.marque{position:absolute;font-weight:900;letter-spacing:2px;font-size:30px;display:flex;align-items:center}
.marque b{color:var(--accent)}
.marque img{height:52px;width:auto}
.pastille{display:inline-block;padding:12px 22px;border-radius:999px;font-weight:900;font-size:28px;background:var(--accent);color:var(--sur-accent)}
.pastille.c{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35);color:var(--texte)}
.grad{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--sur-accent)}
.affiche{position:absolute;overflow:hidden;border-radius:var(--r);box-shadow:0 30px 90px rgba(0,0,0,.7),0 0 0 3px rgba(255,255,255,.1);background:#000}
.affiche .derriere{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(30px) brightness(.55)}
.affiche .devant{position:absolute;inset:0;background-size:contain;background-repeat:no-repeat;background-position:center}
.affiche.vide{display:flex;align-items:center;justify-content:center;padding:60px;text-align:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--sur-accent)}
.genre{position:absolute;left:24px;top:24px;z-index:2}
`;
const TECHNO_CSS = `
.grain{opacity:.14}
.flou{filter:blur(50px) brightness(.3) grayscale(.7)}
.pastille{border-radius:4px;font-family:var(--f-mono)}
.grad{background:var(--accent)}
`;

// Réduit la taille des grands titres tant qu'un mot dépasse la largeur disponible.
const FIT = `<script>
window.__fit = (async () => {
  try { await document.fonts.ready; } catch (e) {}
  for (const el of document.querySelectorAll('h1')) {
    let s = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 2 && s > 30) { s -= 4; el.style.fontSize = s + 'px'; }
  }
})();
</script>`;

function page(th, w, h, body, extraCss = '') {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>@import url('https://fonts.googleapis.com/css2?${th.polices.google_fonts}&display=swap');
:root{--w:${w}px;--h:${h}px}${th.css}${BASE_CSS}${th.univers === 'techno' ? TECHNO_CSS : ''}${extraCss}</style></head><body>${body}${FIT}</body></html>`;
}
const marque = (th, brand, pos = 'top:56px;left:64px') => (th.logo
  ? `<div class="marque" style="${pos}"><img src="${th.logo}" alt=""></div>`
  : `<div class="marque" style="${pos}">${esc(brand.slice(0, -2))}<b>${esc(brand.slice(-2))}</b></div>`);

// Affiche entière (contain) sur un fond flouté de la même image ; pastille de style musical.
function affiche(e, css) {
  const g = styleLabel(e);
  if (!e.image) return `<div class="affiche vide grad" style="${css}"><span class="titre" style="font-size:88px">${esc(e.name)}</span>${g ? `<span class="pastille c genre">${esc(g)}</span>` : ''}</div>`;
  return `<div class="affiche" style="${css}"><div class="derriere" style="${bg(e.image)}"></div><div class="devant" style="${bg(e.image)}"></div>${g ? `<span class="pastille genre">${esc(g)}</span>` : ''}</div>`;
}

// --- Carrousel 1080×1350 ---------------------------------------------------

function slideCouverture(th, { pastille, titre, sousTitre, compte, events, brand }) {
  const imgs = events.filter((e) => e.image).slice(0, 6);
  const techno = th.univers === 'techno';
  const mosaique = imgs.map((e, i) => `<div class="m" style="${bg(e.image)};transform:rotate(${techno ? 0 : [-6, 4, -3, 7, -5, 3][i]}deg)"></div>`).join('');
  return page(th, 1080, 1350, `
  <div class="fond"></div>
  <div class="mosaique">${mosaique}</div>
  <div class="voile"></div><div class="grain"></div>
  ${marque(th, brand)}
  <div class="bloc">
    <div class="pastille">${esc(pastille)}</div>
    <h1 class="titre">${nl(titre)}</h1>
    <h2>${esc(sousTitre)}</h2>
    <p class="compte">${esc(compte)}</p>
  </div>`, `
  .mosaique{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:150px 40px 0;opacity:${techno ? 0.4 : 0.6}}
  .m{aspect-ratio:1;border-radius:var(--r);background-size:cover;background-position:center;box-shadow:0 20px 60px rgba(0,0,0,.6)${techno ? ';filter:grayscale(1) contrast(1.2)' : ''}}
  .voile{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.65) 45%,var(--fond) 72%)}
  .bloc{position:absolute;left:64px;right:64px;bottom:90px}
  h1{font-size:${titre.length > 40 ? 128 : 160}px;margin:34px 0 18px}
  h2{font-size:52px;font-weight:900;color:var(--accent3)}
  .compte{margin-top:40px;font-size:34px;font-weight:700;opacity:.9}`);
}

function slideAgenda(th, { events, brand, titre = "L'agenda", pied = '📌 Enregistre pour ne rien rater', avecMois = false }) {
  const lignes = events.slice(0, 10).map((e) => `
    <li>${e.image ? `<span class="vig" style="${bg(e.image)}"></span>` : '<span class="vig grad"></span>'}
    <span class="j">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))}${avecMois ? ` ${esc(moisCourt(e.start))}` : ''}<small>${esc(heure(e.start))}</small></span>
    <span class="n">${esc(e.name)}<small>${esc([styleLabel(e), lieu(e)].filter(Boolean).join(' · ') || srcLabel(e))}</small></span>
    ${prix(e) ? `<span class="p">${esc(prix(e).replace('dès ', ''))}</span>` : ''}</li>`).join('');
  return page(th, 1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  ${marque(th, brand)}
  <h1 class="titre">${esc(titre)}</h1>
  <ul>${lignes}</ul>
  <p class="pied">${esc(pied)}</p>`, `
  h1{position:absolute;top:120px;left:64px;right:64px;font-size:110px}
  ul{position:absolute;top:260px;left:64px;right:64px;list-style:none}
  li{display:flex;align-items:center;gap:22px;padding:14px 0;border-bottom:2px solid rgba(255,255,255,.12)}
  .vig{flex:0 0 76px;height:76px;border-radius:calc(var(--r) / 2);background-size:cover;background-position:center}
  .j{flex:0 0 128px;font-weight:900;font-size:30px;color:var(--accent);line-height:1.1}
  .j small{display:block;font-size:24px;color:var(--texte);opacity:.75}
  .n{flex:1;font-weight:700;font-size:30px;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .n small{display:block;font-weight:500;font-size:23px;opacity:.72;margin-top:4px}
  .p{font-weight:900;font-size:26px;color:var(--accent3)}
  .pied{position:absolute;bottom:56px;left:64px;font-size:30px;font-weight:700}`);
}

function slideSoiree(th, { e, i, n, brand }) {
  return page(th, 1080, 1350, `
  <div class="fond"></div>${e.image ? `<div class="flou" style="${bg(e.image)}"></div>` : ''}<div class="grain"></div>
  ${marque(th, brand)}
  <div class="num mono">${i}/${n}</div>
  ${affiche(e, 'top:130px;left:110px;width:860px;height:800px')}
  <div class="infos">
    <h1>${esc(e.name)}</h1>
    <div class="grille">
      <div><small>Quand</small>${esc(jourCourt(e.start))} ${esc(jourNum(e.start))} ${esc(moisCourt(e.start))} · ${esc(heure(e.start))}</div>
      <div><small>Où</small>${esc(lieu(e) || "Côte d'Azur")}</div>
      <div><small>Prix</small>${esc(prix(e) || 'Voir billetterie')}</div>
      <div><small>Billets</small>${esc(e.billetterie || srcLabel(e))}</div>
    </div>
  </div>`, `
  .num{position:absolute;top:56px;right:64px;font-weight:900;font-size:30px;opacity:.8}
  .infos{position:absolute;left:64px;right:64px;top:960px}
  h1{font-size:58px;font-weight:900;line-height:1.05;margin-bottom:22px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .grille{display:grid;grid-template-columns:1.25fr 1fr;gap:14px 30px}
  .grille div{font-size:31px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .grille small{display:block;font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--accent);margin-bottom:2px}`);
}

function slideFin(th, { brand, compte, titre, question, tag }) {
  return page(th, 1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc">
    <h1 class="titre">${nl(titre)}</h1>
    <p class="q">${esc(question)}</p>
    <div class="cta grad">Abonne-toi à ${esc(compte)}<br><span>Le programme des soirées de la Côte, chaque semaine</span></div>
    <p class="tag">${esc(tag)}</p>
  </div>
  ${marque(th, brand, 'bottom:60px;left:50%;transform:translateX(-50%);font-size:44px')}`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;gap:44px}
  h1{font-size:190px}
  .q{font-size:46px;font-weight:900}
  .cta{font-size:46px;font-weight:900;padding:36px 46px;border-radius:var(--r)}
  .cta span{font-size:28px;font-weight:700;opacity:.9}
  .tag{font-size:34px;font-weight:700;opacity:.85}`);
}

// Carrousel de soirées (incontournables, bons plans).
export function carouselPages({ th, couverture, agenda, fin, events, config }) {
  const brand = config.marque;
  const details = events.slice(0, 7); // couverture + agenda + 7 soirées + fin = 10 (max Instagram)
  return [
    slideCouverture(th, { ...couverture, events, brand }),
    slideAgenda(th, { ...agenda, events, brand }),
    ...details.map((e, i) => slideSoiree(th, { e, i: i + 1, n: details.length, brand })),
    slideFin(th, { ...fin, brand, compte: config.compte }),
  ];
}

// --- Débat : une seule image 1080×1350 -------------------------------------

export function debatPage({ th, debat, config }) {
  const ab = debat.a && debat.b;
  return [page(th, 1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  ${marque(th, config.marque)}
  <div class="tagd">On en parle ?</div>
  <h1 class="${debat.q.length > 70 ? 'long' : ''}">${esc(debat.q)}</h1>
  ${ab ? `<div class="ab"><div class="opt grad"><b>A</b>${esc(debat.a)}</div><div class="vs titre">vs</div><div class="opt c"><b>B</b>${esc(debat.b)}</div></div>` : ''}
  <p class="pied">Réponds en commentaire 👇</p>`, `
  .tagd{position:absolute;top:56px;right:64px;font-weight:900;font-size:28px;padding:10px 20px;border:2px solid rgba(255,255,255,.4);border-radius:999px}
  h1{position:absolute;top:200px;left:64px;right:64px;font-size:80px;font-weight:900;line-height:1.08}
  h1.long{font-size:66px}
  .ab{position:absolute;left:64px;right:64px;bottom:190px;display:flex;align-items:center;gap:24px}
  .opt{flex:1;min-height:210px;border-radius:var(--r);padding:30px;font-size:40px;font-weight:900;line-height:1.1;display:flex;flex-direction:column;justify-content:center;gap:12px}
  .opt b{font-size:64px;font-family:var(--f-titre)}
  .opt.c{background:rgba(255,255,255,.1);border:3px solid rgba(255,255,255,.35)}
  .vs{font-size:60px;opacity:.8}
  .pied{position:absolute;bottom:80px;left:64px;font-size:40px;font-weight:900}`)];
}

// --- Bon plan rédigé à la main : une image ----------------------------------

export function bonPlanManuelPage({ th, bp, config }) {
  return [page(th, 1080, 1350, `
  <div class="fond"></div>${bp.image ? `<div class="flou" style="${bg(bp.image)};filter:blur(0) brightness(.4)"></div>` : ''}<div class="grain"></div>
  ${marque(th, config.marque)}
  <div class="bloc"><span class="pastille">Bon plan</span><h1 class="titre">${nl(bp.titre)}</h1><p>${nl(bp.texte)}</p></div>`, `
  .bloc{position:absolute;left:64px;right:64px;bottom:110px;display:flex;flex-direction:column;gap:34px;align-items:flex-start}
  h1{font-size:120px}
  p{font-size:40px;font-weight:700;line-height:1.3;opacity:.95}`)];
}

// --- Reel 1080×1920 --------------------------------------------------------

export function reelPages({ th, events, config, hook, sousHook, question = 'Laquelle\ntu choisis ?' }) {
  const debut = page(th, 1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><p class="pov mono">${esc(hook.pre)}</p><h1 class="titre">${nl(hook.titre)}</h1><p class="e">${esc(hook.emoji || '')}</p>
  <p class="s">${esc(sousHook)}</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 80px;gap:30px}
  .pov{font-size:70px;font-weight:900;color:var(--accent3)}
  h1{font-size:160px}
  .e{font-size:140px}
  .s{font-size:44px;font-weight:700;opacity:.85}`);

  const slides = events.map((e, i) => page(th, 1080, 1920, `
    <div class="fond"></div>${e.image ? `<div class="flou" style="${bg(e.image)}"></div>` : ''}<div class="grain"></div>
    <div class="n titre">${i + 1}</div>
    ${affiche(e, 'top:330px;left:70px;width:940px;height:1000px')}
    <div class="infos">
      <span class="pastille">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))} · ${esc(heure(e.start))}</span>${prix(e) ? ` <span class="pastille c">${esc(prix(e))}</span>` : ''}
      <h1>${esc(e.name)}</h1>
      <p>📍 ${esc(lieu(e) || "Côte d'Azur")}</p>
    </div>`, `
    .n{position:absolute;top:110px;left:70px;font-size:190px;color:var(--accent)}
    .infos{position:absolute;left:80px;right:80px;top:1390px}
    h1{font-size:70px;font-weight:900;line-height:1.05;margin:28px 0 18px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    p{font-size:42px;font-weight:700}`));

  const choix = page(th, 1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><h1 class="titre">${nl(question)}</h1>
  <div class="nums">${events.map((_, i) => `<span class="grad">${i + 1}</span>`).join('')}</div>
  <p>Réponds avec le numéro en commentaire 👇</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:60px;padding:0 70px}
  h1{font-size:170px}
  .nums{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
  .nums span{width:120px;height:120px;border-radius:${th.univers === 'techno' ? '8px' : '50%'};display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900}
  p{font-size:50px;font-weight:900}`);

  const fin = page(th, 1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc">${marque(th, config.marque, 'position:static;font-size:150px;letter-spacing:4px')}
  <p class="t">Abonne-toi à ${esc(config.compte)}</p>
  <p class="s">Les soirées de la Côte, chaque semaine<br>📲 Envoie ce reel à ton crew</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:50px;padding:0 70px}
  .marque img{height:180px}
  .t{font-size:66px;font-weight:900;color:var(--accent)}
  .s{font-size:46px;font-weight:700;opacity:.9;line-height:1.4}`);

  return [debut, ...slides, choix, fin];
}

// --- Rendu -----------------------------------------------------------------

export async function renderPages(pages, outDir, prefix, { width, height, png = false }) {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const files = [];
  try {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    for (let i = 0; i < pages.length; i++) {
      await pg.setContent(pages[i], { waitUntil: 'load', timeout: 45000 }).catch(() => {});
      await pg.evaluate(() => window.__fit).catch(() => {});
      await pg.waitForTimeout(300);
      const f = path.join(outDir, `${prefix}-${String(i + 1).padStart(2, '0')}.${png ? 'png' : 'jpg'}`);
      await pg.screenshot(png ? { path: f } : { path: f, type: 'jpeg', quality: 92 });
      files.push(f);
    }
  } finally {
    await browser.close();
  }
  return files;
}
