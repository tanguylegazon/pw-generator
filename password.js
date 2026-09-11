/*!
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @constant {number} maxPasswordLength
 * @description The maximum length that a password can be.
 */
const maxPasswordLength = 1024;

/**
 * @function getCryptoProvider
 * @description Returns a valid crypto provider exposing getRandomValues in browser or Node.js.
 *
 * @returns {Crypto} A crypto provider.
 */
function getCryptoProvider() {
    if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
        return globalThis.crypto;
    }

    if (
        typeof window !== "undefined"
        && typeof window.crypto !== "undefined"
        && typeof window.crypto.getRandomValues === "function"
    ) {
        return window.crypto;
    }

    throw new Error("Secure random generator is not available in this environment.");
}

/**
 * @function getCharsetCharacters
 * @description Validates a character set and returns its unique Unicode characters.
 * @param {string} charset - The character set.
 *
 * @returns {string[]} The characters from the provided character set.
 */
function getCharsetCharacters(charset) {
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    const characters = Array.from(charset);
    if (characters.length === 0) throw new RangeError("Character set must not be empty.");
    if (new Set(characters).size !== characters.length) {
        throw new RangeError("Character set must not contain duplicate characters.");
    }

    return characters;
}

/**
 * @function generatePassword
 * @description This function generates a password with independent, uniform random draws from the provided charset.
 *
 * @returns {string} The generated password.
 */
function generatePassword(length = 16, charset) {
    if (typeof length !== "number") throw new TypeError("Password length must be a number.");
    if (!Number.isSafeInteger(length)) throw new TypeError("Password length must be a safe integer.");
    if (length < 1) throw new RangeError("Password length must be greater than 0.");
    if (length > maxPasswordLength) {
        throw new RangeError("Password length must be less than or equal to " + maxPasswordLength + ".");
    }

    const characters = getCharsetCharacters(charset);
    const maxUint32PlusOne = 0x100000000;
    const randomValues = new Uint32Array(length);
    const cryptoProvider = getCryptoProvider();
    const limit = Math.floor(maxUint32PlusOne / characters.length) * characters.length;

    let result = "";
    cryptoProvider.getRandomValues(randomValues);

    for (let i = 0; i < length; ++i) {
        while (randomValues[i] >= limit) {
            cryptoProvider.getRandomValues(randomValues.subarray(i, i + 1));
        }

        result += characters[randomValues[i] % characters.length];
    }

    return result;
}

/**
 * @function calculatePasswordEntropy
 * @description This function calculates the entropy of a password based on the user's input for length and character
 * set.
 * @param {number} length - The length of the password.
 * @param {string} charset - The character set.
 *
 * @returns {number} The entropy of the password.
 */
function calculatePasswordEntropy(length = 0, charset) {
    if (typeof length !== "number") throw new TypeError("Password length must be a number.");
    if (!Number.isSafeInteger(length)) throw new TypeError("Password length must be a safe integer.");
    if (length > maxPasswordLength) {
        throw new RangeError("Password length must be less than or equal to " + maxPasswordLength + ".");
    }

    const characters = getCharsetCharacters(charset);

    if (length < 1) return 0;

    return length * Math.log2(characters.length);
}

export {generatePassword, calculatePasswordEntropy, maxPasswordLength};
