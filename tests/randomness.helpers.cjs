const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

const comparisonBudget = 1000000;
const familyErrorRate = 0.000001;
let comparisons = 0;
let maximumRatio = 0;

/**
 * @function checkCount
 * @description Checks a binomial count using the two-sided Bernstein bound and a Bonferroni budget.
 */
function checkCount(observed, trials, probability, name) {
    assert(Number.isSafeInteger(trials) && trials > 0, "Invalid trial count.");
    assert(Number.isSafeInteger(observed) && observed >= 0 && observed <= trials, "Invalid observed count.");
    assert(probability >= 0 && probability <= 1, "Invalid probability.");
    assert(++comparisons <= comparisonBudget, "Statistical comparison budget exceeded.");
    if (probability === 0 || probability === 1) {
        assert.equal(observed, trials * probability, name);
        return;
    }
    const deviation = Math.abs(observed - trials * probability);
    const logarithm = Math.log(2 * comparisonBudget / familyErrorRate);
    const variance = trials * probability * (1 - probability);
    const limit = logarithm / 3 + Math.sqrt(logarithm ** 2 / 9 + 2 * variance * logarithm);
    maximumRatio = Math.max(maximumRatio, deviation / limit);
    assert(deviation <= limit, name + ": observed=" + observed + ", expected=" + trials * probability
        + ", deviation limit=" + limit.toFixed(2));
}

/**
 * @function loadGenerator
 * @description Executes the production generator with a real or controlled crypto provider.
 */
function loadGenerator(crypto = webcrypto) {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "password.js"), "utf8");
    const context = vm.createContext({crypto});
    const instrumented = source.replace(/export\s*\{[^}]+};?\s*$/, "");
    assert.notEqual(instrumented, source, "Generator exports were not found.");
    vm.runInContext(instrumented, context);
    return vm.runInContext("({generatePassword, calculatePasswordEntropy, maxPasswordLength})", context);
}

/**
 * @function loadUi
 * @description Executes script.js with a minimal DOM; generation and charset rules remain production code.
 */
function loadUi(generatePassword = loadGenerator().generatePassword, options = {}) {
    const elements = new Map();
    const storage = new Map(Object.entries(options.storage || {}));
    const timers = new Map();
    const frames = new Map();
    let now = 0;
    let timerId = 0;
    let frameId = 0;
    function getElement(id) {
        if (!elements.has(id)) {
            const classes = new Set();
            const listeners = new Map();
            const attributes = new Map();
            const animation = {currentTime: 100};
            elements.set(id, {
                value: id === "pw-length" ? "16" : "", checked: false, hidden: true, style: {},
                selectionStart: 0, selectionEnd: 0,
                parentElement: {setAttribute() {}},
                classList: {add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name)},
                addEventListener(type, callback) {
                    if (!listeners.has(type)) listeners.set(type, []);
                    listeners.get(type).push(callback);
                },
                async emit(type, event = {}) {
                    for (const callback of listeners.get(type) || []) await callback.call(this, {
                        target: this, preventDefault() {}, ...event,
                    });
                },
                setAttribute: (name, value) => attributes.set(name, value),
                getAttribute: name => attributes.get(name),
                querySelector() { return getElement("svg"); },
                querySelectorAll(selector) { return [getElement(selector)]; },
                getAnimations: () => [animation],
                setPointerCapture() {},
                setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
                focus() {}, select() { this.selected = true; },
            });
        }
        return elements.get(id);
    }
    function schedule(callback, delay, repeat = false) {
        timers.set(++timerId, {callback, time: now + delay, delay, repeat});
        return timerId;
    }
    function advance(milliseconds) {
        const end = now + milliseconds;
        while (true) {
            const next = [...timers].filter(([, timer]) => timer.time <= end).sort((a, b) => a[1].time - b[1].time)[0];
            if (!next) break;
            const [id, timer] = next;
            now = timer.time;
            if (timer.repeat) timer.time += timer.delay;
            else timers.delete(id);
            timer.callback();
        }
        now = end;
    }
    const source = fs.readFileSync(path.resolve(__dirname, "..", "script.js"), "utf8");
    const instrumented = source.replace(/^import\s+[^;]+;\s*/m, "").replace(/^export\s+\{[^}]+\};\s*/m, "");
    assert.notEqual(instrumented, source, "UI import was not found.");
    const context = vm.createContext({
        generatePassword, calculatePasswordEntropy: loadGenerator().calculatePasswordEntropy, maxPasswordLength: 1024,
        document: {getElementById: getElement, addEventListener: (...args) => getElement("document").addEventListener(...args)},
        navigator: {maxTouchPoints: options.touch ? 1 : 0, clipboard: options.clipboard || {writeText: async () => {}}},
        localStorage: {
            getItem(key) { if (options.blockRead) throw new Error("Storage denied."); return storage.get(key) ?? null; },
            setItem(key, value) { if (options.blockWrite) throw new Error("Storage denied."); storage.set(key, String(value)); },
            removeItem(key) { storage.delete(key); },
        },
        window: {
            matchMedia: () => ({matches: options.reducedMotion !== false}),
            addEventListener: (...args) => getElement("window").addEventListener(...args),
        },
        performance: {now: () => now},
        requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
        cancelAnimationFrame: id => frames.delete(id),
        setTimeout: (callback, delay) => schedule(callback, delay),
        setInterval: (callback, delay) => schedule(callback, delay, true),
        clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
        console: {error() {}},
    });
    vm.runInContext(instrumented, context, {timeout: 5000});
    const ui = vm.runInContext(`({
        configure(symbols, easy, excluded = "") {
            avoidSymbolsCheckbox.checked = !symbols;
            avoidAmbiguousCheckbox.checked = easy;
            excludedCharacters.value = excluded;
            updateCharset();
            return {charset, ambiguous: ambiguousCharset,
                available: digitCharset + lowerCaseCharset + upperCaseCharset + (symbols ? symbolCharset : ""),
                classes: [digitCharset, lowerCaseCharset, upperCaseCharset,
                ...(symbols ? [symbolCharset] : [])].map(set => [...set].filter(char => charset.includes(char)))};
        },
        generate: generatePasswordForUi
    })`, context);
    return Object.assign(ui, {getElement, storage, advance, frames, timers});
}

function report(name, samples) {
    console.log(name + ": " + samples + " passwords, " + comparisons + " comparisons, maximum deviation/limit="
        + maximumRatio.toFixed(3) + ".");
}

module.exports = {checkCount, loadGenerator, loadUi, report};
