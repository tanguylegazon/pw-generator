const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

/**
 * Throw a standardized test failure.
 * @param {string} message
 */
function fail(message) {
    throw new Error(message);
}

/**
 * Assert a condition and fail the test with a message if false.
 * @param {boolean} condition
 * @param {string} message
 */
function assert(condition, message) {
    if (!condition) fail(message);
}

/**
 * Convert a chi-square statistic to an approximate standardized score.
 * This makes thresholds easier to read and compare across scenarios.
 * @param {number} chiSquare
 * @param {number} degreesOfFreedom
 * @returns {number}
 */
function stdScore(chiSquare, degreesOfFreedom) {
    if (degreesOfFreedom <= 0) return 0;
    return (chiSquare - degreesOfFreedom) / Math.sqrt(2 * degreesOfFreedom);
}

/**
 * Load password.js in a sandboxed VM context and expose its exported functions
 * for Node-based testing without changing production code.
 * @returns {{generatePassword: Function, calculatePasswordEntropy: Function}}
 */
function loadGenerator() {
    const passwordPath = path.resolve(__dirname, "..", "password.js");
    const source = fs.readFileSync(passwordPath, "utf8");
    const instrumentedSource = source.replace(
        /export\s*\{[^}]+};?\s*$/,
        "globalThis.__passwordModuleExports = { generatePassword, calculatePasswordEntropy };",
    );

    if (instrumentedSource === source) {
        fail("Failed to instrument password.js exports for test execution.");
    }

    const context = vm.createContext({
        Uint8Array,
        Uint32Array,
        Math,
        TypeError,
        RangeError,
        Error,
    });
    context.globalThis = context;
    context.window = {crypto: webcrypto};
    context.crypto = webcrypto;

    vm.runInContext(instrumentedSource, context, {filename: "password.js"});
    return context.__passwordModuleExports;
}

/**
 * Run statistical checks for uniform character selection:
 * - global distribution across all generated characters
 * - per-position distribution
 * - collision count (reported for observability)
 * @param {Function} generatePassword
 * @param {{sampleSize:number,passwordLength:number,charset:string}} options
 * @returns {{
 *   sampleSize:number,
 *   passwordLength:number,
 *   charsetSize:number,
 *   collisions:number,
 *   globalStdScore:number,
 *   maxPositionStdScore:number
 * }}
 */
function runUniformRandomnessTest(generatePassword, options) {
    const {sampleSize, passwordLength, charset} = options;
    const characters = [...charset];
    const charsetSize = characters.length;
    const charsetSet = new Set(characters);
    const expectedPerCharacter = (sampleSize * passwordLength) / charsetSize;

    const characterCounts = new Map(characters.map((c) => [c, 0]));
    const perPositionCounts = Array.from(
        {length: passwordLength},
        () => new Map(characters.map((c) => [c, 0])),
    );
    const seenPasswords = new Set();
    let collisions = 0;

    for (let i = 0; i < sampleSize; ++i) {
        const password = generatePassword(passwordLength, charset);
        assert(password.length === passwordLength, `Invalid password length at sample ${i}.`);

        for (let pos = 0; pos < passwordLength; ++pos) {
            const char = password[pos];
            assert(charsetSet.has(char), `Character outside charset at sample ${i}.`);
            characterCounts.set(char, characterCounts.get(char) + 1);
            perPositionCounts[pos].set(char, perPositionCounts[pos].get(char) + 1);
        }

        if (seenPasswords.has(password)) {
            collisions += 1;
        } else {
            seenPasswords.add(password);
        }
    }

    let globalChiSquare = 0;
    for (const char of characters) {
        const observed = characterCounts.get(char);
        globalChiSquare += ((observed - expectedPerCharacter) ** 2) / expectedPerCharacter;
    }
    const globalStdScore = stdScore(globalChiSquare, charsetSize - 1);

    let maxPositionStdScore = 0;
    const expectedPerCharacterPerPosition = sampleSize / charsetSize;
    for (let pos = 0; pos < passwordLength; ++pos) {
        let chiSquare = 0;
        for (const char of characters) {
            const observed = perPositionCounts[pos].get(char);
            chiSquare += ((observed - expectedPerCharacterPerPosition) ** 2) / expectedPerCharacterPerPosition;
        }
        const z = stdScore(chiSquare, charsetSize - 1);
        maxPositionStdScore = Math.max(maxPositionStdScore, Math.abs(z));
    }

    const threshold = 6.0;
    assert(
        Math.abs(globalStdScore) < threshold,
        `Global character distribution deviates too much (z=${globalStdScore.toFixed(2)}).`,
    );
    assert(
        maxPositionStdScore < threshold,
        `Character distribution by position deviates too much (|z|max=${maxPositionStdScore.toFixed(2)}).`,
    );

    return {
        sampleSize,
        passwordLength,
        charsetSize,
        collisions,
        globalStdScore,
        maxPositionStdScore,
    };
}

/**
 * Execute the full test matrix:
 * - multiple charset scenarios
 * - multiple password lengths
 * Sample size can be overridden with RANDOMNESS_SAMPLE_SIZE.
 */
function main() {
    const {generatePassword} = loadGenerator();
    const scenarios = [
        {
            name: "alnum_symbols",
            charset: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
        },
        {
            name: "alnum_only",
            charset: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        },
        {
            name: "digits_only",
            charset: "0123456789",
        },
    ];
    const lengths = [1, 2, 4, 8, 16, 32, 64];
    const sampleSize = Number(process.env.RANDOMNESS_SAMPLE_SIZE || 20000);
    const reports = [];

    for (const scenario of scenarios) {
        for (const passwordLength of lengths) {
            const report = runUniformRandomnessTest(generatePassword, {
                sampleSize,
                passwordLength,
                charset: scenario.charset,
            });
            reports.push({
                scenario: scenario.name,
                ...report,
            });
        }
    }

    console.log("Randomness test passed.");
    console.log(JSON.stringify(reports, null, 2));
}

main();
