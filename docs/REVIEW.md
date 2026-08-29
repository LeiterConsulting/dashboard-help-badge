# Splunk 10.4 UI and developer review

Review date: 2026-08-29
Target: Splunk Enterprise 10.4.x and equivalent Splunk Cloud Platform releases

## Decision

The app uses the supported Dashboard Studio extension framework and remains a small TypeScript/DOM implementation. Splunk's own CLI guidance recommends JavaScript or TypeScript for simple visualizations where minimal bundle size and no framework dependency are useful. Adding React UI solely for the badge glyph would increase the bundle and dependency surface without changing the sandbox boundary.

## Framework alignment

- The installable layout follows the documented `appserver/static/visualizations/<name>` contract.
- Each visualization registers through `visualizations.conf` with `framework_type = studio_visualization`.
- Options, tokens, theme, and mode arrive through extension listeners with immediate initial callbacks.
- The app never reads or modifies the parent Dashboard Studio DOM.
- The zero-search data contract is explicit for every visualization.
- Trigger and panel interactions use the documented drilldown/token API surface and declare dynamic/static token support.
- View/edit state is surfaced visually; runtime token writes are disabled from the trigger while editing.
- All content is plain text, and no visualization uses `innerHTML`, `eval`, external assets, or runtime egress.

## Splunk UI design-system alignment

- Native HTML buttons provide Enter/Space behavior, accessible names, and visible focus states.
- The recommended trigger exposes `aria-haspopup="dialog"`, `aria-expanded`, and a complete 50 × 50 click target.
- The non-modal panel has a programmatic name, semantic heading, optional close control, and Escape dismissal.
- Light and dark surfaces are selected from the extension theme listener because sandboxed iframes do not inherit parent theme tokens.
- Author-selected accent colors receive an automatically selected black or white icon foreground.
- Functional controls have at least 3:1 visual contrast; body text targets 4.5:1 or better.
- Motion is short and disabled under `prefers-reduced-motion`.
- Critical content is available by click, focus, and keyboard; hover is only an optional convenience on the rich alternative.
- The iframe root uses a CSS fallback and the documented dimensions listener clamps Splunk's generated body to the actual viewport, so a compact visualization cannot retain the browser's 960-pixel initial containing block or introduce horizontal overflow.

## App and Splunkbase alignment

- `static/appIcon.png` is an exact 36 × 36 PNG.
- `static/screenshot.png` is an exact 623 × 350 PNG.
- The package contains one root directory and no `local` directory, credentials, source maps, build environment, or generated report.
- Project source is MIT licensed; bundled third-party terms are disclosed separately.
- Privacy, security, support, contribution, changelog, listing copy, and reproducible CI material are included.

## Known platform constraints

The iframe cannot paint outside its bounds or attach to another visualization's DOM. The recommended pattern therefore uses a compact trigger and a separately positioned conditional panel. This is a deliberate use of supported Dashboard Studio composition, not an emulated parent-page popover.

Splunk Enterprise 10.4.0 GA requires the source-qualified action name `setToken.click` for programmatic events to reach an author-configured `drilldown.setToken` handler, even though the current extension documentation illustrates `setToken`. A cache-busted live test showed that the generic form changes the trigger's optimistic ARIA state but does not update the dashboard token. The compatibility action is therefore intentional, automated-release-checked, and exercised on the target 10.4.0 instance.

## Primary references

- [Dashboard Studio custom visualization best practices](https://help.splunk.com/en/splunk-enterprise/developing-views-and-apps-for-splunk-web/10.4/custom-visualizations-for-dashboard-studio/best-practices)
- [Custom visualization project and app structure](https://help.splunk.com/en/splunk-enterprise/developing-views-and-apps-for-splunk-web/10.4/custom-visualizations-for-dashboard-studio/custom-visualization-project-and-app-structure)
- [Dashboard extension CLI](https://help.splunk.com/en/splunk-enterprise/developing-views-and-apps-for-splunk-web/10.4/custom-visualizations-for-dashboard-studio/create-custom-visualizations-for-dashboard-studio-with-the-splunk-dashboard-extension-cli)
- [Splunk UI accessibility: color](https://splunkui.splunk.com/DesignSystem/Accessibility/Color)
- [Splunk UI accessibility: data visualizations](https://splunkui.splunk.com/DesignSystem/Accessibility/DataViz)
- [Splunkbase file standards](https://dev.splunk.com/enterprise/docs/releaseapps/splunkbase/approvalcriteria)
