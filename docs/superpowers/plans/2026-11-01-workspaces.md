# Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Discord-style workspaces (groups of spaces) to Herdr, through Antoine's personal mod `antoine`.

**Architecture:** A pure logic module (`workspaces.js`, no `herdr` import, unit-tested with Node) holds every rule. The `antoine` mod draws the workspace bar, its menu and dialogs, and reconciles the stored state with Herdr's live spaces on every render. Clones of the shipped `spaces` and `agents` mods filter on the open workspace; a clone of the `main` layout puts the bar on the far left.

**Tech Stack:** Herdr mods (gpui-kit JavaScript, `herdr` module), Node 24 `node:test` for the pure module.

**Spec:** `docs/superpowers/specs/2026-11-01-workspaces-design.md`

**Before starting, read:** `~/.config/herdr-app/AGENTS.md` (sections Layouts, Mods, The `herdr` module), `~/.config/herdr-app/herdr.d.ts`, and the shipped mods `spaces`, `agents`, `confirm`, `prompt` as examples.

## Global Constraints

- Everything lives in `~/.config/herdr-app/` (written `$H` below). Never edit a shipped mod or layout (`spaces`, `agents`, `main`, …): Herdr overwrites them on start.
- Names: mod `antoine`, layout `antoine`, clones `antoine-spaces` and `antoine-agents`. Shared keys start with `antoine.`.
- Stored state: one shared key `antoine.workspaces` = `{ list: [{ id, name, emoji, spaces: string[], lastSpace: string|null }], active: string, seen: string|null }`.
- First run: every existing space goes into workspace `{ name: "Pro", emoji: "💼" }`.
- Colors from `theme()` only; no timer for drawing (native `.frames`/`.loop` if animating).
- No git repository exists here: there are no commit steps. Do not create one.
- UI text in French, with accents.
- Done means: `herdr-app check $H/mods/<name>` passes for every touched mod, `herdr-app status` shows no errors, and the behavior was tried in the running app (`herdr-app shot` to look).

## Review Focus

1. Closing the last space of the open workspace: Herdr shows a space of another workspace; the bar must stay on the (now empty) workspace, not jump.
2. Clicking a notification for an agent in another workspace: the bar must switch to that workspace.
3. A space just created (by `+`, `cmd-n`, the worktree dialog) is briefly unassigned: the clones must show it at once, and it must land in the open workspace, never another.
4. The shipped `spaces` mod uses indexes into `spaces()` for drag and reorder: after filtering, drag must still move the right space (or drag is disabled in the clone).
5. Deleting a workspace whose spaces have running agents closes them all, without one extra Herdr confirmation per space, and leaves the bar on a neighbor workspace.

Items 1–3 and 5 are pinned by tests in Task 1; item 4 by a manual check in Task 4.

---

### Task 1: Pure workspace logic

**Files:**
- Create: `$H/mods/antoine/workspaces.js`
- Test: `tests/workspaces.test.mjs` (in this project folder, outside `$H` so saving it doesn't reload the mod)

**Interfaces:**
- Produces (all pure, never mutate their input, return new objects):
  - `initialState(spaceIds: string[]) -> State` — one workspace "Pro" 💼 holding all ids, active, `seen: null`.
  - `reconcile(state: State|null, spaceIds: string[], activeSpaceId: string|null) -> { state: State, select: string|null }` — `null` state means first run (calls `initialState`).
  - `switchTo(state, wsId) -> { state, select: string|null }` — `select` = target's `lastSpace` if it still holds it, else its first space, else null.
  - `create(state, name: string, emoji: string) -> { state, id }` — appends, makes it active.
  - `rename(state, wsId, name) -> State`, `setEmoji(state, wsId, emoji) -> State`.
  - `remove(state, wsId) -> { state, close: string[], select: string|null }` — refuses (returns state unchanged, `close: []`) when it is the last workspace; new active = the next workspace in the list, else the previous.
  - `visibleSpaceIds(state, spaceIds) -> Set<string>` — the open workspace's spaces plus any id no workspace holds.
  - `statusOf(ws, spaces: {id, status}[]) -> "blocked"|"done"|"working"|"idle"|null` — most urgent, order blocked > done > working > idle.
  - ids for new workspaces: `"ws-" + Date.now().toString(36)` plus a counter if taken.

`reconcile` rules, in this order:
1. Remove from every workspace the ids not in `spaceIds`; remember which ones left the **open** workspace (`closedHere`).
2. Add every id no workspace holds to the open workspace.
3. If `activeSpaceId !== state.seen` (Herdr's shown space changed):
   - if it belongs to another workspace and `closedHere` is empty → that workspace becomes active (following a notification, `space.next`, …);
   - if it belongs to another workspace and `closedHere` is not empty → stay; `select` = the open workspace's `lastSpace` if still there, else its first space, else null (the workspace stays open, empty).
4. If the open workspace holds `activeSpaceId`, set its `lastSpace` to it.
5. `seen = activeSpaceId`.

- [ ] **Step 1: Write the failing tests** with `node:test` and `assert/strict`, importing `$H/mods/antoine/workspaces.js` by absolute path (`os.homedir()` + `/.config/herdr-app/mods/antoine/workspaces.js`, via `pathToFileURL`):
  - `first run puts every space in Pro 💼`: `reconcile(null, ["a","b"], "a")` → one workspace, name `"Pro"`, emoji `"💼"`, spaces `["a","b"]`, active is it, `lastSpace` `"a"`, `select` null.
  - `new space lands in the open workspace`: Pro{a}, Perso{b} with Perso open, `reconcile(s, ["a","b","c"], "c")` → Perso spaces `["b","c"]`, active Perso.
  - `follows a shown space from another workspace`: Pro{a}, Perso{b}, Perso open, seen `"b"`; `reconcile(s, ["a","b"], "a")` → active Pro, `select` null.
  - `closing a space stays in its workspace`: Pro{a}, Perso{b,c}, Perso open, seen `"c"`, lastSpace `"c"`; `reconcile(s, ["a","b"], "a")` → active Perso, `select` `"b"`.
  - `closing the last space keeps the workspace open and empty`: Pro{a}, Perso{b}, Perso open, seen `"b"`; `reconcile(s, ["a"], "a")` → active Perso, Perso spaces `[]`, `select` null; then `reconcile(that, ["a"], "a")` → still Perso (no change of shown space, no jump).
  - `switchTo returns the last space`: Pro{a,b} lastSpace `"b"` → `switchTo(s, proId).select === "b"`; empty workspace → `select` null.
  - `create makes it active and empty`: `create(s, "Perso", "🏡")` → new workspace last in list, active, spaces `[]`.
  - `remove closes its spaces and opens the neighbor`: Pro{a}, Perso{b,c}, Perso open → `remove(s, persoId)` → `close` `["b","c"]`, active Pro, `select` `"a"`, Perso gone.
  - `remove refuses the last workspace`: one workspace → `close` `[]`, list unchanged.
  - `rename and setEmoji` change only that workspace.
  - `visibleSpaceIds includes unassigned ids`: Pro{a}, Perso{b}, Pro open → `visibleSpaceIds(s, ["a","b","z"])` is `{a, z}`.
  - `statusOf picks the most urgent`: spaces `[{id:"a",status:"working"},{id:"b",status:"blocked"}]` in ws → `"blocked"`; none → null.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/workspaces.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `$H/mods/antoine/workspaces.js`** as named ES exports with the signatures above. No `herdr` or `gpui-kit` import, so Node can load it. Create `$H/mods/antoine/mod.json` with `{ "place": "none" }` in the same step so Herdr doesn't dock the folder anywhere when it first sees it.

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test tests/workspaces.test.mjs`
Expected: all tests pass.

---

### Task 2: The workspace bar (`antoine` mod)

**Files:**
- Create: `$H/mods/antoine/main.js`, `$H/mods/antoine/bar.js` (the bar view helpers), `$H/mods/antoine/plus.svg` (copy `$H/mods/workspace-chrome/plus.svg`)

**Interfaces:**
- Consumes: everything from Task 1.
- Produces:
  - Shared key `antoine.workspaces` kept in sync (see Global Constraints).
  - `main.js` default class renders the bar when `props()` has no `dialog`/`menu`; Task 3 adds those branches to the same class.
  - Helper in `main.js`: `save(next)` → `setShared("antoine.workspaces", next)` only when `JSON.stringify` differs from the current value (prevents a render loop).

- [ ] **Step 1: Write `main.js` / `bar.js`.** On each render: `const r = reconcile(shared("antoine.workspaces") ?? null, spaces().map(s => s.id), spaces().find(s => s.active)?.id ?? null)`; `save(r.state)`; if `r.select` and it differs from the active space, `run("space.select", { id: r.select })`. Draw a vertical column (width = the block, full height, background `chrome`), top padding 40 px on macOS (`window()?.platform === "macos"`) to clear the traffic lights, else 8 px. One 40×40 rounded pastille per workspace, emoji at ~22 px, `.id("ws-" + w.id)`; the open one gets a `selected` background and a 3 px `accent` bar on its left edge (Discord's pill); hover `hover`. A 10 px dot at its bottom-right in `theme()[statusOf(w, spaces())]` when that status is `blocked` or `done`. Left click: `const r = switchTo(state, w.id); save(r.state); if (r.select) run("space.select", { id: r.select })`. Right click: leave a `// Task 3` hook calling `this.openMenu(w, event)`. Bottom: a 40×40 `+` button (`svg("mods/antoine/plus.svg")`) calling `this.openCreate()` (Task 3; stub to a `console.log` here). Tooltip-free; the name shows on hover through `.tooltip` only if `gpui-kit.d.ts` offers one, else skip.

- [ ] **Step 2: Check it loads**

Run: `herdr-app check ~/.config/herdr-app/mods/antoine`
Expected: exit 0, no error.

(The bar becomes visible in Task 5, when the layout shows it. To try it earlier: `herdr-app do mod.open --name antoine`.)

---

### Task 3: Menu and dialogs (create, rename, emoji, delete)

**Files:**
- Modify: `$H/mods/antoine/main.js`
- Create: `$H/mods/antoine/dialogs.js`

**Interfaces:**
- Consumes: `create`, `rename`, `setEmoji`, `remove`, `save` (Tasks 1–2).
- Produces: the same `antoine` mod opened as an overlay with props `{ menu: true, ws }` (popup) or `{ dialog: "create" | "rename" | "emoji" | "delete", ws? }` (dialog). The overlay copy reads and writes `antoine.workspaces` itself; nothing goes through `nextCommand` (it carries no arguments).

- [ ] **Step 1: Right-click menu.** `openMenu(w, e)` → `openOverlay({ mod: "antoine", kind: "popup", width: 200, height: 130, at: <pointer position from e>, props: { menu: true, ws: w.id } })`. The menu shows « Renommer », « Changer l'emoji », « Supprimer » (this last one in `blocked` color, hidden when only one workspace exists). Each item closes the popup and opens the matching dialog.

- [ ] **Step 2: Dialogs** in `dialogs.js`, styled like `$H/mods/prompt/main.js` and `$H/mods/confirm/main.js` (Esc cancels, Enter confirms, buttons « Annuler » / « Valider »), `kind: "dialog"`, width 360:
  - `create`: title « Nouveau workspace », two inputs « Nom » and « Emoji » (free text, default emoji `"📁"`). Valider (non-empty name) → `const r = create(state, name, emoji); save(r.state); run("space.new")` (the new space then lands in it through `reconcile`).
  - `rename`: title « Renommer le workspace », input « Nom » prefilled → `save(rename(...))`.
  - `emoji`: title « Changer l'emoji », input prefilled → `save(setEmoji(...))`.
  - `delete`: title « Supprimer « <nom> » ? », detail « Ses N spaces et leurs agents seront fermés. » → `const r = remove(state, ws); save(r.state); for (const id of r.close) run("space.close", { id, confirmed: true }); if (r.select) run("space.select", { id: r.select })`. Save before closing, so `reconcile` never sees the closed ids as belonging to the open workspace.

- [ ] **Step 3: Check it loads**

Run: `herdr-app check ~/.config/herdr-app/mods/antoine`
Expected: exit 0.

---

### Task 4: Filtered clones of the spaces and agents lists

**Files:**
- Create (by command): `$H/mods/antoine-spaces/`, `$H/mods/antoine-agents/`
- Modify: their `main.js`

**Interfaces:**
- Consumes: shared `antoine.workspaces` (Task 1 shape). Cross-mod imports are not guaranteed, so each clone carries a small inline copy of `visibleSpaceIds` (same rule: the open workspace's spaces plus unassigned ids; everything when the key is missing).

- [ ] **Step 1: Clone**

Run: `herdr-app do mod.clone '{"name":"spaces","as":"antoine-spaces"}'` then the same for `agents` → `antoine-agents`.
Expected: both folders exist, no `{ "error" }`.

- [ ] **Step 2: Filter `antoine-spaces`.** Wherever the list of shown spaces is built (`ordered()` and the compact rail; grep `spaces()`), keep only ids in `visibleSpaceIds`. Index-based code (drag/reorder uses `spaces()[i]` and `space.move` with an index) must keep working on the full `spaces()` indexes: map a row back to its real index, or turn drag off in the clone if that is not simple. When the open workspace has no visible space, show a centered « Aucun space » line and a button « Nouveau space » running `space.new`.

- [ ] **Step 3: Filter `antoine-agents`.** Right after `let list = agents();`, keep agents whose `space` is visible. `setAgentOrder` then receives the filtered list, so `agent.next`/`prev` stay inside the workspace.

- [ ] **Step 4: Check both**

Run: `herdr-app check ~/.config/herdr-app/mods/antoine-spaces && herdr-app check ~/.config/herdr-app/mods/antoine-agents`
Expected: both exit 0.

---

### Task 5: The `antoine` layout, then trying it all

**Files:**
- Create (by command): `$H/layouts/antoine.json`
- Modify: it

- [ ] **Step 1: Clone the layout**

Run: `herdr-app do layout.clone '{"name":"main","as":"antoine"}'`
Expected: `$H/layouts/antoine.json` exists, the window switches to it.

- [ ] **Step 2: Edit `antoine.json`.** Add as the first child of `root` a block `{ "id": "workspaces", "type": "block", "size": { "px": 60 }, "resizable": false, "background": "chrome", "window_drag": true, "content": { "mod": "antoine" } }`. Point block `spaces` to `antoine-spaces` and block `agents` to `antoine-agents`. Leave `traffic_lights` at `[12, 16]` (they now sit over the bar's top padding).

- [ ] **Step 3: Check files**

Run: `cat ~/.config/herdr-app/layout.error 2>/dev/null; herdr-app status`
Expected: no `layout.error`, `layout: "antoine"`, `errors: []`.

- [ ] **Step 4: Try it in the app** (with `herdr-app shot` to look at each state):
  - the bar shows 💼 Pro with all current spaces in the list;
  - `+` → create « Perso » 🏡 → the bar switches, a new space appears, Pro's spaces are gone from the list;
  - click 💼 → back to Pro on the space last used there;
  - in Perso, start an agent (`herdr-app do tab.new --argv '["claude"]'`), switch to Pro: the agent is not in the list; when it finishes, the toast shows, the 🏡 pastille gets a dot, clicking the toast switches to Perso;
  - close Perso's last space → the bar stays on Perso, list shows « Aucun space » and the button;
  - right click 🏡 → rename, change emoji, then delete → its spaces close, the bar is on Pro;
  - drag a space in the list: the right one moves.

Expected: every point holds; `herdr-app status` still `errors: []`.
