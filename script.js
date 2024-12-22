/*
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {generatePassword, calculatePasswordEntropy} from './password.js';

/**
 * @constant {number} minPasswordLength
 * @description The minimum length that a password can be.
 */
const minPasswordLength = 1;

/**
 * @constant {number} maxPasswordLength
 * @description The maximum length that a password can be.
 */
const maxPasswordLength = 1024;

/**
 * @constant {number} entropyForFullBar
 * @description The entropy value (in bits) required to completely fill the password strength bar.
 */
const entropyForFullBar = 128;

const password = document.getElementById('pw-field');
const passwordLengthInput = document.getElementById('pw-length');
const refreshButton = document.getElementById('pw-refresh');
const includeSymbolsCheckbox = document.getElementById('include-symbols');
const easyCharacters = document.getElementById('easy-characters');

includeSymbolsCheckbox.checked = true;
easyCharacters.checked = false;


/*****************
 * Local storage *
 *****************/
if (localStorage.getItem('includeSymbols') === null) {
    localStorage.setItem('includeSymbols', includeSymbolsCheckbox.checked);
} else {
    includeSymbolsCheckbox.checked = localStorage.getItem('includeSymbols') === 'true';
}

if (localStorage.getItem('easyCharacters') === null) {
    localStorage.setItem('easyCharacters', easyCharacters.checked);
} else {
    easyCharacters.checked = localStorage.getItem('easyCharacters') === 'true';
}


/***********
 * Charset *
 ***********/
let charset = "";
let charsetLength = 0;
const ambiguousCharset = "012CcIilOoXxZz!\"$&'+,/:;@[\\]^`{|}~";

const digits = "0123456789";
const lowerCase = "abcdefghijklmnopqrstuvwxyz";
const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const symbols = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

let digitCharset = digits;
let lowerCaseCharset = lowerCase;
let upperCaseCharset = upperCase;
let symbolCharset = symbols;

/**
 * @function updateCharset
 * @description This function removes ambiguous characters from the character sets if the 'easyCharacters' checkbox is
 * checked. It then concatenates the character sets for digitCharset, lowerCaseCharset, upperCaseCharset, and
 * symbolCharset to form a complete character set.
 *
 * @returns {string} The complete character set.
 */
function updateCharset() {
    if (easyCharacters.checked) {
        for (let i = 0; i < ambiguousCharset.length; ++i) digitCharset = digitCharset.replace(new RegExp(ambiguousCharset[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
        for (let i = 0; i < ambiguousCharset.length; ++i) lowerCaseCharset = lowerCaseCharset.replace(new RegExp(ambiguousCharset[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
        for (let i = 0; i < ambiguousCharset.length; ++i) upperCaseCharset = upperCaseCharset.replace(new RegExp(ambiguousCharset[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
        for (let i = 0; i < ambiguousCharset.length; ++i) symbolCharset = symbolCharset.replace(new RegExp(ambiguousCharset[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
    } else {
        digitCharset = digits;
        lowerCaseCharset = lowerCase;
        upperCaseCharset = upperCase;
        symbolCharset = symbols;
    }

    charset = includeSymbolsCheckbox.checked ? digitCharset + lowerCaseCharset + upperCaseCharset + symbolCharset : digitCharset + lowerCaseCharset + upperCaseCharset;
    charsetLength = charset.length;
}


/************
 * Password *
 ************/
/**
 * @function textScrambleEffect
 * @description This function creates a scramble effect on the text. It gradually reveals the actual text by randomly
 * replacing characters in the text with characters from the character set.
 * @param {string} text - The text to be scrambled.
 */
function textScrambleEffect(text) {
    const baseDuration = 70;
    const durationVariance = 0.4;
    let textArray = new Array(text.length).fill('');

    let durations = [];
    for (let i = 0; i < text.length; ++i) {
        durations[i] = baseDuration * ((1 - durationVariance) + 2 * durationVariance * Math.random());
    }

    let counters = new Array(text.length).fill(0);
    let frameCounts = durations.map(duration => duration / 10);

    let intervalId = setInterval(function () {
        let allDone = true;
        for (let i = 0; i < text.length; ++i) {
            if (counters[i] < frameCounts[i]) {
                let num = Math.floor(Math.random() * charset.length);
                textArray[i] = charset.charAt(num);
                allDone = false;
                ++counters[i];
            } else {
                textArray[i] = text.charAt(i);
            }
        }

        password.value = textArray.join('');

        if (allDone) {
            clearInterval(intervalId);
        }
    }, 10);
}

/**
 * @function updatePassword
 * @description Generate a new password and update the displayed password.
 */
function updatePassword() {
    if (passwordLengthInput.value >= minPasswordLength && passwordLengthInput.value <= maxPasswordLength) {
        updateCharset();
        textScrambleEffect(generatePassword(Number(passwordLengthInput.value), charset));
        updateEntropy();
    }
}

updatePassword();

let lastValidValue = Number(passwordLengthInput.value);
let timeoutId = null;

passwordLengthInput.addEventListener('input', function () {
    let value = this.value;
    if (value === '') lastValidValue = '';
    value = Number(value);
    if (!isNaN(value) && value !== lastValidValue) {
        lastValidValue = value;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updatePassword, 650);
    } else {
        this.value = lastValidValue;
    }
});

passwordLengthInput.addEventListener('blur', function () {
    if (this.value === '' || this.value < minPasswordLength) {
        this.value = String(minPasswordLength);
        updatePassword();
    } else if (this.value > maxPasswordLength) {
        this.value = maxPasswordLength;
        updatePassword();
    }
});


/***********
 * Entropy *
 ***********/
/**
 * @function updateEntropy
 * @description Update the password entropy bar based on the current password.
 */
function updateEntropy() {
    const entropy = calculatePasswordEntropy(Number(passwordLengthInput.value), charset);
    updateEntropyBar(entropy);
}

/**
 * @function updateEntropyBar
 * @description Updates the color and width of the entropy bar based on the entropy value. The bar width is maxed out at 128 bits of entropy.
 * @param {number} entropy - The entropy value of the password.
 */
function updateEntropyBar(entropy) {
    const entropyBar = document.getElementById('entropy-bar');

    if (entropy < 0.35 * entropyForFullBar) {
        entropyBar.style.backgroundColor = '#ca2121'; // red-650
    } else if (entropy < 0.6 * entropyForFullBar) {
        entropyBar.style.backgroundColor = '#f8af19'; // amber-450
    } else if (entropy < 0.85 * entropyForFullBar) {
        entropyBar.style.backgroundColor = '#21c38b'; // emerald-460
    } else {
        entropyBar.style.backgroundColor = '#0d9185'; // teal-610
    }

    entropyBar.style.width = Math.min(entropy / entropyForFullBar * 100, 100) + '%';
}


/*******************************
 * Increase / Decrease buttons *
 *******************************/
const decreaseButton = document.getElementById('pw-length-decrease');
const increaseButton = document.getElementById('pw-length-increase');

increaseButton.addEventListener('click', function () {
    let value = Number(passwordLengthInput.value);
    if (value < 1024) {
        ++value;
        passwordLengthInput.value = String(value);
        updatePassword();
    }
});

decreaseButton.addEventListener('click', function () {
    let value = Number(passwordLengthInput.value);
    if (value > minPasswordLength) {
        --value;
        passwordLengthInput.value = String(value);
        updatePassword();
    }
});

/**
 * @function addIncreaseDecreaseListeners
 * @description This function adds event listeners to the increase or decrease button with a delay and repetition when the button is held down.
 * @param {HTMLElement} button - The button which is held down.
 * @param {Function} operation - The operation to be performed when the button is pressed.
 * @param {Function} condition - The condition that must be met for the operation to be performed.
 */
function addIncreaseDecreaseListeners(button, operation, condition) {
    let timeoutId = null;
    let intervalId = null;

    function startAction() {
        timeoutId = setTimeout(function () {
            intervalId = setInterval(function () {
                let value = Number(passwordLengthInput.value);
                if (condition(value)) {
                    operation();
                    updatePassword();
                }
            }, 20);
        }, 900);
    }

    function endAction() {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
    }

    button.addEventListener('mousedown', startAction);
    button.addEventListener('touchstart', startAction);

    button.addEventListener('mouseup', endAction);
    button.addEventListener('mouseleave', endAction);
    button.addEventListener('touchend', endAction);
    button.addEventListener('touchcancel', endAction);
}

addIncreaseDecreaseListeners(increaseButton, function () {
    let value = Number(passwordLengthInput.value);
    if (value < 1024) {
        passwordLengthInput.value = String(++value);
    }
}, function (value) {
    return value < 1024;
});

addIncreaseDecreaseListeners(decreaseButton, function () {
    let value = Number(passwordLengthInput.value);
    if (value > minPasswordLength) {
        passwordLengthInput.value = String(--value);
    }
}, function (value) {
    return value > minPasswordLength;
});


/****************************
 * Copy to clipboard button *
 ****************************/
const copyButton = document.getElementById('pw-copy');

copyButton.addEventListener('click', function () {
    const passwordText = password.value;
    password.focus();
    password.select();

    navigator.clipboard.writeText(passwordText).then(() => {
        const copiedElements = copyButton.querySelectorAll('.copied');
        const copyElements = copyButton.querySelectorAll('.copy');

        setTimeout(() => {
            copiedElements.forEach(element => element.style.opacity = '1');
        }, 150);

        copyElements.forEach(element => element.style.opacity = '0');

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            copiedElements.forEach(element => element.style.opacity = '0');
            copyElements.forEach(element => element.style.opacity = '1');
        }, 2500);
    });
});


/*****************
 * Other actions *
 *****************/
if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) {
    passwordLengthInput.addEventListener('click', function () {
        this.select();
    });

    password.addEventListener('click', function () {
        this.select();
    });
} else {
    passwordLengthInput.addEventListener('focus', function () {
        this.select();
    });

    password.addEventListener('focus', function () {
        this.select();
    });
}

refreshButton.addEventListener('click', updatePassword);

includeSymbolsCheckbox.addEventListener('click', function () {
    localStorage.setItem('includeSymbols', includeSymbolsCheckbox.checked);
    updatePassword();
});

easyCharacters.addEventListener('click', function () {
    localStorage.setItem('easyCharacters', easyCharacters.checked);
    updatePassword();
});

const refreshButtonSVG = refreshButton.querySelector('svg');
refreshButton.onclick = function () {
    clearTimeout(timeoutId);
    refreshButtonSVG.classList.add('rotate');
    timeoutId = setTimeout(() => refreshButtonSVG.classList.remove('rotate'), 750);
};