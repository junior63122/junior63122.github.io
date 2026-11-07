// Génère les visuels (PNG) à partir de gabarits HTML, rendus par Chromium (Playwright).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { jourCourt, jourNum, moisCourt, heure, plage } from './dates.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const srcLabel = (e) => (e.manuel ? 'Teufy' : e.source === 'dice' ? 'DICE' : e.source === 'shotgun' ? 'Shotgun' : e.source);
const prix = (e) => (e.price == null ? '' : e.price === 0 ? 'Gratuit' : `dès ${String(Math.round(e.price * 100) / 100).replace('.', ',')} €`);
const lieu = (e) => [e.venue, e.city && !norm(e.venue).includes(norm(e.city)) ? e.city : ''].filter(Boolean).join(' · ');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@500;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--rose:#ff2d87;--violet:#7b2cff;--cyan:#22e4ff;--nuit:#0b0618;--blanc:#fff}
html,body{width:var(--w);height:var(--h);overflow:hidden;background:var(--nuit);color:var(--blanc);font-family:Inter,'DejaVu Sans',sans-serif}
.titre{font-family:Anton,Impact,'DejaVu Sans Condensed',sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:.5px}
.fond{position:absolute;inset:0;background:
 radial-gradient(60% 45% at 15% 10%,rgba(255,45,135,.55),transparent 70%),
 radial-gradient(55% 45% at 90% 85%,rgba(123,44,255,.6),transparent 70%),
 radial-gradient(40% 30% at 80% 20%,rgba(34,228,255,.25),transparent 70%),var(--nuit)}
.grain{position:absolute;inset:0;opacity:.08;background-image:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)}
.flou{position:absolute;inset:-60px;background-size:cover;background-position:center;filter:blur(40px) brightness(.45) saturate(1.4)}
.marque{position:absolute;font-weight:900;letter-spacing:2px;font-size:30px}
.marque b{color:var(--rose)}
.pastille{display:inline-block;padding:12px 22px;border-radius:999px;font-weight:900;font-size:28px;background:var(--rose);color:#fff}
.pastille.c{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35)}
`;

function page(w, h, body, extraCss = '') {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${BASE_CSS}${extraCss}</style></head><body>${body}</body></html>`;
}

const marque = (brand, pos = 'top:56px;left:64px') => `<div class="marque" style="${pos}">${esc(brand.slice(0, -2))}<b>${esc(brand.slice(-2))}</b></div>`;

// --- Carrousel 1080×1350 ---------------------------------------------------

function slideCouverture({ titre, sousTitre, from, to, events, brand }) {
  const imgs = events.filter((e) => e.image).slice(0, 6);
  const mosaique = imgs.map((e, i) => `<div class="m" style="background-image:url('${esc(e.image)}');transform:rotate(${[-6, 4, -3, 7, -5, 3][i]}deg)"></div>`).join('');
  return page(1080, 1350, `
  <div class="fond"></div>
  <div class="mosaique">${mosaique}</div>
  <div class="voile"></div><div class="grain"></div>
  ${marque(brand)}
  <div class="bloc">
    <div class="pastille">${esc(plage(from, to))}</div>
    <h1 class="titre">${esc(titre)}</h1>
    <h2>${esc(sousTitre)}</h2>
    <p class="compte">${events.length} soirée${events.length > 1 ? 's' : ''} sélectionnée${events.length > 1 ? 's' : ''} · Swipe →</p>
  </div>`, `
  .mosaique{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:150px 40px 0;opacity:.55}
  .m{aspect-ratio:1;border-radius:26px;background-size:cover;background-position:center;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .voile{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,6,24,.2) 0%,rgba(11,6,24,.75) 45%,#0b0618 72%)}
  .bloc{position:absolute;left:64px;right:64px;bottom:90px}
  h1{font-size:168px;margin:34px 0 18px;text-shadow:0 6px 40px rgba(255,45,135,.45)}
  h2{font-size:56px;font-weight:900;color:var(--cyan)}
  .compte{margin-top:40px;font-size:34px;font-weight:700;opacity:.9}`);
}

function slideAgenda({ events, brand }) {
  const lignes = events.slice(0, 12).map((e) => `
    <li><span class="j">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))}</span>
    <span class="n">${esc(e.name)}<small>${esc(lieu(e) || srcLabel(e))}</small></span>
    <span class="h">${esc(heure(e.start))}</span></li>`).join('');
  return page(1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  ${marque(brand)}
  <h1 class="titre">L'agenda</h1>
  <ul>${lignes}</ul>
  <p class="pied">📌 Enregistre ce post pour ne rien rater</p>`, `
  h1{position:absolute;top:120px;left:64px;font-size:120px}
  ul{position:absolute;top:290px;left:64px;right:64px;list-style:none}
  li{display:flex;align-items:center;gap:26px;padding:18px 0;border-bottom:2px solid rgba(255,255,255,.12)}
  .j{flex:0 0 150px;font-weight:900;font-size:32px;color:var(--rose)}
  .n{flex:1;font-weight:700;font-size:32px;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .n small{display:block;font-weight:500;font-size:24px;opacity:.7;margin-top:4px}
  .h{font-weight:900;font-size:30px;color:var(--cyan)}
  .pied{position:absolute;bottom:60px;left:64px;font-size:32px;font-weight:700}`);
}

function slideSoiree({ e, i, n, brand }) {
  const visuel = e.image ? `style="background-image:url('${esc(e.image)}')"` : '';
  return page(1080, 1350, `
  <div class="fond"></div>${e.image ? `<div class="flou" ${visuel}></div>` : ''}<div class="grain"></div>
  ${marque(brand)}
  <div class="num">${i}/${n}</div>
  <div class="affiche ${e.image ? '' : 'vide'}" ${visuel}>${e.image ? '' : `<span class="titre">${esc(e.name)}</span>`}</div>
  <div class="infos">
    <div class="rang"><span class="pastille">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))} ${esc(moisCourt(e.start))} · ${esc(heure(e.start))}</span>${prix(e) ? `<span class="pastille c">${esc(prix(e))}</span>` : ''}</div>
    <h1>${esc(e.name)}</h1>
    <p>📍 ${esc(lieu(e) || "Côte d'Azur")}</p>
    <p class="src">Billets sur ${esc(srcLabel(e))}</p>
  </div>`, `
  .num{position:absolute;top:56px;right:64px;font-weight:900;font-size:30px;opacity:.8}
  .affiche{position:absolute;top:140px;left:50%;transform:translateX(-50%);width:760px;height:760px;border-radius:36px;background-size:cover;background-position:center;box-shadow:0 30px 90px rgba(0,0,0,.7),0 0 0 3px rgba(255,255,255,.12)}
  .affiche.vide{display:flex;align-items:center;justify-content:center;padding:60px;text-align:center;background:linear-gradient(135deg,var(--violet),var(--rose))}
  .affiche.vide .titre{font-size:92px}
  .infos{position:absolute;left:64px;right:64px;top:950px}
  .rang{display:flex;gap:16px;flex-wrap:wrap}
  h1{font-size:62px;font-weight:900;line-height:1.05;margin:26px 0 16px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  p{font-size:34px;font-weight:700;opacity:.92}
  .src{font-size:26px;opacity:.6;margin-top:10px}`);
}

function slideFin({ brand, cta, compte }) {
  return page(1080, 1350, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc">
    <h1 class="titre">Tu sors<br>où&nbsp;?</h1>
    <p class="q">Dis-nous en commentaire 👇</p>
    <div class="cta">${esc(cta)}<br><span>Lien en bio · ${esc(compte)}</span></div>
    <p class="tag">👯 Tag la personne qui vient avec toi</p>
  </div>
  ${marque(brand, 'bottom:60px;left:50%;transform:translateX(-50%);font-size:44px')}`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;gap:44px}
  h1{font-size:210px;text-shadow:0 10px 60px rgba(123,44,255,.7)}
  .q{font-size:46px;font-weight:900}
  .cta{font-size:44px;font-weight:900;padding:36px 46px;border-radius:32px;background:linear-gradient(135deg,var(--rose),var(--violet))}
  .cta span{font-size:30px;font-weight:700;opacity:.9}
  .tag{font-size:34px;font-weight:700;opacity:.85}`);
}

export function carouselPages({ titre, sousTitre, from, to, events, config }) {
  const brand = config.marque;
  const details = events.slice(0, 7); // 1 couverture + 1 agenda + 7 soirées + 1 fin = 10 (max Instagram)
  return [
    slideCouverture({ titre, sousTitre, from, to, events, brand }),
    slideAgenda({ events, brand }),
    ...details.map((e, i) => slideSoiree({ e, i: i + 1, n: details.length, brand })),
    slideFin({ brand, cta: config.appel_a_l_action, compte: config.compte }),
  ];
}

// --- Reel 1080×1920 --------------------------------------------------------

export function reelPages({ events, from, to, config }) {
  const brand = config.marque;
  const hook = page(1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><p class="pov">POV :</p><h1 class="titre">t'as toujours<br>pas de plan<br>ce week-end</h1><p class="e">👀</p>
  <p class="s">${events.length} soirées sur la Côte d'Azur ${esc(plage(from, to))}</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 80px;gap:30px}
  .pov{font-size:70px;font-weight:900;color:var(--cyan)}
  h1{font-size:170px}
  .e{font-size:140px}
  .s{font-size:44px;font-weight:700;opacity:.85}`);

  const slides = events.map((e, i) => {
    const visuel = e.image ? `style="background-image:url('${esc(e.image)}')"` : '';
    return page(1080, 1920, `
    <div class="fond"></div>${e.image ? `<div class="flou" ${visuel}></div>` : ''}<div class="grain"></div>
    <div class="n titre">${i + 1}</div>
    <div class="affiche ${e.image ? '' : 'vide'}" ${visuel}>${e.image ? '' : `<span class="titre">${esc(e.name)}</span>`}</div>
    <div class="infos">
      <span class="pastille">${esc(jourCourt(e.start))} ${esc(jourNum(e.start))} · ${esc(heure(e.start))}</span>
      <h1>${esc(e.name)}</h1>
      <p>📍 ${esc(lieu(e) || "Côte d'Azur")}</p>
    </div>`, `
    .n{position:absolute;top:150px;left:70px;font-size:220px;color:var(--rose);text-shadow:0 8px 50px rgba(255,45,135,.6)}
    .affiche{position:absolute;top:420px;left:50%;transform:translateX(-50%);width:900px;height:900px;border-radius:44px;background-size:cover;background-position:center;box-shadow:0 40px 120px rgba(0,0,0,.75)}
    .affiche.vide{display:flex;align-items:center;justify-content:center;padding:70px;text-align:center;background:linear-gradient(135deg,var(--violet),var(--rose))}
    .affiche.vide .titre{font-size:110px}
    .infos{position:absolute;left:80px;right:80px;top:1390px}
    h1{font-size:72px;font-weight:900;line-height:1.05;margin:28px 0 18px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    p{font-size:42px;font-weight:700}`);
  });

  const question = page(1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><h1 class="titre">Laquelle<br>tu choisis&nbsp;?</h1>
  <div class="nums">${events.map((_, i) => `<span>${i + 1}</span>`).join('')}</div>
  <p>Réponds avec le numéro en commentaire 👇</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:60px;padding:0 70px}
  h1{font-size:180px}
  .nums{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
  .nums span{width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;background:linear-gradient(135deg,var(--rose),var(--violet))}
  p{font-size:50px;font-weight:900}`);

  const fin = page(1080, 1920, `
  <div class="fond"></div><div class="grain"></div>
  <div class="bloc"><p class="t">${esc(config.appel_a_l_action)}</p>
  ${marque(brand, 'position:static;font-size:150px;letter-spacing:4px')}
  <p class="s">Lien en bio · ${esc(config.compte)}<br>📲 Envoie ce reel à ton crew</p></div>`, `
  .bloc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:50px;padding:0 70px}
  .t{font-size:64px;font-weight:900}
  .s{font-size:46px;font-weight:700;opacity:.9;line-height:1.4}`);

  return [hook, ...slides, question, fin];
}

// --- Rendu -----------------------------------------------------------------

export async function renderPages(pages, outDir, prefix, { width, height }) {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const files = [];
  try {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    for (let i = 0; i < pages.length; i++) {
      await pg.setContent(pages[i], { waitUntil: 'load', timeout: 45000 }).catch(() => {});
      await pg.evaluate(() => document.fonts?.ready).catch(() => {});
      await pg.waitForTimeout(300);
      const f = path.join(outDir, `${prefix}-${String(i + 1).padStart(2, '0')}.${prefix === 'reel' ? 'png' : 'jpg'}`);
      await pg.screenshot(prefix === 'reel' ? { path: f } : { path: f, type: 'jpeg', quality: 92 });
      files.push(f);
    }
  } finally {
    await browser.close();
  }
  return files;
}
