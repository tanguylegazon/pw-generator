const assert = require("node:assert/strict");
const {test} = require("node:test");
const {loadUi, loadGenerator} = require("./randomness.helpers.cjs");

test("Exclusions remove duplicates while preserving the cursor", async () => {
    const ui = loadUi();
    const field = ui.getElement("excluded-characters");
    for (const [value, cursor, expected, position] of [
        ["aa", 2, "a", 1], ["aabb!!00", 8, "ab!0", 4],
        ["aabc", 2, "abc", 1], ["😀😀a", 4, "😀a", 2], ["", 0, "", 0],
    ]) {
        field.value = value;
        field.selectionStart = field.selectionEnd = cursor;
        await field.emit("input");
        assert.equal(field.value, expected);
        assert.equal(field.selectionStart, position);
        assert.equal(field.selectionEnd, position);
    }
    assert.deepEqual([...ui.storage.keys()].sort(), ["avoidAmbiguous", "avoidSymbols"]);
});

test("Equivalent exclusions do not regenerate the password", async () => {
    let generations = 0;
    const generator = loadGenerator().generatePassword;
    const ui = loadUi((...args) => { ++generations; return generator(...args); });
    const field = ui.getElement("excluded-characters");
    field.value = "ab";
    await field.emit("input");
    const previous = generations;
    for (const value of ["abb", "aabb", "baba", "ab😀"]) {
        field.value = value;
        field.selectionStart = field.selectionEnd = value.length;
        await field.emit("input");
        assert.equal(generations, previous);
    }
});
