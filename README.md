# junior63122.github.io

## 📰 Le Journal de Junior — `/journal/`

Un journal en ligne qui publie **automatiquement** des articles sur Junior Joyant
(portraits, conseils cyber, animes & K-dramas, sorties à Nice…).

- Site : https://junior63122.github.io/journal/
- Articles : `journal/articles.json`
- Générateur : `scripts/generate-article.mjs` (Node, aucune dépendance)
- Robot : `.github/workflows/journal-auto.yml` — publie 1 article par jour, et peut
  être lancé à la main (onglet **Actions → Journal - article automatique → Run workflow**).

Générer à la main : `node scripts/generate-article.mjs 3` (3 articles pour aujourd'hui).
