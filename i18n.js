/*!
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const i18n = (() => {
    const root = document.documentElement;
    const storageKey = 'password-language';
    const messages = {
        en: {
            title: 'Tanguy Bonandrini – Password generator',
            description: 'Password generator designed with cryptographic security and user privacy in mind.',
            heading: 'Password generator',
            chooseTheme: 'Choose theme',
            theme: 'Theme',
            light: 'Light',
            auto: 'Auto',
            dark: 'Dark',
            passwordLength: 'Password length',
            decreaseLength: 'Decrease password length',
            increaseLength: 'Increase password length',
            generatedPassword: 'Generated password',
            regenerate: 'Generate a new password',
            strength: 'Password strength',
            entropy: '{bits} theoretical bits',
            copyPassword: 'Copy password',
            copy: 'Copy',
            avoidSymbols: 'Avoid special characters',
            avoidAmbiguous: 'Avoid ambiguous characters',
            advancedOptions: 'Advanced options',
            noCharacters: 'No characters available. Change the options or exclusions.',
            copyFailed: 'Unable to copy. Copy the selected password manually.',
            excludedCharacters: 'Excluded characters',
            resetExclusions: 'Reset exclusions',
            reset: 'Reset',
            letters: 'Letters',
            digits: 'Numbers',
            symbols: 'Symbols',
            allowCharacter: 'Allow {character}',
            privacy: 'Your passwords stay on your device.',
            sourceCode: 'View the source code on GitHub',
            language: 'Language',
        },
        fr: {
            title: 'Tanguy Bonandrini – Générateur de mots de passe',
            description: 'Générateur de mots de passe respectant les bonnes pratiques en matière de sécurité cryptographique et de vie privée des utilisateurs.',
            heading: 'Générateur de mots de passe',
            chooseTheme: 'Choisir le thème',
            theme: 'Thème',
            light: 'Clair',
            auto: 'Auto',
            dark: 'Sombre',
            passwordLength: 'Longueur du mot de passe',
            decreaseLength: 'Diminuer la taille du mot de passe',
            increaseLength: 'Augmenter la taille du mot de passe',
            generatedPassword: 'Mot de passe généré',
            regenerate: 'Générer un nouveau mot de passe',
            strength: 'Robustesse du mot de passe',
            entropy: '{bits} bits théoriques',
            copyPassword: 'Copier le mot de passe',
            copy: 'Copier',
            avoidSymbols: 'Éviter les caractères spéciaux',
            avoidAmbiguous: 'Éviter les caractères ambigus',
            advancedOptions: 'Options avancées',
            noCharacters: 'Aucun caractère disponible. Modifiez les options ou les exclusions.',
            copyFailed: 'Copie impossible. Copiez manuellement le mot de passe sélectionné.',
            excludedCharacters: 'Caractères exclus',
            resetExclusions: 'Réinitialiser les exclusions',
            reset: 'Réinitialiser',
            letters: 'Lettres',
            digits: 'Chiffres',
            symbols: 'Symboles',
            allowCharacter: 'Autoriser {character}',
            privacy: 'Vos mots de passe restent sur votre appareil.',
            sourceCode: 'Voir le code source sur GitHub',
            language: 'Langue',
        },
    };

    function readLanguage() {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved === 'fr' || saved === 'en' ? saved : null;
        } catch {
            return null;
        }
    }

    function detectLanguage() {
        for (const locale of navigator.languages || [navigator.language]) {
            const language = locale?.toLowerCase().split('-')[0];
            if (language === 'fr' || language === 'en') return language;
        }
        return 'en';
    }

    let preferredLanguage = readLanguage();
    let language = preferredLanguage || detectLanguage();
    root.lang = language;

    function translate(key, values = {}) {
        const message = messages[language][key] ?? messages.en[key];
        return message.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
    }

    function applyLanguage() {
        root.lang = language;
        for (const attribute of ['', 'aria-label', 'title', 'content']) {
            const name = 'data-i18n' + (attribute ? '-' + attribute : '');
            for (const element of document.querySelectorAll('[' + name + ']')) {
                const text = translate(element.getAttribute(name), element.dataset);
                if (attribute) element.setAttribute(attribute, text);
                else element.textContent = text;
            }
        }
        document.getElementById('language').value = language;
        document.dispatchEvent(new Event('languagechange'));
    }

    document.addEventListener('DOMContentLoaded', () => {
        try {
            applyLanguage();
            document.getElementById('language').addEventListener('change', event => {
                preferredLanguage = event.target.value;
                language = preferredLanguage;
                try {
                    localStorage.setItem(storageKey, language);
                } catch {}
                applyLanguage();
            });
        } finally {
            root.removeAttribute('data-i18n-pending');
        }
    });

    window.addEventListener('languagechange', () => {
        if (preferredLanguage) return;
        language = detectLanguage();
        if (document.readyState !== 'loading') applyLanguage();
    });
    window.addEventListener('storage', event => {
        if (event.key !== storageKey && event.key !== null) return;
        preferredLanguage = readLanguage();
        language = preferredLanguage || detectLanguage();
        if (document.readyState !== 'loading') applyLanguage();
    });

    root.setAttribute('data-i18n-pending', '');
    return {translate};
})();
