const assert = require("node:assert/strict");
const {checkCount, loadUi, report} = require("./randomness.helpers.cjs");

/**
 * @function completionProbability
 * @description Computes the probability of reaching the required number of classes by dynamic programming.
 */
function completionProbability(probabilities, length, initialMask, required = probabilities.length) {
    let states = new Float64Array(1 << probabilities.length);
    states[initialMask] = 1;
    for (let position = 0; position < length; ++position) {
        const next = new Float64Array(states.length);
        for (let mask = 0; mask < states.length; ++mask) {
            for (let category = 0; category < probabilities.length; ++category) {
                next[mask | (1 << category)] += states[mask] * probabilities[category];
            }
        }
        states = next;
    }
    return states.reduce((total, probability, mask) => total
        + (probabilities.filter((_, category) => mask & (1 << category)).length >= required ? probability : 0), 0);
}

/**
 * @function runScenario
 * @description Checks actual UI outputs against uniform sampling conditioned on the required categories.
 */
function runScenario(ui, symbols, easy, length, samples, excluded = "") {
    const {charset, classes: allClasses, available, ambiguous} = ui.configure(symbols, easy, excluded);
    const classes = allClasses.filter(category => category.length);
    const expectedCharset = new Set(Array.from(available).filter(char => (!easy || !ambiguous.includes(char)) && !excluded.includes(char)));
    assert.deepEqual(new Set(charset), expectedCharset, "UI charset does not match the selected options.");
    const characters = Array.from(charset);
    const size = characters.length;
    const indices = new Map(characters.map((char, index) => [char, index]));
    const categoryOf = characters.map(char => classes.findIndex(category => category.includes(char)));
    const probabilities = classes.map(category => category.length / size);
    assert(classes.every(category => category.length > 0), "Empty UI category.");
    assert.equal(classes.reduce((total, category) => total + category.length, 0), size);
    const required = Math.min(length, classes.length);
    const acceptance = completionProbability(probabilities, length, 0, required);
    const positions = Array.from({length}, () => new Uint32Array(size));
    const pairs = new Uint32Array(classes.length ** 2);
    for (let sample = 0; sample < samples; ++sample) {
        const password = Array.from(ui.generate(length));
        assert.equal(password.length, length);
        let mask = 0;
        for (let position = 0; position < length; ++position) {
            const index = indices.get(password[position]);
            assert.notEqual(index, undefined, "Character outside UI charset.");
            ++positions[position][index];
            mask |= 1 << categoryOf[index];
        }
        assert.equal(classes.filter((_, category) => mask & (1 << category)).length, required, "Missing required category.");
        if (length > 1) {
            const pair = categoryOf[indices.get(password[0])] * classes.length + categoryOf[indices.get(password[1])];
            ++pairs[pair];
        }
    }
    for (let index = 0; index < size; ++index) {
        const probability = completionProbability(probabilities, length - 1, 1 << categoryOf[index], required) / acceptance / size;
        for (let position = 0; position < length; ++position) {
            const name = "UI position " + position + ", character " + index;
            checkCount(positions[position][index], samples, probability, name);
        }
    }
    if (length > 1) {
        for (let first = 0; first < classes.length; ++first) {
            for (let second = 0; second < classes.length; ++second) {
                const probability = probabilities[first] * probabilities[second]
                    * completionProbability(probabilities, length - 2, (1 << first) | (1 << second), required) / acceptance;
                const name = "UI category pair " + first + "," + second;
                checkCount(pairs[first * classes.length + second], samples, probability, name);
            }
        }
    }
}

function main() {
    const ui = loadUi();
    let samples = 0;
    for (const symbols of [false, true]) {
        for (const easy of [false, true]) {
            for (const length of [1, 2, 3, 4, 16, 64]) {
                runScenario(ui, symbols, easy, length, 20000);
                samples += 20000;
            }
        }
    }
    for (const excluded of ["123456789", "abcdefghijklmnopqrstuvwxyz", "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"]) {
        for (const length of [1, 2, 3, 4]) {
            runScenario(ui, true, false, length, 20000, excluded);
            samples += 20000;
        }
    }
    report("UI statistics passed", samples);
}

if (require.main === module) main();
module.exports = {completionProbability, runScenario};
