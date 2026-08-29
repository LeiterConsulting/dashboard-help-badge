import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DEFAULTS,
    contrastText,
    dashboardTokenValue,
    interpolateTokens,
    nativeTooltipText,
    normalizeBadgeOptions,
    normalizeColor,
    normalizePanelOptions,
    normalizeRichOptions,
    normalizeTriggerOptions,
} from '../src/help-options';

test('normalizes unsafe and out-of-range author options', () => {
    const options = normalizeRichOptions({
        accentColor: 'red; background: url(https://example.invalid)',
        anchor: '../../outside',
        iconGlyph: '<script>',
        iconSize: 200,
        iconStyle: 'triangle',
        showOnHover: 'yes',
    });

    assert.equal(options.accentColor, DEFAULTS.accentColor);
    assert.equal(options.anchor, DEFAULTS.anchor);
    assert.equal(options.iconGlyph, DEFAULTS.iconGlyph);
    assert.equal(options.iconSize, 44);
    assert.equal(options.iconStyle, DEFAULTS.iconStyle);
    assert.equal(options.showOnHover, DEFAULTS.showOnHover);
});

test('interpolates scalar and array dashboard tokens without evaluating content', () => {
    const result = interpolateTokens(
        'Environment: $environment$; regions: $regions$; missing: $not_set$',
        {
            environment: '<b>production</b>',
            regions: ['us-east', 'us-west'],
        }
    );

    assert.equal(
        result,
        'Environment: <b>production</b>; regions: us-east, us-west; missing: $not_set$'
    );
});

test('resolves Splunk default, submitted, and environment token namespaces', () => {
    const tokens = {
        env: { app: 'dashboard_help_badge' },
        default: { audience: 'operators', help_checkout: 'closed' },
        submitted: { audience: 'managers', help_checkout: 'open' },
    };

    assert.equal(dashboardTokenValue(tokens, 'help_checkout'), 'open');
    assert.equal(dashboardTokenValue(tokens, 'env:app'), 'dashboard_help_badge');
    assert.equal(
        interpolateTokens('For $audience$ in $env:app$', tokens),
        'For managers in dashboard_help_badge'
    );
});

test('resolves tokens in each configurable content field', () => {
    const options = normalizeBadgeOptions(
        {
            accessibleLabel: 'About $service$',
            heading: '$service$ health',
            helpText: 'Current owner: $owner$',
        },
        { service: 'Checkout', owner: 'SRE' }
    );

    assert.equal(options.accessibleLabel, 'About Checkout');
    assert.equal(options.heading, 'Checkout health');
    assert.equal(options.helpText, 'Current owner: SRE');
    assert.equal(nativeTooltipText(options), 'Checkout health\n\nCurrent owner: SRE');
});

test('selects a contrasting black or white glyph color', () => {
    assert.equal(contrastText('#000000'), '#ffffff');
    assert.equal(contrastText('#ffffff'), '#000000');
    assert.equal(contrastText('#006d9c'), '#ffffff');
});

test('accepts three- and six-digit hex colors only', () => {
    assert.equal(normalizeColor('#ABC'), '#abc');
    assert.equal(normalizeColor('#12abef'), '#12abef');
    assert.equal(normalizeColor('rgb(0, 0, 0)'), DEFAULTS.accentColor);
});

test('normalizes token-paired trigger and panel options', () => {
    const trigger = normalizeTriggerOptions({
        tokenName: 'latency_help',
        openValue: 'visible',
        closedValue: 'hidden',
        iconSize: 1,
    });
    const panel = normalizePanelOptions({
        tokenName: 'latency_help',
        closedValue: 'hidden',
        allowClose: false,
        showHeading: false,
    });

    assert.equal(trigger.tokenName, 'latency_help');
    assert.equal(trigger.openValue, 'visible');
    assert.equal(trigger.closedValue, 'hidden');
    assert.equal(trigger.iconSize, 18);
    assert.equal(panel.tokenName, 'latency_help');
    assert.equal(panel.closedValue, 'hidden');
    assert.equal(panel.allowClose, false);
    assert.equal(panel.showHeading, false);
});
