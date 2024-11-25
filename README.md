# Password Generator

A simple password generator built using HTML, CSS, and JavaScript. This project is designed with privacy and security in
mind, all the code is run client-side, no data is sent to a server.

## Features

- Generate cryptographically secure random passwords<sup>1</sup>.
- Choose the length of the password.
- Choose to include special characters and/or exclude ambiguous characters.
- See the password strength based on its entropy.

## Project files

- `index.html`: The main project page.
- `style.css`: CSS styles for layout and visual elements.
- `script.js`: JavaScript script for application logic.

### Setup

To use this generator, you can either:

1. Access the live version at [tanguy-portfolio.com/password](https://tanguy-portfolio.com/password).
2. Clone the repository and open `index.html` in your web browser.

## License and third-party licenses

This project is licensed under the terms of the MIT License. For more information, see the [LICENSE](LICENSE) file.

For information on the licenses of third-party components included in this project, see
the [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) file.

---

<sup>1</sup> If possible, the generator ensures at least one digit, one lowercase, one uppercase and one special
character. While this may theoretically reduce entropy, it enhances security against attackers unaware of the password
generation process.
