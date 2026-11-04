import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const Q = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/quickopen.js").href);

const files = [
  { root: "/p/owl", rel: "docs/suivi/TODO.md" },
  { root: "/p/owl", rel: "CLAUDE.md" },
  { root: "/p/owl", rel: "src/main.rs" },
  { root: "/p/widget", rel: "main.py" },
  { root: "/p/widget", rel: "packaging/msix/Assets/StoreLogo.png" },
];

test("remember puts the file first, once, per workspace", () => {
  let st = Q.remember(null, "w1", "/a");
  st = Q.remember(st, "w1", "/b");
  st = Q.remember(st, "w1", "/a");
  st = Q.remember(st, "w2", "/c");
  assert.deepEqual(st, { w1: ["/a", "/b"], w2: ["/c"] });
});

test("remember keeps the 30 newest", () => {
  let st = null;
  for (let i = 0; i < 40; i++) st = Q.remember(st, "w", `/f${i}`);
  assert.equal(st.w.length, 30);
  assert.equal(st.w[0], "/f39");
});

test("newlyShown reports only files that just got shown", () => {
  const before = { w1: { shown: "/a" }, w2: { shown: null } };
  const after = { w1: { shown: "/a" }, w2: { shown: "/b" }, w3: { shown: null } };
  assert.deepEqual(Q.newlyShown(before, after), [{ ws: "w2", path: "/b" }]);
  assert.deepEqual(Q.newlyShown(null, { w: { shown: "/x" } }), [{ ws: "w", path: "/x" }]);
});

test("match needs the letters in order", () => {
  assert.equal(Q.match("xyz", "main.py"), null);
  assert.notEqual(Q.match("mpy", "main.py"), null);
  assert.ok(Q.match("main", "main.py") > Q.match("mapy", "main.py"));
});

test("empty query gives the recent files that still exist", () => {
  const got = Q.search("", files, ["/p/widget/main.py", "/gone.txt", "/p/owl/CLAUDE.md"]);
  assert.deepEqual(got.map(Q.pathOf), ["/p/widget/main.py", "/p/owl/CLAUDE.md"]);
});

test("a match on the name beats one spread over the folders", () => {
  const got = Q.search("main", files, []);
  assert.deepEqual(got.map((f) => f.rel), ["main.py", "src/main.rs"]);
});

test("folders count when the name alone doesn't match", () => {
  const got = Q.search("suivitodo", files, []);
  assert.deepEqual(got.map((f) => f.rel), ["docs/suivi/TODO.md"]);
});

test("recently opened files come first among equals", () => {
  const got = Q.search("main", files, ["/p/owl/src/main.rs"]);
  assert.equal(got[0].rel, "src/main.rs");
});

test("where shows the root's name and the file's folder", () => {
  assert.equal(Q.where(files[4], "/home"), "widget • packaging/msix/Assets");
  assert.equal(Q.where(files[3], "/home"), "widget");
  assert.equal(Q.where({ root: "/home", rel: ".claude/CLAUDE.md" }, "/home"), "~ • .claude");
});

test("merge keeps each file once", () => {
  const a = [{ root: "/p", rel: "x/y.md" }], b = [{ root: "/p/x", rel: "y.md" }, { root: "/p/x", rel: "z.md" }];
  assert.deepEqual(Q.merge([a, b]).map(Q.pathOf), ["/p/x/y.md", "/p/x/z.md"]);
});
