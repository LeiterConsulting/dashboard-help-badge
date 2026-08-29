#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
    throw new Error(message);
}

function readText(relativePath) {
    return readFileSync(join(projectRoot, relativePath), 'utf8');
}

function pngDimensions(relativePath) {
    const bytes = readFileSync(join(projectRoot, relativePath));
    const signature = '89504e470d0a1a0a';
    if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== signature) {
        fail(`${relativePath} is not a valid PNG file`);
    }
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function requireDimensions(relativePath, width, height) {
    const actual = pngDimensions(relativePath);
    if (actual.width !== width || actual.height !== height) {
        fail(
            `${relativePath} must be ${width}x${height}; found ${actual.width}x${actual.height}`
        );
    }
}

const packageJson = JSON.parse(readText('package.json'));
const appConf = readText('package/app/app.conf');
const configuredVersions = [...appConf.matchAll(/^version\s*=\s*([^\s#]+)\s*$/gm)].map(
    (match) => match[1]
);

if (configuredVersions.length !== 2 || configuredVersions.some((version) => version !== packageJson.version)) {
    fail('package.json, [id], and [launcher] versions must match');
}

if (packageJson.license !== 'MIT' || packageJson.private !== true) {
    fail('package.json must declare MIT and remain private from the npm registry');
}

requireDimensions('package/app/static/appIcon.png', 36, 36);
requireDimensions('package/app/static/appIcon_2x.png', 72, 72);
requireDimensions('package/app/static/appIconAlt.png', 36, 36);
requireDimensions('package/app/static/appIconAlt_2x.png', 72, 72);
requireDimensions('package/app/appserver/static/appIcon.png', 36, 36);
requireDimensions('package/app/appserver/static/appIcon_2x.png', 72, 72);
requireDimensions('package/app/appserver/static/appIconAlt.png', 36, 36);
requireDimensions('package/app/appserver/static/appIconAlt_2x.png', 72, 72);
requireDimensions('package/app/static/screenshot.png', 623, 350);
requireDimensions('assets/brand/social-preview.png', 1280, 640);

const navigation = readText('package/app/default/data/ui/nav/default.xml');
if (!/<nav\b[^>]*\bcolor="#[0-9A-Fa-f]{6}"/.test(navigation)) {
    fail('Modern navigation must declare the app icon background color');
}

const supportedNavigationIcons = new Set([
    'bookmark',
    'chartgauge',
    'chartline',
    'chartpanels',
    'circlesfour',
    'cog',
    'cylinderindex',
    'filechart',
    'filemagnifier',
    'filenode',
    'forwarderuniversal',
    'layerstriple',
    'layoutoverview',
    'magnifier',
    'monitor',
    'organizernotebook',
    'pulse',
    'star',
    'tag',
]);
const expectedNavigationLinks = [
    {
        href: '/app/dashboard_help_badge/dashboard_help_badge_demo',
        icon: 'organizernotebook',
        label: 'Dashboard Help Badge — Interactive Tutorial',
    },
    {
        href: '/app/dashboard_help_badge/dashboard_help_badge_dark_demo',
        icon: 'monitor',
        label: 'Dashboard Help Badge — Dark Theme',
    },
];
const navigationLinks = [...navigation.matchAll(
    /<a\s+href="([^"]+)"\s+icon="([^"]+)">([^<]+)<\/a>/g
)].map((match) => ({ href: match[1], icon: match[2], label: match[3] }));

if (JSON.stringify(navigationLinks) !== JSON.stringify(expectedNavigationLinks)) {
    fail('Modern navigation must retain the two semantic icon-bearing dashboard links');
}
if (navigationLinks.some(({ icon }) => !supportedNavigationIcons.has(icon))) {
    fail('Modern navigation uses an icon outside the documented Splunk icon set');
}
if (/<view\b/.test(navigation)) {
    fail('Modern navigation must not use monogram-only view entries');
}

const visualizationRoot = join(projectRoot, 'visualizations');
const visualizationNames = readdirSync(visualizationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
const expectedNames = ['help_badge', 'help_panel', 'help_tooltip', 'help_trigger'];

if (JSON.stringify(visualizationNames) !== JSON.stringify(expectedNames)) {
    fail(`Expected visualizations: ${expectedNames.join(', ')}`);
}

for (const name of visualizationNames) {
    const config = JSON.parse(readText(`visualizations/${name}/config.json`));
    const required = config.config?.dataContract?.requiredDataSources;
    const optional = config.config?.dataContract?.optionalDataSources;
    if (!Array.isArray(required) || required.length !== 0 || !Array.isArray(optional) || optional.length !== 0) {
        fail(`${name} must retain its zero-search data contract`);
    }
    if (config.includeInToolbar !== true || !config.config?.name || !config.config?.description) {
        fail(`${name} must have toolbar metadata`);
    }

    const source = readText(`visualizations/${name}/src/visualization.ts`);
    const css = readText(`visualizations/${name}/src/visualization.css`);
    if (/\b(?:innerHTML|outerHTML|eval)\b|window\.parent/.test(source)) {
        fail(`${name} uses an API outside the documented sandbox trust model`);
    }
    if (!/#root\s*\{[\s\S]*?width:\s*100%\s*!important/.test(css)) {
        fail(`${name} must override Dashboard Studio's injected viewport width`);
    }
    if (!/body\s*\{[\s\S]*?width:\s*100vw;[\s\S]*?max-width:\s*100vw;/.test(css)) {
        fail(`${name} must clamp the generated iframe body to its viewport`);
    }
    if (!/addDimensionsListener/.test(source) || !/sizeIframeBody/.test(source)) {
        fail(`${name} must apply dimensions delivered by the extension API`);
    }
    if (['help_trigger', 'help_panel'].includes(name) && !/action:\s*'setToken\.click'/.test(source)) {
        fail(`${name} must retain the Splunk Enterprise 10.4.0 token-routing compatibility action`);
    }
}

console.log(`Release checks passed for Dashboard Help Badge ${packageJson.version}.`);
