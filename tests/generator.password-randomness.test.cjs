const assert = require("node:assert/strict");
const {checkCount, loadGenerator, report} = require("./randomness.helpers.cjs");

/**
 * @function runValidationTests
 * @description Checks rejection boundaries and invalid inputs with controlled random values.
 */
function runValidationTests() {
    const values = [0xffffffff, 0xfffffffe, 0xfffffffd, 0];
    const requests = [];
    const controlled = loadGenerator({getRandomValues(array) {
        requests.push(array.length);
        for (let i = 0; i < array.length; ++i) {
            assert(values.length > 0, "Unexpected random draw.");
            array[i] = values.shift();
        }
        return array;
    }});
    assert.equal(controlled.generatePassword(3, "abc"), "acb");
    assert.deepEqual(requests, [3, 1]);
    const rejected = [0xfffffffa, 0xffffffff, 0xfffffff9];
    const repeated = loadGenerator({getRandomValues(array) {
        assert.equal(array.length, 1);
        assert(rejected.length > 0, "Unexpected retry.");
        array[0] = rejected.shift();
        return array;
    }});
    assert.equal(repeated.generatePassword(1, "0123456789"), "9");
    assert.equal(rejected.length, 0);
    assert.throws(() => loadGenerator({}).generatePassword(1, "ab"), /Secure random generator/);
    assert.throws(() => loadGenerator({getRandomValues() {
        throw new Error("Random source failure.");
    }}).generatePassword(1, "ab"), /Random source failure/);
    const generator = loadGenerator();
    for (const length of [0, -1, 1.5, NaN, Infinity, "16", 1025]) {
        assert.throws(() => generator.generatePassword(length, "ab"));
    }
    for (const charset of ["", "aab", "😀😀", null, 42]) {
        assert.throws(() => generator.generatePassword(16, charset));
    }
    assert.equal(generator.generatePassword(1024, "a"), "a".repeat(1024));
    assert.equal(generator.calculatePasswordEntropy(1, "a😀"), 1);
}

/**
 * @function runDistributionTest
 * @description Checks global and per-position frequencies and non-overlapping pairs under the IID null.
 */
function runDistributionTest(generate, charset, length, samples) {
    const characters = Array.from(charset);
    const size = characters.length;
    const indices = new Map(characters.map((char, index) => [char, index]));
    const counts = new Uint32Array(size);
    const positions = Array.from({length}, () => new Uint32Array(size));
    const pairs = new Uint32Array(size * size);
    for (let sample = 0; sample < samples; ++sample) {
        const password = Array.from(generate(length, charset));
        assert.equal(password.length, length);
        for (let position = 0; position < length; ++position) {
            const index = indices.get(password[position]);
            assert.notEqual(index, undefined, "Character outside charset.");
            ++counts[index];
            ++positions[position][index];
            if (position % 2 === 1) ++pairs[indices.get(password[position - 1]) * size + index];
        }
    }
    for (let index = 0; index < size; ++index) {
        checkCount(counts[index], samples * length, 1 / size, "Global character " + index);
        for (let position = 0; position < length; ++position) {
            checkCount(positions[position][index], samples, 1 / size, "Position " + position + ", character " + index);
        }
    }
    if (length > 1) {
        for (let pair = 0; pair < pairs.length; ++pair) {
            checkCount(pairs[pair], samples * Math.floor(length / 2), 1 / size ** 2, "Pair " + pair);
        }
    }
}

/**
 * @function runPatternTest
 * @description Checks eight-bit words and selected lags with one independent trial per password.
 */
function runPatternTest(generate, samples) {
    const lags = [1, 2, 3, 4, 8, 16, 32, 63];
    const equalities = new Uint32Array(lags.length);
    const words = new Uint32Array(256);
    let transitions = 0;
    let crossPasswordMatches = 0;
    let previous;
    for (let sample = 0; sample < samples; ++sample) {
        const password = generate(64, "01");
        assert.match(password, /^[01]{64}$/);
        ++words[parseInt(password.slice(0, 8), 2)];
        for (let position = 1; position < password.length; ++position) {
            if (password[position - 1] !== password[position]) ++transitions;
        }
        for (let index = 0; index < lags.length; ++index) {
            if (password[0] === password[lags[index]]) ++equalities[index];
        }
        if (sample % 2 === 0) previous = password;
        else if (previous.slice(0, 8) === password.slice(0, 8)) ++crossPasswordMatches;
    }
    for (let word = 0; word < words.length; ++word) checkCount(words[word], samples, 1 / 256, "Binary word " + word);
    for (let index = 0; index < lags.length; ++index) {
        checkCount(equalities[index], samples, 0.5, "Equality at lag " + lags[index]);
    }
    checkCount(crossPasswordMatches, Math.floor(samples / 2), 1 / 256, "Successive password prefixes");
    checkCount(transitions, samples * 63, 0.5, "Binary transitions");
}

function main() {
    runValidationTests();
    const {generatePassword} = loadGenerator();
    let samples = 0;
    for (const charset of ["01", "0123456789", "a😀é🦊",
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"]) {
        for (const length of [1, 4, 16, 64]) {
            runDistributionTest(generatePassword, charset, length, 30000);
            samples += 30000;
        }
    }
    runDistributionTest(generatePassword, "abc", 1024, 2000);
    runPatternTest(generatePassword, 100000);
    report("Generator statistics passed", samples + 102000);
}

if (require.main === module) main();
module.exports = {runDistributionTest, runPatternTest};
