# Architecture and design decision

## The platform boundary

Splunk 10.4 Dashboard Studio custom visualizations run in sandboxed iframes. They communicate with the dashboard through `postMessage`, wrapped by `@splunk/dashboard-studio-extension`. The iframe cannot read or change the parent Dashboard Studio DOM, and its CSS cannot paint beyond the iframe viewport.

That boundary rules out a custom element that directly injects an icon into another visualization's title bar. Attempting to reach `window.parent`, patch Dashboard Studio internals, or depend on undocumented host classes would be brittle and would violate the extension model.

## Product direction and complementary elements

Live tournament testing selected the `help_trigger` + `help_panel` pair as the product direction. The app retains the two single-element alternatives so existing authors can still choose a native tooltip or a reserved rich sidecar when those tradeoffs fit.

### `help_tooltip`

This is the accessibility-first choice. The visualization owns both the icon and styled card. It supports mouse, keyboard, touch/click pinning, Escape, themes, safe token substitution, and deterministic styling. The cost is a larger iframe footprint. Authors place that footprint in adjacent whitespace and select the icon corner that visually attaches it to a neighboring tile.

### `help_badge`

This is the footprint-first choice. It owns only a small button and puts the configured plain text in the HTML `title` attribute. Native browser chrome can display the tooltip beyond the iframe boundary. The cost is browser-controlled timing and appearance, plus a less rich visual experience for keyboard users. Screen readers receive the same information through `aria-label`.

### `help_trigger` and `help_panel`

This pair is the interaction-first choice. The trigger has the same small footprint as the compact badge but uses the supported Dashboard Studio drilldown API to toggle an author-configured token. A visibility condition materializes the separate styled panel only while that token is open. This comes closest to a conventional overlay without escaping the extension sandbox. The cost is higher authoring effort: the two visualizations, one token interaction, and one visibility condition must agree.

The trigger's native button fills its complete visualization viewport. The centered glyph remains visually compact, but empty pixels around it are no longer a dead click zone. `aria-expanded` and `aria-pressed` reflect the optimistic local state while Dashboard Studio propagates the token update; Enter and Space work through native button semantics. The programmatic event uses the `setToken.click` action required by the Splunk Enterprise 10.4.0 configured-event router; the dashboard handler itself remains the supported `drilldown.setToken` type.

## Zero-search contract

All four `config.json` files declare an empty `requiredDataSources` array. They subscribe only to options, theme, mode, and tokens. This is essential: contextual documentation must not consume a search slot, require a dummy query, or show a no-data state.

## Trust model

- Options and token values are untrusted input.
- Text is length-bounded and assigned through `textContent` or safe DOM attributes.
- Colors accept only three- or six-digit hex values.
- Numbers and enum values are clamped/allowlisted.
- Structured token values are never serialized or evaluated.
- There are no runtime network requests, external assets, `innerHTML`, or `eval`.
- The trigger/panel pair writes only the dashboard token selected by the author, through Dashboard Studio's documented `setToken` drilldown API.

## Theme and accessibility

The iframe does not inherit Splunk CSS variables, so the SDK theme listener selects tested light/dark surfaces. Compact iframe canvases use the corresponding Dashboard Studio canvas color instead of the browser's default white. The icon foreground is computed as black or white based on the author-selected hex background. Animation is small and disabled when `prefers-reduced-motion` is active.

Splunk's generated iframe body can retain a 960-pixel initial containing block even when a compact iframe is only 50 pixels wide. Each visualization therefore listens for documented dimension updates and clamps that body to the delivered pixel size. This prevents invisible horizontal overflow and keeps pointer/focus geometry aligned with the visible tile.

The rich tooltip trigger is a native button with an accessible name and tooltip relationship. Focus opens the tooltip; click can pin it; Escape dismisses it without discarding focus. Tooltip content contains no focusable controls, avoiding an ambiguous composite-widget interaction model.
