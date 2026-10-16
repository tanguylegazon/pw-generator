/*!
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {generatePassword, calculatePasswordEntropy, maxPasswordLength} from './password.js';

const minPasswordLength = 1;

const entropyForFullBar = 128;

const password = document.getElementById('pw-field');
const passwordAnimation = document.getElementById('pw-animation');
const passwordLengthInput = document.getElementById('pw-length');
const refreshButton = document.getElementById('pw-refresh');
const avoidSymbolsCheckbox = document.getElementById('avoid-symbols');
const avoidAmbiguousCheckbox = document.getElementById('avoid-ambiguous');
const excludedCharacters = document.getElementById('excluded-characters');
const exclusionsError = document.getElementById('exclusions-error');
const copyError = document.getElementById('copy-error');

excludedCharacters.value = '';


/*****************
 * Local storage *
 *****************/
function readPreference(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writePreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

const allowedSymbols = readPreference('allowSymbols');
const excludedSymbols = readPreference('excludeSymbols');
const allowedAmbiguous = readPreference('allowAmbiguous');
for (const [checkbox, key, fallback] of [
    [avoidSymbolsCheckbox, 'avoidSymbols', allowedSymbols !== null ? allowedSymbols === 'false'
        : excludedSymbols !== null ? excludedSymbols === 'true' : readPreference('includeSymbols') === 'false'],
    [avoidAmbiguousCheckbox, 'avoidAmbiguous', allowedAmbiguous !== null ? allowedAmbiguous === 'false'
        : readPreference('easyCharacters') === 'true'],
]) {
    const saved = readPreference(key);
    checkbox.checked = saved === null ? fallback : saved === 'true';
    writePreference(key, checkbox.checked);
}
try {
    localStorage.removeItem('rememberExclusions');
    localStorage.removeItem('excludedCharacters');
} catch {}


/***********
 * Charset *
 ***********/
let charset = "";
let requiredCharsets = [];
let currentPassword = "";
let passwordTimeoutId = null;
let animationFrameId = null;

const digitCharset = "0123456789";
const lowerCaseCharset = "abcdefghijklmnopqrstuvwxyz";
const upperCaseCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const symbolCharset = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const ambiguousCharset = "012CcIilOoXxZz!\"$&'+,/:;[\\]^`{|}~";

/**
 * @description Returns the character set allowed by the selected options, before custom exclusions.
 *
 * @returns {string} The complete character set.
 */
function getAvailableCharset() {
    const available =
        !avoidSymbolsCheckbox.checked ?
            digitCharset + lowerCaseCharset + upperCaseCharset + symbolCharset :
            digitCharset + lowerCaseCharset + upperCaseCharset;

    return Array.from(available).filter(char => !avoidAmbiguousCheckbox.checked || !ambiguousCharset.includes(char)).join('');
}

function updateCharset() {
    charset = getAvailableCharset();
    const excluded = new Set(excludedCharacters.value);
    charset = Array.from(charset).filter(char => !excluded.has(char)).join('');
    requiredCharsets = [digitCharset, lowerCaseCharset, upperCaseCharset, symbolCharset]
        .filter(set => Array.from(set).some(char => charset.includes(char)));
}

function hasAnyCharacterFromSet(text, set) {
    for (let i = 0; i < text.length; ++i) {
        if (set.includes(text[i])) return true;
    }
    return false;
}

function matchesUiConstraints(passwordText) {
    if (passwordText.length < requiredCharsets.length) return true;
    return requiredCharsets.every(set => hasAnyCharacterFromSet(passwordText, set));
}

function generatePasswordForUi(length) {
    let candidate = generatePassword(length, charset);

    while (!matchesUiConstraints(candidate)) {
        candidate = generatePassword(length, charset);
    }

    return candidate;
}


/************
 * Password *
 ************/
function updatePassword() {
    const length = Number(passwordLengthInput.value);
    if (Number.isSafeInteger(length) && length >= minPasswordLength && length <= maxPasswordLength) {
        clearTimeout(passwordTimeoutId);
        passwordTimeoutId = null;
        copyError.hidden = true;
        const empty = charset.length === 0;
        exclusionsError.hidden = !empty;
        excludedCharacters.setAttribute('aria-invalid', String(empty));
        document.getElementById('pw-copy').disabled = empty;
        refreshButton.disabled = empty;
        if (empty) {
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            currentPassword = '';
            password.value = '';
            passwordAnimation.hidden = true;
            password.classList.remove('scrambling');
            updateEntropyBar(0);
            return;
        }
        currentPassword = generatePasswordForUi(Number(passwordLengthInput.value));
        password.value = currentPassword;
        textScrambleEffect(currentPassword);
        updateEntropy();
    }
}

/**
 * @description This function creates a scramble effect on the text. It gradually reveals the actual text by randomly
 * replacing characters in the text with characters from the character set.
 * @param {string} text - The text to be scrambled.
 */
function textScrambleEffect(text) {
    const baseDuration = 200;
    const durationVariance = 0.4;
    const textArray = new Array(text.length).fill('');

    const durations = [];
    for (let i = 0; i < text.length; ++i) {
        durations[i] =
            baseDuration * ((1 - durationVariance) + 2 * durationVariance * Math.random());
    }

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        password.classList.remove('scrambling');
        passwordAnimation.hidden = true;
        return;
    }

    const startTime = performance.now();
    password.classList.add('scrambling');
    passwordAnimation.hidden = false;

    function updateFrame(currentTime) {
        let allDone = true;
        for (let i = 0; i < text.length; ++i) {
            if (currentTime - startTime < durations[i]) {
                const num = Math.floor(Math.random() * charset.length);
                textArray[i] = charset.charAt(num);
                allDone = false;
            } else {
                textArray[i] = text.charAt(i);
            }
        }

        passwordAnimation.value = textArray.join('');

        if (allDone) {
            password.classList.remove('scrambling');
            passwordAnimation.hidden = true;
            animationFrameId = null;
        } else {
            animationFrameId = requestAnimationFrame(updateFrame);
        }
    }

    updateFrame(startTime);
}

updateCharset();
updatePassword();


/***********
 * Entropy *
 ***********/
function updateEntropy() {
    const entropy = calculatePasswordEntropy(Number(passwordLengthInput.value), charset);
    updateEntropyBar(entropy);
}

/**
 * @description Updates the color and width of the entropy bar based on the entropy value. The bar width is maxed out
 * at 128 bits of entropy.
 * @param {number} entropy - The entropy value of the password.
 */
function updateEntropyBar(entropy) {
    const entropyBar = document.getElementById('entropy-bar');

    if (entropy < 0.33 * entropyForFullBar) {
        entropyBar.style.backgroundColor = 'var(--strength-danger)';
    } else if (entropy < 0.6 * entropyForFullBar) {
        entropyBar.style.backgroundColor = 'var(--strength-warning)';
    } else if (entropy < 0.85 * entropyForFullBar) {
        entropyBar.style.backgroundColor = 'var(--strength-good)';
    } else {
        entropyBar.style.backgroundColor = 'var(--strength-excellent)';
    }

    entropyBar.style.inlineSize = Math.min(entropy / entropyForFullBar * 100, 100) + '%';
    entropyBar.parentElement.setAttribute('aria-valuenow', Math.min(entropy, entropyForFullBar));
    entropyBar.parentElement.setAttribute('aria-valuetext', Math.round(entropy) + ' bits théoriques');
}


/*************************
 * Password length input *
 *************************/
passwordLengthInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');
    clearTimeout(passwordTimeoutId);
    if (Number(this.value) !== currentPassword.length) {
        passwordTimeoutId = setTimeout(updatePassword, 650);
    }
});

passwordLengthInput.addEventListener('blur', function () {
    clearTimeout(passwordTimeoutId);
    this.value = String(Math.max(minPasswordLength, Math.min(maxPasswordLength, Number(this.value))));
    if (Number(this.value) !== currentPassword.length) updatePassword();
});

/*****************************
 * Password length increment *
 *****************************/
const decreaseButton = document.getElementById('pw-length-decrease');
const increaseButton = document.getElementById('pw-length-increase');

function increasePasswordLength() {
    if (passwordLengthInput.value < maxPasswordLength) {
        let value = Number(passwordLengthInput.value);
        passwordLengthInput.value = String(++value);
        updatePassword();
    }
}

function decreasePasswordLength() {
    if (passwordLengthInput.value > minPasswordLength) {
        let value = Number(passwordLengthInput.value);
        passwordLengthInput.value = String(--value);
        updatePassword();
    }
}

/**
 * @description This function listens for the arrow up and arrow down keys to increase or decrease the password length.
 * @param event - The keydown event.
 */
function increaseDecreaseArrowKeys(event) {
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        increasePasswordLength();
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        decreasePasswordLength();
    }
}

/**
 * @description This function adds event listeners to the increase or decrease button with a delay and repetition when
 * the button is held down.
 * @param {HTMLElement} button - The button which is held down.
 * @param {Function} operation - The operation to be performed when the button is pressed.
 */
function addIncreaseDecreaseListeners(button, operation) {
    let timeoutId = null;
    let intervalId = null;

    function startAction(event) {
        if (event.button !== 0) return;
        endAction();
        button.setPointerCapture(event.pointerId);
        timeoutId = setTimeout(() => {
            intervalId = setInterval(operation, 20);
        }, 900);
    }

    function endAction() {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
    }

    button.addEventListener('pointerdown', startAction);
    button.addEventListener('pointerup', endAction);
    button.addEventListener('pointercancel', endAction);
    button.addEventListener('lostpointercapture', endAction);
    window.addEventListener('blur', endAction);
    document.addEventListener('visibilitychange', endAction);
}

increaseButton.addEventListener('click', increasePasswordLength);
decreaseButton.addEventListener('click', decreasePasswordLength);
addIncreaseDecreaseListeners(increaseButton, increasePasswordLength);
addIncreaseDecreaseListeners(decreaseButton, decreasePasswordLength);


/****************************
 * Copy to clipboard button *
 ****************************/
const copyButton = document.getElementById('pw-copy');

let clipboardTimeoutId = null;

copyButton.addEventListener('click', async () => {
    password.focus();
    password.select();
    copyError.hidden = true;

    try {
        await navigator.clipboard.writeText(currentPassword);
        const copiedElements = copyButton.querySelectorAll('.copied');
        const copyElements = copyButton.querySelectorAll('.copy');

        copiedElements.forEach(element => element.style.opacity = '1');
        copyElements.forEach(element => element.style.opacity = '0');

        if (clipboardTimeoutId) {
            clearTimeout(clipboardTimeoutId);
        }

        clipboardTimeoutId = setTimeout(() => {
            copiedElements.forEach(element => element.style.opacity = '0');
            copyElements.forEach(element => element.style.opacity = '1');
        }, 2500);
    } catch {
        copyError.hidden = false;
    }
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

passwordLengthInput.addEventListener('keydown', increaseDecreaseArrowKeys);

excludedCharacters.addEventListener('input', () => {
    const value = excludedCharacters.value;
    const unique = Array.from(new Set(value)).join('');
    if (value !== unique) {
        const start = Array.from(new Set(value.slice(0, excludedCharacters.selectionStart))).join('').length;
        const end = Array.from(new Set(value.slice(0, excludedCharacters.selectionEnd))).join('').length;
        excludedCharacters.value = unique;
        excludedCharacters.setSelectionRange(start, end);
    }
    const previousCharset = charset;
    updateCharset();
    if (charset !== previousCharset) updatePassword();
});

for (const [checkbox, key] of [[avoidSymbolsCheckbox, 'avoidSymbols'], [avoidAmbiguousCheckbox, 'avoidAmbiguous']]) {
    checkbox.addEventListener('change', () => {
        writePreference(key, checkbox.checked);
        updateCharset();
        updatePassword();
    });
}

const refreshButtonSVG = refreshButton.querySelector('svg');
refreshButton.addEventListener('click', () => {
    updatePassword();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    refreshButtonSVG.classList.add('rotate');
    refreshButtonSVG.getAnimations().forEach(animation => animation.currentTime = 0);
});
for (const event of ['animationend', 'animationcancel']) {
    refreshButtonSVG.addEventListener(event, () => refreshButtonSVG.classList.remove('rotate'));
}

export {getAvailableCharset};
