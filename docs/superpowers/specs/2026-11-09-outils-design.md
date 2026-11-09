# Panneau « Outils » : Git façon lazygit et terminal

## Pourquoi

Antoine garde aujourd'hui lazygit et un shell dans deux volets de chaque
onglet. Il veut les sortir des onglets et les ranger dans un panneau à
droite, comme Files et Changes, avec une interface git dessinée par Herdr
plutôt que le programme lazygit lui-même. Ce panneau doit pouvoir accueillir
beaucoup d'autres outils plus tard : il s'appelle donc « Outils », pas « Git ».

## Ce qu'on voit

- Un bouton **« Outils »** s'ajoute dans la barre des onglets, à droite de
  Files et Changes (même style que ces deux boutons, `panelButton` de
  `tabbar.js`). Files et Changes ne changent pas.
- Il ouvre le panneau de droite sur la partie « Outils ». Ce panneau a **sa
  propre barre, tout en haut**, avec un bouton par outil qu'on allume ou
  éteint indépendamment. Pour commencer : **Git** et **Terminal**. Les deux
  peuvent être allumés ensemble (Git en haut, Terminal en dessous), un seul,
  ou aucun.
- La barre est pensée pour recevoir d'autres outils plus tard : ajouter un
  outil doit se limiter à le déclarer quelque part et à écrire sa vue.

Maquette de référence : `.superpowers/brainstorm/*/content/panneau-git-v3.html`
(la barre « Files / Changes / Git » de la maquette devient « Files / Changes /
Outils »).

## La partie Git

Trois cadres, comme sur le schéma d'Antoine :

- **Changements** (en haut à gauche) : les fichiers modifiés, avec leur
  état (modifié, ajouté, supprimé) et une case indiquant s'ils sont indexés.
  - `espace` : indexe ou retire le fichier sélectionné.
  - `c` : ouvre une petite fenêtre « Message du commit » ; entrée valide,
    échap annule.
- **Branches** (en bas à gauche) : les branches locales, la branche
  actuelle marquée. Une branche ouverte dans un worktree (par exemple par
  Claude Code) apparaît dans cette liste avec une marque « worktree » : c'est
  ainsi qu'Antoine voit ses worktrees. *Choix de Claude :* `espace` sur une
  telle branche n'en change pas (git le refuse) et le dit en clair ; `d` la
  refuse aussi tant que le worktree existe.
  - `espace` : passe sur la branche sélectionnée.
  - `n` : ouvre une fenêtre pour saisir le nom d'une nouvelle branche (créée
    depuis la branche actuelle, puis on passe dessus, comme lazygit).
  - `d` : ouvre une fenêtre de confirmation avant de supprimer.
- **Graphe** (à droite, toute la hauteur) : les commits du plus récent au
  plus ancien, avec une ligne de couleur par branche et des courbes aux
  embranchements et fusions, les étiquettes de branches (locales et
  distantes) et de tags, le message, l'âge et le code court. La ligne des
  changements non validés est en tête. Le dessin reprend celui du mod
  **herdr-git-graph** (https://github.com/rabeeh-ta/herdr-git-graph, licence
  MIT : `lanes.js`, et la partie dessin de `graph.js`). Le graphe ne sert qu'à
  regarder pour l'instant : pas d'actions dessus.

Les flèches haut/bas déplacent la sélection dans le cadre actif. **On choisit
le cadre qui reçoit les touches en cliquant dessus** (pas de 1/2/3) ; le cadre
actif est entouré de la couleur d'accent.

Les fenêtres (commit, nouvelle branche, suppression) suivent le style des
dialogues de Herdr (comme ceux de `dialogs.js`), pas celui du terminal de
lazygit. Une erreur git (passage de branche refusé, branche non fusionnée…)
s'affiche à Antoine, en clair, sans rien casser.

## La partie Terminal

Un vrai terminal, vivant, sous la partie Git. **Un terminal par space**,
ouvert dans le dossier du space ; en changeant de space, le panneau montre le
terminal de ce space. Le terminal d'un space reste en vie quand on cache la
partie ou qu'on change de space. Pour le reste, **il se comporte comme les
terminaux de Herdr** : gardé par le core, il survit à un redémarrage de Herdr ;
s'il est perdu (plantage du core, redémarrage de l'ordinateur), un shell neuf
s'ouvre dans le dossier du space. *Choix de Claude :* fermer le space ferme son
terminal ; il ne doit pas apparaître comme un volet dans un onglet.

## Ce que ça suit

Git et Terminal suivent **le dossier du space ouvert** : son dossier de
départ (`spaces()[i].folder`, le dossier personnel s'il est vide), pas le
terminal qui a le focus. Quand Claude Code part dans un worktree, la partie
Git reste sur le dépôt principal ; le worktree se voit comme une branche dans
la liste (voir plus haut). Un space hors d'un dépôt git affiche dans la partie Git un message
simple (« Pas de dépôt git ici »).

## Autres choix de Claude

- Un space ouvert sur une autre machine (ssh) : le panneau affiche « Pas
  disponible sur une autre machine ».
- Le panneau garde sa propre largeur quand on est sur Outils, plus grande que
  celle de Files et Changes (environ 700 px au départ), et la retient.

## Contraintes

- Règles du dépôt (`CLAUDE.md`) : tout va dans le mod `antoine` et la
  disposition `layouts/antoine.json` ; état partagé en `antoine.…` ; règles
  pures testées dans `tests/` ; textes en français ; couleurs via `theme()`.
- Le code repris de herdr-git-graph est noté dans
  `.claude/skills/sync/COPIES.md` (avec sa licence MIT et son auteur), même
  s'il ne vient pas de Herdr.
- Un mod ne peut pas dessiner un terminal à l'intérieur de son propre rendu :
  le terminal est un bloc `{ "terminal": "<adresse>" }` de la disposition,
  placé sous le bloc du mod dans le nœud « Outils » du panneau.

## Laissé au constructeur

- Comment le bloc terminal change d'adresse selon le space (`layout.set`, une
  pile avec un enfant par space, ou autre), et comment le terminal de chaque
  space est lancé et retrouvé.
- Comment Git et Terminal se montrent et se cachent (blocs cachés de la
  disposition via `layout.show`/`layout.hide`, ou autre) et où l'on retient
  les outils allumés.
- Le rafraîchissement du Git (après une action, quand les fichiers changent,
  à intervalle…), le nombre de commits chargés.
- Les détails de dessin non tranchés par la maquette.

## Hors périmètre

- Actions sur le graphe (clic droit, détail d'un commit, diff).
- Pousser, tirer, fusionner, rebaser, stash.
- Outils autres que Git et Terminal.
- Plusieurs dépôts dans un même space.

## Ce qui ferait échouer le projet même si ça marche

- Les touches du panneau partent dans le terminal ou dans Claude Code (ou
  l'inverse) : une frappe ne doit aller qu'à l'endroit cliqué.
- Une action qui change le dépôt sans le geste attendu (suppression sans
  confirmation).
- Perdre le terminal d'un space en changeant de space ou en cachant la partie.
