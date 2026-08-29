# Splunkbase listing copy

## Summary

Reusable, accessible contextual-help badges and panels for Splunk Dashboard Studio 10.4+, with no searches, injected JavaScript, external service, or Splunk-side modification.

## Short description

Add configurable information badges and token-controlled help panels to Dashboard Studio tiles.

## Details

Dashboard Help Badge gives dashboard authors a supported way to explain a chart, metric, table, or workflow in place. The recommended Help Trigger + Help Panel pattern keeps the closed footprint to 50 × 50 pixels, makes the entire compact tile clickable, and uses a Dashboard Studio token visibility condition to display a separately positioned rich panel.

The app also includes a compact native-tooltip badge and a rich reserved-footprint tooltip for dashboards where those tradeoffs fit. Every element supports light and dark themes, safe token interpolation, keyboard interaction, visible focus, and configurable content and styling.

An installed three-tab tutorial provides a finished reference interaction, exact visual-editor steps, a practice tile, and source-map examples. No SPL or data source is required.

## Installation

Install the `.spl` package through **Apps → Manage Apps → Install app from file**. No restart is expected for a fresh install. Open **Dashboard Help Badge — Interactive Tutorial**, then choose **Actions → Clone dashboard** before experimenting.

## Troubleshooting

- If the visualization picker does not show all four entries after upgrading an older prerelease, restart Splunk Web or Splunk Enterprise to clear cached visualization metadata.
- If a panel never appears, verify that trigger and panel use the same token name and closed value, the trigger has a Set Tokens interaction, and the panel visibility condition checks the open value.
- If the rich Tooltip overlaps controls, move its reserved iframe footprint into dashboard whitespace or use the recommended trigger/panel pair.

## Compatibility and data handling

- Splunk Enterprise 10.4+ or the corresponding Splunk Cloud Platform release
- No telemetry, runtime network requests, stored credentials, custom REST handlers, inputs, or scheduled searches
- MIT License
- Community support through GitHub Issues

## Media

Use the listing-ready files under `assets/splunkbase/`. Splunkbase accepts up to five 1200 × 900 listing screenshots; the install package also includes the legacy 623 × 350 `static/screenshot.png` required by Splunk file standards.
