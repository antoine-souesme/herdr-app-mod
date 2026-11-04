# Personnalisation de Herdr (mod `antoine`)

Ce dossier sert à personnaliser l'app Herdr d'Antoine. Le code ne vit pas ici :
il vit dans la configuration de Herdr, `~/.config/herdr-app/`, que l'app
recharge à chaud. Lis d'abord `~/.config/herdr-app/AGENTS.md` (le manuel de
Herdr), puis `herdr.d.ts` et `gpui-kit.d.ts` dans ce même dossier pour l'API.

## Ce qui est à Antoine

- `~/.config/herdr-app/mods/antoine/` : le mod personnel. Toute nouvelle
  personnalisation va ici. Il contient déjà les workspaces (barre d'emojis à
  gauche, menu, dialogues) :
  - `workspaces.js` : les règles, pures, sans import de `herdr` (testées avec Node) ;
  - `store.js` : lecture et écriture de l'état partagé `antoine.workspaces` ;
  - `main.js` : la barre ; `dialogs.js` : menu du clic droit et dialogues.
  - `main.js` choisit aussi la partie à dessiner selon `props().view` :
    `tabs` (`tabbar.js`, copie du mod `tabs` de Herdr + `filetabs.js`),
    `file` (`fileview.js`, l'éditeur), `explorer` (`explorer.js`).
  - `files.js` : règles pures des onglets de fichiers ; `filestore.js` : état
    partagé `antoine.files` ; `icons.js` + `material.js` + `icons/material/` :
    icônes du thème Material Icon de VS Code (MIT).
  - `quickopen.js` : règles pures de la recherche de fichiers (`cmd-p`) et des
    fichiers récents (état partagé `antoine.recent`) ; `quickopenview.js` : sa fenêtre.
  - Herdr refuse qu'un mod importe un fichier d'un autre mod : tout ce qui
    partage du code reste dans `antoine`.
- `~/.config/herdr-app/mods/antoine-spaces/` et `antoine-agents/` : copies
  des mods `spaces` et `agents` de Herdr, filtrées sur le workspace ouvert.
- `~/.config/herdr-app/layouts/antoine.json` : la disposition d'Antoine
  (copie de `main` avec la barre des workspaces).

## Règles

- Ne modifie jamais un mod ou une disposition fournis par Herdr : ils sont
  écrasés à chaque démarrage. Duplique-les (`mod.clone`, `layout.clone`) avec
  un nom `antoine-…`. Les clés de l'état partagé commencent par `antoine.`.
- Tout ce qui est repris de Herdr (copie de mod, de disposition, de thème, ou
  code recopié) est décrit dans `.claude/skills/sync/COPIES.md`,
  avec chaque ajout d'Antoine. Un ajout ou un retrait dans une copie met ce
  registre à jour dans le même changement.
- Garde les règles dans des modules purs et teste-les ici : `tests/`, lancés
  avec `node --test tests/*.test.mjs`. Les tests restent hors de `~/.config/herdr-app`,
  pour ne pas recharger le mod à chaque sauvegarde.
- Après chaque changement : `herdr-app check ~/.config/herdr-app/mods/<mod>`,
  puis `herdr-app status` (aucune erreur), puis essai dans l'app
  (`herdr-app shot` pour voir la fenêtre).
- Textes de l'interface en français, avec les accents. Couleurs via `theme()`.
- En cas de souci : `ctrl-alt-shift-escape` remet la disposition par défaut.

## Ce dossier

- `docs/superpowers/specs/` : documents de conception ; `docs/superpowers/plans/` : plans.
- `tests/` : tests des modules purs du mod `antoine`.
- `upstream/` : les originaux de Herdr tels qu'au dernier report dans les copies.
  Après une mise à jour de Herdr, skill `sync`.
