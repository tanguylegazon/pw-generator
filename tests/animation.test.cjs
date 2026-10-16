const assert = require("node:assert/strict");
const {test} = require("node:test");
const {loadUi} = require("./randomness.helpers.cjs");

test("Scramble restarts cleanly and reveals the generated password", async () => {
    const ui = loadUi(undefined, {reducedMotion: false});
    const password = ui.getElement("pw-field");
    const overlay = ui.getElement("pw-animation");
    assert.equal(overlay.hidden, false);
    assert.equal(overlay.value.length, password.value.length);
    await ui.getElement("pw-refresh").emit("click");
    assert.equal(ui.frames.size, 1);
    const [id, callback] = [...ui.frames][0];
    ui.frames.delete(id);
    callback(300);
    assert.equal(overlay.value, password.value);
    assert.equal(overlay.hidden, true);
    assert.equal(password.classList.contains("scrambling"), false);
    assert.equal(ui.frames.size, 0);
});

test("Reduced motion skips the scramble", () => {
    const ui = loadUi();
    assert.equal(ui.getElement("pw-animation").hidden, true);
    assert.equal(ui.frames.size, 0);
});
