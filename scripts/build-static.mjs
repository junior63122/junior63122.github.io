#!/usr/bin/env node
// Référencement de L'Écho des Anges.
// Génère, à partir de journal/articles.json et journal/pages.js :
//  - une page HTML complète par article (journal/a/<id>.html) : titre, description, adresse canonique,
//    balises Open Graph / Twitter, données structurées schema.org NewsArticle, texte intégral ;
//  - l'index de tous les articles (journal/a/index.html) et les pages fixes (journal/p/*.html) ;
//  - le plan du site (journal/sitemap.xml), le fil RSS (journal/feed.xml) et llms.txt pour les IA ;
//  - robots.txt et llms.txt à la racine du site.
// Usage : node scripts/build-static.mjs   (SITE_URL=https://exemple.fr/journal pour un autre domaine)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const J = join(ROOT, "journal");
const SITE = (process.env.SITE_URL || "https://junior63122.github.io/journal").replace(/\/$/, "");
const ORIGIN = new URL(SITE).origin;
const NOM = "L'Écho des Anges";
const DESC_FR = "L'Écho des Anges, le quotidien de la Baie des Anges : actualité de Nice, Cannes, Monaco et de la Côte d'Azur, économie, finance, événementiel, tech, international et sport.";
const DESC_EN = "L'Écho des Anges, the daily of the Baie des Anges: news from Nice, Cannes, Monaco and the French Riviera, business, finance, events, tech, world and sport.";

const SECTIONS = {
  Business: { fr: "Économie", en: "Business", slug: "economie" },
  Finance: { fr: "Finance", en: "Finance", slug: "finance" },
  "Événementiel": { fr: "Événementiel", en: "Events", slug: "evenementiel" },
  Tech: { fr: "Tech", en: "Tech", slug: "tech" },
  Monde: { fr: "International", en: "World", slug: "international" },
  "Nice & Côte d'Azur": { fr: "Nice & Côte d'Azur", en: "Nice & the Riviera", slug: "nice" },
  Sport: { fr: "Sport", en: "Sport", slug: "sport" },
};

// Personnes et lieux mentionnés, pour les données structurées (champ « about »).
const SUJETS = [
  { re: /Junior William Joyant|Junior Joyant/, item: { "@type": "Person", name: "Junior William Joyant", alternateName: "Junior Joyant", homeLocation: { "@type": "Place", name: "Nice, France" } } },
  { re: /Oneera/, item: { "@type": "Organization", name: "Oneera", foundingDate: "2026-05", foundingLocation: "Nice, France" } },
  { re: /Teufy/, item: { "@type": "Organization", name: "Teufy", foundingDate: "2021" } },
  { re: /\bNice\b/, item: { "@type": "City", name: "Nice", sameAs: "https://fr.wikipedia.org/wiki/Nice" } },
  { re: /\bCannes\b/, item: { "@type": "City", name: "Cannes", sameAs: "https://fr.wikipedia.org/wiki/Cannes" } },
  { re: /\bMonaco\b/, item: { "@type": "Country", name: "Monaco", sameAs: "https://fr.wikipedia.org/wiki/Monaco" } },
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const xml = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const langOf = (a) => a.lang || "fr";
const twinKey = (a) => (langOf(a) === "en" ? a.id.replace(/^((?:archive-)?\d{4}-\d\d-\d\d)-en-/, "$1-") : a.id);
const hash = (str) => { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const iso = (a) => a.heure || `${a.date}T12:00:00+01:00`;
const dateLong = (d, lang) => new Date(d + "T12:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fichier = (a) => `${a.id.replace(/[^a-z0-9-]/gi, "-")}.html`;
const url = (a) => `${SITE}/a/${fichier(a)}`;
const resume = (a) => (a.chapo || (a.liens && a.liens[0] && a.liens[0].resume) || "").replace(/\s+/g, " ").trim().slice(0, 300);

const articles = JSON.parse(readFileSync(join(J, "articles.json"), "utf8"));
const credits = existsSync(join(J, "img/stock/credits.json")) ? JSON.parse(readFileSync(join(J, "img/stock/credits.json"), "utf8")) : {};

// Pages fixes : on exécute pages.js dans un bac à sable pour récupérer son contenu.
const bac = { window: {} };
vm.runInNewContext(readFileSync(join(J, "pages.js"), "utf8"), bac);
const PAGES = bac.window.JOURNAL_PAGES || {};

// Seuls les contenus rédigés sont indexés (les revues de presse brutes sont de simples listes de liens).
const indexables = articles.filter((a) => a.type === "article" || a.type === "archive" || (a.type === "revue" && a.redige && a.corps?.length));

function image(a) {
  if (a.photo === false) return null;
  if (a.image) return { src: a.image.src, credit: a.image.credit, legende: (a.image.legende || {})[langOf(a)] || "" };
  const pool = credits[a.section] || [];
  if (!pool.length) return null;
  const p = pool[hash(twinKey(a)) % pool.length];
  const org = p.origine === "wikimedia" ? "Wikimedia Commons" : p.origine === "pexels" ? "Pexels" : p.origine;
  return { src: `img/stock/${p.fichier}`, credit: `${p.auteur} / ${org} (${p.licence})`, legende: "" };
}

function tete({ lang, titre, description, canonical, type = "website", imageUrl, alternates = [], jsonld = [], extra = "" }) {
  const img = imageUrl || `${SITE}/img/og-default.jpg`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${canonical}">
${alternates.map((x) => `<link rel="alternate" hreflang="${x.lang}" href="${x.href}">`).join("\n")}
<meta property="og:site_name" content="${esc(NOM)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${img}">
<meta property="og:locale" content="${lang === "en" ? "en_GB" : "fr_FR"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titre)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
${extra}
<meta name="theme-color" content="#0c1a2b">
<link rel="alternate" type="application/rss+xml" title="${esc(NOM)}" href="${SITE}/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,700;1,9..144,900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${SITE}/journal.css">
${jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>`;
}

function entete(lang) {
  const nav = Object.values(SECTIONS).map((s) => `<a href="${SITE}/#r/${s.slug}">${esc(s[lang])}</a>`).join("");
  return `<header class="site-header">
  <div class="header-top">
    <div class="header-left"></div>
    <a class="logo" href="${SITE}/${lang === "en" ? "?lang=en" : ""}" aria-label="${esc(NOM)}">
      <svg class="emblem" viewBox="0 0 48 40" aria-hidden="true"><path d="M4 30 C14 28 22 22 26 8" /><path d="M10 33 C21 31 30 24 34 10" /><path d="M17 36 C28 34 38 27 44 14" /></svg>
      <span class="logo-text">L'Écho <em>des</em> Anges</span>
    </a>
    <div class="header-right"></div>
  </div>
  <nav class="sections" aria-label="${lang === "en" ? "Sections" : "Rubriques"}"><a class="home" href="${SITE}/">${lang === "en" ? "Front page" : "À la une"}</a>${nav}<a href="${SITE}/#archives">Archives</a></nav>
</header>`;
}

function pied(lang) {
  const L = lang === "en"
    ? { all: "All articles", story: "Our story", legal: "Legal notice", rss: "RSS feed" }
    : { all: "Tous les articles", story: "Notre histoire", legal: "Mentions légales", rss: "Fil RSS" };
  return `<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand"><span class="logo-text">L'Écho <em>des</em> Anges</span><p>${lang === "en" ? "The daily of the Baie des Anges." : "Le quotidien de la Baie des Anges."}</p></div>
    <div><ul class="footer-list"><li><a href="${SITE}/a/">${L.all}</a></li><li><a href="${SITE}/p/histoire${lang === "en" ? "-en" : ""}.html">${L.story}</a></li><li><a href="${SITE}/p/mentions${lang === "en" ? "-en" : ""}.html">${L.legal}</a></li><li><a href="${SITE}/feed.xml">${L.rss}</a></li></ul></div>
  </div>
  <p class="copyright">© ${new Date().getFullYear()} ${esc(NOM)} · Nice</p>
</footer>
</body>
</html>
`;
}

const editeur = { "@type": "NewsMediaOrganization", name: NOM, url: `${SITE}/`, logo: { "@type": "ImageObject", url: `${SITE}/img/og-default.jpg` } };

function pageArticle(a) {
  const lang = langOf(a);
  const sec = SECTIONS[a.section] || { fr: a.section, en: a.section, slug: "" };
  const img = image(a);
  const imgAbs = img ? `${SITE}/${img.src}` : null;
  const twin = articles.find((x) => x !== a && langOf(x) !== lang && twinKey(x) === twinKey(a) && indexables.includes(x));
  const alternates = twin ? [{ lang, href: url(a) }, { lang: langOf(twin), href: url(twin) }] : [];
  const texte = [a.chapo, ...(a.corps || [])].join(" ");
  const about = SUJETS.filter((s) => s.re.test(`${a.titre} ${texte}`)).map((s) => s.item);
  const ld = {
    "@context": "https://schema.org",
    "@type": a.type === "archive" ? "Article" : "NewsArticle",
    headline: a.titre.slice(0, 110),
    description: resume(a),
    inLanguage: lang,
    datePublished: iso(a),
    dateModified: iso(a),
    articleSection: sec[lang],
    mainEntityOfPage: url(a),
    url: url(a),
    image: imgAbs ? [imgAbs] : [`${SITE}/img/og-default.jpg`],
    author: { "@type": "Organization", name: `Rédaction de ${NOM}`, url: `${SITE}/` },
    publisher: editeur,
    articleBody: (a.corps || []).join("\n\n"),
    ...(about.length ? { about } : {}),
    ...(a.liens?.length ? { citation: a.liens.map((l) => ({ "@type": "CreativeWork", name: l.titre, url: l.url, publisher: l.source })) } : {}),
  };
  const fil = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NOM, item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: a.type === "archive" ? "Archives" : sec[lang], item: a.type === "archive" ? `${SITE}/#archives` : `${SITE}/#r/${sec.slug}` },
    { "@type": "ListItem", position: 3, name: a.titre, item: url(a) },
  ] };
  const T = lang === "en" ? { by: "By", pub: "Published on", src: "Sources", photo: "Photo" } : { by: "Par", pub: "Publié le", src: "Sources", photo: "Photo" };
  const kicker = `${a.type === "archive" ? "Archives · " : ""}${sec[lang]}${a.type === "article" && a.rubrique ? ` · ${a.rubrique}` : ""}`;
  const fig = img ? `<figure class="fig ${a.image ? "hero-portrait" : "hero"}"><img src="${SITE}/${esc(img.src)}" alt="${esc(img.legende || a.titre)}" loading="eager"><figcaption>${img.legende ? `<span>${esc(img.legende)}</span> ` : ""}<span class="credit">${T.photo} : ${esc(img.credit)}</span></figcaption></figure>` : "";
  const galerie = a.galerie?.length ? `<div class="galerie">${a.galerie.map((g) => `<figure class="fig"><img src="${SITE}/${esc(g.src)}" alt="${esc((g.legende || {})[lang] || a.titre)}" loading="lazy"><figcaption><span>${esc((g.legende || {})[lang] || "")}</span> <span class="credit">${T.photo} : ${esc(g.credit)}</span></figcaption></figure>`).join("")}</div>` : "";
  const sources = a.liens?.length ? `<section class="sources-list"><h2>${T.src}</h2><ul>${a.liens.map((l) => `<li><a href="${esc(l.url)}" rel="noopener nofollow" target="_blank">${esc(l.titre)}</a> <span>— ${esc(l.source)}</span></li>`).join("")}</ul></section>` : "";
  return tete({
    lang, titre: `${a.titre} | ${NOM}`, description: resume(a), canonical: url(a), type: "article", imageUrl: imgAbs, alternates, jsonld: [ld, fil],
    extra: `<meta property="article:published_time" content="${iso(a)}">\n<meta property="article:section" content="${esc(sec[lang])}">`,
  }) + entete(lang) + `
<main>
<article class="article">
  <div class="crumbs">${esc(kicker)}</div>
  <h1>${esc(a.titre)}</h1>
  <p class="chapo">${esc(a.chapo)}</p>
  <div class="meta-line"><strong>${T.by} ${esc(a.auteur)}</strong><span class="when">${a.type === "archive" ? "" : T.pub + " "}<time datetime="${iso(a)}">${esc(dateLong(a.date, lang))}</time></span>${a.sources?.length ? `<span class="sources">${T.src} : ${esc(a.sources.join(", "))}</span>` : ""}</div>
  ${fig}
  ${(a.corps || []).map((p) => `<p class="body">${esc(p)}</p>`).join("\n  ")}
  ${galerie}
  ${sources}
</article>
</main>
` + pied(lang);
}

function pageIndex() {
  const parJour = {};
  for (const a of indexables) (parJour[a.date] ||= []).push(a);
  const jours = Object.keys(parJour).sort().reverse();
  const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: `Tous les articles — ${NOM}`, url: `${SITE}/a/`, isPartOf: { "@type": "WebSite", name: NOM, url: `${SITE}/` } };
  return tete({ lang: "fr", titre: `Tous les articles | ${NOM}`, description: `Tous les articles et archives de ${NOM} : Nice, Cannes, Monaco et la Côte d'Azur.`, canonical: `${SITE}/a/`, jsonld: [ld] })
    + entete("fr") + `
<main>
<div class="rubrique-head"><h1>Tous les articles</h1></div>
<div class="list">
${jours.map((d) => `<h2 class="year">${esc(dateLong(d, "fr"))}</h2>
${parJour[d].map((a) => `<article class="list-item"><span class="kicker">${esc((SECTIONS[a.section] || {}).fr || a.section)}${langOf(a) === "en" ? " · English" : ""}</span><h3><a href="${SITE}/a/${fichier(a)}">${esc(a.titre)}</a></h3><p>${esc(resume(a))}</p></article>`).join("\n")}`).join("\n")}
</div>
</main>
` + pied("fr");
}

function pageFixe(cle, lang) {
  const P = (PAGES[cle] || {})[lang];
  if (!P) return null;
  const nom = `${cle}${lang === "en" ? "-en" : ""}.html`;
  return tete({ lang, titre: `${P.titre} | ${NOM}`, description: P.chapo, canonical: `${SITE}/p/${nom}`, alternates: [{ lang: "fr", href: `${SITE}/p/${cle}.html` }, { lang: "en", href: `${SITE}/p/${cle}-en.html` }] })
    + entete(lang) + `
<main><article class="article page"><h1>${esc(P.titre)}</h1><p class="chapo">${esc(P.chapo)}</p><div class="page-body">${P.html}</div></article></main>
` + pied(lang);
}

// ---------- Écriture ----------
rmSync(join(J, "a"), { recursive: true, force: true });
mkdirSync(join(J, "a"), { recursive: true });
mkdirSync(join(J, "p"), { recursive: true });
for (const a of indexables) writeFileSync(join(J, "a", fichier(a)), pageArticle(a));
writeFileSync(join(J, "a", "index.html"), pageIndex());
const fixes = [];
for (const cle of Object.keys(PAGES)) for (const lang of ["fr", "en"]) {
  const html = pageFixe(cle, lang);
  if (html) { writeFileSync(join(J, "p", `${cle}${lang === "en" ? "-en" : ""}.html`), html); fixes.push(`${SITE}/p/${cle}${lang === "en" ? "-en" : ""}.html`); }
}

// Plan du site
const maj = new Date().toISOString().slice(0, 10);
writeFileSync(join(J, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${SITE}/</loc><lastmod>${maj}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE}/a/</loc><lastmod>${maj}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
${fixes.map((u) => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>`).join("\n")}
${indexables.map((a) => `  <url><loc>${url(a)}</loc><lastmod>${(a.heure || a.date).slice(0, 10)}</lastmod><priority>${a.type === "archive" ? "0.5" : "0.7"}</priority></url>`).join("\n")}
</urlset>
`);

// Fil RSS (50 derniers articles en français)
const recents = indexables.filter((a) => langOf(a) === "fr" && a.type !== "archive").sort((x, y) => iso(y).localeCompare(iso(x))).slice(0, 50);
writeFileSync(join(J, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xml(NOM)}</title>
  <link>${SITE}/</link>
  <description>${xml(DESC_FR)}</description>
  <language>fr-FR</language>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${recents.map((a) => `  <item>
    <title>${xml(a.titre)}</title>
    <link>${url(a)}</link>
    <guid isPermaLink="true">${url(a)}</guid>
    <pubDate>${new Date(iso(a)).toUTCString()}</pubDate>
    <category>${xml((SECTIONS[a.section] || {}).fr || a.section)}</category>
    <description>${xml(resume(a))}</description>
  </item>`).join("\n")}
</channel>
</rss>
`);

// llms.txt : résumé lisible par les IA (convention llmstxt.org)
const ligne = (a) => `- [${a.titre}](${url(a)}) (${a.date}) : ${resume(a)}`;
const fr = indexables.filter((a) => langOf(a) === "fr");
const llms = `# ${NOM}

> ${DESC_FR}

${NOM} est un quotidien d'information en ligne basé à Nice, publié en français et en anglais. Chaque article cite ses sources en fin de texte. Toutes les pages listées ci-dessous sont des pages HTML statiques contenant le texte intégral.

- Site : ${SITE}/
- Tous les articles : ${SITE}/a/
- Plan du site : ${SITE}/sitemap.xml
- Fil RSS : ${SITE}/feed.xml
- Histoire du journal : ${SITE}/p/histoire.html
- Mentions légales : ${SITE}/p/mentions.html

## Articles
${fr.filter((a) => a.type !== "archive").sort((x, y) => iso(y).localeCompare(iso(x))).map(ligne).join("\n")}

## Archives (événements de la Côte d'Azur depuis 2020)
${fr.filter((a) => a.type === "archive").sort((x, y) => y.date.localeCompare(x.date)).map(ligne).join("\n")}

## English edition
${indexables.filter((a) => langOf(a) === "en").map(ligne).join("\n")}
`;
writeFileSync(join(J, "llms.txt"), llms);

// Racine du site : robots.txt et llms.txt (seulement si le journal est servi sur ce domaine)
if (ORIGIN === "https://junior63122.github.io") {
  writeFileSync(join(ROOT, "robots.txt"), `# Tous les robots, y compris les moteurs de recherche et les assistants IA, sont autorisés.
User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
  writeFileSync(join(ROOT, "llms.txt"), llms);
}

console.log(`${indexables.length} pages d'articles, ${fixes.length} pages fixes, sitemap (${indexables.length + fixes.length + 2} URL), RSS (${recents.length}), llms.txt.`);
