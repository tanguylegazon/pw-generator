const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {test} = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "i18n.js"), "utf8");
const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");

function loadLanguage(languages, options = {}) {
    const storage = new Map(Object.entries(options.storage || {}));
    const listeners = {document: new Map(), window: new Map()};
    const attributes = new Map();
    const elements = [];
    const selector = {value: "en", addEventListener(type, callback) { this[type] = callback; }};
    const snapshots = [];
    const document = {
        readyState: "loading",
        documentElement: {
            lang: "en",
            setAttribute: (name, value) => attributes.set(name, value),
            removeAttribute(name) {
                snapshots.push(elements.map(element => element.textContent));
                attributes.delete(name);
            },
        },
        querySelectorAll: query => elements.filter(element => element.attributes.has(query.slice(1, -1))),
        getElementById: () => selector,
        addEventListener(type, callback) {
            if (!listeners.document.has(type)) listeners.document.set(type, []);
            listeners.document.get(type).push(callback);
        },
        dispatchEvent(event) {
            for (const callback of listeners.document.get(event.type) || []) callback(event);
        },
    };
    const navigator = {languages, language: languages?.[0]};
    const context = vm.createContext({
        document, navigator, Event,
        localStorage: {
            getItem(key) {
                if (options.blockStorage) throw new Error("Storage denied.");
                return storage.get(key) ?? null;
            },
            setItem(key, value) {
                if (options.blockStorage) throw new Error("Storage denied.");
                storage.set(key, value);
            },
            removeItem(key) {
                if (options.blockStorage) throw new Error("Storage denied.");
                storage.delete(key);
            },
        },
        window: {addEventListener(type, callback) { listeners.window.set(type, callback); }},
    });
    vm.runInContext(source, context);
    const translate = (key, values = {}) => {
        context.key = key;
        context.values = values;
        return vm.runInContext("i18n.translate(key, values)", context);
    };
    function addElement(attribute, key, dataset = {}) {
        const element = {
            attributes: new Map([[attribute, key]]), dataset, textContent: "Untranslated",
            getAttribute(name) { return this.attributes.get(name); },
            setAttribute(name, value) { this.attributes.set(name, value); },
        };
        elements.push(element);
        return element;
    }
    function ready() {
        document.readyState = "interactive";
        document.dispatchEvent(new Event("DOMContentLoaded"));
    }
    function choose(value) {
        selector.value = value;
        selector.change({target: selector});
    }
    return {document, navigator, storage, attributes, selector, snapshots, listeners, translate, addElement, ready, choose};
}

test("The first compatible browser language wins, otherwise English is used", () => {
    for (const [languages, expected] of [
        [["fr-CA", "en-US"], "fr"], [["en-GB", "fr"], "en"],
        [["de-DE", "fr-FR", "en"], "fr"], [["de", "ja"], "en"],
        [[], "en"], [undefined, "en"], [["FR-fr"], "fr"],
    ]) {
        assert.equal(loadLanguage(languages).document.documentElement.lang, expected);
    }
});

test("Only an explicit supported preference overrides browser detection", () => {
    assert.equal(loadLanguage(["fr"], {storage: {"password-language": "en"}}).document.documentElement.lang, "en");
    assert.equal(loadLanguage(["en"], {storage: {"password-language": "fr"}}).document.documentElement.lang, "fr");
    assert.equal(loadLanguage(["fr"], {storage: {"password-language": "de"}}).document.documentElement.lang, "fr");
    const ui = loadLanguage(["fr"], {blockStorage: true});
    ui.ready();
    ui.choose("en");
    ui.navigator.languages = ["fr-FR"];
    ui.listeners.window.get("languagechange")();
    assert.equal(ui.document.documentElement.lang, "en");
});

test("Initial translations finish before the page is revealed", () => {
    for (const [language, expected] of [["fr", "Copier"], ["en", "Copy"]]) {
        const ui = loadLanguage([language]);
        const text = ui.addElement("data-i18n", "copy");
        const label = ui.addElement("data-i18n-aria-label", "allowCharacter", {character: "<"});
        const title = ui.addElement("data-i18n-title", "passwordLength");
        const description = ui.addElement("data-i18n-content", "description");
        assert(ui.attributes.has("data-i18n-pending"));
        assert.equal(text.textContent, "Untranslated");
        ui.ready();
        assert.equal(ui.snapshots[0][0], expected);
        assert(!ui.attributes.has("data-i18n-pending"));
        assert.equal(label.attributes.get("aria-label"), language === "fr" ? "Autoriser <" : "Allow <");
        assert.equal(title.attributes.get("title"), ui.translate("passwordLength"));
        assert.equal(description.attributes.get("content"), ui.translate("description"));
        assert.equal(ui.selector.value, language);
        assert.equal(ui.storage.size, 0);
    }
});

test("Switching updates existing text and attributes without replacing the controls", () => {
    const ui = loadLanguage(["en"]);
    const text = ui.addElement("data-i18n", "advancedOptions");
    const input = ui.addElement("data-i18n-aria-label", "allowCharacter", {character: "&"});
    input.checked = false;
    input.value = "&";
    let changes = 0;
    ui.document.addEventListener("languagechange", () => ++changes);
    ui.ready();
    ui.choose("fr");
    assert.equal(text.textContent, "Options avancées");
    assert.equal(input.attributes.get("aria-label"), "Autoriser &");
    assert.equal(input.checked, false);
    assert.equal(input.value, "&");
    assert.equal(ui.storage.get("password-language"), "fr");
    assert.equal(ui.translate("entropy", {bits: 104}), "104 bits théoriques");
    ui.choose("en");
    assert.equal(ui.translate("entropy", {bits: 104}), "104 theoretical bits");
    assert.equal(changes, 3);
});

test("Browser changes and storage events respect an explicit language choice", () => {
    const ui = loadLanguage(["en"]);
    ui.ready();
    ui.navigator.languages = ["fr"];
    ui.listeners.window.get("languagechange")();
    assert.equal(ui.document.documentElement.lang, "fr");
    ui.choose("en");
    ui.listeners.window.get("languagechange")();
    assert.equal(ui.document.documentElement.lang, "en");
    ui.storage.set("password-language", "fr");
    ui.listeners.window.get("storage")({key: "password-language"});
    assert.equal(ui.document.documentElement.lang, "fr");
    ui.storage.clear();
    ui.navigator.languages = ["ja"];
    ui.listeners.window.get("storage")({key: null});
    assert.equal(ui.document.documentElement.lang, "en");
});

test("Choosing the detected language clears the preference and resumes browser detection", () => {
    for (const [languages, detected, other] of [
        [["en-US", "fr"], "en", "fr"],
        [["fr-CA", "en"], "fr", "en"],
        [["de", "fr-FR"], "fr", "en"],
        [["ja"], "en", "fr"],
    ]) {
        const ui = loadLanguage(languages, {storage: {"password-language": other, unrelated: "kept"}});
        ui.ready();
        ui.choose(detected);
        assert.equal(ui.document.documentElement.lang, detected);
        assert(!ui.storage.has("password-language"));
        assert.equal(ui.storage.get("unrelated"), "kept");
        const reloaded = loadLanguage([other], {storage: Object.fromEntries(ui.storage)});
        assert.equal(reloaded.document.documentElement.lang, other);
        ui.navigator.languages = [other];
        ui.listeners.window.get("languagechange")();
        assert.equal(ui.document.documentElement.lang, other);
    }
});

test("Returning to automatic detection works even when storage is blocked", () => {
    const ui = loadLanguage(["en"], {blockStorage: true});
    ui.ready();
    ui.choose("fr");
    ui.choose("en");
    ui.navigator.languages = ["fr"];
    ui.listeners.window.get("languagechange")();
    assert.equal(ui.document.documentElement.lang, "fr");
});

test("Both dictionaries cover every static and dynamically generated message", () => {
    const keys = new Set([...html.matchAll(/data-i18n(?:-aria-label|-title|-content)?="([^"]+)"/g)].map(match => match[1]));
    for (const key of ["letters", "digits", "symbols", "allowCharacter", "entropy"]) keys.add(key);
    for (const language of ["fr", "en"]) {
        const ui = loadLanguage([language]);
        for (const key of keys) {
            const message = ui.translate(key, {character: "a", bits: 104});
            assert.equal(typeof message, "string");
            assert(message.length > 0, key);
            assert(!message.includes("undefined"), key);
        }
    }
    assert(html.indexOf('src="i18n.js"') < html.indexOf("<body>"));
    assert(!/<script[^>]*(?:async|defer|type="module")[^>]*src="i18n\.js"/.test(html));
});
