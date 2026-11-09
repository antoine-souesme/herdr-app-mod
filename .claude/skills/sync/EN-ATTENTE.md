# En attente d'une mise à jour de Herdr

Les envies d'Antoine qu'on ne peut pas faire aujourd'hui parce qu'il manque
quelque chose à Herdr. À chaque `sync`, on regarde si la nouvelle version le
permet.

Une entrée par envie, sous cette forme :

```
## <ce qu'Antoine veut, en une phrase>

- Ajouté le : <date> (Herdr <version>)
- Bloqué par : <ce qui manque à Herdr : fonction, événement, option…>
- Comment vérifier : <où regarder : `herdr.d.ts`, `gpui-kit.d.ts`, AGENTS.md, changelog…>
```

Une envie faite (ou abandonnée) sort de la liste dans le même commit.

## Liste

## Coloration syntaxique des fichiers Markdown

- Ajouté le : 2026-11-05 (Herdr 0.1.13)
- Bloqué par : l'éditeur de Herdr (`EditorState`) ne colore pas un fichier `.md`,
  même avec `language: "markdown"` (déjà passé par `languageOf` dans `files.js`).
  Ses couleurs `syntax` ne connaissent que les noms du code (keyword, string,
  comment…), rien pour les titres, l'italique, le gras ou les liens.
- Comment vérifier : dans `~/.config/herdr-app/gpui-kit.d.ts`, `EditorState.new` :
  une liste des langages reconnus qui contient markdown, ou des noms de couleurs
  pour le Markdown (title, emphasis, strong, link…) ; le changelog de Herdr
  (`AGENTS.md`) pour « markdown ». Sinon, ouvrir un `.md` dans l'app et regarder.

## Changer la couleur de la sélection dans l'éditeur

- Ajouté le : 2026-11-05 (Herdr 0.1.13)
- Bloqué par : `EditorState.new` n'a aucune option pour la couleur de la sélection
  (seulement `syntax`, pour les couleurs du code), et la couleur `selection` du
  thème (`themes/antoine-monokai.json`) ne semble pas s'appliquer à l'éditeur.
- Comment vérifier : dans `~/.config/herdr-app/gpui-kit.d.ts`, `EditorState.new` :
  une option de sélection (`selection`, `selection_color`…) ou un nom
  `selection` accepté dans `syntax` ; le changelog de Herdr (`AGENTS.md`) pour
  « editor » et « selection ». Sinon, changer `selection` dans le thème et
  regarder l'éditeur dans l'app.

## Rechercher dans l'éditeur (cmd-f)

- Ajouté le : 2026-11-05 (Herdr 0.1.13)
- Bloqué par : l'éditeur de Herdr n'a pas de recherche intégrée, et
  `EditorState` ne permet que `value`, `set_value`, `on` et `release` : impossible
  de sélectionner un passage ou de faire défiler jusqu'à lui depuis le mod, donc
  impossible de faire la recherche nous-mêmes (`InputState` a bien
  `set_selected_range`, mais c'est le champ de texte, pas l'éditeur).
- Comment vérifier : dans `~/.config/herdr-app/gpui-kit.d.ts`, `EditorState` :
  une recherche intégrée (`search`, `find`) ou de quoi sélectionner et faire
  défiler (`set_selected_range`, `scroll_to`…) ; le changelog de Herdr
  (`AGENTS.md`) pour « editor », « search » ou « find ».

## Éditer les fichiers avec Fresh (l'éditeur du terminal) au lieu de l'éditeur de Herdr

Ce qu'Antoine a demandé, et qui a été fait puis retiré le 2026-11-06 (retour à
l'éditeur de Herdr en attendant) :

- un fichier ouvert (explorateur, `cmd-p`, dépôt du Finder, menu + « Ouvrir un
  fichier… ») s'ouvre dans Fresh ; les images dans un visionneur d'image ;
- les fichiers ouverts sont communs à toutes les spaces : un seul Fresh par
  fichier, listé dans la barre de chaque space, sans rechargement quand on
  change de space ; deux fichiers de même nom affichent aussi leur dossier ;
- les éditeurs sont à droite du séparateur, après les onglets de terminaux,
  avec l'icône du type de fichier ;
- l'onglet épinglé est lui-même l'éditeur (pas d'onglet en double) ; on épingle
  et désépingle par un clic droit sur l'onglet ;
- un point sur l'onglet d'un fichier non sauvegardé (sans script qui tourne en
  permanence) ;
- dans Fresh : cmd+s, cmd+z, cmd+shift+z, cmd+f ; pas de barre de menu ni
  d'onglets ; thème Monokai ; police Fira Code avec ligatures (pour Fresh seul).

Ce qui reste en place : `~/.config/fresh/config.json` et
`~/.config/fresh/themes/monokai.json` (réglages de Fresh), le visionneur
d'image, le clic droit pour épingler, « Ouvrir un fichier… » du menu +.

- Ajouté le : 2026-11-06 (Herdr 0.1.13)
- Bloqué par : un terminal n'appartient qu'à un onglet d'une seule space.
  L'afficher dans une autre space oblige à le déplacer (`terminal.park` puis
  `terminal.keep`), ce qui recharge Fresh. Les autres façons de l'afficher
  ailleurs ne marchent pas : un bloc `{ terminal }` de la disposition oblige à
  réécrire la disposition (`layout.set`, qui efface les réglages faits à la
  souris, dont le thème) ; une fenêtre `openOverlay({ kind: "window" | "popup",
  layout: { terminal } })` s'affiche bien sur la zone de travail, mais Fresh n'y
  reçoit ni la souris ni le clavier (`pane.focus` répond « no such pane »).
  Pas de police par terminal (`font` vaut pour tous), ni d'événement « fichier
  modifié » venant d'un programme.
- Comment vérifier : dans `herdr.d.ts`, `OverlaySpec` (un overlay dont le
  terminal prend le clavier, ou `pane.focus` qui accepte un terminal d'overlay),
  un bloc de disposition dont on change le terminal sans `layout.set`, une police
  par terminal ; dans `AGENTS.md` et le changelog : « overlay », « terminal block »,
  « focus », « font ». Puis ouvrir un Fresh (`hc run --bg fresh <fichier>`) dans
  un overlay et essayer de taper.
