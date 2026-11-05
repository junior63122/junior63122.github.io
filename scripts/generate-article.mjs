#!/usr/bin/env node
// Articles de la section « Junior » du Journal, en français et en anglais.
// Usage : node scripts/generate-article.mjs [nombre] [--date=YYYY-MM-DD]
// Un même jour donne toujours les mêmes articles (graine = date) : pas de doublon.
// La version anglaise utilise la même graine, c'est donc la traduction du même article.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "journal", "articles.json");

// Journalistes de la section Junior
const JOURNALISTES = ["Clara Benoît", "Théo Lambert"];

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
// Tire un index (identique en FR et EN) puis renvoie l'élément dans la langue voulue.
const idx = (r, n) => Math.floor(r() * n);
const at = (arr, i, lang) => (Array.isArray(arr[i]) ? arr[i][lang === "en" ? 1 : 0] : arr[i]);

// ---------- Banques de contenu : [français, anglais] ----------
const lieux = [
  ["la Promenade des Anglais", "the Promenade des Anglais"], ["le Vieux-Nice", "Old Nice"],
  ["la colline du Château", "Castle Hill"], ["le cours Saleya", "the Cours Saleya"],
  ["la place Masséna", "Place Masséna"], ["le port Lympia", "Port Lympia"],
  ["le campus", "campus"], ["la Coulée verte", "the Promenade du Paillon park"], ["la plage de Castel", "Castel beach"],
];
const animes = ["One Piece", "Jujutsu Kaisen", "Demon Slayer", "Naruto", "Haikyu!!", "Spy x Family", "Frieren"];
const kdramas = ["Crash Landing on You", "Goblin", "Business Proposal", "Itaewon Class", "Extraordinary Attorney Woo", "Vincenzo"];
const sujetsCyber = [
  [["les mots de passe", "passwords"], ["un gestionnaire de mots de passe et des phrases de passe longues valent mieux que « Nice2024! »", "a password manager and long passphrases beat “Nice2024!” every time"]],
  [["le phishing", "phishing"], ["un lien qui presse et fait peur, c'est presque toujours un piège : on vérifie l'expéditeur avant de cliquer", "a link that rushes or scares you is almost always a trap: check the sender before you click"]],
  [["la double authentification", "two-factor authentication"], ["activer la 2FA partout, c'est fermer la porte à double tour", "turning on 2FA everywhere is like double-locking your front door"]],
  [["les mises à jour", "software updates"], ["les mises à jour ne sont pas là pour embêter : elles bouchent des failles", "updates aren't there to annoy you: they patch security holes"]],
  [["le Wi-Fi public", "public Wi-Fi"], ["sur le Wi-Fi d'un café, on évite de se connecter à sa banque", "on a café's Wi-Fi, don't log in to your bank"]],
  [["les sauvegardes", "backups"], ["la règle 3-2-1 : trois copies, deux supports, une hors de chez soi", "follow the 3-2-1 rule: three copies, two media, one off-site"]],
  [["les réseaux sociaux", "social media"], ["un compte privé et moins d'infos perso en ligne, c'est moins de prise pour les arnaqueurs", "a private account and less personal info online give scammers less to work with"]],
];
const humeurs = [
  ["en pleine forme", "full of energy"], ["d'humeur blagueuse", "in a joking mood"], ["motivé comme jamais", "more motivated than ever"],
  ["un peu fatigué mais souriant", "a little tired but smiling"], ["inarrêtable", "unstoppable"], ["d'excellente humeur", "in great spirits"],
];
const meteo = [
  ["sous un grand soleil", "under bright sunshine"], ["sous un ciel tout bleu", "under clear blue skies"],
  ["avec un petit vent marin", "with a light sea breeze"], ["sous quelques nuages", "under a few clouds"], ["dans la douceur niçoise", "in the mild Nice weather"],
];
const citations = [
  ["Prends tout ce que je dis à la rigolade, je suis toujours dans la rigolade !", "Take everything I say as a joke — I'm always joking!"],
  ["Une soirée sans danser, c'est une soirée ratée.", "A night out without dancing is a wasted night."],
  ["L'amitié fille-garçon, ça existe, promis !", "Friendship between girls and guys exists, I promise!"],
  ["Le meilleur antivirus, c'est le bon sens.", "The best antivirus is common sense."],
  ["Un épisode de plus et je vais dormir… bon, deux.", "One more episode and then bed… okay, two."],
  ["À Nice, même les lundis ont l'air de vacances.", "In Nice, even Mondays feel like a holiday."],
];

// Chaque rubrique tire ses choix une seule fois, puis rédige dans la langue demandée.
const rubriques = [
  {
    nom: ["Portrait", "Profile"], emoji: "🌟",
    draw: (r) => ({ t: idx(r, 3), lieu: idx(r, lieux.length), meteo: idx(r, meteo.length), humeur: idx(r, humeurs.length), cit: idx(r, citations.length) }),
    write: (c, l) => l === "en" ? {
      titre: ["Junior Joyant, the Nice party-starter who codes", "Who is Junior Joyant, really?", "Junior Joyant: laughter as a way of life"][c.t],
      chapo: "A computer science and cybersecurity student in Nice, Junior Joyant has made good humour his trademark.",
      corps: [
        `We bumped into him near ${at(lieux, c.lieu, l)}, ${at(meteo, c.meteo, l)}, ${at(humeurs, c.humeur, l)}. Junior Joyant doesn't go unnoticed: one smile, one joke, and the conversation is off.`,
        "Born and raised in Nice, he splits his time between his computer science and cybersecurity studies, his friends and his favourite shows. “I'm always looking to meet new people,” he says. His motto: never take yourself too seriously.",
        `Asked to sum himself up in one sentence, he doesn't hesitate: “${at(citations, c.cit, l)}”`,
      ],
    } : {
      titre: ["Junior Joyant, l'ambianceur niçois qui code", "Qui est vraiment Junior Joyant ?", "Junior Joyant : le rire comme ligne de conduite"][c.t],
      chapo: "Étudiant en informatique et cybersécurité à Nice, Junior Joyant a fait de la bonne humeur sa marque de fabrique.",
      corps: [
        `On l'a croisé du côté de ${at(lieux, c.lieu, l)}, ${at(meteo, c.meteo, l)}, ${at(humeurs, c.humeur, l)}. Junior Joyant ne passe pas inaperçu : un sourire, une blague, et la conversation est lancée.`,
        "Niçois pur jus, il partage son temps entre ses études en informatique et cybersécurité, ses amis et ses séries. « Je cherche toujours à rencontrer de nouvelles personnes », confie-t-il. Son credo : ne jamais se prendre trop au sérieux.",
        `Quand on lui demande de se résumer en une phrase, il répond sans hésiter : « ${at(citations, c.cit, l)} »`,
      ],
    },
  },
  {
    nom: ["Tech & Cyber", "Tech & Cyber"], emoji: "🔐",
    draw: (r) => ({ s: idx(r, sujetsCyber.length) }),
    write: (c, l) => {
      const [sujet, conseil] = sujetsCyber[c.s].map((x) => at([x], 0, l));
      return l === "en" ? {
        titre: `Junior's cyber tip: ${sujet}`,
        chapo: "Every week, our favourite cybersecurity student shares a simple tip to stay safe online.",
        corps: [
          `This time, Junior Joyant tackles a classic: ${sujet}. “Everyone thinks it only happens to other people,” he smiles.`,
          `His advice is clear: ${conseil}.`,
          "“Cybersecurity isn't just for hackers in hoodies — it's for everyone,” he reminds us before heading back to class.",
        ],
      } : {
        titre: `Le conseil cyber de Junior : ${sujet}`,
        chapo: "Chaque semaine, notre étudiant en cybersécurité préféré partage une astuce simple pour se protéger en ligne.",
        corps: [
          `Cette fois, Junior Joyant s'attaque à un classique : ${sujet}. « Tout le monde pense que ça n'arrive qu'aux autres », sourit-il.`,
          `Son conseil est clair : ${conseil}.`,
          "« La cybersécurité, ce n'est pas que pour les hackers en sweat à capuche, c'est pour tout le monde », rappelle-t-il avant de retourner à ses cours.",
        ],
      };
    },
  },
  {
    nom: ["Culture", "Culture"], emoji: "🎬",
    draw: (r) => ({ a: idx(r, animes.length), k: idx(r, kdramas.length), t: idx(r, 3) }),
    write: (c, l) => {
      const anime = animes[c.a], kd = kdramas[c.k];
      return l === "en" ? {
        titre: ["Anime and K-dramas: Junior's watchlist", `${anime} or ${kd}? Junior decides`, "Binge night: what Junior Joyant is watching"][c.t],
        chapo: "A huge fan of anime and K-dramas, Junior Joyant opens up his watchlist.",
        corps: [
          `Right now, ${anime} is on repeat at Junior's place. “The fights, the friendship, the plot twists… I love it,” he explains.`,
          `On the K-drama side, he recommends ${kd}: “Perfect for a quiet night in, tissues optional.”`,
          "His advice for beginners: “Start with one episode. Just one. You'll see.”",
        ],
      } : {
        titre: ["Animes et K-dramas : la watchlist de Junior", `${anime} ou ${kd} ? Junior tranche`, "Soirée séries : ce que regarde Junior Joyant"][c.t],
        chapo: "Grand fan d'animes et de K-dramas, Junior Joyant nous ouvre sa watchlist.",
        corps: [
          `En ce moment, c'est ${anime} qui tourne en boucle chez Junior. « Les combats, l'amitié, les rebondissements… j'adore », explique-t-il.`,
          `Côté K-drama, il recommande ${kd} : « Parfait pour une soirée tranquille, avec ou sans mouchoirs. »`,
          "Son conseil pour les débutants : « Commencez par un épisode. Juste un. Vous verrez bien. »",
        ],
      };
    },
  },
  {
    nom: ["Sorties", "Nightlife"], emoji: "🪩",
    draw: (r) => ({ lieu: idx(r, lieux.length), t: idx(r, 3), cit: idx(r, citations.length) }),
    write: (c, l) => l === "en" ? {
      titre: ["Junior Joyant, always up for a dance", "Junior's going out tonight! Are you?", "Nice nightlife through Junior's eyes"][c.t],
      chapo: "He said it himself: invite him to a party and he'll be there to dance. Instantly.",
      corps: [
        `His nights often start around ${at(lieux, c.lieu, l)} before ending up on the dance floor. “I'm here for the vibe,” says Junior Joyant.`,
        "For him, a great night out is above all about good friends and plenty of laughs.",
        `Note to party organisers: just invite him. “${at(citations, c.cit, l)}”`,
      ],
    } : {
      titre: ["Junior Joyant, toujours partant pour danser", "Ce soir, Junior sort ! Et vous ?", "Les soirées niçoises vues par Junior"][c.t],
      chapo: "Il l'a dit lui-même : si tu proposes une soirée, il vient danser. Direct.",
      corps: [
        `Ses soirées commencent souvent du côté de ${at(lieux, c.lieu, l)} avant de finir sur la piste de danse. « Je suis là pour l'ambiance », assure Junior Joyant.`,
        "Pour lui, une sortie réussie, c'est avant tout une bonne bande d'amis et beaucoup de fous rires.",
        `Avis aux organisateurs : il suffit de l'inviter. « ${at(citations, c.cit, l)} »`,
      ],
    },
  },
  {
    nom: ["Brève", "In brief"], emoji: "☀️",
    draw: (r) => ({ meteo: idx(r, meteo.length), lieu: idx(r, lieux.length), humeur: idx(r, humeurs.length), serie: idx(r, animes.length + kdramas.length), cit: idx(r, citations.length) }),
    write: (c, l) => {
      const serie = [...animes, ...kdramas][c.serie];
      return l === "en" ? {
        titre: `Junior's day, ${at(meteo, c.meteo, l)}`,
        chapo: "Today's news, in brief.",
        corps: [
          `Junior Joyant was spotted near ${at(lieux, c.lieu, l)}, ${at(humeurs, c.humeur, l)}.`,
          `On the agenda: a bit of coding, a bit of cyber, and most likely an episode of ${serie} tonight.`,
          `Quote of the day: “${at(citations, c.cit, l)}”`,
        ],
      } : {
        titre: `La journée de Junior, ${at(meteo, c.meteo, l)}`,
        chapo: "Les nouvelles du jour, en bref.",
        corps: [
          `Junior Joyant a été aperçu près de ${at(lieux, c.lieu, l)}, ${at(humeurs, c.humeur, l)}.`,
          `Au programme : un peu de code, un peu de cyber, et sûrement un épisode de ${serie} ce soir.`,
          `Sa phrase du jour : « ${at(citations, c.cit, l)} »`,
        ],
      };
    },
  },
];

function slugify(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function generateArticle(date, index = 0, lang = "fr") {
  const r = seededRandom(`${date}#${index}`);
  const rub = rubriques[idx(r, rubriques.length)];
  const choix = rub.draw(r);
  const auteur = JOURNALISTES[idx(r, JOURNALISTES.length)];
  const a = rub.write(choix, lang);
  const base = rub.write(choix, "fr"); // l'id reste celui de l'article d'origine
  return {
    id: `${date}-${lang === "fr" ? "" : lang + "-"}${index}-${slugify(base.titre)}`,
    lang,
    date,
    section: "Junior",
    rubrique: at([rub.nom], 0, lang),
    emoji: rub.emoji,
    titre: a.titre,
    chapo: a.chapo,
    corps: a.corps,
    auteur,
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
    for (const lang of ["fr", "en"]) {
      const art = generateArticle(date, i, lang);
      if (ids.has(art.id)) continue;
      db.push(art);
      ids.add(art.id);
      added++;
      console.log(`+ [${lang}] [${art.rubrique}] ${art.titre}`);
    }
  }
  db.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.type === "revue" ? 0 : 1) - (b.type === "revue" ? 0 : 1) || a.id.localeCompare(b.id)));
  writeFileSync(DB, JSON.stringify(db, null, 2) + "\n");
  console.log(`${added} article(s) ajouté(s), ${db.length} au total.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
