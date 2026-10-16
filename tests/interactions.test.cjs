const assert = require("node:assert/strict");
const {test} = require("node:test");
const {loadUi} = require("./randomness.helpers.cjs");

test("Storage failures do not interrupt generation or option changes", async () => {
    for (const options of [{blockRead: true}, {blockWrite: true}]) {
        const ui = loadUi(undefined, options);
        assert.equal(ui.getElement("pw-field").value.length, 16);
        const checkbox = ui.getElement("avoid-symbols");
        checkbox.checked = true;
        await checkbox.emit("change");
        assert.match(ui.getElement("pw-field").value, /^[a-zA-Z0-9]+$/);
    }
});

test("Length stays synchronized after buttons, typing and blur", async () => {
    const ui = loadUi();
    const length = ui.getElement("pw-length");
    const password = ui.getElement("pw-field");
    await ui.getElement("pw-length-increase").emit("click");
    assert.equal(password.value.length, 17);
    length.value = "16";
    await length.emit("input");
    ui.advance(650);
    assert.equal(password.value.length, 16);
    for (const [input, expected] of [["", 1], ["0", 1], ["2048", 1024]]) {
        length.value = input;
        await length.emit("input");
        await length.emit("blur");
        assert.equal(Number(length.value), expected);
        assert.equal(password.value.length, expected);
    }
    length.value = "12x";
    await length.emit("input");
    ui.advance(650);
    assert.equal(length.value, "12");
    assert.equal(password.value.length, 12);
});

test("Keyboard arrows work on touch-capable devices", async () => {
    const ui = loadUi(undefined, {touch: true});
    await ui.getElement("pw-length").emit("keydown", {key: "ArrowUp"});
    assert.equal(ui.getElement("pw-field").value.length, 17);
});

test("Refresh restarts its animation and cleans up on completion", async () => {
    const ui = loadUi(undefined, {reducedMotion: false});
    const refresh = ui.getElement("pw-refresh");
    const icon = ui.getElement("svg");
    await refresh.emit("click");
    icon.getAnimations()[0].currentTime = 200;
    await refresh.emit("click");
    assert.equal(icon.getAnimations()[0].currentTime, 0);
    await icon.emit("animationend");
    assert(!icon.classList.contains("rotate"));
});

test("Clipboard failures provide a visible message and preserve manual selection", async () => {
    const ui = loadUi(undefined, {clipboard: {writeText: async () => { throw new Error("Denied"); }}});
    await ui.getElement("pw-copy").emit("click");
    assert.equal(ui.getElement("copy-error").hidden, false);
    assert.equal(ui.getElement("pw-field").selected, true);
});

test("Holding a length button stops on pointer cancellation or window blur", async () => {
    for (const [id, event] of [["pw-length-increase", "pointercancel"], ["window", "blur"]]) {
        const ui = loadUi();
        const button = ui.getElement("pw-length-increase");
        await button.emit("pointerdown", {button: 0, pointerId: 1});
        ui.advance(960);
        assert.equal(ui.getElement("pw-field").value.length, 19);
        await ui.getElement(id).emit(event);
        ui.advance(1000);
        assert.equal(ui.getElement("pw-field").value.length, 19);
    }
});

test("Saved options take precedence over legacy preferences", () => {
    for (const storage of [
        {includeSymbols: "false", easyCharacters: "true"},
        {allowSymbols: "false", allowAmbiguous: "false"},
        {excludeSymbols: "true", easyCharacters: "true"},
        {avoidSymbols: "true", avoidAmbiguous: "true", includeSymbols: "true", easyCharacters: "false"},
    ]) {
        const ui = loadUi(undefined, {storage});
        assert.equal(ui.getElement("avoid-symbols").checked, true);
        assert.equal(ui.getElement("avoid-ambiguous").checked, true);
        assert.equal(ui.getElement("pw-length").value, "16");
        assert.equal(ui.getElement("excluded-characters").value, "");
    }
});

test("An empty pool clears the password and recovers when exclusions are removed", async () => {
    const ui = loadUi();
    const field = ui.getElement("excluded-characters");
    field.value = ui.configure(true, false).charset;
    await field.emit("input");
    assert.equal(ui.getElement("pw-field").value, "");
    assert.equal(ui.getElement("pw-copy").disabled, true);
    assert.equal(ui.getElement("exclusions-error").hidden, false);
    field.value = "";
    await field.emit("input");
    assert.equal(ui.getElement("pw-field").value.length, 16);
    assert.equal(ui.getElement("pw-copy").disabled, false);
    assert.equal(ui.getElement("exclusions-error").hidden, true);
});
