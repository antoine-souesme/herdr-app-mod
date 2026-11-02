---
name: sync
description: Use when Herdr (herdr-app) was updated, when Antoine asks whether his copied mods, layout, theme or keys are behind Herdr's, or before changing anything copied from Herdr (antoine-agents, antoine-spaces, tabbar.js, layouts/antoine.json, antoine-monokai) after a Herdr update.
---

# Reporter les mises à jour de Herdr dans les copies d'Antoine

## Principe

Antoine a repris des parties de Herdr pour les modifier. Herdr met à jour ses
originaux, jamais les copies. Trois choses rendent le report sûr :

- `upstream/` (racine du dépôt, sous git) : les originaux tels qu'au dernier report ;
  `upstream/VERSION` : **la version de Herdr du dernier report**.
- `COPIES.md` (à côté de ce fichier) : chaque copie, son original et **tous les
  ajouts d'Antoine** à garder.
- `upstream.sh` : `diff` (ce que Herdr a changé depuis), `check` (fichiers de Herdr
  utilisés tels quels et disparus), `snapshot` (enregistre la nouvelle référence).

## Étapes

1. Lis `COPIES.md` en entier.
2. `bash .claude/skills/sync/upstream.sh diff` depuis la racine du dépôt.
   La première ligne donne la version du dernier report et la version installée.
   - Même version et sortie 0 : rien à faire, dis-le à Antoine avec la version.
   - Sortie 1 : le diff montre chaque changement de Herdr.
3. `bash .claude/skills/sync/upstream.sh check` : une icône de Herdr
   disparue est à remplacer dans le mod `antoine` (cherche son nouveau nom chez Herdr).
4. Pour chaque bloc du diff, trouve la copie dans `COPIES.md` et reporte le changement
   à la main dans la copie :
   - chaque ajout listé pour cette copie doit encore être là et marcher après ;
   - si Herdr change une ligne qu'un ajout touche, fusionne les deux intentions ; si
     elles se contredisent, demande à Antoine avant d'écrire ;
   - un changement sans objet dans la copie : ne le reporte pas, note-le pour le compte rendu.
5. Après chaque copie modifiée : `herdr-app check ~/.config/herdr-app/mods/<mod>`,
   `herdr-app status` (aucune erreur), `herdr-app shot` pour regarder, et
   `node --test tests/*.test.mjs` si un module pur a bougé.
6. Vérifie aussi `keys.json` : la section `layout:antoine` doit toujours y être.
7. Tout reporté et vérifié : `bash .claude/skills/sync/upstream.sh snapshot`
   (met `upstream/VERSION` à la version installée). Mets `COPIES.md` à jour si un
   ajout a changé de forme. Commit avec un message qui nomme la version de Herdr.
8. Compte rendu à Antoine : version d'avant et d'après, ce qui a été reporté, ce qui
   ne l'a pas été et pourquoi.

## Erreurs à éviter

- `snapshot` avant d'avoir tout reporté : les changements de Herdr sortent du diff
  et ne seront jamais reportés, et `VERSION` ment.
- Recopier l'original par-dessus la copie : les ajouts d'Antoine disparaissent.
- Modifier un original de Herdr : il est écrasé au démarrage.
- Les fichiers `*.d.ts` sont exclus exprès : Herdr les génère, ils ne demandent rien.
