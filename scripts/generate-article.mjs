#!/usr/bin/env node
// Générateur automatique d'articles pour « Le Journal de Junior ».
// Usage : node scripts/generate-article.mjs [nombre] [--date=YYYY-MM-DD]
// Les articles sont ajoutés à journal/articles.json (le plus récent en premier).
// Un même jour donne toujours le même article (graine = date), donc relancer
// le script le même jour ne crée pas de doublon.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "journal", "articles.json");

// ---------- Profil (ce que Junior dit de lui-même) ----------
const JUNIOR = {
  nom: "Junior Joyant",
  ville: "Nice",
  etudes: "informatique et cybersécurité",
  instagram: "https://www.instagram.com/junior_joyant",
};

// ---------- Hasard reproductible ----------
function seededRandom(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Banques de contenu ----------
const lieux = [
  "la Promenade des Anglais", "le Vieux-Nice", "la colline du Château",
  "le cours Saleya", "la place Masséna", "le port Lympia",
  "le campus", "la Coulée verte", "la plage de Castel",
];
const animes = ["One Piece", "Jujutsu Kaisen", "Demon Slayer", "Naruto", "Haikyu!!", "Spy x Family", "Frieren"];
const kdramas = ["Crash Landing on You", "Goblin", "Business Proposal", "Itaewon Class", "Extraordinary Attorney Woo", "Vincenzo"];
const sujetsCyber = [
  ["les mots de passe", "un gestionnaire de mots de passe et des phrases de passe longues valent mieux que « Nice2024! »"],
  ["le phishing", "un lien qui presse et fait peur, c'est presque toujours un piège : on vérifie l'expéditeur avant de cliquer"],
  ["la double authentification", "activer la 2FA partout, c'est fermer la porte à double tour"],
  ["les mises à jour", "les mises à jour ne sont pas là pour embêter : elles bouchent des failles"],
  ["le Wi-Fi public", "sur le Wi-Fi d'un café, on évite de se connecter à sa banque"],
  ["les sauvegardes", "la règle 3-2-1 : trois copies, deux supports, une hors de chez soi"],
  ["les réseaux sociaux", "un compte privé et moins d'infos perso en ligne, c'est moins de prise pour les arnaqueurs"],
];
const humeurs = ["en pleine forme", "d'humeur blagueuse", "motivé comme jamais", "un peu fatigué mais souriant", "inarrêtable", "d'excellente humeur"];
const meteo = ["sous un grand soleil", "sous un ciel tout bleu", "avec un petit vent marin", "sous quelques nuages", "dans la douceur niçoise"];
const citations = [
  "Prends tout ce que je dis à la rigolade, je suis toujours dans la rigolade !",
  "Une soirée sans danser, c'est une soirée ratée.",
  "L'amitié fille-garçon, ça existe, promis !",
  "Le meilleur antivirus, c'est le bon sens.",
  "Un épisode de plus et je vais dormir… bon, deux.",
  "À Nice, même les lundis ont l'air de vacances.",
];

const pick = (r, a) => a[Math.floor(r() * a.length)];

// ---------- Rubriques ----------
const rubriques = [
  {
    nom: "Portrait",
    emoji: "🌟",
    build: (r) => {
      const lieu = pick(r, lieux);
      return {
        titre: pick(r, [
          `Junior Joyant, l'ambianceur niçois qui code`,
          `Qui est vraiment Junior Joyant ?`,
          `Junior Joyant : le rire comme ligne de conduite`,
        ]),
        chapo: `Étudiant en ${JUNIOR.etudes} à ${JUNIOR.ville}, Junior Joyant a fait de la bonne humeur sa marque de fabrique.`,
        corps: [
          `On l'a croisé du côté de ${lieu}, ${pick(r, meteo)}, ${pick(r, humeurs)}. Junior Joyant ne passe pas inaperçu : un sourire, une blague, et la conversation est lancée.`,
          `Niçois pur jus, il partage son temps entre ses études en ${JUNIOR.etudes}, ses amis et ses séries. « Je cherche toujours à rencontrer de nouvelles personnes », confie-t-il. Son credo : ne jamais se prendre trop au sérieux.`,
          `Quand on lui demande de se résumer en une phrase, il répond sans hésiter : « ${pick(r, citations)} »`,
        ],
      };
    },
  },
  {
    nom: "Tech & Cyber",
    emoji: "🔐",
    build: (r) => {
      const [sujet, conseil] = pick(r, sujetsCyber);
      return {
        titre: `Le conseil cyber de Junior : ${sujet}`,
        chapo: `Chaque semaine, notre étudiant en cybersécurité préféré partage une astuce simple pour se protéger en ligne.`,
        corps: [
          `Cette fois, Junior Joyant s'attaque à un classique : ${sujet}. « Tout le monde pense que ça n'arrive qu'aux autres », sourit-il.`,
          `Son conseil est clair : ${conseil}.`,
          `« La cybersécurité, ce n'est pas que pour les hackers en sweat à capuche, c'est pour tout le monde », rappelle-t-il avant de retourner à ses cours.`,
        ],
      };
    },
  },
  {
    nom: "Culture",
    emoji: "🎬",
    build: (r) => {
      const anime = pick(r, animes);
      const kd = pick(r, kdramas);
      return {
        titre: pick(r, [
          `Animes et K-dramas : la watchlist de Junior`,
          `${anime} ou ${kd} ? Junior tranche`,
          `Soirée séries : ce que regarde Junior Joyant`,
        ]),
        chapo: `Grand fan d'animes et de K-dramas, Junior Joyant nous ouvre sa watchlist.`,
        corps: [
          `En ce moment, c'est ${anime} qui tourne en boucle chez Junior. « Les combats, l'amitié, les rebondissements… j'adore », explique-t-il.`,
          `Côté K-drama, il recommande ${kd} : « Parfait pour une soirée tranquille, avec ou sans mouchoirs. »`,
          `Son conseil pour les débutants : « Commencez par un épisode. Juste un. Vous verrez bien. »`,
        ],
      };
    },
  },
  {
    nom: "Sorties",
    emoji: "🪩",
    build: (r) => {
      const lieu = pick(r, lieux);
      return {
        titre: pick(r, [
          `Junior Joyant, toujours partant pour danser`,
          `Ce soir, Junior sort ! Et vous ?`,
          `Les soirées niçoises vues par Junior`,
        ]),
        chapo: `Il l'a dit lui-même : si tu proposes une soirée, il vient danser. Direct.`,
        corps: [
          `Ses soirées commencent souvent du côté de ${lieu} avant de finir sur la piste de danse. « Je suis là pour l'ambiance », assure Junior Joyant.`,
          `Pour lui, une sortie réussie, c'est avant tout une bonne bande d'amis et beaucoup de fous rires.`,
          `Avis aux organisateurs : il suffit de l'inviter. « ${pick(r, citations)} »`,
        ],
      };
    },
  },
  {
    nom: "Brève",
    emoji: "☀️",
    build: (r) => {
      const lieu = pick(r, lieux);
      return {
        titre: `La journée de Junior, ${pick(r, meteo)}`,
        chapo: `Les nouvelles du jour, en bref.`,
        corps: [
          `Junior Joyant a été aperçu près de ${lieu}, ${pick(r, humeurs)}.`,
          `Au programme : un peu de code, un peu de cyber, et sûrement un épisode de ${pick(r, [...animes, ...kdramas])} ce soir.`,
          `Sa phrase du jour : « ${pick(r, citations)} »`,
        ],
      };
    },
  },
];

// ---------- Génération ----------
function slugify(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function generateArticle(date, index = 0) {
  const r = seededRandom(`${date}#${index}`);
  const rub = pick(r, rubriques);
  const a = rub.build(r);
  return {
    id: `${date}-${index}-${slugify(a.titre)}`,
    date,
    section: "Junior",
    rubrique: rub.nom,
    emoji: rub.emoji,
    titre: a.titre,
    chapo: a.chapo,
    corps: a.corps,
    auteur: "La rédaction (auto)",
    type: "junior",
  };
}

function main() {
  const args = process.argv.slice(2);
  const count = Math.max(1, parseInt(args.find((a) => /^\d+$/.test(a)) ?? "1", 10));
  const dateArg = args.find((a) => a.startsWith("--date="));
  const date = dateArg ? dateArg.slice(7) : new Date().toISOString().slice(0, 10);

  const db = existsSync(DB) ? JSON.parse(readFileSync(DB, "utf8")) : [];
  const ids = new Set(db.map((a) => a.id));
  let added = 0;
  for (let i = 0; i < count; i++) {
    const art = generateArticle(date, i);
    if (ids.has(art.id)) continue;
    db.push(art);
    ids.add(art.id);
    added++;
    console.log(`+ [${art.rubrique}] ${art.titre}`);
  }
  db.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)));
  writeFileSync(DB, JSON.stringify(db, null, 2) + "\n");
  console.log(`${added} article(s) ajouté(s), ${db.length} au total.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
