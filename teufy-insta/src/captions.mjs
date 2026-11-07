// Légendes Instagram. Écrites pour sonner comme un vrai community manager :
// phrases courtes, peu d'emojis, pas de tirets cadratins, peu de hashtags.
// Chaque formulation est choisie par le sélecteur d'apprentissage (`ch.pick`) :
// les versions qui font le plus réagir reviennent plus souvent.
// L'app Teufy n'est pas encore sortie : on pousse à s'abonner au compte, pas à télécharger.
import { jourCourt, jourNum, moisCourt, heure, plage } from './dates.mjs';
import { styleLabel } from './genres.mjs';

// Tirage déterministe : même date → même texte (aperçu = publication réelle).
export function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const shuffle = (r, arr) => arr.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const LOCAL = ['#nice', '#cotedazur', '#sortiranice', '#nicefrance', '#cannes', '#monaco', '#antibes', '#frenchriviera', '#soireenice', '#nicenightlife'];
const GENRE = {
  commercial: ['#house', '#shatta', '#afro', '#clubbing', '#electro', '#amapiano', '#dancehall'],
  techno: ['#techno', '#technonice', '#hardtechno', '#rave', '#technofamily', '#technolovers', '#undergroundtechno'],
  general: ['#soiree', '#nightlife', '#teuf', '#sortir', '#clubbing'],
};
export function hashtags(r, genre = 'general') {
  return ['#TeufyParty', ...shuffle(r, LOCAL).slice(0, 3), ...shuffle(r, GENRE[genre] || GENRE.general).slice(0, 3)].join(' ');
}

// Une ligne d'info par soirée : date, nom, style, lieu, heure, prix.
const ligne = (e, avecMois = false) => {
  const lieu = [e.venue, e.city].filter(Boolean).join(', ');
  const style = styleLabel(e);
  const p = e.price === 0 ? ' · gratuit' : e.price != null ? ` · ${String(e.price).replace('.', ',')} €` : '';
  return `${jourCourt(e.start)} ${jourNum(e.start)}${avecMois ? ` ${moisCourt(e.start)}` : ''} · ${e.name}${style ? ` [${style}]` : ''}${lieu ? ` · ${lieu}` : ''} · ${heure(e.start)}${p}`;
};
// Le mois n'est ajouté que si les dates s'étalent sur plus de 9 jours.
const liste = (events, n = 12) => {
  const t = events.map((e) => Date.parse(e.start));
  const avecMois = Math.max(...t) - Math.min(...t) > 9 * 86400e3;
  return events.slice(0, n).map((e) => ligne(e, avecMois)).join('\n');
};

const SUIVRE = [
  'Abonne-toi pour avoir le programme chaque semaine.',
  'Suis le compte pour ne rater aucune soirée sur la Côte.',
  'On poste les meilleures soirées de la Côte chaque semaine, abonne-toi.',
  'Active les notifs pour avoir le programme avant tout le monde.',
];

// --- Les incontournables de la semaine ------------------------------------

export function captionIncontournables({ variante, events, from, to, ch, r }) {
  const techno = variante === 'techno';
  const intro = ch.pick(`intro-${variante}`, techno
    ? [
      `La sélection techno de la semaine.\nPour ceux qui restent jusqu'à la fermeture.`,
      `Techno only. Les dates à pas rater ${plage(from, to)} sur la Côte.`,
      `Cette semaine ça tape fort sur la Côte d'Azur. On vous a fait le tri.`,
      `Pour la communauté techno de la Côte : voilà où vous serez cette semaine.`,
      `Moins de blabla, plus de BPM. Les soirées techno de la semaine 👇`,
      `Pas juste des soirées. Des line-up, des lieux, une vraie communauté. La techno sur la Côte cette semaine 👇`,
    ]
    : [
      `Cette semaine, la Côte d'Azur ne dort pas.\nNice, Cannes, Monaco… des ambiances, des styles, des vibes pour tous.`,
      `Les soirées incontournables de la semaine sur la Côte, ${plage(from, to)} 👇`,
      `House, shatta, afro, électro… Cette semaine il y en a pour tout le monde.`,
      `Votre semaine est réglée. Voilà les soirées à pas louper sur la Côte d'Azur.`,
      `On a fait le tour des soirées de la semaine. Celles-là, on les recommande les yeux fermés.`,
      `Pas d'excuse cette semaine, le programme est chargé 👇`,
    ]);
  const question = ch.pick(`question-${variante}`, techno
    ? [
      'Vous serez à laquelle ? Dites-le en commentaire, la famille techno se retrouve.',
      'Il manque une date ? Ajoutez-la en commentaire pour les autres.',
      'Tag ton binôme de rave.',
      'Votre set préféré du mois dernier ? On veut des noms.',
    ]
    : [
      'Vous allez à laquelle ? Dites-le en commentaire.',
      'Tag la personne qui va te dire « juste un verre » et finir à 5h.',
      'Enregistrez le post, vous nous remercierez vendredi.',
      'Il en manque une ? Balancez-la en commentaire.',
    ]);
  const suivre = ch.pick('suivre', SUIVRE);
  return clip(`${intro}\n\n${liste(events)}\n\n${question}\n\nBillets sur Shotgun et DICE. ${suivre}\n\n${hashtags(r, variante)}`);
}

// --- Bons plans -------------------------------------------------------------

export function captionBonPlan({ variante, events, from, to, ch, r, manuel }) {
  const suivre = ch.pick('suivre', SUIVRE);
  if (manuel) {
    const fin = ch.pick('fin-bonplan', ['Partagez à ceux qui doivent savoir.', 'Enregistrez pour plus tard.', 'Envoyez ça à votre groupe.']);
    return clip(`${manuel.titre}\n\n${manuel.texte}\n\n${fin} ${suivre}\n\n${hashtags(r)}`);
  }
  if (variante === 'a-reserver') {
    const intro = ch.pick('intro-a-reserver', [
      `Bon plan : les grosses dates qui arrivent sur la Côte. Prenez vos places avant que ce soit sold out.`,
      `Petit conseil : ces soirées vont partir vite. Les places sont souvent moins chères maintenant que la veille.`,
      `À réserver maintenant, pas le jour J. Les dates qu'on surveille pour les prochaines semaines.`,
    ]);
    const fin = ch.pick('fin-a-reserver', ['Envoie ça à ton groupe avant d\'oublier.', 'Enregistre le post, ça t\'évitera le « c\'est complet ».', 'Laquelle vous tente le plus ?']);
    return clip(`${intro}\n\n${liste(events)}\n\n${fin}\n\nBillets sur Shotgun et DICE. ${suivre}\n\n${hashtags(r)}`);
  }
  const intro = ch.pick('intro-petits-prix', [
    `Bon plan : sortir sur la Côte sans se ruiner. Gratuit ou petit prix, ${plage(from, to)}.`,
    `Fin de mois difficile ? Voilà les soirées gratuites ou à petit prix des prochains jours.`,
    `Qui a dit que sortir sur la Côte coûtait une fortune ? Petits prix et entrées gratuites 👇`,
  ]);
  const fin = ch.pick('fin-petits-prix', ['Partagez à votre pote toujours fauché.', 'Tag la personne qui dit toujours que c\'est trop cher.', 'Vous connaissez d\'autres bons plans ? Partagez en commentaire.']);
  return clip(`${intro}\n\n${liste(events)}\n\n${fin}\n\n${suivre}\n\n${hashtags(r)}`);
}

// --- Débat ------------------------------------------------------------------

export function captionDebat({ debat, ch, r }) {
  const vote = debat.a && debat.b
    ? `\n\n${ch.pick('vote', ['Votez en commentaire', 'Répondez en commentaire', 'Votre camp en commentaire'])} : 🅰️ ${debat.a} ou 🅱️ ${debat.b}`
    : '';
  return clip(`${debat.legende}${vote}\n\n${hashtags(r)}`);
}

// --- Reels ------------------------------------------------------------------

export function captionReel({ variante, events, ch, r, elargi = false }) {
  const hooks = {
    weekend: ['Laquelle tu choisis ce week-end ? Réponds avec le numéro.', 'Ton week-end sur la Côte en 15 secondes. Tu vas à laquelle ?', 'Plus d\'excuse pour rester chez toi ce week-end.'],
    techno: ['Ce week-end ça tape. Ton numéro en commentaire.', 'La famille techno de la Côte, on se retrouve où ce week-end ?', 'Pour ceux qui rentrent quand le soleil se lève.'],
    'petits-prix': ['Sortir ce week-end sans exploser ton budget. Laquelle tu prends ?', 'Gratuit ou presque. Ton numéro en commentaire.', 'Le week-end des petits budgets sur la Côte.'],
  }[variante].filter((h) => !elargi || !/week-end/i.test(h));
  const hook = ch.pick(`legende-reel-${variante}`, hooks.length ? hooks : ['Laquelle tu choisis ? Ton numéro en commentaire.']);
  const cta = ch.pick('cta-reel', ['Envoie ce reel à ton crew.', 'Tag ceux qui viennent avec toi.', 'Enregistre pour ne pas oublier.']);
  const suivre = ch.pick('suivre', SUIVRE);
  return clip(`${hook}\n\n${events.map((e, i) => `${i + 1}. ${ligne(e)}`).join('\n')}\n\n${cta} ${suivre}\n\n${hashtags(r, variante === 'techno' ? 'techno' : 'general')}`);
}

function clip(s) { return s.length <= 2200 ? s : s.slice(0, 2190) + '…'; }
