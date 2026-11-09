// Règles de la partie Git du panneau Outils : changements, branches, touches, messages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir, tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { join } from "node:path";

const P = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/gitpanel.js").href);

const env = { ...process.env, GIT_AUTHOR_NAME: "T", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "T", GIT_COMMITTER_EMAIL: "t@t", GIT_CONFIG_GLOBAL: "/dev/null" };
const run = (cwd, args) => { const r = spawnSync("git", args, { cwd, env, encoding: "utf8" }); return { code: r.status, stdout: r.stdout, stderr: r.stderr }; };
const sh = (cwd, ...args) => { const r = run(cwd, args); assert.equal(r.code, 0, r.stderr); return r.stdout; };
const newRepo = () => { const d = realpathSync(mkdtempSync(join(tmpdir(), "outils-panel-"))); sh(d, "init", "-q", "-b", "main"); return d; };
const changes = (d) => P.parseChanges(sh(d, ...P.STATUS_ARGS));
const branches = (d) => P.parseBranches(sh(d, ...P.BRANCH_ARGS), sh(d, ...P.WORKTREE_ARGS), d, (run(d, P.REFLOG_ARGS).stdout ?? "")); // sans commit, git reflog échoue : la vue passe ""

test("changements : état et indexation", () => {
  const d = newRepo();
  writeFileSync(join(d, "a.txt"), "a"); writeFileSync(join(d, "gone.txt"), "g");
  sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  writeFileSync(join(d, "a.txt"), "a2"); rmSync(join(d, "gone.txt"));
  writeFileSync(join(d, "-n é b.txt"), "x");
  sh(d, "add", "--", "a.txt");
  const c = changes(d);
  assert.deepEqual(c.find((x) => x.path === "a.txt"), { path: "a.txt", kind: "M", staged: true });
  assert.deepEqual(c.find((x) => x.path === "gone.txt"), { path: "gone.txt", kind: "D", staged: false });
  assert.deepEqual(c.find((x) => x.path === "-n é b.txt"), { path: "-n é b.txt", kind: "A", staged: false });
});

test("espace indexe puis retire, même un nom piégé", () => {
  const d = newRepo();
  writeFileSync(join(d, "x.txt"), "x"); sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  writeFileSync(join(d, "-n é b.txt"), "x"); rmSync(join(d, "x.txt"));
  for (const path of ["-n é b.txt", "x.txt"]) {
    const before = changes(d).find((c) => c.path === path);
    assert.deepEqual(P.stageArgs(before).slice(-2), ["--", path]);
    sh(d, ...P.stageArgs(before));
    assert.equal(changes(d).find((c) => c.path === path).staged, true);
    sh(d, ...P.stageArgs(changes(d).find((c) => c.path === path)));
    assert.equal(changes(d).find((c) => c.path === path).staged, false);
  }
});

test("espace sur un fichier en partie indexé l'indexe en entier", () => {
  const d = newRepo();
  writeFileSync(join(d, "a.txt"), "1"); sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  writeFileSync(join(d, "a.txt"), "2"); sh(d, "add", "a.txt"); writeFileSync(join(d, "a.txt"), "3");
  const c = changes(d)[0];
  assert.equal(c.staged, false);
  sh(d, ...P.stageArgs(c));
  assert.equal(changes(d)[0].staged, true);
});

test("dépôt sans commit : indexer, retirer, aucune branche", () => {
  const d = newRepo();
  writeFileSync(join(d, "a.txt"), "a");
  sh(d, ...P.stageArgs(changes(d)[0]));
  assert.equal(changes(d)[0].staged, true);
  sh(d, ...P.stageArgs(changes(d)[0]));
  assert.equal(changes(d)[0].staged, false);
  assert.deepEqual(branches(d), []);
});

test("branches : actuelle et worktree", () => {
  const d = newRepo();
  writeFileSync(join(d, "a.txt"), "a"); sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  sh(d, "branch", "dev");
  const wt = d + "-wt";
  sh(d, "worktree", "add", "-q", "-b", "wt", wt);
  const b = branches(d);
  assert.deepEqual(b.map((x) => x.name).sort(), ["dev", "main", "wt"]);
  assert.equal(b[0].name, "main");
  assert.equal(b.find((x) => x.name === "main").current, true);
  assert.equal(b.find((x) => x.name === "main").worktree, null);
  assert.equal(b.find((x) => x.name === "wt").worktree, wt);
  assert.match(P.refusal("checkout", b.find((x) => x.name === "wt")), /worktree/);
  assert.match(P.refusal("delete", b.find((x) => x.name === "wt")), /worktree/);
  assert.equal(P.refusal("delete", b.find((x) => x.name === "main")), "Impossible de supprimer la branche actuelle");
  assert.equal(P.refusal("checkout", b.find((x) => x.name === "dev")), null);
  assert.equal(P.refusal("checkout", b.find((x) => x.name === "main")), null);
});

test("commandes des branches et du commit", () => {
  assert.deepEqual(P.commitArgs("Mon message"), ["commit", "-m", "Mon message"]);
  assert.deepEqual(P.checkoutArgs("dev"), ["switch", "dev"]);
  assert.deepEqual(P.createArgs("feat/x"), ["switch", "-c", "feat/x"]);
  assert.deepEqual(P.deleteArgs("dev"), ["branch", "-d", "dev"]);
});

test("nom de nouvelle branche", () => {
  assert.equal(P.branchError("", []), "Nom vide");
  assert.equal(P.branchError("  ", []), "Nom vide");
  assert.equal(P.branchError("main", [{ name: "main" }]), "Cette branche existe déjà");
  for (const bad of ["feat x", "a..b", "-a", "a/", "a.lock", "a~b", "a^b", "a:b", "a?b", "a*b", "a[b", "a\\b", "@", "a@{b", ".a", "a/.b", "a."])
    assert.equal(P.branchError(bad, []), "Nom de branche invalide", bad);
  assert.equal(P.branchError("feat/outils-2", []), null);
});

test("touches : seulement dans le cadre actif", () => {
  assert.equal(P.keyAction(null, "space"), null);
  assert.equal(P.keyAction(null, "c"), null);
  assert.equal(P.keyAction("changes", "space"), "stage");
  assert.equal(P.keyAction("changes", "c"), "commit");
  assert.equal(P.keyAction("changes", "n"), null);
  assert.equal(P.keyAction("branches", "space"), "checkout");
  assert.equal(P.keyAction("branches", "n"), "new");
  assert.equal(P.keyAction("branches", "d"), "delete");
  assert.equal(P.keyAction("branches", "c"), null);
  assert.equal(P.keyAction("graph", "c"), null);
  assert.equal(P.keyAction("graph", "down"), "down");
  assert.equal(P.keyAction("changes", "up"), "up");
});

test("message d'erreur de git", () => {
  assert.equal(P.gitMessage({ code: 1, stderr: "error: The branch 'x' is not fully merged.\nhint: blah\n" }), "The branch 'x' is not fully merged.");
  assert.equal(P.gitMessage({ code: 128, stderr: "fatal: not a git repository\n" }), "not a git repository");
  assert.equal(P.gitMessage({ code: 1, stderr: "" }), "La commande git a échoué");
});

test("âge d'un commit, en français et court", () => {
  const now = 1_800_000_000;
  assert.equal(P.ago(now - 20, now), "maintenant");
  assert.equal(P.ago(now - 5 * 60, now), "5 min");
  assert.equal(P.ago(now - 3 * 3600, now), "3 h");
  assert.equal(P.ago(now - 2 * 86400, now), "2 j");
  assert.equal(P.ago(now - 15 * 86400, now), "2 sem");
  assert.equal(P.ago(now - 70 * 86400, now), "2 mois");
  assert.equal(P.ago(now - 800 * 86400, now), "2 ans");
  assert.equal(P.ago(now - 400 * 86400, now), "1 an");
  assert.equal(P.ago(null, now), "");
});

test("dossier suivi : celui du premier terminal du space, sinon son dossier de départ", () => {
  const space = { folder: "/depart", tabs: [{ id: "tb1" }, { id: "tb2" }] };
  const panes = [{ tab: "tb2", cwd: "/autre" }, { tab: "tb1", cwd: null }, { tab: "tb1", cwd: "/repo/sous" }];
  assert.equal(P.spaceFolder(space, panes, "/home"), "/repo/sous");
  assert.equal(P.spaceFolder(space, [], "/home"), "/depart");
  assert.equal(P.spaceFolder({ folder: "", tabs: [] }, [], "/home"), "/home");
});

test("un worktree montre le dépôt principal", () => {
  const d = newRepo();
  writeFileSync(join(d, "a.txt"), "a"); sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  const wt = d + "-wt2";
  sh(d, "worktree", "add", "-q", "-b", "wt2", wt);
  const rootOf = (cwd) => P.mainRoot(sh(cwd, ...P.ROOT_ARGS));
  assert.equal(rootOf(wt), d);
  assert.equal(rootOf(d), d);
  assert.equal(P.mainRoot(""), null);
});

test("lectures en série : une demande pendant une lecture abandonnée est quand même servie", async () => {
  const runs = [];
  let release;
  const read = P.serial(async (n) => { runs.push(n); if (n === 1) await new Promise((r) => { release = r; }); });
  const first = read(1);
  const second = read(2); // pendant la première : mise de côté
  release();
  await first; await second;
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(runs, [1, 2]);
});

test("lectures en série : une erreur n'empêche pas la suivante", async () => {
  const runs = [];
  const read = P.serial(async (n) => { runs.push(n); if (n === 1) throw new Error("x"); });
  await read(1).catch(() => {});
  await read(2);
  assert.deepEqual(runs, [1, 2]);
});

test("branches : ordre de lazygit, date du dernier passage, état distant", () => {
  const remote = realpathSync(mkdtempSync(join(tmpdir(), "outils-remote-")));
  sh(remote, "init", "-q", "--bare", "-b", "main");
  const d = newRepo();
  writeFileSync(join(d, "a.txt"), "a"); sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  sh(d, "remote", "add", "origin", remote);
  sh(d, "push", "-q", "-u", "origin", "main");
  sh(d, "branch", "vieille");
  sh(d, "checkout", "-qb", "dev");
  sh(d, "push", "-q", "-u", "origin", "dev");
  writeFileSync(join(d, "b.txt"), "b"); sh(d, "add", "."); sh(d, "commit", "-qm", "b");
  sh(d, "checkout", "-q", "main");
  const b = branches(d);
  assert.deepEqual(b.map((x) => x.name), ["main", "dev", "vieille"]);
  assert.equal(b[0].current, true);
  assert.equal(typeof b[1].checkedOut, "number");
  assert.equal(b[2].checkedOut, null);
  assert.equal(b[0].sync, "✓");
  assert.equal(b[1].sync, "↑1");
  assert.equal(b[2].sync, "");
});

test("état distant, comme lazygit", () => {
  assert.equal(P.syncText("", ""), "");
  assert.equal(P.syncText("origin/main", ""), "✓");
  assert.equal(P.syncText("origin/main", "ahead 2"), "↑2");
  assert.equal(P.syncText("origin/main", "behind 3"), "↓3");
  assert.equal(P.syncText("origin/main", "ahead 2, behind 3"), "↑2↓3");
  assert.equal(P.syncText("origin/x", "gone"), "gone");
});

test("date courte de la liste des branches", () => {
  const now = 1_800_000_000;
  assert.equal(P.shortAgo(now - 30, now), "30s");
  assert.equal(P.shortAgo(now - 5 * 60, now), "5m");
  assert.equal(P.shortAgo(now - 3 * 3600, now), "3h");
  assert.equal(P.shortAgo(now - 2 * 86400, now), "2d");
  assert.equal(P.shortAgo(now - 15 * 86400, now), "2w");
  assert.equal(P.shortAgo(now - 70 * 86400, now), "2M");
  assert.equal(P.shortAgo(now - 800 * 86400, now), "2y");
  assert.equal(P.shortAgo(null, now), "");
});

test("la branche qu'on quitte compte aussi comme visitée (lazygit)", () => {
  const m = P.parseCheckouts("HEAD@{200}\0checkout: moving from main to dev\nHEAD@{100}\0checkout: moving from dev to main\n");
  assert.equal(m.get("dev"), 200);
  assert.equal(m.get("main"), 200);
});

test("arborescence des changements : dossiers, fichiers, état indexé du dossier", () => {
  const changes = [
    { path: "src/a/x.js", kind: "M", staged: true },
    { path: "src/a/y.js", kind: "A", staged: false },
    { path: "src/b.js", kind: "D", staged: true },
    { path: "README.md", kind: "M", staged: false },
    { path: "docs/only/one.md", kind: "A", staged: true },
  ];
  const rows = P.changeTree(changes);
  assert.deepEqual(rows.map((r) => [r.kind, r.name, r.depth]), [
    ["dir", "docs/only", 0], ["file", "one.md", 1],
    ["dir", "src", 0], ["dir", "a", 1], ["file", "x.js", 2], ["file", "y.js", 2], ["file", "b.js", 1],
    ["file", "README.md", 0],
  ]);
  assert.equal(rows[0].staged, "all");
  assert.equal(rows[2].staged, "some");
  assert.equal(rows[2].path, "src");
  assert.equal(rows[0].path, "docs/only");
  assert.equal(rows[4].change.path, "src/a/x.js");
});

test("espace sur un dossier : tout indexer, ou tout retirer s'il l'est déjà", () => {
  assert.deepEqual(P.stageArgs({ kind: "dir", path: "src", staged: "some" }), ["add", "-A", "--", "src"]);
  assert.deepEqual(P.stageArgs({ kind: "dir", path: "src", staged: "all" }), ["reset", "-q", "--", "src"]);
});

test("la touche ` bascule liste et arbre dans les changements", () => {
  assert.equal(P.keyAction("changes", "`"), "toggleTree");
  assert.equal(P.keyAction("branches", "`"), null);
});

test("PR : ouvertes et fusionnées par branche, l'ouverte d'abord, rien si gh échoue", () => {
  const prs = P.parsePrs(JSON.stringify([
    { headRefName: "feat/outils", isDraft: false, number: 3, url: "u3", state: "OPEN" },
    { headRefName: "feat/outils", isDraft: false, number: 1, url: "u1", state: "MERGED" },
    { headRefName: "wip", isDraft: true, number: 7, url: "u7", state: "OPEN" },
    { headRefName: "vieille", isDraft: false, number: 2, url: "u2", state: "MERGED" },
    { headRefName: "abandon", isDraft: false, number: 4, url: "u4", state: "CLOSED" },
  ]));
  assert.deepEqual(prs.get("feat/outils"), { number: 3, draft: false, url: "u3", state: "open" });
  assert.equal(prs.get("wip").draft, true);
  assert.deepEqual(prs.get("vieille"), { number: 2, draft: false, url: "u2", state: "merged" });
  assert.equal(prs.has("abandon"), false);
  assert.equal(P.parsePrs("pas du json").size, 0);
  assert.equal(P.parsePrs("").size, 0);
  assert.deepEqual(P.PR_ARGS, ["pr", "list", "--state", "all", "--json", "number,headRefName,isDraft,url,state", "--limit", "200"]);
});

test("branche distante supprimée après fusion : vue après un fetch --prune", () => {
  assert.deepEqual(P.FETCH_ARGS, ["fetch", "--all", "--prune", "--quiet"]);
  const remote = realpathSync(mkdtempSync(join(tmpdir(), "outils-gone-")));
  sh(remote, "init", "-q", "--bare", "-b", "main");
  const d = newRepo();
  writeFileSync(join(d, "a.txt"), "a"); sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  sh(d, "remote", "add", "origin", remote);
  sh(d, "push", "-q", "-u", "origin", "main");
  sh(d, "checkout", "-qb", "feat"); sh(d, "push", "-q", "-u", "origin", "feat");
  sh(remote, "branch", "-D", "feat"); // supprimée côté distant, comme GitHub après la fusion
  assert.equal(branches(d).find((b) => b.name === "feat").sync, "✓");
  sh(d, ...P.FETCH_ARGS);
  assert.equal(branches(d).find((b) => b.name === "feat").sync, "gone");
});
