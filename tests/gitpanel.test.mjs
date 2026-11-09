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
const branches = (d) => P.parseBranches(sh(d, ...P.BRANCH_ARGS), sh(d, ...P.WORKTREE_ARGS), d);

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
  assert.deepEqual(b.map((x) => x.name), ["dev", "main", "wt"]);
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
