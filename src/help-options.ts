export type Theme = 'light' | 'dark';
export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type IconGlyph = 'info' | 'question' | 'alert';
export type IconStyle = 'circle' | 'rounded-square';

export type TokenValues = Record<string, unknown>;
export type RawOptions = Record<string, unknown>;

export interface HelpContent {
    accessibleLabel: string;
    heading: string;
    helpText: string;
}

export interface RichHelpOptions extends HelpContent {
    accentColor: string;
    accentTextColor: '#000000' | '#ffffff';
    allowPin: boolean;
    anchor: Anchor;
    iconGlyph: IconGlyph;
    iconSize: number;
    iconStyle: IconStyle;
    showHeading: boolean;
    showOnHover: boolean;
}

export interface BadgeHelpOptions extends HelpContent {
    accentColor: string;
    accentTextColor: '#000000' | '#ffffff';
    iconGlyph: IconGlyph;
    iconSize: number;
    iconStyle: IconStyle;
}

export interface TriggerHelpOptions extends BadgeHelpOptions {
    closedValue: string;
    openValue: string;
    tokenName: string;
}

export interface PanelHelpOptions extends HelpContent {
    accentColor: string;
    allowClose: boolean;
    closedValue: string;
    showHeading: boolean;
    tokenName: string;
}

export const DEFAULTS = {
    accessibleLabel: 'More information',
    heading: 'About this tile',
    helpText: 'Explain what this tile shows, how it is calculated, and what the viewer should do next.',
    accentColor: '#006d9c',
    anchor: 'top-right' as Anchor,
    iconGlyph: 'info' as IconGlyph,
    iconSize: 26,
    iconStyle: 'circle' as IconStyle,
    showHeading: true,
    showOnHover: true,
    allowPin: true,
    tokenName: 'help_popover',
    openValue: 'open',
    closedValue: 'closed',
    allowClose: true,
};

const TOKEN_PATTERN = /\$([A-Za-z_][A-Za-z0-9_.:-]*)\$/g;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function text(value: unknown, fallback: string, maximumLength: number): string {
    if (typeof value !== 'string') return fallback;
    const normalized = value.replace(/\r\n?/g, '\n').slice(0, maximumLength);
    return normalized.trim() ? normalized : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function numberInRange(value: unknown, fallback: number, minimum: number, maximum: number): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.round(Math.min(maximum, Math.max(minimum, parsed)));
}

function member<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeColor(value: unknown, fallback = DEFAULTS.accentColor): string {
    return typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim())
        ? value.trim().toLowerCase()
        : fallback;
}

function expandHex(color: string): [number, number, number] {
    const hex = color.slice(1);
    const expanded = hex.length === 3 ? [...hex].map((character) => character + character).join('') : hex;
    return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16)) as [
        number,
        number,
        number,
    ];
}

function relativeLuminance(color: string): number {
    const channels = expandHex(color).map((channel) => {
        const ratio = channel / 255;
        return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastText(color: string): '#000000' | '#ffffff' {
    const luminance = relativeLuminance(normalizeColor(color));
    const blackContrast = (luminance + 0.05) / 0.05;
    const whiteContrast = 1.05 / (luminance + 0.05);
    return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
}

function tokenText(value: unknown): string | null {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        const safeValues = value.filter(
            (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
        );
        return safeValues.length === value.length ? safeValues.join(', ') : null;
    }
    return null;
}

function tokenSection(tokens: TokenValues, sectionName: string): TokenValues | null {
    const section = tokens[sectionName];
    return typeof section === 'object' && section !== null && !Array.isArray(section)
        ? (section as TokenValues)
        : null;
}

function lookupToken(
    tokens: TokenValues,
    name: string
): { found: boolean; value: unknown } {
    const submitted = tokenSection(tokens, 'submitted');
    if (submitted && Object.prototype.hasOwnProperty.call(submitted, name)) {
        return { found: true, value: submitted[name] };
    }

    const defaults = tokenSection(tokens, 'default');
    if (defaults && Object.prototype.hasOwnProperty.call(defaults, name)) {
        return { found: true, value: defaults[name] };
    }

    if (name.startsWith('env:')) {
        const environment = tokenSection(tokens, 'env');
        const environmentName = name.slice(4);
        if (environment && Object.prototype.hasOwnProperty.call(environment, environmentName)) {
            return { found: true, value: environment[environmentName] };
        }
    }

    if (Object.prototype.hasOwnProperty.call(tokens, name)) {
        return { found: true, value: tokens[name] };
    }

    return { found: false, value: undefined };
}

/** Resolve both Splunk's nested default/submitted/env token state and flat test input. */
export function dashboardTokenValue(tokens: TokenValues, name: string): unknown {
    return lookupToken(tokens, name).value;
}

/** Resolve familiar $token$ references without evaluating HTML or expressions. */
export function interpolateTokens(value: string, tokens: TokenValues): string {
    return value.replace(TOKEN_PATTERN, (original, name: string) => {
        const token = lookupToken(tokens, name);
        if (!token.found) return original;
        return tokenText(token.value) ?? original;
    });
}

function content(options: RawOptions, tokens: TokenValues): HelpContent {
    return {
        accessibleLabel: interpolateTokens(
            text(options.accessibleLabel, DEFAULTS.accessibleLabel, 256),
            tokens
        ),
        heading: interpolateTokens(text(options.heading, DEFAULTS.heading, 256), tokens),
        helpText: interpolateTokens(text(options.helpText, DEFAULTS.helpText, 4096), tokens),
    };
}

function appearance(options: RawOptions) {
    const accentColor = normalizeColor(options.accentColor);
    return {
        accentColor,
        accentTextColor: contrastText(accentColor),
        iconGlyph: member(options.iconGlyph, ['info', 'question', 'alert'] as const, DEFAULTS.iconGlyph),
        iconSize: numberInRange(options.iconSize, DEFAULTS.iconSize, 18, 44),
        iconStyle: member(
            options.iconStyle,
            ['circle', 'rounded-square'] as const,
            DEFAULTS.iconStyle
        ),
    };
}

function tokenOption(value: unknown, fallback: string): string {
    return text(value, fallback, 128);
}

export function normalizeRichOptions(
    options: RawOptions = {},
    tokens: TokenValues = {}
): RichHelpOptions {
    return {
        ...content(options, tokens),
        ...appearance(options),
        allowPin: bool(options.allowPin, DEFAULTS.allowPin),
        anchor: member(
            options.anchor,
            ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const,
            DEFAULTS.anchor
        ),
        showHeading: bool(options.showHeading, DEFAULTS.showHeading),
        showOnHover: bool(options.showOnHover, DEFAULTS.showOnHover),
    };
}

export function normalizeBadgeOptions(
    options: RawOptions = {},
    tokens: TokenValues = {}
): BadgeHelpOptions {
    return {
        ...content(options, tokens),
        ...appearance(options),
    };
}

export function normalizeTriggerOptions(
    options: RawOptions = {},
    tokens: TokenValues = {}
): TriggerHelpOptions {
    return {
        ...content(options, tokens),
        ...appearance(options),
        tokenName: tokenOption(options.tokenName, DEFAULTS.tokenName),
        openValue: tokenOption(options.openValue, DEFAULTS.openValue),
        closedValue: tokenOption(options.closedValue, DEFAULTS.closedValue),
    };
}

export function normalizePanelOptions(
    options: RawOptions = {},
    tokens: TokenValues = {}
): PanelHelpOptions {
    return {
        ...content(options, tokens),
        accentColor: normalizeColor(options.accentColor),
        allowClose: bool(options.allowClose, DEFAULTS.allowClose),
        closedValue: tokenOption(options.closedValue, DEFAULTS.closedValue),
        showHeading: bool(options.showHeading, DEFAULTS.showHeading),
        tokenName: tokenOption(options.tokenName, DEFAULTS.tokenName),
    };
}

export function iconCharacter(iconGlyph: IconGlyph): string {
    if (iconGlyph === 'question') return '?';
    if (iconGlyph === 'alert') return '!';
    return 'i';
}

export function nativeTooltipText(options: BadgeHelpOptions): string {
    return options.heading ? `${options.heading}\n\n${options.helpText}` : options.helpText;
}
