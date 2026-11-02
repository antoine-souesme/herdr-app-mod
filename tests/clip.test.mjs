import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const C = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine/clip.js").href);

test("copyName keeps the name when it is free", () => {
  assert.equal(C.copyName("a.txt", false, new Set(["b.txt"])), "a.txt");
});

test("copyName adds « copie » before the extension, then a number", () => {
  assert.equal(C.copyName("a.txt", false, new Set(["a.txt"])), "a copie.txt");
  assert.equal(C.copyName("a.txt", false, new Set(["a.txt", "a copie.txt"])), "a copie 2.txt");
  assert.equal(C.copyName("a.txt", false, new Set(["a.txt", "a copie.txt", "a copie 2.txt"])), "a copie 3.txt");
});

test("copyName: folders and dotfiles have no extension", () => {
  assert.equal(C.copyName("src.v2", true, new Set(["src.v2"])), "src.v2 copie");
  assert.equal(C.copyName(".env", false, new Set([".env"])), ".env copie");
  assert.equal(C.copyName(".env.local", false, new Set([".env.local"])), ".env copie.local");
});

test("pasteDir: a folder receives, a file gives its folder", () => {
  assert.equal(C.pasteDir({ path: "/p/src", dir: true }), "/p/src");
  assert.equal(C.pasteDir({ path: "/p/src/a.js", dir: false }), "/p/src");
});

test("canPaste refuses a folder into itself or below", () => {
  assert.equal(C.canPaste("/p/src", "/p"), true);
  assert.equal(C.canPaste("/p/src", "/p/src"), false);
  assert.equal(C.canPaste("/p/src", "/p/src/lib"), false);
  assert.equal(C.canPaste("/p/src", "/p/srcx"), true);
});

test("parsePaths keeps the absolute paths", () => {
  assert.deepEqual(C.parsePaths("/a/b.txt\n/c d/e\n\n"), ["/a/b.txt", "/c d/e"]);
  assert.deepEqual(C.parsePaths(""), []);
});
