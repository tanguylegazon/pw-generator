/*!
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {generatePassword, calculatePasswordEntropy, maxPasswordLength} from './password.js';

/**
 * @constant {number} minPasswordLength
 * @description The minimum length that a password can be.
 */
const minPasswordLength = 1;

/**
 * @constant {number} entropyForFullBar
 * @description The entropy value (in bits) required to completely fill the password strength bar.
 */
const entropyForFullBar = 128;

const password = document.getElementById('pw-field');
const passwordAnimation = document.getElementById('pw-animation');
const passwordLengthInput = document.getElementById('pw-length');
const refreshButton = document.getElementById('pw-refresh');
const avoidSymbolsCheckbox = document.getElementById('avoid-symbols');
const avoidAmbiguousCheckbox = document.getElementById('avoid-ambiguous');
const excludedCharacters = document.getElementById('excluded-characters');
const exclusionsError = document.getElementById('exclusions-error');

excludedCharacters.value = '';
for (const key of ['rememberExclusions', 'excludedCharacters']) {
    if (localStorage.getItem(key) !== null) localStorage.removeItem(key);
}


/*****************
 * Local storage *
 *****************/
if (localStorage.getItem('avoidSymbols') === null) {
    const allowed = localStorage.getItem('allowSymbols');
    const excluded = localStorage.getItem('excludeSymbols');
    localStorage.setItem('avoidSymbols', allowed !== null ? allowed === 'false' : excluded !== null ? excluded === 'true' : localStorage.getItem('includeSymbols') === 'false');
}
if (localStorage.getItem('avoidAmbiguous') === null) {
    const allowed = localStorage.getItem('allowAmbiguous');
    localStorage.setItem('avoidAmbiguous', allowed !== null ? allowed === 'false' : localStorage.getItem('easyCharacters') === 'true');
}
for (const [checkbox, key] of [[avoidSymbolsCheckbox, 'avoidSymbols'], [avoidAmbiguousCheckbox, 'avoidAmbiguous']]) {
    if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, checkbox.checked);
    } else {
        checkbox.checked = localStorage.getItem(key) === 'true';
    }
}


/***********
 * Charset *
 ***********/
let charset = "";
let charsetLength = 0;
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
 * @function getAvailableCharset
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
    charsetLength = charset.length;
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
/**
 * @function updatePassword
 * @description Generate a new password and update the displayed password.
 */
function updatePassword() {
    if (passwordLengthInput.value >= minPasswordLength && passwordLengthInput.value <= maxPasswordLength) {
        clearTimeout(passwordTimeoutId);
        passwordTimeoutId = null;
        updateCharset();
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
 * @function textScrambleEffect
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

updatePassword();


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
 * @description Updates the color and width of the entropy bar based on the entropy value. The bar width is maxed out
 * at 128 bits of entropy.
 * @param {number} entropy - The entropy value of the password.
 */
function updateEntropyBar(entropy) {
    const entropyBar = document.getElementById('entropy-bar');

    if (entropy < 0.33 * entropyForFullBar) {
        entropyBar.style.backgroundColor = '#e2302f'; // red-570
    } else if (entropy < 0.6 * entropyForFullBar) {
        entropyBar.style.backgroundColor = '#f59e0b'; // amber-500
    } else if (entropy < 0.85 * entropyForFullBar) {
        entropyBar.style.backgroundColor = '#84cc16'; // lime-500
    } else {
        entropyBar.style.backgroundColor = '#08a070'; // emerald-570
    }

    entropyBar.style.inlineSize = Math.min(entropy / entropyForFullBar * 100, 100) + '%';
    entropyBar.parentElement.setAttribute('aria-valuenow', Math.min(entropy, entropyForFullBar));
    entropyBar.parentElement.setAttribute('aria-valuetext', Math.round(entropy) + ' bits théoriques');
}


/*************************
 * Password length input *
 *************************/
let lastValidLength = Number(passwordLengthInput.value);

passwordLengthInput.addEventListener('beforeinput', function (event) {
    if (event.data && /\D/.test(event.data)) {
        event.preventDefault();
    }
});

passwordLengthInput.addEventListener('input', function () {
    let value = this.value;
    if (value === '') lastValidLength = '';
    value = Number(value);
    if (!isNaN(value) && value !== lastValidLength) {
        lastValidLength = value;
        clearTimeout(passwordTimeoutId);
        passwordTimeoutId = setTimeout(updatePassword, 650);
    } else {
        this.value = lastValidLength;
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

/*****************************
 * Password length increment *
 *****************************/
const decreaseButton = document.getElementById('pw-length-decrease');
const increaseButton = document.getElementById('pw-length-increase');

/**
 * @function increasePasswordLength
 * @description Increase the password length by one.
 */
function increasePasswordLength() {
    if (passwordLengthInput.value < maxPasswordLength) {
        let value = Number(passwordLengthInput.value);
        passwordLengthInput.value = String(++value);
        updatePassword();
    }
}

/**
 * @function decreasePasswordLength
 * @description Decrease the password length by one.
 */
function decreasePasswordLength() {
    if (passwordLengthInput.value > minPasswordLength) {
        let value = Number(passwordLengthInput.value);
        passwordLengthInput.value = String(--value);
        updatePassword()
    }
}

/**
 * @function increaseDecreaseArrowKeys
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
 * @function addIncreaseDecreaseListeners
 * @description This function adds event listeners to the increase or decrease button with a delay and repetition when
 * the button is held down.
 * @param {HTMLElement} button - The button which is held down.
 * @param {Function} operation - The operation to be performed when the button is pressed.
 */
function addIncreaseDecreaseListeners(button, operation) {
    let timeoutId = null;
    let intervalId = null;

    function startAction() {
        timeoutId = setTimeout(() => {
            intervalId = setInterval(operation, 20);
        }, 900);
    }

    function endAction() {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        if (password.value.length !== Number(passwordLengthInput.value)) updatePassword();
    }

    button.addEventListener('mousedown', startAction);
    button.addEventListener('touchstart', startAction, {passive: true});

    button.addEventListener('mouseup', endAction);
    button.addEventListener('mouseleave', endAction);
    button.addEventListener('touchend', endAction, {passive: true});
    button.addEventListener('touchcancel', endAction, {passive: true});
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

    try {
        await navigator.clipboard.writeText(currentPassword);
        const copiedElements = copyButton.querySelectorAll('.copied');
        const copyElements = copyButton.querySelectorAll('.copy');

        setTimeout(() => {
            copiedElements.forEach(element => element.style.opacity = '1');
        }, 150);

        copyElements.forEach(element => element.style.opacity = '0');

        if (clipboardTimeoutId) {
            clearTimeout(clipboardTimeoutId);
        }

        clipboardTimeoutId = setTimeout(() => {
            copiedElements.forEach(element => element.style.opacity = '0');
            copyElements.forEach(element => element.style.opacity = '1');
        }, 2500);
    } catch (error) {
        console.error('Failed to copy password.', error);
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
        passwordLengthInput.addEventListener('keydown', increaseDecreaseArrowKeys);
    });

    password.addEventListener('focus', function () {
        this.select();
    });
}

refreshButton.addEventListener('click', updatePassword);

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
        localStorage.setItem(key, checkbox.checked);
        updatePassword();
    });
}

const refreshButtonSVG = refreshButton.querySelector('svg');
let refreshTimeoutId = null;

refreshButton.onclick = () => {
    clearTimeout(refreshTimeoutId);
    refreshButtonSVG.classList.add('rotate');
    refreshTimeoutId = setTimeout(() =>
        refreshButtonSVG.classList.remove('rotate'), 750
    );
};

export {getAvailableCharset};
