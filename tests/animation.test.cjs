const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "script.js"), "utf8");
const start = source.indexOf("function textScrambleEffect(text) {");
const end = source.indexOf("\nupdatePassword();", start);
assert(start !== -1 && end !== -1);
const classes = new Set();
const frames = new Map();
let frameId = 0;
let reducedMotion = false;
const context = vm.createContext({
    password: {classList: {add: name => classes.add(name), remove: name => classes.delete(name)}},
    passwordAnimation: {className: "rounded", hidden: true, value: ""},
    animationFrameId: null, charset: "abc123", performance: {now: () => 0},
    window: {matchMedia: () => ({matches: reducedMotion})},
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
});
vm.runInContext(source.slice(start, end), context);

context.textScrambleEffect("password");
assert.equal(context.passwordAnimation.value.length, 8);
assert.equal(context.passwordAnimation.hidden, false);
assert(classes.has("scrambling"));
context.textScrambleEffect("next");
assert.equal(frames.size, 1);
assert.equal(context.passwordAnimation.className, "rounded");
assert.equal(context.passwordAnimation.value.length, 4);
frames.get(frameId)(300);
assert.equal(context.passwordAnimation.value, "next");
assert.equal(context.passwordAnimation.hidden, true);
assert(!classes.has("scrambling"));
assert.equal(context.animationFrameId, null);

reducedMotion = true;
context.textScrambleEffect("final");
assert.equal(context.passwordAnimation.hidden, true);
assert(!classes.has("scrambling"));
console.log("Password animation passed.");
