const assert = require("node:assert/strict");
const {loadUi} = require("./randomness.helpers.cjs");

const ui = loadUi();
const digits = "0123456789";
const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

for (const excluded of ["", "0O1Il", "[]\\^-", "aaa😀", digits, letters, digits + letters]) {
    const {charset, classes} = ui.configure(true, false, excluded);
    assert(charset.length > 0);
    assert(Array.from(charset).every(char => !excluded.includes(char)));
    for (const length of [1, 3, 16]) {
        for (let i = 0; i < 100; ++i) {
            const password = ui.generate(length);
            assert.equal(password.length, length);
            assert(Array.from(password).every(char => charset.includes(char)));
            if (length >= classes.filter(set => set.length).length) {
                assert(classes.filter(set => set.length).every(set => set.some(char => password.includes(char))));
            }
        }
    }
}

const {charset} = ui.configure(false, false, digits + letters);
assert.equal(charset, "");
assert.throws(() => ui.generate(16), {name: "RangeError"});

const easy = ui.configure(true, true, "ab@");
assert(Array.from(easy.charset).every(char => !easy.ambiguous.includes(char) && !"ab@".includes(char)));
console.log("Character exclusions passed.");
