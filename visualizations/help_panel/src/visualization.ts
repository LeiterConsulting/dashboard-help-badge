import { VisualizationAPI } from '@splunk/dashboard-studio-extension';
import type {
    DimensionsState,
    ModeState,
    ThemeState,
    TokensState,
    VisualizationOptionsState,
} from '@splunk/dashboard-studio-extension/visualization';
import {
    normalizePanelOptions,
    type RawOptions,
    type Theme,
    type TokenValues,
} from '../../../src/help-options';
import { sizeIframeBody } from '../../../src/iframe-viewport';
import './visualization.css';

const host = document.getElementById('root') ?? document.body;
host.replaceChildren();

const root = document.createElement('section');
root.className = 'help-panel';
root.setAttribute('role', 'dialog');
root.setAttribute('aria-modal', 'false');

const accent = document.createElement('div');
accent.className = 'help-panel__accent';
accent.setAttribute('aria-hidden', 'true');

const content = document.createElement('div');
content.className = 'help-panel__content';

const heading = document.createElement('h3');
heading.className = 'help-panel__heading';

const body = document.createElement('div');
body.className = 'help-panel__body';

const closeButton = document.createElement('button');
closeButton.className = 'help-panel__close';
closeButton.type = 'button';
closeButton.setAttribute('aria-label', 'Close contextual help');
closeButton.textContent = '×';

content.append(heading, body);
root.append(accent, content, closeButton);
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
    const options = normalizePanelOptions(state.options, state.tokens);
    root.dataset.mode = state.mode;
    root.dataset.theme = state.theme;
    root.style.setProperty('--help-accent', options.accentColor);
    root.setAttribute('aria-label', options.accessibleLabel);
    heading.textContent = options.heading;
    heading.hidden = !options.showHeading;
    body.textContent = options.helpText;
    closeButton.hidden = !options.allowClose;
}

function closePayload(): { name: string; value: string } {
    const options = normalizePanelOptions(state.options, state.tokens);
    return { name: options.tokenName, value: options.closedValue };
}

VisualizationAPI.addDrilldownListener({
    node: closeButton,
    action: 'setToken',
    payloadCallback: closePayload,
});

document.addEventListener('keydown', (event) => {
    const options = normalizePanelOptions(state.options, state.tokens);
    if (event.key === 'Escape' && state.mode !== 'edit' && options.allowClose) {
        VisualizationAPI.triggerDrilldown({
            // Splunk Enterprise 10.4.0 routes configured keyboard handlers by this source-qualified action.
            action: 'setToken.click',
            originalEvent: event,
            payload: closePayload(),
        });
    }
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
