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
- **Sous-agents internes de Claude Code** (repris de herdr-paddock, Apache-2.0, sans
  Codex) : `hooks/subagents.sh`, branché dans `~/.claude/settings.json` (SubagentStart,
  SubagentStop, StopFailure, SessionStart, SessionEnd, en `async`), pose une étiquette
  `antoine.sub.<id>` sur le terminal de l'agent. `subs.js` (pur, testé) la lit ; dans
  `main.js`, méthodes `subs`, `subStatus`, `hookRow`, `this.hooked` dans `render`, et
  `subRow`, `withKids`, `fold`, `urgency` passent par `subs` au lieu de `tree`.
- `mod.json` : `cloned_from` (laissé par `mod.clone`).

## 2. `mods/antoine-spaces/` ← `mods/spaces/`

Ajouts d'Antoine :
- **Filtre par workspace** : fonction `visibleIds(ids)` (même règle que
  `visibleSpaceIds` dans `mods/antoine/workspaces.js`), appliquée dans `ordered()`.
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

## 7. Raccourcis : `keys.json`, section `layout:antoine`

`cmd-s` → `antoine.save`, `cmd-w` → `antoine.close`. Le reste du fichier est celui de
Herdr ; vérifier après une mise à jour que la section `layout:antoine` est toujours là.

## 8. Fichiers de Herdr utilisés tels quels (à vérifier qu'ils existent encore)

Le mod `antoine` et ses copies dessinent ces icônes de Herdr sans les copier :
`upstream.sh check` signale celles qui ont disparu.
