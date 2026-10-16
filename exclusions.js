/*!
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {getAvailableCharset} from './script.js';

const exclusions = document.getElementById('excluded-characters');
const list = document.getElementById('character-list');
const count = document.getElementById('excluded-count');

for (const [name, characters] of [
    ['Lettres', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'],
    ['Chiffres', '0123456789'],
    ['Symboles', '()[]{}<>.,;:!?\'"`+-=*/\\|_~^%&#@$'],
]) {
    const section = document.createElement('details');
    section.className = 'small rounded';
    const heading = document.createElement('summary');
    heading.textContent = name;
    const group = document.createElement('div');
    group.className = 'character-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', name);
    for (const character of characters) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'toggle small rounded';
        input.value = character;
        input.setAttribute('aria-label', 'Autoriser ' + character);
        label.append(input, character);
        group.append(label);
    }
    section.append(heading, group);
    list.append(section);
}

function updateChoices() {
    const excluded = new Set(exclusions.value);
    const available = getAvailableCharset();
    count.textContent = excluded.size ? '(' + excluded.size + ')' : '';
    count.hidden = excluded.size === 0;
    for (const input of list.querySelectorAll('input')) {
        input.disabled = !available.includes(input.value);
        input.checked = !input.disabled && !excluded.has(input.value);
    }
}

list.addEventListener('change', event => {
    const excluded = new Set(exclusions.value);
    if (event.target.checked) excluded.delete(event.target.value);
    else excluded.add(event.target.value);
    exclusions.value = Array.from(excluded).join('');
    exclusions.dispatchEvent(new Event('input', {bubbles: true}));
});

document.getElementById('reset-exclusions').addEventListener('click', () => {
    exclusions.value = '';
    exclusions.dispatchEvent(new Event('input', {bubbles: true}));
});

document.getElementById('avoid-symbols').addEventListener('change', updateChoices);
document.getElementById('avoid-ambiguous').addEventListener('change', updateChoices);
exclusions.addEventListener('input', updateChoices);
updateChoices();

const panel = document.getElementById('exclusions-panel');
const button = document.getElementById('advanced-options');

function positionPanel() {
    if (!panel.matches(':popover-open')) return;
    const anchor = button.getBoundingClientRect();
    const gap = 8;
    const margin = 16;
    const below = window.innerHeight - anchor.bottom - gap - margin;
    const above = anchor.top - gap - margin;
    const placeBelow = below >= Math.min(panel.scrollHeight, 320) || below >= above;
    panel.style.maxBlockSize = Math.max(0, placeBelow ? below : above) + 'px';
    panel.style.left = Math.max(margin, Math.min(anchor.right - panel.offsetWidth,
        window.innerWidth - panel.offsetWidth - margin)) + 'px';
    panel.style.top = (placeBelow ? anchor.bottom + gap : anchor.top - panel.offsetHeight - gap) + 'px';
}

panel.addEventListener('toggle', positionPanel);
new ResizeObserver(positionPanel).observe(panel);
window.addEventListener('resize', positionPanel);
window.addEventListener('scroll', positionPanel, true);
