const assert = require("node:assert/strict");
const {checkCount, loadUi} = require("./randomness.helpers.cjs");
const {runDistributionTest, runPatternTest} = require("./generator.password-randomness.test.cjs");
const {completionProbability, runScenario} = require("./policy.password-randomness.test.cjs");

/**
 * @function validateProbabilityModel
 * @description Compares the conditional model to exhaustive enumeration of a small unequal alphabet.
 */
function validateProbabilityModel() {
    for (let length = 0; length <= 6; ++length) {
        for (let initialMask = 0; initialMask < 4; ++initialMask) {
            let accepted = 0;
            for (let word = 0; word < 4 ** length; ++word) {
                let value = word;
                let mask = initialMask;
                for (let position = 0; position < length; ++position) {
                    mask |= value % 4 === 0 ? 1 : 2;
                    value = Math.floor(value / 4);
                }
                if (mask === 3) ++accepted;
            }
            assert.equal(completionProbability([0.25, 0.75], length, initialMask), accepted / 4 ** length);
        }
    }
}

/**
 * @function validateDetectors
 * @description Ensures deliberately biased and dependent outputs fail the intended statistical checks.
 */
function validateDetectors() {
    let sample = 0;
    assert.throws(() => runDistributionTest(() => ++sample % 20 < 11 ? "0" : "1", "01", 1, 20000), /Global character/);
    sample = 0;
    assert.throws(() => runDistributionTest(() => ++sample % 2 ? "01".repeat(8) : "10".repeat(8),
        "01", 16, 20000), /Pair/);
    assert.throws(() => runPatternTest(() => "01".repeat(32), 20000), /Binary word/);
    sample = 0;
    assert.throws(() => runPatternTest(() => {
        const word = (Math.floor(sample++ / 2) % 256).toString(2).padStart(8, "0");
        return word + String(Number(word[0]) ^ Number(word[1])).repeat(56);
    }, 65536), /Successive password prefixes/);
    const ui = loadUi();
    const biasedUi = {configure: ui.configure, generate: () => "0aA!"};
    assert.throws(() => runScenario(biasedUi, true, false, 4, 10000), /UI position/);
}

function main() {
    checkCount(5000, 10000, 0.5, "Balanced reference");
    checkCount(0, 10000, 0, "Impossible reference");
    assert.throws(() => checkCount(1, 10000, 0, "Impossible output"), /Impossible output/);
    assert.throws(() => checkCount(NaN, 10000, 0.5, "Invalid output"), /Invalid observed count/);
    validateProbabilityModel();
    validateDetectors();
    const candidates = ["0aA!", "aaaa", "aaaa", "0aA!"];
    const ui = loadUi(() => {
        assert(candidates.length > 0, "Unexpected UI retry.");
        return candidates.shift();
    });
    ui.configure(true, false);
    assert.equal(ui.generate(4), "0aA!");
    assert.equal(candidates.length, 0);
    console.log("Statistical model, injected defects and UI rejection checks passed.");
}

main();
