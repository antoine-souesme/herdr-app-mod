// Historique et lignes du graphe du panneau Outils (repris de herdr-git-graph).
import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir, tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = homedir() + "/.config/herdr-app/mods/antoine/";
const G = await import(pathToFileURL(dir + "gitlog.js").href);
const L = await import(pathToFileURL(dir + "lanes.js").href);

const env = { ...process.env, GIT_AUTHOR_NAME: "T", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "T", GIT_COMMITTER_EMAIL: "t@t", GIT_CONFIG_GLOBAL: "/dev/null" };
const sh = (cwd, ...args) => execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const out = (cwd, args) => { const r = spawnSync("git", args, { cwd, env, encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
const commit = (cwd, msg) => { writeFileSync(join(cwd, `${msg}.txt`), msg); sh(cwd, "add", "."); sh(cwd, "commit", "-qm", msg); };

const repo = mkdtempSync(join(tmpdir(), "outils-gitlog-"));
sh(repo, "init", "-q", "-b", "main");
commit(repo, "init");
sh(repo, "checkout", "-qb", "feature"); commit(repo, "f1");
sh(repo, "checkout", "-q", "main"); commit(repo, "m1");
sh(repo, "merge", "-q", "--no-ff", "feature", "-m", "fusion");
sh(repo, "tag", "v1");

const log = () => G.parseLog(out(repo, [...G.READ, ...G.logArgs({ all: true, remotes: true, limit: 300 })]));

test("une branche fusionnée donne deux lignes", () => {
  assert.equal(L.layoutLanes(log()).width, 2);
});

test("la branche actuelle et le tag ont leur étiquette", () => {
  const labels = G.labelsOf(log()[0]);
  assert.ok(labels.some((l) => l.head && l.parts[0].name === "main"));
  assert.ok(labels.some((l) => l.kind === "tag" && l.parts[0].name === "v1"));
});

test("dépôt sans commit : historique vide", () => {
  const empty = mkdtempSync(join(tmpdir(), "outils-vide-"));
  sh(empty, "init", "-q", "-b", "main");
  assert.deepEqual(G.parseLog(out(empty, [...G.READ, ...G.logArgs({ all: true, remotes: true, limit: 300 })])), []);
});

test("la ligne des changements non validés est en tête, en français", () => {
  const head = log()[0].hash;
  const c = G.withUncommitted(log(), 3, head);
  assert.equal(c[0].uncommitted, true);
  assert.equal(c[0].subject, "Changements non validés (3)");
  assert.deepEqual(c[0].parents, [head]);
});
