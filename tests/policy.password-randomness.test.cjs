const assert = require("node:assert/strict");
const {checkCount, loadUi, report} = require("./randomness.helpers.cjs");

/**
 * @function completionProbability
 * @description Computes the probability of completing all required classes by dynamic programming.
 */
function completionProbability(probabilities, length, initialMask) {
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
    return states[states.length - 1];
}

/**
 * @function runScenario
 * @description Checks actual UI outputs against uniform sampling conditioned on the required categories.
 */
function runScenario(ui, symbols, easy, length, samples) {
    const {charset, classes, available, ambiguous} = ui.configure(symbols, easy);
    const expectedCharset = new Set(Array.from(available).filter(char => !easy || !ambiguous.includes(char)));
    assert.deepEqual(new Set(charset), expectedCharset, "UI charset does not match the selected options.");
    const characters = Array.from(charset);
    const size = characters.length;
    const indices = new Map(characters.map((char, index) => [char, index]));
    const categoryOf = characters.map(char => classes.findIndex(category => category.includes(char)));
    const probabilities = classes.map(category => category.length / size);
    assert(classes.every(category => category.length > 0), "Empty UI category.");
    assert.equal(classes.reduce((total, category) => total + category.length, 0), size);
    const constrained = length >= classes.length;
    const acceptance = constrained ? completionProbability(probabilities, length, 0) : 1;
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
        if (constrained) assert.equal(mask, (1 << classes.length) - 1, "Missing required category.");
        if (length > 1) {
            const pair = categoryOf[indices.get(password[0])] * classes.length + categoryOf[indices.get(password[1])];
            ++pairs[pair];
        }
    }
    for (let index = 0; index < size; ++index) {
        const probability = (constrained
            ? completionProbability(probabilities, length - 1, 1 << categoryOf[index]) / acceptance : 1) / size;
        for (let position = 0; position < length; ++position) {
            const name = "UI position " + position + ", character " + index;
            checkCount(positions[position][index], samples, probability, name);
        }
    }
    if (length > 1) {
        for (let first = 0; first < classes.length; ++first) {
            for (let second = 0; second < classes.length; ++second) {
                const probability = probabilities[first] * probabilities[second] * (constrained
                    ? completionProbability(probabilities, length - 2, (1 << first) | (1 << second)) / acceptance : 1);
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
    report("UI statistics passed", samples);
}

if (require.main === module) main();
module.exports = {completionProbability, runScenario};
