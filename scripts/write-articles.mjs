#!/usr/bin/env node
// Rédige les articles du jour de L'Écho des Anges à partir des dépêches collectées
// par generate-news.mjs. Chaque revue de presse du jour devient un article complet
// (titre, chapô, corps), les dépêches d'origine restant citées comme sources.
// Nécessite la variable d'environnement ANTHROPIC_API_KEY (secret GitHub Actions) ;
// sans elle, le script ne fait rien et les rubriques restent en revue de presse.
// Usage : node scripts/write-articles.mjs [--date=YYYY-MM-DD] [--force]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "journal", "articles.json");
const MODEL = process.env.JOURNAL_MODEL || "claude-opus-5-5";

const LANGUES = {
  fr: { nom: "français", attribution: "« selon Le Monde », « rapporte franceinfo »" },
  en: { nom: "English (British spelling)", attribution: "“according to BBC News”, “the Guardian reports”" },
};

const SCHEMA = {
  type: "object",
  properties: {
    titre: { type: "string", description: "Titre de presse, informatif, 6 à 14 mots, sans point final." },
    chapo: { type: "string", description: "Chapô de 1 à 2 phrases qui résume l'essentiel." },
    corps: { type: "array", items: { type: "string" }, description: "Paragraphes de l'article, 4 à 7." },
  },
  required: ["titre", "chapo", "corps"],
  additionalProperties: false,
};

function consignes(lang, rubrique) {
  const L = LANGUES[lang];
  return `Tu es journaliste à L'Écho des Anges, quotidien d'information basé à Nice. Tu rédiges l'article du jour de la rubrique « ${rubrique} », en ${L.nom}, à partir des dépêches fournies par l'utilisateur.

Exactitude (règle absolue) :
- N'utilise que les faits présents dans les dépêches. N'invente aucun chiffre, nom, date, lieu, citation ni détail de contexte.
- Attribue les informations à leur média d'origine dans le texte (par exemple ${L.attribution}).
- Ne mets entre guillemets que des propos qui figurent mot pour mot dans les dépêches. Sinon, n'utilise pas de guillemets.
- Si les dépêches sont maigres, écris un article plus court plutôt que de remplir.

Construction :
- Ouvre sur l'information la plus importante, dans une attaque factuelle et précise. Développe-la, puis traite les autres dépêches pertinentes plus brièvement, avec des transitions naturelles. Ignore les dépêches hors sujet ou redondantes.
- 300 à 550 mots au total, 4 à 7 paragraphes.

Style :
- Ton sobre et professionnel d'un quotidien de référence. Phrases variées, verbes précis, vocabulaire concret.
- Pas de question rhétorique, pas de formule creuse ni d'emphase (« véritable », « à la croisée des chemins », « un tournant majeur », « dans un contexte de »), pas de conclusion moralisatrice ou de bilan général en fin d'article.
- Ne parle jamais de toi, des dépêches, de sources fournies ou du fait que l'article est rédigé à partir d'elles.`;
}

function depeches(art) {
  return art.liens.map((l, i) => {
    const heure = l.heure ? ` (${l.heure})` : "";
    return `Dépêche ${i + 1} — ${l.source}${heure}\nTitre : ${l.titre}${l.resume ? `\nRésumé : ${l.resume}` : ""}`;
  }).join("\n\n");
}

const empreinte = (art) => art.liens.map((l) => l.url).join("|");

async function rediger(client, art) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: consignes(art.lang || "fr", art.rubrique),
    messages: [{ role: "user", content: `Date de l'édition : ${art.date}\n\n${depeches(art)}` }],
  });
  if (response.stop_reason === "refusal") throw new Error(`refus (${response.stop_details?.category ?? "sans catégorie"})`);
  if (response.stop_reason === "max_tokens") throw new Error("réponse tronquée");
  const texte = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const sortie = JSON.parse(texte);
  const corps = (sortie.corps || []).map((p) => String(p).trim()).filter(Boolean);
  if (!sortie.titre || !sortie.chapo || corps.length < 2) throw new Error("article incomplet");
  return { titre: sortie.titre.trim(), chapo: sortie.chapo.trim(), corps };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY absente : pas de rédaction, les rubriques restent en revue de presse.");
    return;
  }
  const args = process.argv.slice(2);
  const date = (args.find((a) => a.startsWith("--date=")) || "").slice(7) || new Date().toISOString().slice(0, 10);
  const force = args.includes("--force");
  const db = JSON.parse(readFileSync(DB, "utf8"));
  const client = new Anthropic();

  const aFaire = db.filter((a) => a.type === "revue" && a.date === date && a.liens?.length &&
    (force || !a.redige || a.redigeSur !== empreinte(a)));
  console.log(`${aFaire.length} article(s) à rédiger pour le ${date}.`);

  let ok = 0;
  for (const art of aFaire) {
    try {
      const r = await rediger(client, art);
      Object.assign(art, r, { redige: true, redigeSur: empreinte(art) });
      ok++;
      console.log(`✓ [${art.lang}] ${art.rubrique} : ${r.titre}`);
      writeFileSync(DB, JSON.stringify(db, null, 2) + "\n"); // sauvegarde au fil de l'eau
    } catch (e) {
      console.warn(`✗ [${art.lang}] ${art.rubrique} : ${e.message}`);
    }
  }
  console.log(`${ok}/${aFaire.length} article(s) rédigé(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
