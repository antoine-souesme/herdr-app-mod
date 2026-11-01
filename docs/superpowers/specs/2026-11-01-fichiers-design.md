# Onglets de fichiers et explorateur — conception

Date : 2026-11-01 · Demandeur : Antoine · S'appuie sur : `2026-11-01-workspaces-design.md`

## Intention

Antoine tient un fichier de « backlog » avec ses notes sur tous ses projets
pro. Il veut l'avoir sous la main tout le temps, même quand il change de
space dans le workspace. Plus largement, il veut ouvrir et modifier des
fichiers dans des onglets, un peu comme dans VS Code, et parcourir les
dossiers de ses spaces dans un explorateur.

Les fichiers sont liés au **workspace**, pas au space.

## Ce que voit et fait Antoine

**Onglets de fichiers**
- Dans la barre des onglets, après les onglets du space affiché, un **trait
  vertical**, puis les onglets de fichiers du workspace ouvert.
- Cliquer sur un onglet de fichier affiche le fichier **à la place des
  terminaux**, sur toute la zone de travail. Cliquer sur un onglet du space
  ramène les terminaux.
- Le fichier se **modifie** directement. **cmd-s** sauvegarde. Coloration du
  **Markdown** et des fichiers **.env** pour commencer.
- Tant qu'il y a des changements non sauvegardés, l'onglet montre un point
  (supposition validée).
- Si le fichier a changé sur le disque pendant qu'Antoine l'éditait, la
  sauvegarde le prévient au lieu d'écraser (supposition validée).
- **Sauvegarde automatique** quand Antoine change de workspace ou quitte
  Herdr avec des changements non sauvegardés (décision d'Antoine). Si le
  fichier a changé sur le disque entre-temps, on n'écrase pas : le texte
  d'Antoine est gardé à côté, dans un fichier `<nom>.herdr-<date>` du même
  dossier (choix de conception), et une notification le dit.
- **Retour aux terminaux sans clic** : quand l'onglet du space change par un
  autre moyen qu'un clic (cmd-1…9, changement de space, clic sur une
  notification, nouvel onglet), la zone de travail revient aux terminaux
  (décision d'Antoine).
- **cmd-w** ferme l'onglet du fichier quand c'est lui qui est affiché
  (décision d'Antoine), et l'onglet du terminal sinon.

**Deux sortes de fichiers**
- **Épinglé** (le backlog) : reste toujours dans les onglets de son
  workspace, y compris après un redémarrage de Herdr. On l'ajoute par un
  bouton « épingler » qui ouvre le **sélecteur de fichiers du Mac**.
- **Temporaire** (ouvert depuis l'explorateur) : disparaît quand on ferme
  son onglet ou au redémarrage de Herdr.

**Explorateur**
- Un **bouton en haut de la barre des workspaces**, au-dessus des emojis
  (supposition validée d'après la capture d'Antoine), ouvre ou ferme
  l'explorateur.
- L'explorateur prend place **entre la barre des workspaces et la colonne
  des spaces et des agents**.
- Il montre **côte à côte les dossiers de tous les spaces du workspace
  ouvert**, un dossier racine par space, comme un projet VS Code à
  plusieurs dossiers.
- Un clic sur un fichier l'ouvre dans un onglet temporaire du workspace et
  l'affiche.
- Dossier racine d'un space : le dossier où se trouve son premier terminal
  maintenant (`panes()[i].cwd`), comme les mods de Herdr ; à défaut
  `folder` du space. Deux spaces sur le même dossier n'en montrent qu'un.
  Les dossiers s'ouvrent à la demande, un niveau à la fois, donc même le
  dossier personnel reste rapide (choix de conception).

## Hors périmètre

- Raccourcis clavier autres que cmd-s.
- Coloration d'autres langages que Markdown et .env (le reste s'ouvre en
  texte simple).
- Aperçu Markdown mis en forme.
- Créer, renommer, supprimer des fichiers depuis l'explorateur.
- Spaces sur une machine distante (Antoine n'en a pas).

## Anti-objectifs

- Perdre une modification : jamais d'écrasement silencieux d'un fichier
  changé sur le disque, jamais de fermeture silencieuse d'un onglet modifié.
- Toucher aux mods ou dispositions fournis par Herdr.

## Comment c'est fabriqué (choix de Claude)

Tout vit dans `~/.config/herdr-app/` (voir `CLAUDE.md` du projet).

- **Mod `antoine`** reçoit : l'explorateur, la vue d'un fichier (éditeur),
  le bouton de l'explorateur dans la barre, et les règles pures des
  fichiers dans un module à part, testé avec Node comme `workspaces.js`.
- **`mods/antoine-tabs/`** : copie du mod `tabs` de Herdr, qui ajoute le
  trait vertical, les onglets de fichiers et le bouton « épingler ».
- **`layouts/antoine.json`** :
  - un bloc `explorer` (mod `antoine`, avec une prop qui dit « explorateur »),
    caché au départ, entre le bloc `workspaces` et `sidebar` ; le bouton fait
    `layout.toggle {id: "explorer"}` ;
  - le bloc `main` (`{ "tab": "active" }`) devient un `stack` à deux enfants :
    les terminaux et la vue de fichier (mod `antoine`) ; changer d'onglet
    fait `layout.select` sur ce stack ;
  - le bloc `tabs` pointe vers `antoine-tabs`.
- **Stockage** : clé partagée `antoine.files` = par workspace, la liste des
  fichiers épinglés, la liste des fichiers temporaires et le fichier
  affiché. Les temporaires sont vidés au démarrage de Herdr. Supprimer un
  workspace supprime ses fichiers.
- **Lecture et écriture** : `readTextFile` et `writeTextFile(path, text,
  expected)` ; `expected` = le texte lu à l'ouverture (ou à la dernière
  sauvegarde), ce qui fait échouer la sauvegarde si le disque a changé.
- **Sélecteur de fichiers** : Herdr n'offre que `pickFolder` ; utiliser
  `exec("osascript", ["-e", "POSIX path of (choose file)"])`. `exec` coupe
  au bout de 30 secondes : Antoine accepte cette limite pour commencer.
- **Démarrage** : les temporaires sont vidés et la zone de travail remise sur
  les terminaux au premier rendu après un vrai démarrage de Herdr, pas après
  un simple rechargement du mod (le constructeur choisit le repère, par
  exemple un marqueur sur `globalThis` ou le PID du processus Herdr).
- **Cas limites** : fichier de plus de 1 Mio, binaire ou disparu → l'onglet
  affiche un message à la place de l'éditeur ; un épinglé disparu reste
  épinglé (on peut le retirer).
- **Coloration** : la liste des langages de l'éditeur n'est pas documentée ;
  vérifier dans l'app ce que donnent Markdown et .env, sinon texte simple.
- Tout passe par la clé partagée `antoine.files` : une copie cachée dans le
  `stack` ne reçoit pas les commandes `<mod>.<commande>`.
- **Éditeur** : `EditorState` + `Editor` de gpui-kit, `language` selon
  l'extension, couleurs de `syntax` tirées de `theme()`.
- **Changement de workspace** : la zone de travail revient aux terminaux du
  space (choix de conception), les onglets de fichiers deviennent ceux du
  nouveau workspace.

## Laissé au constructeur

Largeur de l'explorateur (autour de 260 px), icônes, style du trait et des
onglets de fichiers, place exacte du bouton « épingler » (bout de la zone
des fichiers, par exemple), comment l'explorateur liste les dossiers (s'
inspirer du mod `files` de Herdr), nom de langage reconnu par l'éditeur
pour Markdown et .env. Fermer un onglet modifié demande confirmation.

## Questions ouvertes

Aucune bloquante.
