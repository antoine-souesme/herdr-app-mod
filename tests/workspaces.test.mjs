import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const W = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/workspaces.js").href);

const ws = (id, name, spaces, lastSpace = null, emoji = "📁") => ({ id, name, emoji, spaces, lastSpace });
const two = (active, seen, persoSpaces = ["b"], last = null) => ({
  list: [ws("pro", "Pro", ["a"], "a"), ws("perso", "Perso", persoSpaces, last)],
  active,
  seen,
});
const byId = (s, id) => s.list.find((w) => w.id === id);

test("first run puts every space in Pro 💼", () => {
  const { state, select } = W.reconcile(null, ["a", "b"], "a");
  assert.equal(state.list.length, 1);
  const [w] = state.list;
  assert.equal(w.name, "Pro");
  assert.equal(w.emoji, "💼");
  assert.deepEqual(w.spaces, ["a", "b"]);
  assert.equal(state.active, w.id);
  assert.equal(w.lastSpace, "a");
  assert.equal(select, null);
});

test("new space lands in the open workspace", () => {
  const { state } = W.reconcile(two("perso", "b"), ["a", "b", "c"], "c");
  assert.deepEqual(byId(state, "perso").spaces, ["b", "c"]);
  assert.equal(state.active, "perso");
});

test("follows a shown space from another workspace", () => {
  const { state, select } = W.reconcile(two("perso", "b"), ["a", "b"], "a");
  assert.equal(state.active, "pro");
  assert.equal(select, null);
});

test("closing a space stays in its workspace", () => {
  const { state, select } = W.reconcile(two("perso", "c", ["b", "c"], "c"), ["a", "b"], "a");
  assert.equal(state.active, "perso");
  assert.equal(select, "b");
});

test("closing the last space keeps the workspace open and empty", () => {
  const r = W.reconcile(two("perso", "b"), ["a"], "a");
  assert.equal(r.state.active, "perso");
  assert.deepEqual(byId(r.state, "perso").spaces, []);
  assert.equal(r.select, null);
  const again = W.reconcile(r.state, ["a"], "a");
  assert.equal(again.state.active, "perso");
});

test("switchTo returns the last space", () => {
  const s = { list: [ws("pro", "Pro", ["a", "b"], "b"), ws("e", "E", [])], active: "e", seen: "a" };
  assert.equal(W.switchTo(s, "pro").select, "b");
  assert.equal(W.switchTo(s, "pro").state.active, "pro");
  assert.equal(W.switchTo(s, "e").select, null);
});

test("create makes it active and empty", () => {
  const { state, id } = W.create(two("pro", "a"), "Perso", "🏡");
  const last = state.list.at(-1);
  assert.equal(last.id, id);
  assert.equal(last.name, "Perso");
  assert.equal(last.emoji, "🏡");
  assert.deepEqual(last.spaces, []);
  assert.equal(state.active, id);
});

test("remove closes its spaces and opens the neighbor", () => {
  const r = W.remove(two("perso", "c", ["b", "c"]), "perso");
  assert.deepEqual(r.close, ["b", "c"]);
  assert.equal(r.state.active, "pro");
  assert.equal(r.select, "a");
  assert.equal(byId(r.state, "perso"), undefined);
});

test("remove refuses the last workspace", () => {
  const s = { list: [ws("pro", "Pro", ["a"])], active: "pro", seen: "a" };
  const r = W.remove(s, "pro");
  assert.deepEqual(r.close, []);
  assert.deepEqual(r.state, s);
});

test("rename and setEmoji change only that workspace", () => {
  const s = two("pro", "a");
  const r = W.rename(s, "perso", "Maison");
  assert.equal(byId(r, "perso").name, "Maison");
  assert.equal(byId(r, "pro").name, "Pro");
  const e = W.setEmoji(s, "pro", "🚀");
  assert.equal(byId(e, "pro").emoji, "🚀");
  assert.equal(byId(e, "perso").emoji, "📁");
  assert.equal(byId(s, "perso").name, "Perso"); // input untouched
});

test("visibleSpaceIds includes unassigned ids", () => {
  assert.deepEqual(W.visibleSpaceIds(two("pro", "a"), ["a", "b", "z"]), new Set(["a", "z"]));
});

test("statusOf picks the most urgent", () => {
  const w = ws("x", "X", ["a", "b"]);
  assert.equal(W.statusOf(w, [{ id: "a", status: "working" }, { id: "b", status: "blocked" }, { id: "q", status: "done" }]), "blocked");
  assert.equal(W.statusOf(w, [{ id: "a", status: null }]), null);
});

test("deleting a workspace never jumps to a third one", () => {
  const s = { list: [ws("a", "A", ["a1"], "a1"), ws("b", "B", []), ws("c", "C", ["c1"])], active: "a", seen: "a1" };
  const r = W.remove(s, "a");
  assert.equal(r.state.active, "b");
  // Herdr then shows c1 (a space of C) after closing a1.
  const after = W.reconcile(r.state, ["c1"], "c1");
  assert.equal(after.state.active, "b");
  // Later changes are followed again.
  const later = W.reconcile(after.state, ["c1", "c2"], "c2", "t9");
  assert.equal(later.state.active, "b"); // c2 is new: lands in the open workspace
});

test("a focus change follows the other workspace even if the shown space stays", () => {
  // Perso is open and empty; Herdr still shows "a" (Pro), focus on terminal t1.
  const s = { list: [ws("pro", "Pro", ["a"], "a"), ws("perso", "Perso", [])], active: "perso", seen: "a|t1" };
  const same = W.reconcile(s, ["a"], "a", "t1");
  assert.equal(same.state.active, "perso");
  // A notification click focuses the agent t2 in "a".
  const moved = W.reconcile(same.state, ["a"], "a", "t2");
  assert.equal(moved.state.active, "pro");
});

test("move reorders workspaces", () => {
  const s = { list: [ws("a", "A", []), ws("b", "B", []), ws("c", "C", [])], active: "b", seen: null };
  assert.deepEqual(W.move(s, "a", 2).list.map((w) => w.id), ["b", "c", "a"]);
  assert.deepEqual(W.move(s, "c", 0).list.map((w) => w.id), ["c", "a", "b"]);
  assert.equal(W.move(s, "a", 2).active, "b");
  assert.deepEqual(s.list.map((w) => w.id), ["a", "b", "c"]); // input untouched
});
