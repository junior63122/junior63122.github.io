# junior63122.github.io

## 📰 L'Écho des Anges — `/journal/`

Un quotidien en ligne, en **français et en anglais**, mis à jour deux fois par jour par un workflow GitHub Actions.
Chaque rubrique est signée par un(e) journaliste de la rédaction (noms dans `scripts/generate-news.mjs` et `scripts/generate-article.mjs`) :

- **Actualité** — Business, Finance, Événementiel, Tech, Monde, Nice & Côte d'Azur, Sport.
  Chaque rubrique publie une revue de presse du jour, construite à partir des flux RSS
  de médias reconnus (Le Monde, franceinfo, Google Actualités…). Chaque info cite sa source
  et renvoie vers l'article d'origine.
- **Junior** — portraits, conseils cyber, animes & K-dramas, sorties à Nice sur Junior Joyant.

| Élément | Fichier |
| --- | --- |
| Site | https://junior63122.github.io/journal/ |
| Articles | `journal/articles.json` |
| Générateur d'actu | `scripts/generate-news.mjs` (liste des flux dans `RUBRIQUES`) |
| Générateur « Junior » | `scripts/generate-article.mjs` |
| Robot | `.github/workflows/journal-auto.yml` |

Lancer le robot à la main : onglet **Actions → « Journal - articles automatiques » → Run workflow**.

Ajouter une rubrique : ajoute une entrée dans `RUBRIQUES` (journaliste, emoji, puis nom/intro/flux RSS en `fr` et `en`).
La version anglaise utilise des flux anglophones (BBC News, Google News).
