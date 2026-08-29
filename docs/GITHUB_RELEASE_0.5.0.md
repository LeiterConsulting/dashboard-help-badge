# Dashboard Help Badge 0.5.0

Initial public testing release for Splunk Enterprise 10.4.x and corresponding Splunk Cloud Platform releases.

## Highlights

- Adds four reusable Dashboard Studio help elements with no SPL or data source requirement.
- Promotes the compact, token-controlled Help Trigger + Help Panel pattern selected through live tournament testing.
- Includes a three-tab interactive tutorial, editable clone-first workflow, source map, and dark-theme verification dashboard.
- Makes the complete 50 × 50 trigger tile clickable and supports pointer, keyboard, Escape, theme, token, and reduced-motion behavior.
- Packages standard and retina app icon assets for legacy and modern Splunk Web static paths.
- Ships identical `.spl` and portable `.tar.gz` installers without macOS metadata, dotfiles, links, or files outside the single app root.

## Install

Download either attached package and install it through **Apps → Manage Apps → Install app from file**:

- `dashboard_help_badge-0.5.0-<commit>.spl`
- `dashboard_help_badge-0.5.0-<commit>.tar.gz`

Open **Dashboard Help Badge — Interactive Tutorial** after installation. Clone the tutorial before experimenting so the installed answer key remains unchanged.

## Compatibility and validation

- Target: Splunk Enterprise 10.4.x+
- License: MIT
- Zero external runtime services, scripted inputs, indexes, custom REST handlers, or Splunk-side modifications
- Automated TypeScript, unit, release-structure, public-tree, production-build, and packaging checks
- Splunk AppInspect precert validation and live Splunk Enterprise 10.4.0 installation/interaction testing

The `.spl` and `.tar.gz` attachments contain the same gzip-compressed tar archive; both extensions are accepted by Splunk's documented app-package standards.
