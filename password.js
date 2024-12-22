/*!
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @function shuffleString
 * @description This function shuffles the characters in a string in a random order. It uses the Fisher-Yates shuffle algorithm.
 * @param {string} string - The string to be shuffled.
 *
 * @returns {string} The shuffled string.
 */
function shuffleString(string) {
    const maxUint32 = 0xFFFFFFFF;

    if (typeof string !== "string") throw new TypeError("Input must be a string.");
    if (string.length === 0) throw new RangeError("Input must not be empty.");
    if (string.length > maxUint32) throw new RangeError("Array length must be less than 2^32.");

    let array = string.split("");

    for (let i = array.length - 1; i > 0; i--) {
        const limit = maxUint32 - (maxUint32 % (i + 1));
        let randomValue = 0;

        do {
            const randomValues = window.crypto.getRandomValues(new Uint32Array(1));
            randomValue = randomValues[0];
        } while (randomValue >= limit);

        const randomIndex = randomValue % (i + 1);
        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }

    return array.join("");
}

/**
 * @function getRandomCharacter
 * @description This function generates a secure random character from the provided character set.
 * @param {string} charset - The character set.
 *
 * @returns {string} A single character randomly selected from the provided character set.
 */
function getRandomCharacter(charset) {
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    let randomValue = 0;

    do {
        randomValue = window.crypto.getRandomValues(new Uint8Array(1))[0];
    } while (randomValue >= 256 / charset.length * charset.length);
    return charset.charAt(randomValue % charset.length);
}

/**
 * @function generatePassword
 * @description This function generates a password based on the user's input for length and whether to include symbols.
 * It ensures that the password contains at least one digit, one letter, and one symbol (if symbols are included).
 *
 * @returns {string} The generated password.
 */
function generatePassword(length = 16, charset) {
    if (typeof length !== "number") throw new TypeError("Password length must be a number.");
    if (length !== Math.floor(length)) throw new TypeError("Password length must be an integer.");
    if (length < 1) throw new RangeError("Password length must greater than 0.");
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    let result = "";
    let digitCharset = getDigits(charset);
    let lowerCaseCharset = getLowerCase(charset);
    let upperCaseCharset = getUpperCase(charset);
    let symbolCharset = getSymbols(charset);

    if (symbolCharset.length > 0) {
        result += getRandomCharacter(symbolCharset);
    }
    if (length >= 4 || length >= 3 && symbolCharset.length === 0) {
        result += getRandomCharacter(digitCharset);
        result += getRandomCharacter(lowerCaseCharset);
        result += getRandomCharacter(upperCaseCharset);
    } else if (length === 3 && symbolCharset.length > 0) {
        result += getRandomCharacter(digitCharset);
        result += getRandomCharacter(lowerCaseCharset + upperCaseCharset);
    } else if (length === 2 && symbolCharset.length > 0) {
        result += getRandomCharacter(digitCharset + lowerCaseCharset + upperCaseCharset);
    }

    for (let i = result.length; i < length; ++i) {
        result += getRandomCharacter(charset);
    }

    return shuffleString(result);
}

/**
 * @function calculatePasswordEntropy
 * @description This function calculates the entropy of a password based on the user's input for length and character set.
 * @param {number} length - The length of the password.
 * @param {string} charset - The character set.
 *
 * @returns {number} The entropy of the password.
 */
function calculatePasswordEntropy(length = 0, charset) {
    if (typeof length !== "number") throw new TypeError("Password length must be a number.");
    if (length !== Math.floor(length)) throw new TypeError("Password length must be an integer.");
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    if (length < 1) return 0;

    let digitCharset = getDigits(charset);
    let lowerCaseCharset = getLowerCase(charset);
    let upperCaseCharset = getUpperCase(charset);
    let symbolCharset = getSymbols(charset);

    let entropy = length * Math.log2(charset.length);

    if (symbolCharset.length > 0) {
        entropy += Math.log2(symbolCharset.length) - Math.log2(charset.length);
    }

    if (length >= 4 || length >= 3 && symbolCharset.length === 0) {
        entropy +=
            Math.log2(digitCharset.length)
            + Math.log2(lowerCaseCharset.length)
            + Math.log2(upperCaseCharset.length)
            - 3 * Math.log2(charset.length);
    } else if (length === 3 && symbolCharset.length > 0) {
        entropy +=
            Math.log2(digitCharset.length)
            + Math.log2(lowerCaseCharset.length + upperCaseCharset.length)
            - 2 * Math.log2(charset.length);
    } else if (length === 2 && symbolCharset.length > 0) {
        entropy +=
            Math.log2(digitCharset.length + lowerCaseCharset.length + upperCaseCharset.length)
            - Math.log2(charset.length);
    }

    return entropy;
}

/**
 * @function getDigits
 * @description This function extracts all unique digits from the provided character set.
 * @param {string} charset - The character set.
 *
 * @returns {string} The list of all unique digits in the provided character set.
 */
function getDigits(charset) {
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    return [...new Set(charset.match(/\d/g))].sort().join("");
}

/**
 * @function getLowerCase
 * @description This function extracts all unique lowercase letters from the provided character set.
 * @param {string} charset - The character set.
 *
 * @returns {string} The list of all unique lowercase letters in the provided character set.
 */
function getLowerCase(charset) {
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    return [...new Set(charset.match(/[a-z]/g))].sort().join('');
}

/**
 * @function getUpperCase
 * @description This function extracts all unique uppercase letters from the provided character set.
 * @param {string} charset - The character set.
 *
 * @returns {string} The list of all unique uppercase letters in the provided character set.
 */
function getUpperCase(charset) {
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    return [...new Set(charset.match(/[A-Z]/g))].sort().join('');
}

/**
 * @function getSymbols
 * @description This function extracts all symbols from the provided character set.
 * @param {string} charset - The character set.
 *
 * @returns {string} The list of all unique symbols in the provided character set.
 */
function getSymbols(charset) {
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    return [...new Set(charset.match(/[^a-zA-Z0-9]/g))].sort().join('');
}

export {generatePassword, calculatePasswordEntropy};