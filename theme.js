/*!
 * This material includes code from Custom CSS by tanguylegazon, licensed under the MIT License.
 * A copy of the license is available at https://github.com/tanguylegazon/custom-css/blob/main/LICENSE.
 */

(() => {
    const root = document.documentElement;
    const storageKey = 'password-theme';

    function readTheme() {
        try {
            return localStorage.getItem(storageKey);
        } catch (_) {
            return null;
        }
    }

    function applyTheme(theme) {
        if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
        else delete root.dataset.theme;
    }

    applyTheme(readTheme());

    document.addEventListener('DOMContentLoaded', () => {
        const navigation = document.querySelector('.password-header');
        let frame;
        function updateNavigation() {
            frame = null;
            navigation.toggleAttribute('data-scrolled', scrollY >= 24);
        }
        window.addEventListener('scroll', () => {
            if (!frame) frame = requestAnimationFrame(updateNavigation);
        }, {passive: true});
        window.addEventListener('pageshow', updateNavigation);
        updateNavigation();
        requestAnimationFrame(() => navigation.classList.add('is-ready'));

        const group = document.querySelector('.theme-switch');
        const buttons = group.querySelectorAll('.theme-switch-button');
        const labels = {light: 'Clair', auto: 'Auto', dark: 'Sombre'};

        function syncTheme(theme) {
            applyTheme(theme);
            const selected = root.dataset.theme || 'auto';
            group.dataset.selected = selected;
            group.querySelector('.theme-current-label').textContent = labels[selected];
            buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeValue === selected)));
        }

        buttons.forEach(button => button.addEventListener('click', () => {
            const theme = button.dataset.themeValue;
            syncTheme(theme);
            group.open = false;
            group.querySelector('summary').focus();
            try {
                if (theme === 'auto') localStorage.removeItem(storageKey);
                else localStorage.setItem(storageKey, theme);
            } catch {}
        }));

        document.addEventListener('click', event => {
            if (!group.contains(event.target)) group.open = false;
        });
        group.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                group.open = false;
                group.querySelector('summary').focus();
            }
        });
        window.addEventListener('storage', event => {
            if (event.key === storageKey || event.key === null) syncTheme(readTheme());
        });
        syncTheme(readTheme());
    });
})();
