/**
 * @constant minPasswordLength
 * @description The minimum length that a script can be.
 */
const minPasswordLength = 1;

const script = document.getElementById('pw-text');
const passwordLengthInput = document.getElementById('pw-length');
const refreshButton = document.getElementById('pw-refresh');
const includeSymbolsCheckbox = document.getElementById('include-symbols');
const avoidComplicatedCharactersCheckbox = document.getElementById('avoid-complicated-characters');
const includeSymbolsLabel = document.getElementById('include-symbols-label');
const avoidComplicatedCharactersLabel = document.getElementById('avoid-complicated-characters-label');

includeSymbolsCheckbox.checked = true;
avoidComplicatedCharactersCheckbox.checked = false;


/*****************
 * Local storage *
 *****************/
if (localStorage.getItem('includeSymbols') === null) {
    localStorage.setItem('includeSymbols', includeSymbolsCheckbox.checked);
} else {
    includeSymbolsCheckbox.checked = localStorage.getItem('includeSymbols') === 'true';
}

if (localStorage.getItem('avoidComplicatedCharacters') === null) {
    localStorage.setItem('avoidComplicatedCharacters', avoidComplicatedCharactersCheckbox.checked);
} else {
    avoidComplicatedCharactersCheckbox.checked = localStorage.getItem('avoidComplicatedCharacters') === 'true';
}

includeSymbolsCheckbox.checked ? includeSymbolsLabel.classList.add('active') : includeSymbolsLabel.classList.remove('active');
avoidComplicatedCharactersCheckbox.checked ? avoidComplicatedCharactersLabel.classList.add('active') : avoidComplicatedCharactersLabel.classList.remove('active');


/***********
 * Charset *
 ***********/
let charset = "";
let charsetLength = 0;
const complicatedCharset = "1Il0Oo\"',;[\\]^`{|}~";

let digitCharset = "";
for (let i = 48; i <= 57; ++i) digitCharset += String.fromCharCode(i);

let letterCharset = "";
for (let i = 65, j = 97; i <= 90; ++i, ++j) letterCharset += String.fromCharCode(i) + String.fromCharCode(j);

let symbolCharset = "";
for (let i = 33; i <= 47; ++i) symbolCharset += String.fromCharCode(i);
for (let i = 58; i <= 64; ++i) symbolCharset += String.fromCharCode(i);
for (let i = 91; i <= 96; ++i) symbolCharset += String.fromCharCode(i);
for (let i = 123; i <= 126; ++i) symbolCharset += String.fromCharCode(i);

/**
 * @function updateCharset
 * @description This function concatenates the character sets for digits, letters, and symbols to form a complete character set.
 * @returns {string} The concatenated string of digitCharset, letterCharset, and symbolCharset.
 */
function updateCharset() {
    charset = includeSymbolsCheckbox.checked ? digitCharset + letterCharset + symbolCharset : digitCharset + letterCharset;

    if (avoidComplicatedCharactersCheckbox.checked) {
        for (let i = 0; i < complicatedCharset.length; ++i) charset = charset.replace(new RegExp(complicatedCharset[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
    }

    charsetLength = charset.length;
}


/******************
 * Password logic *
 ******************/
/**
 * @function textScrambleEffect
 * @description This function creates a scramble effect on the text. It gradually reveals the actual text by randomly
 * replacing characters in the text with characters from the charset .
 * @param {string} text - The text to be scrambled.
 */
function textScrambleEffect(text) {
    const baseDuration = 50;
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

        script.value = textArray.join('');

        if (allDone) {
            clearInterval(intervalId);
        }
    }, 10);
}

/**
 * @function shuffleString
 * @description This function shuffles the characters in a string in a random order. It uses the Fisher-Yates shuffle algorithm.
 * @param {string} string - The string to be shuffled.
 *
 * @returns {string} The shuffled string.
 */
function shuffleString(string) {
    let array = string.split("");
    let oldElement;

    for (let i = array.length - 1; i >= 0; --i) {
        let randomValue = 0;

        do {
            randomValue = window.crypto.getRandomValues(new Uint16Array(1))[0];
        } while (randomValue >= Math.floor((2 ** 16 - 1) / array.length) * array.length);

        oldElement = array[i];
        array[i] = array[randomValue];
        array[randomValue] = oldElement;
    }

    return array.join("");
}

/**
 * @function getSecureRandom
 * @description This function generates a secure random character from the provided character set.
 * If the 'avoidComplicatedCharactersCheckbox' is checked, it only generates non-confusing characters.
 * @param {string} charset - The character set.
 *
 * @returns {string} A single character randomly selected from the provided character set.
 */
function getSecureRandom(charset) {
    let randomValue, character;

    do {
        do {
            randomValue = window.crypto.getRandomValues(new Uint8Array(1))[0];
        } while (randomValue >= Math.floor(256 / charset.length) * charset.length);
        character = charset.charAt(randomValue % charset.length);
    } while (avoidComplicatedCharactersCheckbox.checked && complicatedCharset.includes(character));

    return character;
}

/**
 * @function generatePassword
 * @description This function generates a script based on the user's input for length and whether to include symbols.
 * It ensures that the script contains at least one digit, one letter, and one symbol (if symbols are included).
 *
 * @returns {string} The generated script.
 */
function generatePassword() {
    const length = passwordLengthInput.value;
    let result = "";  // Initialize result as an empty string

    updateCharset();

    if (length >= 3) {
        result += getSecureRandom(digitCharset);
        result += getSecureRandom(letterCharset);
        if (includeSymbolsCheckbox.checked) {
            result += getSecureRandom(symbolCharset);
        }
    }

    for (let i = result.length; i < length; ++i) {
        result += getSecureRandom(charset);
    }

    textScrambleEffect(shuffleString(result));
    return shuffleString(result);
}

/**
 * @function updatePassword
 * @description Updates the displayed script on the webpage by generating a new script and setting it as the text content of the 'script' element.
 */
function updatePassword() {
    if (passwordLengthInput.value <= 1024) script.value = generatePassword();
}

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
    } else if (this.value > 1024) {
        this.value = 1024;
        updatePassword();
    }
});

updatePassword();


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
            }, 25);
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
const copyMessage = document.getElementById('pw-copy-message');
const copyButton = document.getElementById('pw-copy');

copyButton.addEventListener('click', function () {
    const passwordText = script.value;
    script.focus();
    script.select();

    navigator.clipboard.writeText(passwordText).then(() => {
        copyMessage.style.opacity = '1';
        copyMessage.style.visibility = 'visible';

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            copyMessage.style.opacity = '0';
            copyMessage.style.visibility = 'hidden';
        }, 4500);
    });
});


/*****************
 * Other actions *
 *****************/
if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) {
    passwordLengthInput.addEventListener('click', function () {
        this.select();
    });

    script.addEventListener('click', function () {
        this.select();
    });
} else {
    passwordLengthInput.addEventListener('focus', function () {
        this.select();
    });

    script.addEventListener('focus', function () {
        this.select();
    });
}

refreshButton.addEventListener('click', updatePassword);

includeSymbolsCheckbox.addEventListener('click', function () {
    includeSymbolsLabel.classList.toggle('active');
    localStorage.setItem('includeSymbols', includeSymbolsCheckbox.checked);
    updatePassword();
});

avoidComplicatedCharactersCheckbox.addEventListener('click', function () {
    avoidComplicatedCharactersLabel.classList.toggle('active');
    localStorage.setItem('avoidComplicatedCharacters', avoidComplicatedCharactersCheckbox.checked);
    updatePassword();
});

const refreshButtonSVG = refreshButton.querySelector('svg');
refreshButton.onclick = function () {
    refreshButtonSVG.classList.add('rotate');
    setTimeout(() => refreshButtonSVG.classList.remove('rotate'), 800);
};