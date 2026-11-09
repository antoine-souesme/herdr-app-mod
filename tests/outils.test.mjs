import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const O = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/outils.js").href);

test("les outils de la barre : Git puis Terminal", () => {
  assert.deepEqual(O.TOOLS.map((t) => [t.id, t.label, t.node]),
    [["git", "Git", "outils-git"], ["terminal", "Terminal", "outils-term"]]);
});

test("nom de terminal stable et sûr", () => {
  assert.equal(O.terminalNameFor("s7"), "outils-s7");
  assert.equal(O.terminalNameFor("S/7 é"), O.terminalNameFor("S/7 é"));
  assert.match(O.terminalNameFor("S/7 é"), /^outils-[a-z0-9_-]+$/);
  assert.match(O.terminalNameFor("x".repeat(80)), /^outils-[a-z0-9_-]{1,25}$/);
});

test("deux spaces différents ne partagent pas un nom", () => {
  assert.notEqual(O.terminalNameFor("A"), O.terminalNameFor("a"));
});

test("termFor retrouve le terminal vivant du space", () => {
  const terms = [{ address: "t1", name: "outils-s1", state: "live" }, { address: "t2", name: "outils-s2", state: "exited" }];
  assert.equal(O.termFor(terms, "s1"), "t1");
  assert.equal(O.termFor(terms, "s2"), null);
  assert.equal(O.termFor(terms, "s3"), null);
});

test("orphanTerms : seuls les outils-… vivants sans space", () => {
  const terms = [{ address: "t1", name: "outils-s1", state: "live" }, { address: "t3", name: "outils-s9", state: "live" },
    { address: "t4", name: "autre", state: "live" }, { address: "t5", name: "outils-s8", state: "exited" }];
  assert.deepEqual(O.orphanTerms(terms, ["s1"]), ["t3"]);
});

test("withTerminal change le bloc sans toucher l'original", () => {
  const tree = { id: "root", children: [{ id: "x", children: [{ id: "outils-term", type: "block", content: { terminal: "t1" } }] }] };
  const out = O.withTerminal(tree, "t9");
  assert.equal(out.children[0].children[0].content.terminal, "t9");
  assert.equal(tree.children[0].children[0].content.terminal, "t1");
});

test("largeur d'Outils par défaut", () => {
  assert.equal(O.OUTILS_WIDTH, 700);
});

test("findNode trouve un nœud par id, ou null", () => {
  const tree = { id: "a", children: [{ id: "b", children: [{ id: "c" }] }] };
  assert.equal(O.findNode(tree, "c").id, "c");
  assert.equal(O.findNode(tree, "z"), null);
});
