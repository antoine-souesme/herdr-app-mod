import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const F = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/files.js").href);

const frozen = (o) => JSON.parse(JSON.stringify(o));

test("openFile adds a temporary tab and shows it", () => {
  let st = F.openFile(null, "w1", "/a.md");
  assert.deepEqual(F.tabsOf(st, "w1"), [{ path: "/a.md", pinned: false }]);
  assert.equal(F.shownOf(st, "w1"), "/a.md");
  st = F.openFile(st, "w1", "/a.md");
  assert.equal(F.tabsOf(st, "w1").length, 1);
});

test("opening a pinned file doesn't add a temporary tab", () => {
  const st = F.openFile(F.pin(null, "w1", "/b.md"), "w1", "/b.md");
  assert.deepEqual(F.tabsOf(st, "w1"), [{ path: "/b.md", pinned: true }]);
});

test("pin moves a temporary tab to pinned, pinned listed first", () => {
  let st = F.openFile(null, "w1", "/a.md");
  st = F.openFile(st, "w1", "/c.md");
  st = F.pin(st, "w1", "/c.md");
  assert.deepEqual(F.tabsOf(st, "w1"), [{ path: "/c.md", pinned: true }, { path: "/a.md", pinned: false }]);
  assert.equal(F.shownOf(st, "w1"), "/c.md");
});

test("closeFile never closes a pinned tab and clears shown", () => {
  let st = F.pin(null, "w1", "/p.md");
  st = F.openFile(st, "w1", "/a.md");
  st = F.closeFile(st, "w1", "/p.md");
  assert.equal(F.tabsOf(st, "w1").length, 2);
  st = F.closeFile(st, "w1", "/a.md");
  assert.deepEqual(F.tabsOf(st, "w1"), [{ path: "/p.md", pinned: true }]);
  assert.equal(F.shownOf(st, "w1"), null);
});

test("unpin removes it and clears shown", () => {
  const st = F.unpin(F.pin(null, "w1", "/p.md"), "w1", "/p.md");
  assert.deepEqual(F.tabsOf(st, "w1"), []);
  assert.equal(F.shownOf(st, "w1"), null);
});

test("boot clears temporary tabs and shown, keeps pinned", () => {
  let st = F.pin(null, "w1", "/p.md");
  st = F.openFile(st, "w1", "/a.md");
  st = F.openFile(st, "w2", "/b.md");
  st = F.boot(st);
  assert.deepEqual(F.tabsOf(st, "w1"), [{ path: "/p.md", pinned: true }]);
  assert.deepEqual(F.tabsOf(st, "w2"), []);
  assert.equal(F.shownOf(st, "w1"), null);
});

test("files are per workspace", () => {
  const st = F.openFile(null, "w1", "/a.md");
  assert.deepEqual(F.tabsOf(st, "w2"), []);
  assert.equal(F.shownOf(st, "w2"), null);
  assert.deepEqual(F.tabsOf(F.dropWorkspace(st, "w1"), "w1"), []);
});

test("show sets or clears the shown file", () => {
  const st = F.openFile(null, "w1", "/a.md");
  assert.equal(F.shownOf(F.show(st, "w1", null), "w1"), null);
  assert.equal(F.shownOf(F.show(F.show(st, "w1", null), "w1", "/a.md"), "w1"), "/a.md");
});

test("roots dedupes and falls back to folder then home", () => {
  assert.deepEqual(
    F.roots([{ cwd: "/a" }, { cwd: "/a", folder: "/b" }, { cwd: "", folder: "/b" }, { cwd: "", folder: "" }], "/h"),
    ["/a", "/b", "/h"],
  );
});

test("languageOf", () => {
  assert.equal(F.languageOf("/x/notes.md"), "markdown");
  assert.equal(F.languageOf("/x/.env"), "bash");
  assert.equal(F.languageOf("/x/.env.local"), "bash");
  assert.equal(F.languageOf("/x/a.txt"), "text");
});

test("conflictPath", () => {
  assert.equal(F.conflictPath("/x/b.md", new Date(2026, 10, 1, 9, 5, 7)), "/x/b.md.herdr-20261101-090507");
});

test("isBinary", () => {
  assert.equal(F.isBinary("a\u0000b"), true);
  assert.equal(F.isBinary("abc"), false);
});

test("inputs are never mutated", () => {
  const st = F.openFile(F.pin(null, "w1", "/p.md"), "w1", "/a.md");
  const before = frozen(st);
  F.openFile(st, "w1", "/z.md");
  F.pin(st, "w1", "/a.md");
  F.unpin(st, "w1", "/p.md");
  F.closeFile(st, "w1", "/a.md");
  F.show(st, "w1", null);
  F.boot(st);
  F.dropWorkspace(st, "w1");
  assert.deepEqual(st, before);
});

test("housekeeping saves dirty files that are hidden or closed, drops closed ones", () => {
  const docs = [
    { path: "/shown.md", dirty: true },   // shown: cmd-s decides
    { path: "/hidden.md", dirty: true },  // tab kept but not shown: save
    { path: "/clean.md", dirty: false },  // nothing to do
    { path: "/closed.md", dirty: true },  // tab gone (unpin, workspace deleted): save, then drop
    { path: "/discarded.md", dirty: true }, // closed with "Fermer sans sauvegarder": drop only
  ];
  const r = F.housekeeping(docs, ["/shown.md", "/hidden.md", "/clean.md"], "/shown.md", ["/discarded.md"]);
  assert.deepEqual(r.save, ["/hidden.md", "/closed.md"]);
  assert.deepEqual(r.drop, ["/closed.md", "/discarded.md"]);
});

const I = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/icons.js").href);
const MAP = {
  file: "file", folder: "folder", folderExpanded: "folder-open",
  fileNames: { "CLAUDE.md": "claude", ".gitignore": "git" },
  fileExtensions: { md: "markdown", ts: "typescript", "d.ts": "typescript-def" },
  folderNames: { docs: "folder-docs", ".claude": "folder-claude" },
  folderNamesExpanded: { docs: "folder-docs-open", ".claude": "folder-claude-open" },
};

test("iconFor picks the material icon like VS Code", () => {
  assert.equal(I.iconFor(MAP, "CLAUDE.md", false), "claude");
  assert.equal(I.iconFor(MAP, "claude.md", false), "markdown"); // names are exact, then lower-case
  assert.equal(I.iconFor(MAP, ".gitignore", false), "git");
  assert.equal(I.iconFor(MAP, "index.d.ts", false), "typescript-def"); // longest extension first
  assert.equal(I.iconFor(MAP, "a.TS", false), "typescript");
  assert.equal(I.iconFor(MAP, "noext", false), "file");
  assert.equal(I.iconFor(MAP, "docs", true, false), "folder-docs");
  assert.equal(I.iconFor(MAP, "Docs", true, true), "folder-docs-open");
  assert.equal(I.iconFor(MAP, "misc", true, false), "folder");
  assert.equal(I.iconFor(MAP, "misc", true, true), "folder-open");
});

test("addFolder adds a folder to one workspace only, once", () => {
  let st = F.addFolder(null, "w1", "/x");
  st = F.addFolder(st, "w1", "/x");
  st = F.addFolder(st, "w2", "/y");
  assert.deepEqual(F.foldersOf(st, "w1"), ["/x"]);
  assert.deepEqual(F.foldersOf(st, "w2"), ["/y"]);
  assert.deepEqual(F.foldersOf(st, "w3"), []);
});

test("removeFolder takes the folder out of its workspace", () => {
  const st = F.addFolder(F.addFolder(null, "w1", "/x"), "w1", "/z");
  const before = frozen(st);
  assert.deepEqual(F.foldersOf(F.removeFolder(st, "w1", "/x"), "w1"), ["/z"]);
  assert.deepEqual(st, before);
});

test("withFolders puts the added folders after the spaces' ones, without duplicates", () => {
  assert.deepEqual(F.withFolders(["/a", "/b"], ["/c", "/a"]), ["/a", "/b", "/c"]);
});

test("moveFolder reorders a workspace's added folders", () => {
  let st = null;
  for (const p of ["/a", "/b", "/c"]) st = F.addFolder(st, "w1", p);
  const before = frozen(st);
  assert.deepEqual(F.foldersOf(F.moveFolder(st, "w1", 0, 2), "w1"), ["/b", "/c", "/a"]);
  assert.deepEqual(F.foldersOf(F.moveFolder(st, "w1", 2, 0), "w1"), ["/c", "/a", "/b"]);
  assert.deepEqual(F.foldersOf(F.moveFolder(st, "w1", 1, 1), "w1"), ["/a", "/b", "/c"]);
  assert.deepEqual(st, before);
});
