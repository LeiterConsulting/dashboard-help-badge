# Dashboard Help Badge 0.5.1

Patch release for Splunk Enterprise 10.4.x and corresponding Splunk Cloud Platform releases.

## What changed

- Replaced the modern-navigation fallback letter monograms with supported, semantic Splunk icons.
- The interactive tutorial now uses the notebook icon.
- The dark-theme verification dashboard now uses the monitor icon.
- Added automated source and installed-runtime checks for both icon-bearing navigation links.

The contextual-help visualizations, tutorial workflow, app artwork, and zero-search architecture are unchanged from 0.5.0.

## Validation

- Complete TypeScript, unit-test, public-tree, production-build, and packaging gate
- Splunk AppInspect `precert`: 100 passed, 149 not applicable, zero warnings or failures
- In-place installation and live navigation-object verification on Splunk Enterprise 10.4.0
- Visual confirmation in the Splunk 10.4 modern navigation interface
- Portable package inspection for macOS metadata, links, dotfiles, and paths outside the single app root

## Installation

Download either release archive and install it through **Apps → Manage Apps → Install app from file**. Existing 0.5.0 installations can be upgraded in place.

- `dashboard_help_badge-0.5.1-<commit>.spl` — conventional Splunk app package
- `dashboard_help_badge-0.5.1-<commit>.tar.gz` — equivalent portable tarball

No external service, credential, search, input, scheduled job, or Splunk-side modification is required.

License: MIT
