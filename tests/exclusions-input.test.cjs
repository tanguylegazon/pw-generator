const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "script.js"), "utf8");
const start = source.indexOf("excludedCharacters.addEventListener('input',");
const end = source.indexOf("\n});", start) + 4;
assert(start !== -1 && end > start);
let onInput;
let generations = 0;
const field = {
    value: "", selectionStart: 0, selectionEnd: 0,
    addEventListener(event, callback) { onInput = callback; },
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
};
const context = {
    excludedCharacters: field, charset: '', updatePassword() { ++generations; },
    updateCharset() { context.charset = Array.from(new Set(field.value)).sort().join(''); },
    localStorage: {setItem() { assert.fail('Exclusions must not be stored.'); }},
};
vm.runInNewContext(source.slice(start, end), context);

for (const [value, cursor, expected, position] of [
    ["aa", 2, "a", 1],
    ["aabb!!00", 8, "ab!0", 4],
    ["aabc", 2, "abc", 1],
    ["😀😀a", 4, "😀a", 2],
    ["", 0, "", 0],
]) {
    field.value = value;
    field.selectionStart = field.selectionEnd = cursor;
    onInput();
    assert.equal(field.value, expected);
    assert.equal(field.selectionStart, position);
    assert.equal(field.selectionEnd, position);
}
field.value = 'ab';
onInput();
const previousGenerations = generations;
for (const value of ['abb', 'aabb', 'baba']) {
    field.value = value;
    field.selectionStart = field.selectionEnd = value.length;
    onInput();
    assert.equal(generations, previousGenerations);
}
console.log("Unique character input passed.");
