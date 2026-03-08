const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

function fail(message) {
    throw new Error(message);
}

function assert(condition, message) {
    if (!condition) fail(message);
}

function stdScore(chiSquare, degreesOfFreedom) {
    if (degreesOfFreedom <= 0) return 0;
    return (chiSquare - degreesOfFreedom) / Math.sqrt(2 * degreesOfFreedom);
}

function loadPasswordGenerator() {
    const passwordPath = path.resolve(__dirname, "..", "password.js");
    const source = fs.readFileSync(passwordPath, "utf8");
    const instrumentedSource = source.replace(
        /export\s*\{[^}]+\};?\s*$/,
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
    return context.__passwordModuleExports.generatePassword;
}

function extractConstString(source, name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
        `const\\s+${escapedName}\\s*=\\s*("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')\\s*;`,
    );
    const match = source.match(regex);
    if (!match) fail(`Could not find string constant "${name}" in script.js.`);
    return vm.runInNewContext(match[1]);
}

function escapeForRegExp(char) {
    return char.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function loadUiCharsets() {
    const scriptPath = path.resolve(__dirname, "..", "script.js");
    const source = fs.readFileSync(scriptPath, "utf8");

    return {
        digits: extractConstString(source, "digitCharset"),
        lower: extractConstString(source, "lowerCaseCharset"),
        upper: extractConstString(source, "upperCaseCharset"),
        symbols: extractConstString(source, "symbolCharset"),
        ambiguous: extractConstString(source, "ambiguousCharset"),
    };
}

function buildCharsetFromUiConfig(constants, includeSymbols, easyCharacters) {
    let charset = includeSymbols
        ? constants.digits + constants.lower + constants.upper + constants.symbols
        : constants.digits + constants.lower + constants.upper;

    if (easyCharacters) {
        for (let i = 0; i < constants.ambiguous.length; ++i) {
            charset = charset.replace(new RegExp(escapeForRegExp(constants.ambiguous[i]), "g"), "");
        }
    }

    return charset;
}

function hasAnyCharacterFromSet(text, set) {
    for (let i = 0; i < text.length; ++i) {
        if (set.includes(text[i])) return true;
    }
    return false;
}

function matchesUiConstraints(passwordText, includeSymbols, constants) {
    const requiredClassCount = includeSymbols ? 4 : 3;
    if (passwordText.length < requiredClassCount) return true;

    if (!hasAnyCharacterFromSet(passwordText, constants.digits)) return false;
    if (!hasAnyCharacterFromSet(passwordText, constants.lower)) return false;
    if (!hasAnyCharacterFromSet(passwordText, constants.upper)) return false;
    if (includeSymbols && !hasAnyCharacterFromSet(passwordText, constants.symbols)) return false;
    return true;
}

function generatePasswordForUi(generatePassword, length, charset, includeSymbols, constants) {
    const maxAttempts = 256;
    for (let i = 0; i < maxAttempts; ++i) {
        const candidate = generatePassword(length, charset);
        if (matchesUiConstraints(candidate, includeSymbols, constants)) return candidate;
    }
    return generatePassword(length, charset);
}

function runUiScenarioTest(generatePassword, constants, options) {
    const {includeSymbols, easyCharacters, passwordLength, sampleSize} = options;
    const charset = buildCharsetFromUiConfig(constants, includeSymbols, easyCharacters);
    const characters = [...charset];
    const charsetSet = new Set(characters);
    const requiredClassCount = includeSymbols ? 4 : 3;

    const classes = {
        digit: [...new Set(charset.match(/\d/g) || [])],
        lower: [...new Set(charset.match(/[a-z]/g) || [])],
        upper: [...new Set(charset.match(/[A-Z]/g) || [])],
    };
    if (includeSymbols) {
        classes.symbol = [...new Set(charset.match(/[^a-zA-Z0-9]/g) || [])];
    }

    const charCounts = new Map(characters.map((c) => [c, 0]));
    const classTotals = Object.fromEntries(Object.keys(classes).map((k) => [k, 0]));

    for (let i = 0; i < sampleSize; ++i) {
        const password = generatePasswordForUi(generatePassword, passwordLength, charset, includeSymbols, constants);
        assert(password.length === passwordLength, `Invalid length at sample ${i}.`);

        for (let j = 0; j < password.length; ++j) {
            const char = password[j];
            assert(charsetSet.has(char), `Character outside charset at sample ${i}.`);
            charCounts.set(char, charCounts.get(char) + 1);
        }

        if (passwordLength >= requiredClassCount) {
            assert(matchesUiConstraints(password, includeSymbols, constants), `Missing UI class constraint at sample ${i}.`);
        }
    }

    const classOfChar = new Map();
    for (const [className, classChars] of Object.entries(classes)) {
        for (const c of classChars) classOfChar.set(c, className);
    }
    for (const [char, count] of charCounts.entries()) {
        classTotals[classOfChar.get(char)] += count;
    }

    const threshold = 6.0;
    const testKind = passwordLength < requiredClassCount ? "uniform_all_chars" : "uniform_within_each_class";
    const scores = {};

    if (testKind === "uniform_all_chars") {
        const expected = (sampleSize * passwordLength) / characters.length;
        let chi = 0;
        for (const c of characters) {
            const observed = charCounts.get(c);
            chi += ((observed - expected) ** 2) / expected;
        }
        const z = stdScore(chi, characters.length - 1);
        assert(Math.abs(z) < threshold, `UI short-length distribution deviates too much (z=${z.toFixed(2)}).`);
        scores.allChars = z;
    } else {
        for (const [className, classChars] of Object.entries(classes)) {
            const expected = classTotals[className] / classChars.length;
            let chi = 0;
            for (const c of classChars) {
                const observed = charCounts.get(c);
                chi += ((observed - expected) ** 2) / expected;
            }
            const z = stdScore(chi, classChars.length - 1);
            assert(Math.abs(z) < threshold, `UI class "${className}" distribution deviates too much (z=${z.toFixed(2)}).`);
            scores[className] = z;
        }
    }

    return {
        includeSymbols,
        easyCharacters,
        passwordLength,
        sampleSize,
        charsetSize: characters.length,
        testKind,
        scores,
    };
}

function main() {
    const generatePassword = loadPasswordGenerator();
    const constants = loadUiCharsets();

    const lengths = [1, 2, 4, 16];
    const configs = [
        {includeSymbols: true, easyCharacters: false},
        {includeSymbols: true, easyCharacters: true},
        {includeSymbols: false, easyCharacters: false},
        {includeSymbols: false, easyCharacters: true},
    ];

    const sampleSize = Number(process.env.UI_RANDOMNESS_SAMPLE_SIZE || 6000);
    const reports = [];

    for (const config of configs) {
        for (const passwordLength of lengths) {
            reports.push(runUiScenarioTest(generatePassword, constants, {
                ...config,
                passwordLength,
                sampleSize,
            }));
        }
    }

    console.log("UI randomness test passed.");
    console.log(JSON.stringify(reports, null, 2));
}

main();
