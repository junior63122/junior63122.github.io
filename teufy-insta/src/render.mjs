// Génère les visuels (JPEG/PNG) à partir de gabarits HTML, rendus par Chromium (Playwright).
// Deux univers : « club » (néon rose/violet) et « techno » (noir, vert acide, typo brute).
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

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@500;700;900&family=Space+Mono:wght@700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
h1{max-width:100%}
:root{--accent:#ff2d87;--accent2:#7b2cff;--accent3:#22e4ff;--fond:#0b0618;--texte:#fff}
html,body{width:var(--w);height:var(--h);overflow:hidden;background:var(--fond);color:var(--texte);font-family:Inter,'DejaVu Sans',sans-serif}
.titre{font-family:Anton,Impact,'DejaVu Sans Condensed',sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:.5px}
.fond{position:absolute;inset:0;background:
 radial-gradient(60% 45% at 15% 10%,rgba(255,45,135,.55),transparent 70%),
 radial-gradient(55% 45% at 90% 85%,rgba(123,44,255,.6),transparent 70%),
 radial-gradient(40% 30% at 80% 20%,rgba(34,228,255,.25),transparent 70%),var(--fond)}
.grain{position:absolute;inset:0;opacity:.08;background-image:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)}
.flou{position:absolute;inset:-60px;background-size:cover;background-position:center;filter:blur(40px) brightness(.45) saturate(1.4)}
.marque{position:absolute;font-weight:900;letter-spacing:2px;font-size:30px}
.marque b{color:var(--accent)}
.pastille{display:inline-block;padding:12px 22px;border-radius:999px;font-weight:900;font-size:28px;background:var(--accent);color:#fff}
.pastille.c{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35)}
.grad{background:linear-gradient(135deg,var(--accent),var(--accent2))}
`;

// Univers techno : noir profond, vert acide, monospace, pas de dégradé « néon ».
const TECHNO_CSS = `
:root{--accent:#c6ff00;--accent2:#1a1a1a;--accent3:#c6ff00;--fond:#050505}
.fond{background:radial-gradient(70% 50% at 50% 0%,rgba(198,255,0,.10),transparent 70%),#050505}
.grain{opacity:.14}
.flou{filter:blur(40px) brightness(.35) grayscale(.6)}
.pastille{background:var(--accent);color:#050505;border-radius:4px;font-family:'Space Mono',monospace}
.pastille.c{color:#fff;border-radius:4px}
.grad{background:#c6ff00;color:#050505}
.marque b{color:var(--accent)}
.mono{font-family:'Space Mono','DejaVu Sans Mono',monospace}
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

function page(w, h, body, extraCss = '', theme = 'club') {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${BASE_CSS}${theme === 'techno' ? TECHNO_CSS : ''}${extraCss}</style></head><body>${body}${FIT}</body></html>`;
}
const marque = (brand, pos = 'top:56px;left:64px') => `<div class="marque" style="${pos}">${esc(brand.slice(0, -2))}<b>${esc(brand.slice(-2))}</b></div>`;
const visuel = (e) => (e.image ? `style="background-image:url('${esc(e.image)}')"` : '');

// --- Carrousel 1080×1350 ---------------------------------------------------

function slideCouverture({ pastille, titre, sousTitre, compte, events, brand, theme }) {
  const imgs = events.filter((e) => e.image).slice(0, 6);
  const mosaique = imgs.map((e, i) => `<div class="m" style="background-image:url('${esc(e.image)}');transform:rotate(${theme === 'techno' ? 0 : [-6, 4, -3, 7, -5, 3][i]}deg)"></div>`).join('');
  return page(1080, 1350, `
  <div class="fond"></div>
  <div class="mosaique">${mosaique}</div>
  <div class="voile"></div><div class="grain"></div>
  ${marque(brand)}
  <div class="bloc">
    <div class="pastille">${esc(pastille)}</div>
    <h1 class="titre">${nl(titre)}</h1>
    <h2>${esc(sousTitre)}</h2>
    <p class="compte">${esc(compte)}</p>
  </div>`, `
  .mosaique{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:150px 40px 0;opacity:.55}
  .m{aspect-ratio:1;border-radius:${theme === 'techno' ? 4 : 26}px;background-size:cover;background-position:center;box-shadow:0 20px 60px rgba(0,0,0,.6)${theme === 'techno' ? ';filter:grayscale(1) contrast(1.2)' : ''}}
  .voile{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.7) 45%,var(--fond) 72%)}
  .bloc{position:absolute;left:64px;right:64px;bottom:90px}
  h1{font-size:${titre.length > 40 ? 128 : 160}px;margin:34px 0 18px;${theme === 'techno' ? '' : 'text-shadow:0 6px 40px rgba(255,45,135,.45)'}}
  h2{font-size:52px;font-weight:900;color:var(--accent3)}
  .compte{margin-top:40px;font-size:34px;font-weight:700;opacity:.9}`, theme);
}

function slideAgenda({ events, brand, theme, titre = "L'agenda", pied = '📌 Enregistre ce post pour ne rien rater', avecMois = false }) {
  const lignes = events.slice(0, 12).map((e) => `
    <li><span class="j">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))}${avecMois ? `<small>${esc(moisCourt(e.start))}</small>` : ''}</span>
    <span class="n">${esc(e.name)}<small>${esc([lieu(e) || srcLabel(e), styleLabel(e)].filter(Boolean).join(' · '))}</small></span>
    <span class="h">${esc(e.price === 0 ? 'Gratuit' : heure(e.start))}</span></li>`).join('');
  return page(1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  ${marque(brand)}
  <h1 class="titre">${esc(titre)}</h1>
  <ul>${lignes}</ul>
  <p class="pied">${esc(pied)}</p>`, `
  h1{position:absolute;top:120px;left:64px;font-size:120px}
  ul{position:absolute;top:290px;left:64px;right:64px;list-style:none}
  li{display:flex;align-items:center;gap:26px;padding:18px 0;border-bottom:2px solid rgba(255,255,255,.12)}
  .j{flex:0 0 150px;font-weight:900;font-size:32px;color:var(--accent)}
  .j small{display:block;font-size:22px;opacity:.8}
  .n{flex:1;font-weight:700;font-size:32px;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .n small{display:block;font-weight:500;font-size:24px;opacity:.7;margin-top:4px}
  .h{font-weight:900;font-size:30px;color:var(--accent3)}
  .pied{position:absolute;bottom:60px;left:64px;font-size:32px;font-weight:700}`, theme);
}

function slideSoiree({ e, i, n, brand, theme }) {
  const style = styleLabel(e);
  return page(1080, 1350, `
  <div class="fond"></div>${e.image ? `<div class="flou" ${visuel(e)}></div>` : ''}<div class="grain"></div>
  ${marque(brand)}
  <div class="num mono">${i}/${n}</div>
  <div class="affiche ${e.image ? '' : 'vide grad'}" ${visuel(e)}>${e.image ? '' : `<span class="titre">${esc(e.name)}</span>`}</div>
  <div class="infos">
    <div class="rang"><span class="pastille">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))} ${esc(moisCourt(e.start))} · ${esc(heure(e.start))}</span>${prix(e) ? `<span class="pastille c">${esc(prix(e))}</span>` : ''}${style ? `<span class="pastille c">${esc(style)}</span>` : ''}</div>
    <h1>${esc(e.name)}</h1>
    <p>📍 ${esc(lieu(e) || "Côte d'Azur")}</p>
    <p class="src">Billets sur ${esc(srcLabel(e))}</p>
  </div>`, `
  .num{position:absolute;top:56px;right:64px;font-weight:900;font-size:30px;opacity:.8}
  .affiche{position:absolute;top:140px;left:50%;transform:translateX(-50%);width:760px;height:760px;border-radius:${theme === 'techno' ? 6 : 36}px;background-size:cover;background-position:center;box-shadow:0 30px 90px rgba(0,0,0,.7),0 0 0 3px rgba(255,255,255,.12)}
  .affiche.vide{display:flex;align-items:center;justify-content:center;padding:60px;text-align:center}
  .affiche.vide .titre{font-size:92px}
  .infos{position:absolute;left:64px;right:64px;top:950px}
  .rang{display:flex;gap:16px;flex-wrap:wrap}
  h1{font-size:62px;font-weight:900;line-height:1.05;margin:26px 0 16px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  p{font-size:34px;font-weight:700;opacity:.92}
  .src{font-size:26px;opacity:.6;margin-top:10px}`, theme);
}

function slideFin({ brand, cta, compte, theme, titre, question, tag }) {
  return page(1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc">
    <h1 class="titre">${nl(titre)}</h1>
    <p class="q">${esc(question)}</p>
    <div class="cta grad">${esc(cta)}<br><span>Lien en bio · ${esc(compte)}</span></div>
    <p class="tag">${esc(tag)}</p>
  </div>
  ${marque(brand, 'bottom:60px;left:50%;transform:translateX(-50%);font-size:44px')}`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;gap:44px}
  h1{font-size:190px}
  .q{font-size:46px;font-weight:900}
  .cta{font-size:44px;font-weight:900;padding:36px 46px;border-radius:${theme === 'techno' ? 6 : 32}px}
  .cta span{font-size:30px;font-weight:700;opacity:.9}
  .tag{font-size:34px;font-weight:700;opacity:.85}`, theme);
}

// Carrousel de soirées (incontournables, bons plans).
export function carouselPages({ couverture, agenda, fin, events, config, theme = 'club' }) {
  const brand = config.marque;
  const details = events.slice(0, 7); // couverture + agenda + 7 soirées + fin = 10 (max Instagram)
  return [
    slideCouverture({ ...couverture, events, brand, theme }),
    slideAgenda({ ...agenda, events, brand, theme }),
    ...details.map((e, i) => slideSoiree({ e, i: i + 1, n: details.length, brand, theme })),
    slideFin({ ...fin, brand, cta: config.appel_a_l_action, compte: config.compte, theme }),
  ];
}

// --- Débat : une seule image 1080×1350 -------------------------------------

export function debatPage({ debat, config }) {
  const ab = debat.a && debat.b;
  return [page(1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  ${marque(config.marque)}
  <div class="tagd">On en parle ?</div>
  <h1 class="${debat.q.length > 70 ? 'long' : ''}">${esc(debat.q)}</h1>
  ${ab ? `<div class="ab"><div class="opt grad"><b>A</b>${esc(debat.a)}</div><div class="vs titre">vs</div><div class="opt c"><b>B</b>${esc(debat.b)}</div></div>` : ''}
  <p class="pied">Réponds en commentaire 👇</p>`, `
  .tagd{position:absolute;top:56px;right:64px;font-weight:900;font-size:28px;padding:10px 20px;border:2px solid rgba(255,255,255,.4);border-radius:999px}
  h1{position:absolute;top:200px;left:64px;right:64px;font-size:80px;font-weight:900;line-height:1.08}
  h1.long{font-size:66px}
  .ab{position:absolute;left:64px;right:64px;bottom:190px;display:flex;align-items:center;gap:24px}
  .opt{flex:1;min-height:210px;border-radius:30px;padding:30px;font-size:40px;font-weight:900;line-height:1.1;display:flex;flex-direction:column;justify-content:center;gap:12px}
  .opt b{font-size:64px;font-family:Anton,Impact,sans-serif}
  .opt.c{background:rgba(255,255,255,.1);border:3px solid rgba(255,255,255,.35)}
  .vs{font-size:60px;opacity:.8}
  .pied{position:absolute;bottom:80px;left:64px;font-size:40px;font-weight:900}`)];
}

// --- Bon plan rédigé à la main : une image ----------------------------------

export function bonPlanManuelPage({ bp, config }) {
  return [page(1080, 1350, `
  <div class="fond"></div>${bp.image ? `<div class="flou" style="background-image:url('${esc(bp.image)}');filter:blur(0) brightness(.4)"></div>` : ''}<div class="grain"></div>
  ${marque(config.marque)}
  <div class="bloc"><span class="pastille">Bon plan</span><h1 class="titre">${nl(bp.titre)}</h1><p>${nl(bp.texte)}</p></div>`, `
  .bloc{position:absolute;left:64px;right:64px;bottom:110px;display:flex;flex-direction:column;gap:34px;align-items:flex-start}
  h1{font-size:120px}
  p{font-size:40px;font-weight:700;line-height:1.3;opacity:.95}`)];
}

// --- Reel 1080×1920 --------------------------------------------------------

export function reelPages({ events, config, theme = 'club', hook, sousHook, question = 'Laquelle\ntu choisis ?' }) {
  const brand = config.marque;
  const debut = page(1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><p class="pov mono">${esc(hook.pre)}</p><h1 class="titre">${nl(hook.titre)}</h1><p class="e">${esc(hook.emoji || '')}</p>
  <p class="s">${esc(sousHook)}</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 80px;gap:30px}
  .pov{font-size:70px;font-weight:900;color:var(--accent3)}
  h1{font-size:160px}
  .e{font-size:140px}
  .s{font-size:44px;font-weight:700;opacity:.85}`, theme);

  const slides = events.map((e, i) => page(1080, 1920, `
    <div class="fond"></div>${e.image ? `<div class="flou" ${visuel(e)}></div>` : ''}<div class="grain"></div>
    <div class="n titre">${i + 1}</div>
    <div class="affiche ${e.image ? '' : 'vide grad'}" ${visuel(e)}>${e.image ? '' : `<span class="titre">${esc(e.name)}</span>`}</div>
    <div class="infos">
      <span class="pastille">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))} · ${esc(heure(e.start))}</span>${prix(e) ? ` <span class="pastille c">${esc(prix(e))}</span>` : ''}
      <h1>${esc(e.name)}</h1>
      <p>📍 ${esc(lieu(e) || "Côte d'Azur")}</p>
    </div>`, `
    .n{position:absolute;top:150px;left:70px;font-size:220px;color:var(--accent)}
    .affiche{position:absolute;top:420px;left:50%;transform:translateX(-50%);width:900px;height:900px;border-radius:${theme === 'techno' ? 6 : 44}px;background-size:cover;background-position:center;box-shadow:0 40px 120px rgba(0,0,0,.75)}
    .affiche.vide{display:flex;align-items:center;justify-content:center;padding:70px;text-align:center}
    .affiche.vide .titre{font-size:110px}
    .infos{position:absolute;left:80px;right:80px;top:1390px}
    h1{font-size:72px;font-weight:900;line-height:1.05;margin:28px 0 18px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    p{font-size:42px;font-weight:700}`, theme));

  const choix = page(1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><h1 class="titre">${nl(question)}</h1>
  <div class="nums">${events.map((_, i) => `<span class="grad">${i + 1}</span>`).join('')}</div>
  <p>Réponds avec le numéro en commentaire 👇</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:60px;padding:0 70px}
  h1{font-size:170px}
  .nums{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
  .nums span{width:120px;height:120px;border-radius:${theme === 'techno' ? '8px' : '50%'};display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900}
  p{font-size:50px;font-weight:900}`, theme);

  const fin = page(1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><p class="t">${esc(config.appel_a_l_action)}</p>
  ${marque(brand, 'position:static;font-size:150px;letter-spacing:4px')}
  <p class="s">Lien en bio · ${esc(config.compte)}<br>📲 Envoie ce reel à ton crew</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:50px;padding:0 70px}
  .t{font-size:64px;font-weight:900}
  .s{font-size:46px;font-weight:700;opacity:.9;line-height:1.4}`, theme);

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
