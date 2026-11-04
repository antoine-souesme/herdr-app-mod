import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const S = await import(pathToFileURL(homedir() + "/.config/herdr-app/mods/antoine-agents/subs.js").href);

test("hookSubs reads antoine.sub labels, oldest first, skipping others and bad values", () => {
  const labels = {
    "antoine.sub.b": '{"type":"Explore","at":2000,"s":"x"}',
    "antoine.sub.a": '{"type":"Plan","at":1000,"s":"x"}',
    "antoine.sub.bad": "pas du json",
    "antoine.sub.empty": "",
    "herdr.pinned": "1",
  };
  assert.deepEqual(S.hookSubs(labels), [
    { id: "a", type: "Plan", at: 1000 },
    { id: "b", type: "Explore", at: 2000 },
  ]);
});

test("hookSubs drops a label older than 12 hours when now is given", () => {
  const labels = { "antoine.sub.old": '{"type":"x","at":0}', "antoine.sub.new": `{"type":"y","at":${S.MAX_AGE}}` };
  assert.equal(S.hookSubs(labels, S.MAX_AGE + 1).length, 2); // at: 0 means unknown, kept
  assert.deepEqual(S.hookSubs({ "antoine.sub.old": '{"type":"x","at":1}' }, S.MAX_AGE + 1), []);
});

test("isClaude goes by the reported app, else the program key", () => {
  assert.equal(S.isClaude({ app: "claude-code" }), true);
  assert.equal(S.isClaude({ app: null, program: { key: "claude" } }), true);
  assert.equal(S.isClaude({ app: "codex" }), false);
  assert.equal(S.isClaude({}), false);
});

test("joinSubs puts hook rows after terminal rows and only the very last closes the tree", () => {
  const tree = [{ t: 1, lines: ["└"] }, { t: 2, lines: ["", "└"] }];
  const out = S.joinSubs(tree, [{ id: "h1" }, { id: "h2" }]);
  assert.deepEqual(out.map((s) => s.lines), [["├"], ["│", "└"], ["├"], ["└"]]);
  assert.deepEqual(tree[0].lines, ["└"]); // input untouched
  assert.deepEqual(S.joinSubs(tree, []).map((s) => s.lines), [["└"], ["", "└"]]);
});
