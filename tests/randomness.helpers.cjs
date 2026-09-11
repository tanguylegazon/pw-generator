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
function loadUi(generatePassword = loadGenerator().generatePassword) {
    const elements = new Map();
    function getElement(id) {
        if (!elements.has(id)) elements.set(id, {
            value: "16", checked: false, style: {},
            classList: {add() {}, remove() {}},
            addEventListener() {}, querySelector() { return getElement("svg"); },
        });
        return elements.get(id);
    }
    const source = fs.readFileSync(path.resolve(__dirname, "..", "script.js"), "utf8");
    const instrumented = source.replace(/^import\s+[^;]+;\s*/m, "");
    assert.notEqual(instrumented, source, "UI import was not found.");
    const context = vm.createContext({
        generatePassword, calculatePasswordEntropy: () => 0, maxPasswordLength: 1024,
        document: {getElementById: getElement}, navigator: {},
        localStorage: {getItem: () => null, setItem() {}},
        window: {matchMedia: () => ({matches: true})}, clearTimeout() {},
    });
    vm.runInContext(instrumented, context, {timeout: 5000});
    return vm.runInContext(`({
        configure(symbols, easy) {
            includeSymbolsCheckbox.checked = symbols;
            easyCharacters.checked = easy;
            updateCharset();
            return {charset, ambiguous: ambiguousCharset,
                available: digitCharset + lowerCaseCharset + upperCaseCharset + (symbols ? symbolCharset : ""),
                classes: [digitCharset, lowerCaseCharset, upperCaseCharset,
                ...(symbols ? [symbolCharset] : [])].map(set => [...set].filter(char => charset.includes(char)))};
        },
        generate: generatePasswordForUi
    })`, context);
}

function report(name, samples) {
    console.log(name + ": " + samples + " passwords, " + comparisons + " comparisons, maximum deviation/limit="
        + maximumRatio.toFixed(3) + ".");
}

module.exports = {checkCount, loadGenerator, loadUi, report};
