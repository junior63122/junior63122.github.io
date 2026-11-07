# Teufy · Instagram automatique (Shotgun + DICE)

L'automate publie 9 contenus par mois sur Instagram, à la place d'un community manager.

| Quand (vers 18h, heure de Paris) | Publication |
| --- | --- |
| 1er lundi du mois | **Les incontournables de la semaine** : soirées commerciales (house, shatta, afro, électro…) |
| 1er jeudi | **Reel** : « POV : t'as toujours pas de plan ce week-end » (les soirées du week-end, numérotées) |
| 2e mercredi | **Débat** : une question qui fait parler (A ou B ?) |
| 2e vendredi | **Bon plan** : sortir sans se ruiner (soirées gratuites ou à moins de 10 €) |
| 3e lundi | **Les incontournables techno** : univers visuel à part (noir, vert acide) |
| 3e jeudi | **Reel techno** : « Ce week-end ça tape » |
| 4e mardi | **Bon plan** : les grosses dates à réserver avant qu'elles soient sold out |
| 4e mercredi | **Débat** |
| 4e vendredi | **Reel petits prix** : le week-end à moins de 10 € |

Le calendrier se modifie dans `config.json` (`calendrier`). Chaque ligne indique le jour (1 = lundi … 7 = dimanche), son rang dans le mois (1er, 2e, 3e, 4e) et le type de publication.

## D'où vient le contenu

- **Soirées** : pages publiques de Shotgun et DICE (Nice, Cannes, Antibes, Monaco), plus tes soirées dans `evenements-manuels.json`, toujours mises en avant. Les doublons sont fusionnés et les soirées hors Côte d'Azur écartées. Le style (techno ou commercial) est deviné grâce aux tags Shotgun/DICE et au nom de la soirée.
- **Débats** : `contenus/debats.json`, 36 sujets écrits à la main (soirée pyjama Mario Kart en boîte, Just Dance à 2h du matin, Nice ou Cannes, filmer le set, dress code…). Un débat n'est jamais publié deux fois tant que la liste n'est pas épuisée, soit 18 mois. Ajoute les tiens sur le même modèle.
- **Bons plans** : calculés automatiquement à partir des prix (gratuit / moins de 10 €) et des grosses dates à venir. Pour un vrai bon plan (code promo, partenariat, entrée offerte avant minuit…), ajoute-le dans `contenus/bons-plans.json`. Il passe en priorité, une seule fois :
  ```json
  [
    {
      "titre": "Entrée offerte avant minuit",
      "texte": "Tous les jeudis au Ghost avec le code TEUFY.\nValable jusqu'au 30 novembre.",
      "du": "2026-11-01",
      "au": "2026-11-30",
      "image": "https://…/photo.jpg"
    }
  ]
  ```

### Pour que ça ne fasse pas « IA »

- Légendes écrites à la main, plusieurs versions pour chaque format, tirées au hasard. Le ton est familier, avec des phrases courtes, peu d'emojis et pas de tiret « — » (typique des textes générés). Le test `npm test` le vérifie.
- 6 à 7 hashtags ciblés qui changent à chaque post, au lieu d'un mur de 30.
- Chaque publication se termine par une vraie question ou un « tag ton pote », pour faire réagir en commentaire.
- La techno a son propre univers visuel et ses propres textes, parce que sa communauté ne se reconnaît pas dans les visuels « club ».

## Mise en route (une seule fois, ~20 min)

### 1. Compte Instagram professionnel

Le compte Teufy doit être un compte **Professionnel** (Créateur ou Entreprise), relié à une **Page Facebook**. C'est obligatoire pour publier via l'API officielle de Meta. Aucun mot de passe n'est utilisé.

### 2. Jeton d'accès Meta

1. Sur <https://developers.facebook.com/apps>, crée une app de type **Business** et ajoute le produit **Instagram**.
2. Dans **Meta Business Suite → Paramètres → Utilisateurs système**, crée un utilisateur système **Admin**. Donne-lui accès à la Page et au compte Instagram Teufy.
3. Clique sur **Générer un jeton** pour ton app, avec les autorisations `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` et `business_management`. Choisis l'expiration **Jamais**.
4. Ouvre `https://graph.facebook.com/v21.0/me/accounts?fields=name,instagram_business_account&access_token=TON_JETON`. La valeur `instagram_business_account.id` est ton **IG_USER_ID**.

Tu passes par « Instagram API with Instagram Login » (sans Page Facebook) ? Ajoute la variable de dépôt `IG_API_HOST` = `graph.instagram.com`. Ces jetons expirent au bout de 60 jours.

### 3. Secrets GitHub

Dans **Settings → Secrets and variables → Actions**, ajoute `IG_ACCESS_TOKEN` et `IG_USER_ID`. Sans eux, rien n'est publié.

### 4. Voir le mois avant de lancer

**Actions → « Teufy - Instagram automatique » → Run workflow → « mois »**. Les 9 publications du mois sont générées avec les vraies soirées du moment, sans rien publier. Télécharge l'artefact `teufy-…` : chaque dossier contient les visuels ou la vidéo, et `legende.txt`.

Pour publier un contenu tout de suite, choisis-le dans la liste et coche *publier*.

## Musique des reels

L'API Instagram ne permet pas d'ajouter les sons tendance de la bibliothèque Instagram. Dépose des `.mp3` libres de droits :
- `assets/musiques/techno/` pour le reel techno ;
- `assets/musiques/club/` pour les autres ;
- ou `assets/musiques/` pour tous.

Un fichier est pris au hasard à chaque reel. Sans musique, le reel est muet.

## En local

```sh
cd teufy-insta
npm install && npx playwright install chromium   # ffmpeg doit être installé
node src/run.mjs mois                            # aperçu des 9 publications du mois dans media/
node src/run.mjs reel:techno --dry-run           # un seul contenu
npm test
```

## Si quelque chose casse

- **« Pas assez de soirées trouvées »** : rien n'est publié et GitHub t'envoie un e-mail d'échec. Les pages Shotgun/DICE récupérées sont dans l'artefact (`out/debug/`). Quand il y a peu de soirées techno ou à petit prix, l'automate élargit d'abord la période. Ensuite il bascule sur un format proche (par exemple reel « week-end » au lieu de « petits prix »).
- **Erreur Instagram** : le message de l'API est dans le journal du workflow (souvent un jeton ou une autorisation manquante).
- **Pas de double publication** : `historique.json` garde tout ce qui a été publié, y compris les débats et bons plans déjà utilisés.
- Ce module lit les pages publiques de Shotgun et DICE. Pour un usage intensif, demande un accès API à Shotgun (API organisateurs) ou à DICE (API partenaires).
