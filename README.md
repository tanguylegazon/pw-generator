# Password Generator

A simple password generator built using HTML, CSS, and JavaScript. This project is designed with privacy and security
in mind, all the code is run client-side, no data is stored or sent to a server.

## Features

- Generate cryptographically secure random passwords.
- Choose the length of the password.
- Choose to include special characters and/or exclude ambiguous characters.
- Exclude specific characters for the current session.
- Remember the two main options and the theme locally; passwords, length and custom exclusions are not saved.
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
- `assets/custom-css/5924e44.min.css`: Custom CSS bundled from commit
  `5924e447ccdf61ff001fcee18267213997809d26` (`design`), minified with CSSO 5.0.5 without rule restructuring.

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
