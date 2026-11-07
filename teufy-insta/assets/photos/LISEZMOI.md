# Photos d'ambiance

Dépose ici des photos de soirées (JPEG ou PNG, idéalement 1080 px de large ou plus) :
foule, scène, DJ, lumières, feux d'artifice… Ce sont elles qui donnent l'âme des visuels
(fond de la couverture, bandeaux du haut et du bas de chaque soirée, débats).

Le bot les passe en noir et blanc et les teinte de la couleur de la saison (rouge l'hiver,
rose au printemps, corail l'été, violet l'automne). Pas besoin de les retoucher.

Il prend d'abord le dossier le plus précis :

| Dossier | Utilisé pour |
| --- | --- |
| `techno/` | posts et reels techno |
| `club/` | posts commerciaux, bons plans, reels |
| `fetes/` | décembre (Noël, Nouvel An) |
| `debat/` | débats (amis, ambiance bar…) |
| `hiver/` `printemps/` `ete/` `automne/` | selon la saison |
| ce dossier | tout le reste |

Sans photo, le bot va en chercher sur Pexels (gratuit, secret `PEXELS_API_KEY`), puis,
à défaut, dessine un fond de faisceaux de lumière teinté.

Utilise des photos dont tu as les droits (les tiennes, celles des clubs partenaires avec
leur accord, ou des banques libres).
