// Légendes Instagram (2 200 caractères max, 30 hashtags max).
import { jourCourt, jourNum, heure, plage } from './dates.mjs';

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const seedOf = (d) => Math.floor(d.getTime() / (7 * 86400e3)); // change chaque semaine

const ligne = (e, i) => {
  const lieu = [e.venue, e.city].filter(Boolean).join(', ');
  return `${i + 1}. ${jourCourt(e.start)} ${jourNum(e.start)} · ${heure(e.start)} — ${e.name}${lieu ? ` (${lieu})` : ''}`;
};

export function captionCarousel({ kind, events, from, to, config }) {
  const s = seedOf(from);
  const intro = kind === 'weekend'
    ? pick([
      `🔥 Le week-end arrive : voilà où sortir sur la Côte d'Azur ${plage(from, to)}.`,
      `Vendredi, samedi, dimanche : ton programme de soirées sur la Côte d'Azur est prêt 🪩`,
      `Pas de plan ce week-end ? On a fait le tri pour toi 👇`,
    ], s)
    : pick([
      `🪩 Les soirées de la semaine sur la Côte d'Azur, ${plage(from, to)}.`,
      `Qui a dit qu'on ne sortait pas en semaine ? Voici les meilleures soirées ${plage(from, to)} 🌙`,
      `Ta semaine de teuf sur la Côte d'Azur commence ici 👇`,
    ], s);
  const liste = events.slice(0, 12).map(ligne).join('\n');
  const outro = pick([
    '💬 Tu vas à laquelle ? Dis-le en commentaire.',
    '👯 Tag la personne qui sort avec toi.',
    '📌 Enregistre le post pour ne rien rater.',
  ], s);
  return clip([
    intro, '', liste, '',
    `🎟️ Billets sur Shotgun et DICE · ${config.appel_a_l_action} (lien en bio ${config.compte})`,
    outro, '',
    config.hashtags.slice(0, 30).join(' '),
  ].join('\n'));
}

export function captionReel({ events, from, to, config }) {
  const s = seedOf(from);
  const hook = pick([
    'Laquelle tu choisis ce week-end ? Réponds avec le numéro 👇',
    'Ton week-end sur la Côte d\'Azur en 15 secondes 🪩 Tu vas à laquelle ?',
    'POV : t\'as enfin un plan pour ce week-end 👀 Commente ton numéro !',
  ], s);
  return clip([
    hook, '',
    events.map(ligne).join('\n'), '',
    `📲 Envoie ce reel à ton crew · ${config.appel_a_l_action} (lien en bio ${config.compte})`, '',
    config.hashtags.slice(0, 30).join(' '),
  ].join('\n'));
}

function clip(s) { return s.length <= 2200 ? s : s.slice(0, 2190) + '…'; }
