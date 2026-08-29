import { VisualizationAPI } from '@splunk/dashboard-studio-extension';
import type {
    DimensionsState,
    ModeState,
    ThemeState,
    TokensState,
    VisualizationOptionsState,
} from '@splunk/dashboard-studio-extension/visualization';
import {
    dashboardTokenValue,
    iconCharacter,
    normalizeTriggerOptions,
    type RawOptions,
    type Theme,
    type TokenValues,
} from '../../../src/help-options';
import { sizeIframeBody } from '../../../src/iframe-viewport';
import './visualization.css';

const host = document.getElementById('root') ?? document.body;
host.replaceChildren();

const root = document.createElement('div');
root.className = 'help-trigger';

const button = document.createElement('button');
button.className = 'help-trigger__button';
button.type = 'button';
button.setAttribute('aria-haspopup', 'dialog');

const glyph = document.createElement('span');
glyph.className = 'help-trigger__glyph';
glyph.setAttribute('aria-hidden', 'true');
button.appendChild(glyph);
root.appendChild(button);
host.appendChild(root);

const state: {
    options: RawOptions;
    tokens: TokenValues;
    theme: Theme;
    mode: ModeState['mode'];
    optimisticOpen: boolean | null;
} = {
    options: {},
    tokens: {},
    theme: 'light',
    mode: 'view',
    optimisticOpen: null,
};

function isOpen(tokenName: string, openValue: string): boolean {
    if (state.optimisticOpen !== null) return state.optimisticOpen;
    return String(dashboardTokenValue(state.tokens, tokenName) ?? '') === openValue;
}

function writeToken(open: boolean, event: Event): void {
    if (state.mode === 'edit') return;
    const options = normalizeTriggerOptions(state.options, state.tokens);
    state.optimisticOpen = open;
    render();
    VisualizationAPI.triggerDrilldown({
        // Splunk Enterprise 10.4.0 routes configured click handlers by this source-qualified action.
        action: 'setToken.click',
        originalEvent: event,
        payload: {
            name: options.tokenName,
            value: open ? options.openValue : options.closedValue,
        },
    });
}

function render(): void {
    const options = normalizeTriggerOptions(state.options, state.tokens);
    const open = isOpen(options.tokenName, options.openValue);

    root.dataset.iconStyle = options.iconStyle;
    root.dataset.mode = state.mode;
    root.dataset.theme = state.theme;
    root.style.setProperty('--help-accent', options.accentColor);
    root.style.setProperty('--help-accent-text', options.accentTextColor);
    root.style.setProperty('--help-icon-size', `${options.iconSize}px`);

    glyph.textContent = iconCharacter(options.iconGlyph);
    button.setAttribute('aria-label', options.accessibleLabel);
    button.title = options.accessibleLabel;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-pressed', String(open));
}

button.addEventListener('click', (event) => {
    const options = normalizeTriggerOptions(state.options, state.tokens);
    writeToken(!isOpen(options.tokenName, options.openValue), event);
});

button.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const options = normalizeTriggerOptions(state.options, state.tokens);
    if (!isOpen(options.tokenName, options.openValue)) return;
    event.preventDefault();
    writeToken(false, event);
});

VisualizationAPI.addOptionsListener(
    ({ options }: VisualizationOptionsState) => {
        state.options = options;
        state.optimisticOpen = null;
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
        const options = normalizeTriggerOptions(state.options, tokens);
        const currentValue = dashboardTokenValue(tokens, options.tokenName);
        state.optimisticOpen =
            currentValue === undefined ? null : String(currentValue) === options.openValue;
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
