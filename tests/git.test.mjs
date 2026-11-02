import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const G = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/git.js").href);

const z = (...entries) => entries.join("\0") + "\0";

test("parseStatus reads git status --porcelain -z", () => {
  const m = G.parseStatus(z(" M src/a.js", "?? new.txt", "A  b.js", " D gone.md", "UU both.js", "R  to.js", "from.js", "MM c.js"));
  assert.deepEqual(Object.fromEntries(m), {
    "src/a.js": "modified", "new.txt": "untracked", "b.js": "added", "gone.md": "deleted",
    "both.js": "conflict", "to.js": "renamed", "c.js": "modified",
  });
});

test("decoration of a file: its letter and color", () => {
  const m = G.parseStatus(z(" M src/a.js", "?? new.txt"));
  assert.deepEqual(G.decoration(m, "src/a.js", false), { kind: "modified", letter: "M", color: "#e2c08d" });
  assert.deepEqual(G.decoration(m, "new.txt", false), { kind: "untracked", letter: "U", color: "#73c991" });
  assert.equal(G.decoration(m, "other.txt", false), null);
});

test("decoration of a folder: the most important change inside, a dot instead of a letter", () => {
  const m = G.parseStatus(z("?? src/new.js", " M src/lib/a.js", "?? srcx/b.js"));
  assert.deepEqual(G.decoration(m, "src", true), { kind: "modified", letter: "•", color: "#e2c08d" });
  assert.deepEqual(G.decoration(m, "src/lib", true), { kind: "modified", letter: "•", color: "#e2c08d" });
  assert.deepEqual(G.decoration(m, "srcx", true), { kind: "untracked", letter: "•", color: "#73c991" });
  assert.equal(G.decoration(m, "docs", true), null);
});

test("decoration of a whole untracked folder (git lists it with a slash)", () => {
  const m = G.parseStatus(z("?? newdir/"));
  assert.deepEqual(G.decoration(m, "newdir", true), { kind: "untracked", letter: "•", color: "#73c991" });
  assert.deepEqual(G.decoration(m, "newdir/x.js", false), { kind: "untracked", letter: "U", color: "#73c991" });
});

test("decoration of the repository itself ('') covers every change", () => {
  const m = G.parseStatus(z("?? a.txt", " M b/c.js"));
  assert.deepEqual(G.decoration(m, "", true), { kind: "modified", letter: "•", color: "#e2c08d" });
  assert.equal(G.decoration(new Map(), "", true), null);
});
