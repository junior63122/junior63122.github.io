# Teufy · Instagram automatique (Shotgun + DICE)

L'automate publie 9 contenus par mois sur Instagram. Il mesure les résultats de chaque post et ajuste la suite pour gagner en engagement et en abonnés.

| Quand (vers 17h-20h, heure apprise) | Publication |
| --- | --- |
| 1er lundi du mois | **Les incontournables de la semaine** : soirées commerciales (house, shatta, afro, électro…) |
| 1er jeudi | **Reel** : les soirées du week-end, numérotées (« Laquelle tu choisis ? ») |
| 2e mercredi | **Débat** : une question qui fait parler (A ou B ?) |
| 2e vendredi | **Bon plan** : sortir sans se ruiner (gratuit ou moins de 10 €) |
| 3e lundi | **Les incontournables techno** : univers visuel à part |
| 3e jeudi | **Reel techno** |
| 4e mardi | **Bon plan** : les grosses dates à réserver avant qu'elles soient sold out |
| 4e mercredi | **Débat** |
| 4e vendredi | **Reel petits prix** |

Le calendrier se modifie dans `config.json` (`calendrier`).

## Les infos viennent de Shotgun et DICE

Pour chaque soirée, le bot récupère sur Shotgun et DICE l'**affiche**, le **titre**, le **style musical** (tags de la billetterie), la **date et l'heure**, le **lieu**, le **prix** et, quand la billetterie l'affiche, la **popularité** (nombre d'intéressés ou de participants). Si la liste ne donne pas tout, il ouvre la page de la soirée pour compléter.

Sur les visuels, l'affiche est montrée **en entier**, sans recadrage, avec le style musical par-dessus. Dessous figurent le nom de la soirée, puis Quand / Où / Prix / Billets. L'agenda reprend chaque soirée avec sa vignette, l'heure, le style, le lieu et le prix.

Tes propres soirées vont dans `evenements-manuels.json` et passent toujours en tête.

## Il choisit les meilleures soirées et apprend tout seul

Chaque jour, le bot relève les statistiques des posts des 3 dernières semaines : portée, likes, commentaires, enregistrements, partages, abonnements gagnés, visites du profil et temps de visionnage des reels. Il note aussi le nombre d'abonnés. Tout est enregistré dans `apprentissage.json`, avec un résumé lisible dans **`RAPPORT.md`**.

- **Score d'un post** : likes + 2× commentaires + 3× enregistrements + 4× partages + 10× abonnements gagnés, rapporté à la portée et comparé aux autres posts du même format. Bonus pour la portée (nouveaux publics) et pour les reels regardés jusqu'au bout (rétention).
- **Choix des soirées** : qualité des infos (affiche, style, prix), popularité, soirées en vente sur les deux billetteries… plus ce que le public a aimé : les styles, lieux, villes, gammes de prix et horaires qui ont fait réagir remontent. Deux soirées maximum par lieu dans un même post, pour garder de la variété.
- **Textes et horaires** : accroches des reels, intros, questions, appels à s'abonner, sujets de débat et heure de publication (entre 16h et 20h). Le bot privilégie ce qui marche, tout en continuant à tester les autres options pour ne pas tourner en rond (échantillonnage de Thompson).

Il faut environ 4 à 6 semaines de publications pour que l'apprentissage commence à peser vraiment.

## Direction artistique

La charte est dans **`contenus/da.json`** : polices, arrondis, et une palette par saison.

| Saison | Ambiance par défaut |
| --- | --- |
| Hiver (déc.-fév.) | bleu glacé, lavande |
| Printemps (mars-mai) | rose, menthe, jaune |
| Été (juin-août) | orange coucher de soleil, rose, turquoise |
| Automne (sept.-nov.) | orange ambré, bordeaux |

La techno garde son univers à part (fond noir, typo brute, sans dégradés), avec une couleur d'accent qui suit aussi la saison. Pour mettre le logo officiel, dépose `assets/logo.png` (ou `.svg`) : il remplace le nom écrit sur tous les visuels.

> Les couleurs par défaut sont provisoires. Elles sont à caler sur le compte Instagram officiel de Teufy (voir les captures demandées).

## Pas d'invitation à télécharger l'app

L'app n'est pas encore disponible. Les visuels et légendes poussent à **s'abonner au compte**, à enregistrer, à partager et à commenter. Le test `npm test` vérifie qu'aucune légende ne parle de téléchargement ou de « lien en bio ».

## Contenus écrits à la main

- **Débats** : `contenus/debats.json`, 36 sujets (soirée pyjama Mario Kart en boîte, Just Dance à 2h du matin, Nice ou Cannes, filmer le set, dress code…). Aucun n'est republié avant que la liste soit épuisée.
- **Bons plans** : calculés à partir des prix et des grosses dates. Un vrai bon plan (code promo, entrée offerte…) se met dans `contenus/bons-plans.json` et passe en priorité :
  ```json
  [{ "titre": "Entrée offerte avant minuit", "texte": "Tous les jeudis au Ghost avec le code TEUFY.", "du": "2026-11-01", "au": "2026-11-30" }]
  ```
- **Légendes** : plusieurs versions humaines par format, avec peu d'emojis, pas de tiret « — » et 7 hashtags qui tournent.

## Mise en route (une seule fois, ~20 min)

1. **Compte Instagram Professionnel** (Créateur ou Entreprise) relié à une Page Facebook.
2. **Jeton Meta qui n'expire pas** :
   - Sur <https://developers.facebook.com/apps>, crée une app **Business** et ajoute le produit Instagram.
   - Dans Meta Business Suite → Paramètres → Utilisateurs système, crée un utilisateur **Admin** et donne-lui accès à la Page et au compte Instagram.
   - Génère un jeton qui n'expire **jamais**, avec ces autorisations : `instagram_basic`, `instagram_content_publish`, **`instagram_manage_insights`** (indispensable pour l'apprentissage), `pages_show_list`, `pages_read_engagement`, `business_management`.
   - Trouve l'identifiant du compte avec `https://graph.facebook.com/v21.0/me/accounts?fields=name,instagram_business_account&access_token=TON_JETON`. La valeur `instagram_business_account.id` est ton IG_USER_ID.
3. **Secrets GitHub** (Settings → Secrets and variables → Actions) : `IG_ACCESS_TOKEN` et `IG_USER_ID`.
4. **Aperçu** : Actions → « Teufy - Instagram automatique » → Run workflow → **mois**. Les 9 publications sont générées avec les vraies soirées, sans rien publier. Tout est dans l'artefact `teufy-…`.

Avec « Instagram API with Instagram Login » (sans Page Facebook), ajoute la variable de dépôt `IG_API_HOST` = `graph.instagram.com`.

## Musique des reels

L'API Instagram ne permet pas d'utiliser les sons tendance. Dépose des `.mp3` libres de droits dans `assets/musiques/techno/` et `assets/musiques/club/` (ou `assets/musiques/` pour tous).

## En local

```sh
cd teufy-insta
npm install && npx playwright install chromium   # ffmpeg doit être installé
node src/run.mjs mois                            # aperçu des 9 publications du mois
node src/run.mjs reel:techno --dry-run           # un seul contenu
node src/run.mjs collecter                       # statistiques (avec IG_ACCESS_TOKEN et IG_USER_ID)
npm test
```

## Si quelque chose casse

- **« Pas assez de soirées trouvées »** : rien n'est publié et GitHub envoie un e-mail. Les pages récupérées sont dans l'artefact (`out/debug/`).
- **Erreur Instagram** : le message de l'API est dans le journal du workflow (jeton ou autorisation manquante, le plus souvent).
- **Pas de double publication** : `historique.json` garde tout ce qui a été publié.
