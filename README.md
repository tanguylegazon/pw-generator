# Password Generator

A simple password generator built using HTML, CSS, and JavaScript. This project is designed with privacy and security in
mind, all the code is run client-side, no data is stored or sent to a server.

## Features

- Generate cryptographically secure random passwords<sup>1</sup>.
- Choose the length of the password.
- Choose to include special characters and/or exclude ambiguous characters.
- See the password strength based on its entropy.

## Project files

- `index.html`: The main project page.
- `style.css`: CSS styles for layout and visual elements.
- `script.js`: Main JavaScript script for UI interactions and display.
- `password.js`: JavaScript script for password generation.

> **Note:** The `password.js` file can be used as a standalone script to generate secure passwords in other project
> environments.

## Usage

### Setup

To use this generator, you can either:

1. Access the live version at [tanguy-portfolio.com/password](https://tanguy-portfolio.com/password).
2. Clone this repository and open `index.html` in your web browser.

## License and third-party licenses

This project is licensed under the terms of the Mozilla Public License Version 2.0. See the [LICENSE](LICENSE) file for
details.

This project includes third-party components distributed under their own respective licenses. See
the [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) file for details.

---

<sup>1</sup> The generator ensures at least one digit, one lowercase, one uppercase and one special character. While
this may mathematically reduce entropy, it enhances security against attackers unaware of the password generation
process.
