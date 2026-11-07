# Teufy · Instagram automatique (Shotgun + DICE)

Chaque semaine, sans rien faire :

| Quand (heure de Paris) | Publication | Contenu |
| --- | --- | --- |
| Lundi ~12h | Carrousel « Les soirées de la semaine sur la Côte d'Azur » | Soirées du lundi au jeudi |
| Jeudi ~17h | Carrousel « Les soirées de la semaine » spécial week-end | Soirées du vendredi au dimanche |
| Vendredi ~18h | Reel « POV : t'as toujours pas de plan ce week-end » | Les plus belles affiches du week-end, numérotées, puis « Laquelle tu choisis ? Commente le numéro » |

Les soirées viennent de **Shotgun** et **DICE** (Nice, Cannes, Antibes, Monaco… voir `config.json`), plus tes propres soirées dans `evenements-manuels.json`. Les doublons entre les deux billetteries sont fusionnés. Les soirées hors Côte d'Azur sont exclues.

Carrousel : couverture, agenda complet (l'idéal pour les enregistrements), une diapo par soirée avec l'affiche, puis une diapo « Tu sors où ? » + appel vers Teufy. Légendes avec la liste, une question pour les commentaires et les hashtags. Le texte change chaque semaine.

## Mise en route (une seule fois, ~20 min)

### 1. Compte Instagram professionnel

Le compte Teufy doit être un compte **Professionnel** (Créateur ou Entreprise), relié à une **Page Facebook**. C'est obligatoire pour publier via l'API officielle de Meta. Aucun mot de passe Instagram n'est utilisé.

### 2. Jeton d'accès Meta

1. Sur <https://developers.facebook.com/apps>, crée une app de type **Business**, et ajoute le produit **Instagram** (API Graph).
2. Dans **Meta Business Suite → Paramètres → Utilisateurs système**, crée un utilisateur système **Admin**. Donne-lui accès à la Page et au compte Instagram Teufy.
3. Clique sur **Générer un jeton** pour ton app, avec ces autorisations : `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`. Choisis l'expiration **Jamais** : ce jeton n'expire pas, contrairement aux jetons de 60 jours.
4. Trouve l'identifiant Instagram en ouvrant cette adresse (remplace `TON_JETON`) :
   `https://graph.facebook.com/v21.0/me/accounts?fields=name,instagram_business_account&access_token=TON_JETON`
   La valeur `instagram_business_account.id` est ton **IG_USER_ID** (environ 17 chiffres).

Tu utilises plutôt « Instagram API with Instagram Login » (sans Page Facebook) ? Ça fonctionne aussi : ajoute la variable de dépôt `IG_API_HOST` = `graph.instagram.com`. Ces jetons expirent au bout de 60 jours.

### 3. Secrets GitHub

Dans le dépôt : **Settings → Secrets and variables → Actions → New repository secret** :

- `IG_ACCESS_TOKEN` : le jeton de l'étape 2
- `IG_USER_ID` : l'identifiant de l'étape 2

Sans ces secrets, rien n'est publié. Le workflow produit seulement l'aperçu.

### 4. Tester avant de publier

**Actions → « Teufy - Instagram automatique » → Run workflow**, avec *publier* décoché. À la fin, télécharge l'artefact `teufy-…`. Il contient les visuels, la vidéo, les légendes (`publication.json`) et les pages Shotgun/DICE récupérées (`out/debug/`).

Pour publier tout de suite : relance avec *publier* coché.

Les médias sont mis en ligne via GitHub Pages (`https://junior63122.github.io/teufy-insta/media/…`), car Instagram exige une URL publique pour les images et vidéos.

## Personnaliser

- **Musique du reel** : dépose un ou plusieurs `.mp3` libres de droits dans `assets/musiques/`. Un fichier est choisi au hasard chaque semaine. Sans musique, le reel est muet. L'API Instagram ne permet pas d'ajouter un son tendance de la bibliothèque Instagram.
- **Tes soirées Teufy en priorité** : ajoute-les dans `evenements-manuels.json`. Elles passent toujours en tête.
  ```json
  [
    {
      "name": "Teufy Opening Party",
      "start": "2026-11-14T23:00:00+01:00",
      "venue": "Le Bunker",
      "city": "Nice",
      "price": 10,
      "image": "https://…/affiche.jpg",
      "url": "https://teufy.app/…"
    }
  ]
  ```
- **Villes, pages Shotgun/DICE, hashtags, titres, nombre de soirées** : `config.json`.
- **Jours et heures** : les lignes `cron` en haut de `.github/workflows/teufy-instagram.yml` (heures UTC).
- **Design** : les gabarits HTML/CSS sont dans `src/render.mjs`.

## En local

```sh
cd teufy-insta
npm install && npx playwright install chromium   # ffmpeg doit être installé
node src/run.mjs tout --dry-run                  # génère tout dans media/, sans publier
npm test
```

## Si quelque chose casse

- **« Pas assez de soirées trouvées »** : le workflow s'arrête sans rien publier, et GitHub t'envoie un e-mail d'échec. Si Shotgun ou DICE ont changé leur site, les pages récupérées sont dans l'artefact (`out/debug/`). L'extraction est générique (schema.org, `__NEXT_DATA__`, flux Next.js), donc elle résiste à la plupart des changements.
- **Erreur Instagram** : le message de l'API est affiché dans le journal du workflow. Le plus souvent, il s'agit d'un jeton expiré ou d'une autorisation manquante.
- **Pas de double publication** : `historique.json` garde ce qui a été publié. Une même publication n'est jamais postée deux fois la même semaine.
- Ce module lit les pages publiques de Shotgun et DICE. Pour un usage intensif, demande un accès API à Shotgun (API organisateurs) ou à DICE (API partenaires).
