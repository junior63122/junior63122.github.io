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
