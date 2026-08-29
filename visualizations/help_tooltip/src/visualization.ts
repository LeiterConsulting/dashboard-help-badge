import { VisualizationAPI } from '@splunk/dashboard-studio-extension';
import type {
    DimensionsState,
    ModeState,
    ThemeState,
    TokensState,
    VisualizationOptionsState,
} from '@splunk/dashboard-studio-extension/visualization';
import {
    iconCharacter,
    normalizeRichOptions,
    type RawOptions,
    type Theme,
    type TokenValues,
} from '../../../src/help-options';
import { sizeIframeBody } from '../../../src/iframe-viewport';
import './visualization.css';

const host = document.getElementById('root') ?? document.body;
host.replaceChildren();

const root = document.createElement('div');
root.className = 'help-tooltip';

const button = document.createElement('button');
button.className = 'help-tooltip__badge';
button.type = 'button';
button.setAttribute('aria-haspopup', 'true');

const glyph = document.createElement('span');
glyph.className = 'help-tooltip__glyph';
glyph.setAttribute('aria-hidden', 'true');
button.appendChild(glyph);

const tooltip = document.createElement('div');
const tooltipId = `help-tooltip-${Math.random().toString(36).slice(2)}`;
tooltip.className = 'help-tooltip__card';
tooltip.id = tooltipId;
tooltip.setAttribute('role', 'tooltip');
button.setAttribute('aria-describedby', tooltipId);

const heading = document.createElement('div');
heading.className = 'help-tooltip__heading';

const body = document.createElement('div');
body.className = 'help-tooltip__body';

const pinHint = document.createElement('div');
pinHint.className = 'help-tooltip__pin-hint';

tooltip.append(heading, body, pinHint);
root.append(button, tooltip);
host.appendChild(root);

const state: {
    options: RawOptions;
    tokens: TokenValues;
    theme: Theme;
    mode: ModeState['mode'];
    pointerInside: boolean;
    focusInside: boolean;
    pinned: boolean;
    dismissed: boolean;
} = {
    options: {},
    tokens: {},
    theme: 'light',
    mode: 'view',
    pointerInside: false,
    focusInside: false,
    pinned: false,
    dismissed: false,
};

function isOpen(showOnHover: boolean): boolean {
    return (
        state.pinned ||
        (!state.dismissed && (state.focusInside || (showOnHover && state.pointerInside)))
    );
}

function render(): void {
    const options = normalizeRichOptions(state.options, state.tokens);
    if (!options.allowPin) state.pinned = false;
    const open = isOpen(options.showOnHover);

    root.dataset.anchor = options.anchor;
    root.dataset.iconStyle = options.iconStyle;
    root.dataset.mode = state.mode;
    root.dataset.theme = state.theme;
    root.style.setProperty('--help-accent', options.accentColor);
    root.style.setProperty('--help-accent-text', options.accentTextColor);
    root.style.setProperty('--help-icon-size', `${options.iconSize}px`);
    root.classList.toggle('help-tooltip--open', open);
    root.classList.toggle('help-tooltip--pinned', state.pinned);

    glyph.textContent = iconCharacter(options.iconGlyph);
    heading.textContent = options.heading;
    heading.hidden = !options.showHeading;
    body.textContent = options.helpText;
    pinHint.textContent = state.pinned ? 'Pinned — click the icon or press Escape to close.' : '';
    pinHint.hidden = !state.pinned;

    button.setAttribute('aria-label', options.accessibleLabel);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-pressed', String(state.pinned));
    button.removeAttribute('title');
    tooltip.setAttribute('aria-hidden', String(!open));
}

root.addEventListener('pointerenter', () => {
    state.pointerInside = true;
    state.dismissed = false;
    render();
});

root.addEventListener('pointerleave', () => {
    state.pointerInside = false;
    state.dismissed = false;
    render();
});

root.addEventListener('focusin', () => {
    state.focusInside = true;
    state.dismissed = false;
    render();
});

root.addEventListener('focusout', () => {
    queueMicrotask(() => {
        state.focusInside = root.contains(document.activeElement);
        if (!state.focusInside) state.dismissed = false;
        render();
    });
});

button.addEventListener('click', () => {
    const options = normalizeRichOptions(state.options, state.tokens);
    if (options.allowPin) {
        state.pinned = !state.pinned;
        state.dismissed = false;
    }
    render();
});

document.addEventListener('keydown', (event) => {
    const options = normalizeRichOptions(state.options, state.tokens);
    if (event.key !== 'Escape' || (!state.pinned && !isOpen(options.showOnHover))) return;
    state.pinned = false;
    state.pointerInside = false;
    button.focus();
    state.dismissed = true;
    render();
});

VisualizationAPI.addOptionsListener(
    ({ options }: VisualizationOptionsState) => {
        state.options = options;
        render();
    },
    { invokeImmediately: true }
);

VisualizationAPI.addDimensionsListener(
    ({ width, height }: DimensionsState) => sizeIframeBody(width, height),
    { invokeImmediately: true }
);

VisualizationAPI.addTokensListener(
    ({ tokens }: TokensState) => {
        state.tokens = tokens;
        render();
    },
    { invokeImmediately: true }
);

VisualizationAPI.addThemeListener(
    ({ theme }: ThemeState) => {
        state.theme = theme;
        render();
    },
    { invokeImmediately: true }
);

VisualizationAPI.addModeListener(
    ({ mode }: ModeState) => {
        state.mode = mode;
        render();
    },
    { invokeImmediately: true }
);

render();
