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
    nativeTooltipText,
    normalizeBadgeOptions,
    type RawOptions,
    type Theme,
    type TokenValues,
} from '../../../src/help-options';
import { sizeIframeBody } from '../../../src/iframe-viewport';
import './visualization.css';

const host = document.getElementById('root') ?? document.body;
host.replaceChildren();

const root = document.createElement('div');
root.className = 'help-badge';

const button = document.createElement('button');
button.className = 'help-badge__button';
button.type = 'button';

const glyph = document.createElement('span');
glyph.className = 'help-badge__glyph';
glyph.setAttribute('aria-hidden', 'true');

const screenReaderText = document.createElement('span');
screenReaderText.className = 'help-badge__screen-reader-text';

button.append(glyph, screenReaderText);
root.appendChild(button);
host.appendChild(root);

const state: {
    options: RawOptions;
    tokens: TokenValues;
    theme: Theme;
    mode: ModeState['mode'];
} = {
    options: {},
    tokens: {},
    theme: 'light',
    mode: 'view',
};

function render(): void {
    const options = normalizeBadgeOptions(state.options, state.tokens);
    const tooltipText = nativeTooltipText(options);

    root.dataset.iconStyle = options.iconStyle;
    root.dataset.mode = state.mode;
    root.dataset.theme = state.theme;
    root.style.setProperty('--help-accent', options.accentColor);
    root.style.setProperty('--help-accent-text', options.accentTextColor);
    root.style.setProperty('--help-icon-size', `${options.iconSize}px`);

    glyph.textContent = iconCharacter(options.iconGlyph);
    screenReaderText.textContent = tooltipText;
    button.title = tooltipText;
    button.setAttribute('aria-label', `${options.accessibleLabel}: ${tooltipText}`);
}

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
