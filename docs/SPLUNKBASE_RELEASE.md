# Splunkbase release checklist

## Automated gates

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build:prod`
- `npm run package`
- Verify every archive member is below the single `dashboard_help_badge/` root.
- Verify the archive contains no `.DS_Store`, AppleDouble, credential, `.env`, source-map, or instance-local file.
- Run Splunk AppInspect in `precert` mode with `--included-tags cloud`.

## Functional matrix

- Fresh install on Splunk Enterprise 10.4.x.
- In-place upgrade from the prior release.
- All four visualization types appear in the Custom picker; the tutorial identifies Help Trigger as element 1 of 2 and Help Panel as element 2 of 2.
- No visualization asks for or runs a data source.
- All editor controls persist to dashboard JSON.
- Light and dark themes update without reload.
- `$token$` values update while the dashboard is open.
- Tutorial clone/edit workflow, three tabs, reference pair, and source map.
- Trigger/panel authoring through the visual editor, including default token creation, interaction, and visibility condition.
- Installed dashboard ACLs and clone-first recovery guidance.
- Rich: hover, focus, click/tap pin, click unpin, and Escape.
- Rich: four anchors and minimum/recommended footprints.
- Compact: native hover tooltip and complete screen-reader label.
- Long text, line breaks, missing tokens, array tokens, and hostile-looking plain text.

## Listing material

- Exact 36 × 36 app icon in `package/app/static/appIcon.png`.
- Exact 623 × 350 package screenshot in `package/app/static/screenshot.png`.
- Five exact 1200 × 900 listing screenshots under `assets/splunkbase/`.
- Repository/listing banner and high-resolution icon source under `assets/brand/`.
- Short description, full description, installation instructions, configuration guide, release notes, license, privacy statement, support URL/email, and compatibility declaration.
- State clearly that Splunk Enterprise 10.4+ is required.
- State clearly that the app sends no telemetry and makes no runtime network requests.

## Known limitations to disclose

- A custom visualization cannot modify or attach to the parent Dashboard Studio DOM.
- The rich card cannot paint outside its iframe; its transparent footprint intercepts pointer events.
- The compact native tooltip cannot be styled and its display delay/placement varies by browser.
- Dashboard Studio's `editor.text` is a compact text editor; very long or multi-line bodies are easier to edit in dashboard source.
- Token interpolation is plain scalar substitution, not Dynamic Options Syntax or expression evaluation.
