#!/usr/bin/env node
// Constitue les archives de L'Écho des Anges : des articles sur les événements marquants
// de la Côte d'Azur (Nice, Cannes, Monaco, Antibes, Menton, Grasse, arrière-pays...)
// sur une période donnée. Chaque événement est vérifié par recherche web avant d'être
// rédigé, et les pages consultées sont citées en sources. Une version anglaise est
// produite pour chaque article.
// Nécessite ANTHROPIC_API_KEY. Reprend là où il s'est arrêté (pas de doublons).
// Usage : node scripts/write-archives.mjs --de=2024-01-01 --a=2026-10-31 --nombre=50

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "journal", "articles.json");
const MODEL = process.env.JOURNAL_MODEL || "claude-opus-5-5";
const PAR_LOT = 10; // événements proposés par recherche

const RUBRIQUES = {
  Business: { journaliste: "Camille Rostand", emoji: "💼", theme: "entreprises, emploi, tourisme, immobilier, transports, grands projets économiques" },
  Finance: { journaliste: "Hugo Marchetti", emoji: "📈", theme: "banques, finances publiques locales, levées de fonds, Monaco place financière" },
  "Événementiel": { journaliste: "Léa Fontaine", emoji: "🎪", theme: "Festival de Cannes, MIPIM, Cannes Lions, carnaval de Nice, fête du Citron, concerts, festivals, salons" },
  Tech: { journaliste: "Nathan Belkacem", emoji: "💻", theme: "Sophia Antipolis, start-up, numérique, innovation, cybersécurité" },
  Monde: { journaliste: "Sofia Delmas", emoji: "🌍", theme: "événements internationaux accueillis sur la Côte d'Azur, diplomatie, sommets, Monaco à l'international" },
  "Nice & Côte d'Azur": { journaliste: "Lucas Giordano", emoji: "🌴", theme: "vie locale, politique municipale, faits marquants, environnement, intempéries, culture, urbanisme" },
  Sport: { journaliste: "Inès Morel", emoji: "⚽", theme: "OGC Nice, AS Monaco, Grand Prix de Monaco, Masters de Monte-Carlo, Ironman de Nice, Tour de France, rugby" },
};

const OUTIL_RECHERCHE = { type: "web_search_20260209", name: "web_search", max_uses: 6 };

const STYLE = `Style : celui d'un quotidien de référence. Attaque factuelle et précise sur l'information principale, puis contexte, détails et conséquences. Phrases variées, verbes précis, vocabulaire concret. Pas de question rhétorique, pas d'emphase ni de formule creuse (« véritable », « à la croisée des chemins », « un tournant majeur », « dans un contexte de »), pas de conclusion moralisatrice. Ne parle jamais de toi, de tes recherches ni de la façon dont l'article a été écrit.`;

const client = () => new Anthropic();

// Appel avec recherche web : gère les pauses du serveur et renvoie le texte final.
async function appelRecherche(system, prompt) {
  const messages = [{ role: "user", content: prompt }];
  for (let tour = 0; tour < 6; tour++) {
    const r = await client().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      tools: [OUTIL_RECHERCHE],
      system,
      messages,
    });
    if (r.stop_reason === "refusal") throw new Error(`refus (${r.stop_details?.category ?? "sans catégorie"})`);
    if (r.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: r.content }); continue; }
    if (r.stop_reason === "max_tokens") throw new Error("réponse tronquée");
    return r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  }
  throw new Error("trop de reprises");
}

function extraireJSON(texte) {
  const debut = texte.search(/[[{]/);
  const fin = Math.max(texte.lastIndexOf("}"), texte.lastIndexOf("]"));
  if (debut < 0 || fin < debut) throw new Error("pas de JSON dans la réponse");
  return JSON.parse(texte.slice(debut, fin + 1));
}

async function planifier(de, a, n, dejaTraites) {
  const system = `Tu es chef d'édition à L'Écho des Anges, quotidien basé à Nice. Tu prépares les archives du journal sur la Côte d'Azur (Nice, Cannes, Monaco, Antibes, Menton, Grasse, Saint-Tropez, Sophia Antipolis, vallées de l'arrière-pays).`;
  const rubriques = Object.entries(RUBRIQUES).map(([k, v]) => `- ${k} : ${v.theme}`).join("\n");
  const prompt = `Propose ${n} événements marquants survenus entre le ${de} et le ${a}, en vérifiant chacun par une recherche web (date exacte et faits).
Répartis-les entre ces rubriques :
${rubriques}

Choisis des événements d'intérêt réel pour les lecteurs de la Riviera, variés dans le temps et les sujets. N'inclus pas de faits divers concernant des particuliers non publics.
Écarte les sujets déjà traités :
${dejaTraites.slice(-300).map((t) => `- ${t}`).join("\n") || "(aucun)"}

Réponds uniquement par un tableau JSON : [{"date": "AAAA-MM-JJ", "rubrique": "<une des rubriques ci-dessus>", "sujet": "<description précise de l'événement>"}]`;
  const liste = extraireJSON(await appelRecherche(system, prompt));
  return (Array.isArray(liste) ? liste : []).filter((e) => e && /^\d{4}-\d\d-\d\d$/.test(e.date) && RUBRIQUES[e.rubrique] && e.sujet && e.date >= de && e.date <= a);
}

async function rediger(ev) {
  const system = `Tu es journaliste à L'Écho des Anges, quotidien basé à Nice, rubrique « ${ev.rubrique} ». Tu écris un article d'archives, en français, sur un événement passé, rédigé au passé comme un compte rendu publié le jour même ou le lendemain.

Exactitude (règle absolue) : vérifie les faits par la recherche web avant d'écrire. N'écris que ce que tes sources confirment ; aucun chiffre, nom, date ou citation inventé. Ne mets entre guillemets que des propos rapportés tels quels par une source. Attribue les informations sensibles à leur source.

Construction : titre de presse informatif (6 à 14 mots), chapô de 1 à 2 phrases, puis 4 à 7 paragraphes (300 à 550 mots).
${STYLE}`;
  const prompt = `Événement : ${ev.sujet} (date : ${ev.date}).

Réponds uniquement par un objet JSON :
{"date": "AAAA-MM-JJ (date exacte de l'événement, vérifiée)", "titre": "...", "chapo": "...", "corps": ["paragraphe", "..."], "sources": [{"titre": "titre de la page", "media": "nom du média ou de l'organisme", "url": "https://..."}], "tragique": true ou false}
Les sources sont les pages consultées qui confirment les faits (2 à 5). « tragique » vaut true si l'événement comporte des morts, des blessés graves, un attentat ou une catastrophe.`;
  const r = extraireJSON(await appelRecherche(system, prompt));
  const corps = (r.corps || []).map((p) => String(p).trim()).filter(Boolean);
  const sources = (r.sources || []).filter((s) => s && /^https?:\/\//.test(s.url)).slice(0, 6);
  if (!r.titre || !r.chapo || corps.length < 3) throw new Error("article incomplet");
  if (!sources.length) throw new Error("aucune source vérifiable");
  return { date: /^\d{4}-\d\d-\d\d$/.test(r.date) ? r.date : ev.date, titre: r.titre.trim(), chapo: r.chapo.trim(), corps, sources, tragique: r.tragique === true };
}

const SCHEMA_EN = {
  type: "object",
  properties: { titre: { type: "string" }, chapo: { type: "string" }, corps: { type: "array", items: { type: "string" } } },
  required: ["titre", "chapo", "corps"],
  additionalProperties: false,
};

async function traduire(art) {
  const r = await client().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA_EN } },
    system: "You translate articles from L'Écho des Anges, a Nice-based daily, into British English for its English edition. Keep every fact, figure and name exactly; write natural newspaper English, not a word-for-word translation. Keep French proper names and institutions as they are, adding a short gloss only where a reader would need it. Return titre (headline), chapo (standfirst) and corps (paragraphs, same number as the original).",
    messages: [{ role: "user", content: JSON.stringify({ titre: art.titre, chapo: art.chapo, corps: art.corps }) }],
  });
  if (r.stop_reason === "refusal" || r.stop_reason === "max_tokens") throw new Error(`traduction impossible (${r.stop_reason})`);
  const t = JSON.parse(r.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
  if (!t.titre || !t.chapo || !t.corps?.length) throw new Error("traduction incomplète");
  return t;
}

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function enregistrer(db) {
  db.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : (x.type === "revue" ? 0 : 1) - (y.type === "revue" ? 0 : 1) || x.id.localeCompare(y.id)));
  writeFileSync(DB, JSON.stringify(db, null, 2) + "\n");
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.log("ANTHROPIC_API_KEY absente : rien à faire."); return; }
  const arg = (n, d) => (process.argv.find((x) => x.startsWith(`--${n}=`)) || "").split("=")[1] || d;
  const de = arg("de", "2024-01-01");
  const a = arg("a", new Date().toISOString().slice(0, 10));
  const nombre = Math.max(1, parseInt(arg("nombre", "20"), 10));

  const db = JSON.parse(readFileSync(DB, "utf8"));
  const titres = () => db.filter((x) => x.type === "archive" && (x.lang || "fr") === "fr").map((x) => `${x.date} — ${x.titre}`);
  let faits = 0, echecs = 0;
  console.log(`Archives du ${de} au ${a} : objectif ${nombre} article(s).`);

  while (faits < nombre && echecs < 10) {
    let lot;
    try { lot = await planifier(de, a, Math.min(PAR_LOT, nombre - faits + 2), titres()); }
    catch (e) { echecs++; console.warn(`✗ planification : ${e.message}`); continue; }
    if (!lot.length) { echecs++; continue; }
    for (const ev of lot) {
      if (faits >= nombre) break;
      try {
        const fr = await rediger(ev);
        const R = RUBRIQUES[ev.rubrique];
        const id = `archive-${fr.date}-${slug(fr.titre)}`;
        if (db.some((x) => x.id === id)) continue;
        const base = { lang: "fr", date: fr.date, section: ev.rubrique, rubrique: "Archives", emoji: R.emoji, type: "archive", auteur: R.journaliste, liens: fr.sources.map((s) => ({ titre: s.titre || s.url, source: s.media || new URL(s.url).hostname, url: s.url })), sources: [...new Set(fr.sources.map((s) => s.media).filter(Boolean))], ...(fr.tragique ? { photo: false } : {}) };
        db.push({ ...base, id, titre: fr.titre, chapo: fr.chapo, corps: fr.corps });
        try {
          const en = await traduire(fr);
          db.push({ ...base, id: id.replace(/^archive-(\d{4}-\d\d-\d\d)-/, "archive-$1-en-"), lang: "en", titre: en.titre, chapo: en.chapo, corps: en.corps });
        } catch (e) { console.warn(`  (pas de version anglaise : ${e.message})`); }
        enregistrer(db);
        faits++;
        console.log(`✓ ${faits}/${nombre} [${ev.rubrique}] ${fr.date} — ${fr.titre}`);
      } catch (e) {
        console.warn(`✗ ${ev.date} ${ev.sujet.slice(0, 60)} : ${e.message}`);
      }
    }
  }
  console.log(`${faits} archive(s) ajoutée(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
