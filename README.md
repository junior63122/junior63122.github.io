# junior63122.github.io

## 📰 L'Écho des Anges — `/journal/`

Un quotidien en ligne, en **français et en anglais**, mis à jour deux fois par jour par un workflow GitHub Actions.
Chaque rubrique est signée par un(e) journaliste de la rédaction (noms dans `scripts/generate-news.mjs` et `journal/journal.js`) :

- **Actualité** — Business, Finance, Événementiel, Tech, Monde, Nice & Côte d'Azur, Sport.
  Chaque rubrique publie une revue de presse du jour, construite à partir des flux RSS
  de médias reconnus (Le Monde, franceinfo, Google Actualités…). Chaque info cite sa source
  et renvoie vers l'article d'origine.

| Élément | Fichier |
| --- | --- |
| Site | https://junior63122.github.io/journal/ |
| Articles | `journal/articles.json` |
| Générateur d'actu | `scripts/generate-news.mjs` (liste des flux dans `RUBRIQUES`) |
| Photos libres (Wikimedia Commons) | `scripts/fetch-images.mjs` → `journal/img/stock/` (+ `credits.json`) |
| Rédaction des articles (API Claude) | `scripts/write-articles.mjs` — nécessite le secret GitHub `ANTHROPIC_API_KEY` |
| Robot | `.github/workflows/journal-auto.yml` |

Lancer le robot à la main : onglet **Actions → « Journal - articles automatiques » → Run workflow**.

Ajouter une rubrique : ajoute une entrée dans `RUBRIQUES` (journaliste, emoji, puis nom/intro/flux RSS en `fr` et `en`).
La version anglaise utilise des flux anglophones (BBC News, Google News).

### Activer la rédaction des articles

Sans clé, chaque rubrique reste une revue de presse (titres et liens). Pour que le robot
rédige un article complet par rubrique et par langue :

1. Créer une clé API sur https://platform.claude.com (rubrique API Keys).
2. Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**,
   nom `ANTHROPIC_API_KEY`, valeur = la clé.
3. Lancer le robot (onglet **Actions → Journal - éditions → Run workflow**).

### Archives

Les archives retracent les événements marquants de la Côte d'Azur depuis 2020. Pour en ajouter
(clé API nécessaire, voir ci-dessus) : onglet **Actions → « Journal - archives » → Run workflow**,
en indiquant la période et le nombre d'articles. Chaque événement est vérifié par recherche web
et les pages consultées sont citées en sources ; une version anglaise est produite.
Par exemple : 2024-01-01 → 2026-10-31, puis 2022-01-01 → 2023-12-31, puis 2020-01-01 → 2021-12-31.

### Pages fixes

Histoire du journal : `journal/pages.js`. Les mentions légales ont été retirées à la demande de
l'éditeur ; leur dernière version se trouve dans l'historique Git (commit 2501f78).
