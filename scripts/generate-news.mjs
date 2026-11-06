#!/usr/bin/env node
// Génère les articles d'actualité (Business, Finance, Événementiel, …) du Journal.
// Chaque rubrique = une revue de presse du jour construite à partir de flux RSS
// de médias reconnus : titres, résumés et liens vers les sources (rien n'est inventé).
// Usage : node scripts/generate-news.mjs [--date=YYYY-MM-DD] [--fixture=fichier.xml]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "journal", "articles.json");
const MAX_ARTICLES = 500; // on garde l'historique raisonnable
const PAR_ARTICLE = 5; // nombre d'infos par revue de presse

const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`;
const gnewsEn = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-GB&gl=GB&ceid=GB:en`;
const bbc = (s) => `https://feeds.bbci.co.uk/news/${s}/rss.xml`;

export const LANGS = ["fr", "en"];

// Chaque rubrique est tenue par un(e) journaliste de la rédaction.
// Les flux sont essayés dans l'ordre ; s'ils échouent, les suivants prennent le relais.
export const RUBRIQUES = [
  { key: "Business", emoji: "💼", journaliste: "Camille Rostand",
    fr: { nom: "Business", intro: "Entreprises, emploi, stratégie : l'essentiel de l'actualité économique.",
      feeds: ["https://www.lemonde.fr/economie/rss_full.xml", "https://www.francetvinfo.fr/economie.rss", gnews("entreprises économie France")] },
    en: { nom: "Business", intro: "Companies, jobs and strategy: the business news that matters.",
      feeds: [bbc("business"), gnewsEn("business companies economy")] } },
  { key: "Finance", emoji: "📈", journaliste: "Hugo Marchetti",
    fr: { nom: "Finance", intro: "Bourse, marchés, taux, crypto et argent au quotidien : ce qui a bougé.",
      feeds: ["https://www.lemonde.fr/argent/rss_full.xml", gnews("bourse CAC 40 marchés"), gnews("finance crypto taux BCE")] },
    en: { nom: "Finance", intro: "Stocks, markets, interest rates and crypto: what moved today.",
      feeds: [gnewsEn("stock markets finance"), gnewsEn("interest rates central bank crypto")] } },
  { key: "Événementiel", emoji: "🎪", journaliste: "Léa Fontaine",
    fr: { nom: "Événementiel", intro: "Salons, festivals, concerts, grands rendez-vous : l'actualité de l'événementiel.",
      feeds: [gnews("événementiel France"), gnews("festival salon concert France"), "https://www.lemonde.fr/culture/rss_full.xml"] },
    en: { nom: "Events", intro: "Trade shows, festivals, concerts and big gatherings: the events industry today.",
      feeds: [gnewsEn("events industry"), gnewsEn("festival trade show concert"), bbc("entertainment_and_arts")] } },
  { key: "Tech", emoji: "💻", journaliste: "Nathan Belkacem",
    fr: { nom: "Tech", intro: "Intelligence artificielle, start-up, cybersécurité : les nouvelles du numérique.",
      feeds: ["https://www.lemonde.fr/pixels/rss_full.xml", gnews("cybersécurité"), gnews("start-up numérique")] },
    en: { nom: "Tech", intro: "Start-ups, cybersecurity and digital life: the latest from the tech world.",
      feeds: [bbc("technology"), gnewsEn("cybersecurity"), gnewsEn("tech start-up")] } },
  { key: "Monde", emoji: "🌍", journaliste: "Sofia Delmas",
    fr: { nom: "Monde", intro: "Le tour du monde de l'actualité en quelques titres.",
      feeds: ["https://www.lemonde.fr/international/rss_full.xml", "https://www.francetvinfo.fr/monde.rss"] },
    en: { nom: "World", intro: "Around the world in a few headlines.",
      feeds: [bbc("world"), gnewsEn("world news")] } },
  { key: "Nice & Côte d'Azur", emoji: "🌴", journaliste: "Lucas Giordano",
    fr: { nom: "Nice & Côte d'Azur", intro: "Ce qui se passe près de chez nous, de Nice à Monaco.",
      feeds: [gnews("Nice Côte d'Azur"), gnews("Nice événement sortie"), gnews("Monaco actualité")] },
    en: { nom: "Nice & the Riviera", intro: "What's happening on the French Riviera, from Nice to Monaco.",
      feeds: [gnewsEn("Nice France"), gnewsEn("French Riviera"), gnewsEn("Monaco")] } },
  { key: "Sport", emoji: "⚽", journaliste: "Inès Morel",
    fr: { nom: "Sport", intro: "Résultats, transferts et grands moments du sport.",
      feeds: ["https://www.lemonde.fr/sport/rss_full.xml", gnews("OGC Nice"), "https://www.francetvinfo.fr/sports.rss"] },
    en: { nom: "Sport", intro: "Results, transfers and the big moments in sport.",
      feeds: [bbc("sport"), "https://feeds.bbci.co.uk/sport/rss.xml", gnewsEn("OGC Nice")] } },
];

// ---------- Lecture RSS / Atom (sans dépendance) ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
const clean = (s) => decode(decode(s || "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

const MEDIAS = { "lemonde.fr": "Le Monde", "francetvinfo.fr": "franceinfo", "feeds.bbci.co.uk": "BBC News" };

export function parseFeed(xml, feedUrl = "") {
  const host = (() => { try { return new URL(feedUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const channel = clean(tag(xml.split(/<item|<entry/i)[0], "title"));
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map((b) => {
    let titre = clean(tag(b, "title"));
    let link = clean(tag(b, "link"));
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? decode(m[1]) : ""; }
    let source = clean(tag(b, "source")) || MEDIAS[host] || channel.replace(/\s*[:|–-].*$/, "") || host;
    // Google News : « Titre - Média »
    if (host === "news.google.com") {
      const src = clean(tag(b, "source"));
      if (src && titre.endsWith(" - " + src)) { titre = titre.slice(0, -(src.length + 3)).trim(); source = src; }
      else {
        const m = titre.match(/^(.*) - ([^-]{2,60})$/);
        if (m) { titre = m[1].trim(); source = src || m[2].trim(); }
      }
    }
    let resume = clean(tag(b, "description") || tag(b, "summary") || tag(b, "content"));
    if (resume.startsWith(titre.slice(0, 40))) resume = ""; // Google News répète le titre
    if (resume.length > 260) resume = resume.slice(0, 257).replace(/\s+\S*$/, "") + "…";
    const d = Date.parse(clean(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date")));
    return { titre, source, url: link, resume, date: Number.isNaN(d) ? null : d };
  }).filter((i) => i.titre && /^https?:\/\//.test(i.url));
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EchoDesAnges/1.0; +https://junior63122.github.io/journal/)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text(), url);
}

// ---------- Construction d'un article ----------
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s) => norm(s).replace(/ /g, "-").slice(0, 50);
const dateLang = (d, lang) => new Date(d + "T12:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

export function buildArticle(rub, items, date, dejaVus = new Set(), lang = "fr") {
  const L = rub[lang];
  const now = Date.parse(date + "T23:59:59Z");
  const seen = new Set();
  const choisis = items
    .filter((i) => !i.date || (now - i.date < 3 * 864e5 && i.date - now < 864e5)) // infos de moins de 3 jours
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .filter((i) => {
      const k = norm(i.titre).slice(0, 70);
      if (seen.has(k) || dejaVus.has(i.url)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, PAR_ARTICLE);
  if (!choisis.length) return null;
  const sources = [...new Set(choisis.map((i) => i.source).filter(Boolean))];
  return {
    id: `${date}-${lang === "fr" ? "" : lang + "-"}actu-${slugify(rub.key)}`,
    lang,
    date,
    section: rub.key,
    rubrique: L.nom,
    emoji: rub.emoji,
    type: "revue",
    titre: choisis[0].titre,
    chapo: `${L.intro} ${lang === "fr" ? "Le point du" : "Our round-up for"} ${dateLang(date, lang)}.`,
    corps: [],
    liens: choisis.map(({ titre, source, url, resume, date: d }) => ({ titre, source, url, resume, heure: d ? new Date(d).toISOString() : null })),
    auteur: rub.journaliste,
    sources,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const date = (args.find((a) => a.startsWith("--date=")) || "").slice(7) || new Date().toISOString().slice(0, 10);
  const fixture = (args.find((a) => a.startsWith("--fixture=")) || "").slice(10);

  const db = existsSync(DB) ? JSON.parse(readFileSync(DB, "utf8")) : [];
  const ids = new Set(db.map((a) => a.id));
  // On évite de republier un lien déjà paru les jours précédents.
  const dejaVus = new Set(db.filter((a) => a.date !== date).flatMap((a) => (a.liens || []).map((l) => l.url)));

  let ajoutes = 0;
  for (const lang of LANGS) for (const rub of RUBRIQUES) {
    const L = rub[lang];
    const items = [];
    for (const url of fixture ? [fixture] : L.feeds) {
      try {
        const got = fixture ? parseFeed(readFileSync(url, "utf8"), "https://www.lemonde.fr/x") : await fetchFeed(url);
        items.push(...got);
        console.log(`  [${lang}] ${L.nom} ← ${got.length} (${url.slice(0, 70)})`);
      } catch (e) {
        console.warn(`  [${lang}] ${L.nom} ✗ ${url.slice(0, 70)} : ${e.message}`);
      }
      if (items.length >= PAR_ARTICLE * 3) break;
    }
    const art = buildArticle(rub, items, date, dejaVus, lang);
    if (!art) { console.warn(`! [${lang}] ${L.nom} : aucune info récente, article ignoré`); continue; }
    art.liens.forEach((l) => dejaVus.add(l.url)); // une info = une seule rubrique
    const i = db.findIndex((a) => a.id === art.id);
    // Relancer le même jour = mise à jour. Si les dépêches n'ont pas changé,
    // on garde l'article déjà rédigé (voir write-articles.mjs).
    if (i >= 0) {
      const old = db[i];
      if (old.redige && old.liens.map((l) => l.url).join("|") === art.liens.map((l) => l.url).join("|")) {
        Object.assign(art, { titre: old.titre, chapo: old.chapo, corps: old.corps, redige: true, redigeSur: old.redigeSur });
      }
      db[i] = art;
    } else db.push(art);
    if (!ids.has(art.id)) ajoutes++;
    console.log(`+ [${lang}] [${art.rubrique}] ${art.titre}`);
  }

  db.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.type === "revue" ? 0 : 1) - (b.type === "revue" ? 0 : 1) || a.id.localeCompare(b.id)));
  // La limite ne concerne que les revues de presse : archives et articles sont toujours conservés.
  let revues = 0;
  const garde = db.filter((x) => x.type !== "revue" || ++revues <= MAX_ARTICLES);
  writeFileSync(DB, JSON.stringify(garde, null, 2) + "\n");
  console.log(`${ajoutes} nouvel(s) article(s) d'actu, ${garde.length} au total.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
