# Workspaces dans Herdr — conception

Date : 2026-11-01 · Demandeur : Antoine

## Intention

Antoine veut séparer ses projets personnels et ses projets professionnels dans
Herdr. Il ajoute un niveau au-dessus des spaces : le **workspace**. Un workspace
contient des spaces (et donc leurs agents). On en ouvre un seul à la fois ;
le reste de la fenêtre n'affiche que le sien.

C'est aussi la première brique du **mod de personnalisation personnel
d'Antoine** : le mod `antoine` recevra plus tard d'autres réglages et
ajouts. Son nom ne doit donc pas parler de workspaces.

## Ce que voit et fait Antoine

- Une **barre verticale tout à gauche de la fenêtre**, à la manière de la
  barre des serveurs de Discord. Chaque workspace y est une pastille
  portant **un emoji**. Le workspace ouvert est mis en évidence.
- **Changer de workspace** : un clic sur sa pastille. La liste des spaces et
  la liste des agents n'affichent alors que les spaces de ce workspace et
  leurs agents. Le workspace rouvre le dernier space qu'Antoine y regardait
  (choix de conception).
- **Créer un workspace** : un bouton « + » en bas de la barre ; Herdr demande
  un nom et un emoji (supposition validée).
- **Clic droit sur une pastille** : un petit menu avec « Renommer »,
  « Changer l'emoji » et « Supprimer » (décision d'Antoine).
- **Supprimer un workspace** : depuis ce menu, confirmation, puis **tous ses
  spaces sont fermés, agents compris**. On ne peut pas supprimer le dernier workspace restant (choix de
  conception).
- **Nouveau space** : il se range automatiquement dans le workspace ouvert.
- **Pas de déplacement** d'un space d'un workspace à un autre (décision
  d'Antoine).
- **Agents des autres workspaces** : ils continuent de tourner. Antoine
  **veut être prévenu** quand l'un d'eux termine ou l'attend : les
  notifications et sons habituels de Herdr restent actifs. Cliquer sur une
  notification bascule dans le bon workspace. Une pastille de statut sur
  l'emoji signale qu'un agent de ce workspace attend ou a fini (supposition
  validée).
- **Premier lancement** : tous les spaces existants vont dans un premier
  workspace, nommé « Pro » avec l'emoji 💼 (choix de conception), qu'Antoine
  renomme par le menu du clic droit.
- **Workspace vide** : quand Antoine ferme le dernier space d'un workspace,
  il reste dans ce workspace : la liste des spaces est vide et propose un
  bouton pour créer un space. La barre ne bascule pas toute seule vers un
  autre workspace (décision d'Antoine). Plus généralement, quand Antoine
  ferme un space, on revient sur un autre space du même workspace s'il en
  reste un, pour éviter les sauts entre workspaces.

## Hors périmètre

- Raccourcis clavier pour changer de workspace (« on verra plus tard »).
- Déplacer un space d'un workspace à l'autre.

## Anti-objectifs

- Toucher aux mods ou à la disposition fournis par Herdr : ils sont écrasés à
  chaque démarrage. Tout passe par des copies.
- Couper les notifications des workspaces non ouverts.

## Comment c'est fabriqué (choix de Claude)

Tout vit dans `~/.config/herdr-app/` et se recharge à chaud.

- **`mods/antoine/`** : le mod personnel. Pour l'instant, la barre des
  workspaces. Il sera enrichi plus tard.
- **`layouts/antoine.json`** : copie de la disposition `main`
  (`herdr-app do layout.clone '{"name":"main","as":"antoine"}'`), avec une
  colonne étroite à gauche de `sidebar` qui affiche le mod `antoine`, et les
  blocs `spaces` et `agents` pointés vers les copies ci-dessous.
- **`mods/antoine-spaces/`** et **`mods/antoine-agents/`** : copies de
  `spaces` et `agents` (`mod.clone`), filtrées sur les spaces du workspace
  ouvert. `antoine-agents` appelle `setAgentOrder` avec la liste filtrée, pour
  que `agent.next` / `agent.prev` restent dans le workspace.
- **Stockage** : l'état partagé de Herdr (`shared` / `setShared`), sous une
  clé du mod `antoine`, par exemple `antoine.workspaces` :
  liste ordonnée de `{ id, name, emoji, spaces: [spaceId…], lastSpace }` et
  `antoine.workspace.active`.
- **Le workspace ouvert suit le space affiché** : quand le space actif
  appartient à un autre workspace (clic sur une notification, `space.next`,
  `ctrl-1`…), la barre bascule sur ce workspace. Exception : juste après la
  fermeture d'un space du workspace ouvert, Herdr affiche un space voisin ;
  le mod ne bascule pas, il resélectionne un space du workspace ouvert, ou
  reste sur le workspace vide s'il n'en reste aucun. Cela règle le clic sur les
  notifications sans modifier le mod `toast`.
- **Rangement des nouveaux spaces** : tout space qui n'appartient à aucun
  workspace est rangé dans le workspace ouvert. Les identifiants de spaces
  disparus sont retirés.
- **Créer un workspace** crée aussi son premier space (`space.new`), pour
  qu'un workspace ne soit jamais vide à l'ouverture (choix de conception).
- **Supprimer** ferme chaque space avec `space.close {id, confirmed: true}`
  après une confirmation unique (dialogue via le mod `confirm` ou propre au
  mod `antoine`).
- Couleurs via `theme()`, animations natives, aucun minuteur pour l'affichage.
- Vérification : `herdr-app check` sur chaque mod, `herdr-app status` sans
  erreur, capture `herdr-app shot` pour contrôler le rendu.

## Laissé au constructeur

Largeur exacte de la barre (autour de 56–64 px), style des pastilles, place
précise des traffic lights macOS (la barre est désormais le bord gauche :
décaler `traffic_lights` ou laisser de la place en haut de la barre),
comportement de la barre latérale repliée, choix de l'emoji (saisie libre).

## Questions ouvertes

Aucune bloquante.
