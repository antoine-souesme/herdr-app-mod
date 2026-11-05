# Registre des copies de Herdr

Tout ce qu'Antoine a repris de Herdr, et ce qu'il y a ajouté. C'est la référence
pour reporter une mise à jour de Herdr sans rien perdre : chaque ajout listé ici
doit encore marcher après le report.

**Tenir à jour :** tout changement d'une copie (nouvel ajout, ajout retiré) met
ce registre à jour dans le même changement. Une nouvelle copie y entre avec son
original, et l'original entre dans `ORIGINALS` de `upstream.sh`.

Chemins relatifs à `~/.config/herdr-app/`. Référence des originaux : `upstream/`
à la racine du dépôt.

## 1. `mods/antoine-agents/` ← `mods/agents/`

Ajouts d'Antoine :
- **Filtre par workspace** (`render`, juste après `let list = agents()`) : ne montre
  que les agents des spaces du workspace ouvert, plus ceux des spaces qu'aucun
  workspace ne tient encore. Lit l'état partagé `antoine.workspaces`.
- **Menu de tri** : `openOverlay({ mod: "antoine-agents", … sortMenu })` au lieu de
  `mod: "agents"`, pour que le menu s'ouvre dans la copie.
- **Nom du space sur chaque ligne** (`row`, `const full = true`) : une ligne
  d'agent dit toujours « space · détail », même sous un en-tête de space
  (l'original ne le fait qu'en tri par priorité et pour les épinglés).
- **Tri « Ordre des spaces »** (`SORTS`, `id: "spaces"`) : une seule liste sans
  en-têtes, triée par l'ordre de `spaces()` (dans `render` avant le tri par
  priorité, et `rows`) ; menu de tri passé de 140 à 175 px de haut.
- **Sous-agents internes de Claude Code** (repris de herdr-paddock, Apache-2.0, sans
  Codex) : `hooks/subagents.sh`, branché dans `~/.claude/settings.json` (SubagentStart,
  SubagentStop, StopFailure, SessionStart, SessionEnd, en `async`), pose une étiquette
  `antoine.sub.<id>` sur le terminal de l'agent. `subs.js` (pur, testé) la lit ; dans
  `main.js`, méthodes `subs`, `subStatus`, `hookRow`, `this.hooked` dans `render`, et
  `subRow`, `withKids`, `fold`, `urgency` passent par `subs` au lieu de `tree`.
- **Retour aux terminaux au clic sur un agent** (`focusAgent`, avant `clean`) :
  les trois `run("pane.focus", …)` des lignes d'agent et de sous-agent passent par
  `focusAgent`, qui remet `shown` à `null` dans `antoine.files` pour le workspace
  ouvert, puis donne le focus au terminal de l'agent.
- `mod.json` : `cloned_from` (laissé par `mod.clone`).

## 2. `mods/antoine-spaces/` ← `mods/spaces/`

Ajouts d'Antoine :
- **Filtre par workspace** : fonction `visibleIds(ids)` (même règle que
  `visibleSpaceIds` dans `mods/antoine/workspaces.js`), appliquée dans `ordered()`
  au filtre final seulement : le rangement des worktrees (`space.move`, Herdr 0.1.13)
  se calcule sur tous les spaces, pour ne pas déplacer ceux des autres workspaces.
- **Workspace vide** : quand aucun space n'est visible, un bloc « Aucun space » avec
  un bouton « Nouveau space » (`run("space.new")`) au lieu d'une liste vide.
- `mod.json` : `cloned_from`.

## 3. `mods/antoine/tabbar.js` ← `mods/tabs/main.js` (+ `win-*.svg`)

Copie devenue une classe du mod `antoine` (`TabBar`, choisie par `props().view === "tabs"`).
Ajouts d'Antoine :
- **Onglets de fichiers** (`FileTabs` de `filetabs.js`) : affichés après les onglets
  de terminaux ; quand un fichier est affiché, aucun onglet de terminal n'a l'air
  actif ni sa croix ; cliquer un onglet de terminal revient aux terminaux
  (`this.files.toTerminals()`).
- **Croix des onglets de terminaux** : présente sur chaque onglet, mais invisible
  et sans effet hors de l'onglet actif, pour que changer d'onglet ne décale pas
  les autres (Herdr ne l'ajoute qu'à l'onglet actif).
- **Dépôt de fichiers du Finder** : `.on_drop` sur la racine de la barre appelle
  `dropFiles`, qui garde les fichiers (pas les dossiers) et les ouvre comme
  l'explorateur (`openFiles` de `files.js`, le dernier est affiché) ; tous
  entrent dans les fichiers récents de `cmd-p` (`rememberAll` de `filestore.js`).
- Plus de `export default class … extends View` : `export class TabBar` avec
  `constructor(_props, cx)`.
- Icônes de fenêtre Windows lues dans `mods/antoine/win-*.svg` (copies identiques).

## 4. `layouts/antoine.json` ← `layouts/main.json`

Ajouts d'Antoine (par `id` de bloc) :
- `workspaces` (nouveau, première colonne, 72 px) : la barre des workspaces, mod `antoine`.
- `explorer` (nouveau, caché par défaut, 180 à 480 px) : mod `antoine`, `view: "explorer"`.
- `spaces` → mod `antoine-spaces` ; `agents` → mod `antoine-agents` ;
  `tabs` → mod `antoine`, `view: "tabs"`.
- `work-stack` (nouveau, pile autour de `main`) avec `file-view` (mod `antoine`,
  `view: "file"`) : l'éditeur de fichiers à la place des terminaux.
- Racine : `resizable: true`, `cloned_from`.

## 5. `themes/antoine-monokai.json` ← `themes/monokai.json`

Ajouts d'Antoine : blancs adoucis — `foreground` `#d0d0c8` (au lieu de `#f8f8f2`),
`ansi[7]` `#c4c4be` (au lieu de `#e3e3dd`), `ansi[15]` `#d8d8d2` (au lieu de `#f8f8f2`).
Tout le reste suit `monokai`.

## 6. Code repris dans des fichiers d'Antoine

- `mods/antoine/explorer.js`, constante `SCRIPT` ← listage de `mods/files/main.js`
  (type et nom séparés par NUL, `.git` sauté, 500 au plus). Ajouts autour : fichiers
  masqués comme VS Code (`EXCLUDED`), grisé de ce que git ignore, couleurs git.
- `mods/antoine/spinner.svg` ← `mods/workspace-chrome/spinner.svg` (copie identique).
- `mods/antoine/explorer.js`, classe `ExplorerTrash` : écrite sur le modèle de
  `mods/confirm/main.js` (mêmes touches Entrée / Échap, même allure), textes en français.
- `mods/antoine/quickopenview.js` (recherche de fichiers, `cmd-p`) : défilement à la
  molette et suivi de la sélection repris de `mods/picker/main.js`, liste à hauteur de ligne fixe.

## 7. Raccourcis : `keys.json`, section `layout:antoine`

`cmd-s` → `antoine.save`, `cmd-w` → `antoine.close`, `cmd-p` → `antoine.quickopen`
(remplace, dans cette disposition, le `cmd-p` de Herdr qui ouvre `picker`). Le reste du fichier est celui de
Herdr ; vérifier après une mise à jour que la section `layout:antoine` est toujours là.

## 8. Fichiers de Herdr utilisés tels quels (à vérifier qu'ils existent encore)

Le mod `antoine` et ses copies dessinent ces icônes de Herdr sans les copier :
`upstream.sh check` signale celles qui ont disparu.
