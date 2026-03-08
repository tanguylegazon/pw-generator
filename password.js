/*!
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
 * @function getRandomInt
 * @description Returns an unbiased integer in [0, maxExclusive), using rejection sampling.
 * @param {number} maxExclusive - Upper bound excluded.
 *
 * @returns {number} A uniform random integer.
 */
function getRandomInt(maxExclusive) {
    const maxUint32PlusOne = 0x100000000;
    const maxUint32Array = new Uint32Array(1);
    const cryptoProvider = getCryptoProvider();

    if (typeof maxExclusive !== "number") throw new TypeError("Upper bound must be a number.");
    if (maxExclusive !== Math.floor(maxExclusive)) throw new TypeError("Upper bound must be an integer.");
    if (maxExclusive < 1) throw new RangeError("Upper bound must be greater than 0.");
    if (maxExclusive > maxUint32PlusOne) throw new RangeError("Upper bound must be less than or equal to 2^32.");

    const limit = Math.floor(maxUint32PlusOne / maxExclusive) * maxExclusive;
    let randomValue = 0;

    do {
        cryptoProvider.getRandomValues(maxUint32Array);
        randomValue = maxUint32Array[0];
    } while (randomValue >= limit);

    return randomValue % maxExclusive;
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
    if (charset.length > 0x100000000) throw new RangeError("Character set length must be less than or equal to 2^32.");

    return charset.charAt(getRandomInt(charset.length));
}

/**
 * @function generatePassword
 * @description This function generates a password with independent, uniform random draws from the provided charset.
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
    for (let i = 0; i < length; ++i) {
        result += getRandomCharacter(charset);
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
    if (length !== Math.floor(length)) throw new TypeError("Password length must be an integer.");
    if (typeof charset !== "string") throw new TypeError("Character set must be a string.");
    if (charset.length === 0) throw new RangeError("Character set must not be empty.");

    if (length < 1) return 0;

    return length * Math.log2(charset.length);
}

export {generatePassword, calculatePasswordEntropy};
