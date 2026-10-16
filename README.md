# Password Generator

A simple password generator built using HTML, CSS, and JavaScript. This project is designed with privacy and security
in mind. All the code runs client-side; passwords are never stored or sent to a server.

## Features

- Generate cryptographically secure random passwords.
- Choose the length of the password.
- Choose to include special characters and/or exclude ambiguous characters.
- Exclude specific characters for the current session.
- Automatically select French or English from browser preferences, with English as the fallback.
- Choose the interface language from the footer.
- Remember the two main options, theme and explicit language choice locally; passwords, length and custom exclusions are not saved.
- See the password strength based on its entropy.

## Statistical randomness test

The generator is automatically tested for detectable bias across character frequencies, positions, pairs, binary
patterns, correlations and successive outputs. UI generation rules are checked against their expected distribution.

Run locally:

```sh
node --test tests/*.test.cjs
```

Statistical tests detect regressions; cryptographic security relies on Web Crypto and unbiased rejection sampling.
Passing these tests does not prove unpredictability or perfect randomness. The statistical error budget applies
separately to each test process. Deterministic tests also check rejection boundaries and deliberately biased generators.

## Project files

- `index.html`: The main project page.
- `style.css`: CSS styles for layout and visual elements.
- `script.js`: Main JavaScript script for UI interactions and display.
- `password.js`: JavaScript script for password generation.
- `exclusions.js`: Advanced character selection and popover positioning.
- `theme.js`: Theme preferences and navigation behavior.
- `i18n.js`: French and English translations, language detection and preferences.

Custom CSS is loaded through jsDelivr, pinned to distribution commit `dfdf1f3ed4a6fe4434e1aaa5d1ed3b12575ec559`,
built from source commit `b31d28944307bbe0c9b66af0288d41cc21676df2`. Updates are explicit.

> **Note:** The `password.js` file can be used as a standalone script to generate secure passwords in other project
> environments.

## Usage

### Setup

To use this generator, you can either:

1. Access the live version at [tanguy-bonandrini.fr/password](https://tanguy-bonandrini.fr/password).
2. Clone this repository and serve it with a local web server.

> **Note:** JavaScript modules require HTTP(S); opening `index.html` directly is not supported.

## License and third-party licenses

This project is licensed under the terms of the Mozilla Public License Version 2.0. See the [LICENSE](LICENSE) file for
details.

This project includes third-party materials, which are distributed under their own respective licenses. See the
[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) file for details.
