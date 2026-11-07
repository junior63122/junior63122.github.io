// Légendes Instagram. Écrites pour sonner comme un vrai community manager :
// phrases courtes, peu d'emojis, pas de tirets cadratins, peu de hashtags,
// et un texte différent à chaque publication (tirage selon la date).
import { jourCourt, jourNum, moisCourt, heure, plage } from './dates.mjs';

// Tirage déterministe : même date → même texte (aperçu = publication réelle).
function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const shuffle = (r, arr) => arr.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const LOCAL = ['#nice', '#cotedazur', '#sortiranice', '#nicefrance', '#cannes', '#monaco', '#antibes', '#frenchriviera', '#soireenice', '#nicenightlife'];
const GENRE = {
  commercial: ['#house', '#shatta', '#afro', '#clubbing', '#electro', '#amapiano', '#dancehall'],
  techno: ['#techno', '#technonice', '#hardtechno', '#rave', '#technofamily', '#technolovers', '#undergroundtechno'],
  general: ['#soiree', '#nightlife', '#teuf', '#sortir', '#clubbing'],
};
export function hashtags(r, genre = 'general') {
  return ['#teufy', ...shuffle(r, LOCAL).slice(0, 3), ...shuffle(r, GENRE[genre] || GENRE.general).slice(0, 3)].join(' ');
}

const ligne = (e, avecMois = false) => {
  const lieu = [e.venue, e.city].filter(Boolean).join(', ');
  const p = e.price === 0 ? ' · gratuit' : e.price != null && e.price <= 12 ? ` · ${String(e.price).replace('.', ',')} €` : '';
  return `${jourCourt(e.start)} ${jourNum(e.start)}${avecMois ? ` ${moisCourt(e.start)}` : ''} · ${e.name}${lieu ? ` (${lieu})` : ''} · ${heure(e.start)}${p}`;
};
// Le mois n'est ajouté que si les dates s'étalent sur plus de 9 jours.
const liste = (events, n = 12) => {
  const t = events.map((e) => Date.parse(e.start));
  const avecMois = Math.max(...t) - Math.min(...t) > 9 * 86400e3;
  return events.slice(0, n).map((e) => ligne(e, avecMois)).join('\n');
};

// --- Les incontournables de la semaine ------------------------------------

export function captionIncontournables({ variante, events, from, to, seed, config }) {
  const r = rng(seed);
  const intro = variante === 'techno'
    ? pick(r, [
      `La sélection techno de la semaine.\nPour ceux qui restent jusqu'à la fermeture.`,
      `Techno only. Les dates à pas rater ${plage(from, to)} sur la Côte.`,
      `Cette semaine ça tape fort sur la Côte d'Azur. On vous a fait le tri.`,
      `Pour la communauté techno de la Côte : voilà où vous serez cette semaine.`,
      `Moins de blabla, plus de BPM. Les soirées techno de la semaine 👇`,
    ])
    : pick(r, [
      `Les soirées incontournables de la semaine sur la Côte, ${plage(from, to)} 👇`,
      `House, shatta, afro, électro… Cette semaine il y en a pour tout le monde.`,
      `Votre semaine est réglée. Voilà les soirées à pas louper sur la Côte d'Azur.`,
      `On a fait le tour des soirées de la semaine. Celles-là, on les recommande les yeux fermés.`,
      `Pas d'excuse cette semaine, le programme est chargé 👇`,
    ]);
  const question = variante === 'techno'
    ? pick(r, [
      'Vous serez à laquelle ? Dites-le en commentaire, la famille techno se retrouve.',
      'Il manque une date ? Ajoutez-la en commentaire pour les autres.',
      'Tag ton binôme de rave.',
      'Votre set préféré du mois dernier ? On veut des noms.',
    ])
    : pick(r, [
      'Vous allez à laquelle ? Dites-le en commentaire.',
      'Tag la personne qui va te dire « juste un verre » et finir à 5h.',
      'Enregistrez le post, vous nous remercierez vendredi.',
      'Il en manque une ? Balancez-la en commentaire.',
    ]);
  return clip(`${intro}\n\n${liste(events)}\n\n${question}\n\nBillets sur Shotgun et DICE. Tout le programme sur Teufy, lien en bio.\n\n${hashtags(r, variante)}`);
}

// --- Bons plans -------------------------------------------------------------

export function captionBonPlan({ variante, events, from, to, seed, manuel }) {
  const r = rng(seed);
  if (manuel) {
    return clip(`${manuel.titre}\n\n${manuel.texte}\n\n${pick(r, ['Partagez à ceux qui doivent savoir.', 'Enregistrez pour plus tard.', 'Envoyez ça à votre groupe.'])}\n\n${hashtags(r)}`);
  }
  if (variante === 'a-reserver') {
    const intro = pick(r, [
      `Bon plan : les grosses dates qui arrivent sur la Côte. Prenez vos places avant que ce soit sold out.`,
      `Petit conseil : ces soirées vont partir vite. Les places sont souvent moins chères maintenant que la veille.`,
      `À réserver maintenant, pas le jour J. Les dates qu'on surveille pour les prochaines semaines.`,
    ]);
    return clip(`${intro}\n\n${liste(events)}\n\n${pick(r, ['Envoie ça à ton groupe avant d\'oublier.', 'Enregistre le post, ça t\'évitera le « c\'est complet ».', 'Laquelle vous tente le plus ?'])}\n\nBillets sur Shotgun et DICE. Lien en bio.\n\n${hashtags(r)}`);
  }
  const intro = pick(r, [
    `Bon plan : sortir sur la Côte sans se ruiner. Gratuit ou moins de 10 €, ${plage(from, to)}.`,
    `Fin de mois difficile ? Voilà les soirées gratuites ou à petit prix des prochains jours.`,
    `Qui a dit que sortir sur la Côte coûtait une fortune ? Petits prix et entrées gratuites 👇`,
  ]);
  return clip(`${intro}\n\n${liste(events)}\n\n${pick(r, ['Partagez à votre pote toujours fauché.', 'Tag la personne qui dit toujours que c\'est trop cher.', 'Vous connaissez d\'autres bons plans ? Partagez en commentaire.'])}\n\nTout le programme sur Teufy, lien en bio.\n\n${hashtags(r)}`);
}

// --- Débat ------------------------------------------------------------------

export function captionDebat({ debat, seed }) {
  const r = rng(seed);
  const vote = debat.a && debat.b
    ? `\n\n${pick(r, ['Votez en commentaire', 'Répondez en commentaire', 'Votre camp en commentaire'])} : 🅰️ ${debat.a} ou 🅱️ ${debat.b}`
    : '';
  return clip(`${debat.legende}${vote}\n\n${hashtags(r)}`);
}

// --- Reels ------------------------------------------------------------------

export function captionReel({ variante, events, seed, elargi = false }) {
  const r = rng(seed);
  const hook = {
    weekend: ['Laquelle tu choisis ce week-end ? Réponds avec le numéro.', 'Ton week-end sur la Côte en 15 secondes. Tu vas à laquelle ?', 'Plus d\'excuse pour rester chez toi ce week-end.'],
    techno: ['Ce week-end ça tape. Ton numéro en commentaire.', 'La famille techno de la Côte, on se retrouve où ce week-end ?', 'Pour ceux qui rentrent quand le soleil se lève.'],
    'petits-prix': ['Sortir ce week-end sans exploser ton budget. Laquelle tu prends ?', 'Gratuit ou presque. Ton numéro en commentaire.', 'Le week-end des petits budgets sur la Côte.'],
  }[variante].filter((h) => !elargi || !/week-end/i.test(h));
  const cta = pick(r, ['Envoie ce reel à ton crew.', 'Tag ceux qui viennent avec toi.', 'Enregistre pour ne pas oublier.']);
  return clip(`${pick(r, hook)}\n\n${events.map((e, i) => `${i + 1}. ${ligne(e)}`).join('\n')}\n\n${cta} Tout le programme sur Teufy, lien en bio.\n\n${hashtags(r, variante === 'techno' ? 'techno' : 'general')}`);
}

export { rng, pick };

function clip(s) { return s.length <= 2200 ? s : s.slice(0, 2190) + '…'; }
