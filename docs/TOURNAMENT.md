# Contextual-help tournament result

The opening dashboard compared four contenders against the same metric and content. Live testing selected **D — Token-controlled overlay** as the product direction.

## Scoring rubric

Score each contender from 1–5 for:

1. visual polish;
2. how convincingly it attaches to a tile;
3. mouse, keyboard, touch, and Escape behavior;
4. interference with the underlying visualization; and
5. authoring effort and reuse across dashboards.

## Opening bracket

| Seed | Pattern | Strongest trait | Known cost |
| --- | --- | --- | --- |
| A | Native compact hover | Minimal footprint | Browser-owned tooltip presentation |
| B | Rich hover sidecar | Discoverability and styling | Reserved iframe and Splunk visualization chrome |
| C | Rich click-to-pin sidecar | Predictable mouse/touch behavior | Reserved iframe and Splunk visualization chrome |
| D | Token-controlled overlay | Tiny closed state plus styled panel | Paired elements, event handler, and visibility condition |

## Token-controlled pairing recipe

Use the same `tokenName`, `openValue`, and `closedValue` on the Help Trigger and the corresponding values on Help Panel. Configure both elements with a `drilldown.setToken` event handler whose key is `value`:

```json
{
  "type": "drilldown.setToken",
  "options": {
    "tokens": [
      { "token": "help_tournament", "key": "value" }
    ]
  }
}
```

Define a condition for the open value:

```json
{
  "name": "Show token popover",
  "value": "$help_tournament$ = \"open\""
}
```

Reference that condition from the Help Panel's `containerOptions.visibility.showConditions`. Give the token a closed default value so the panel is absent on first load. The packaged dashboard contains the full working source.

## Tournament progression

Contender D won because it combines a tiny closed footprint, deterministic rich styling, predictable touch/click operation, and no persistent iframe covering the underlying tile. The production refinement makes the entire compact trigger tile—not only the visible `i`—the native button hit target. The trigger and compact badge also consume the Dashboard Studio SDK theme state so their iframe canvas follows light and dark dashboards.

The installed default dashboard is now an interactive winner tutorial. It contains a finished pair, an inspectable reference pair, an empty practice tile, exact visual-editor steps, a completion checklist, and an advanced source map. The separate dark-theme view proves the theme contract on a real dark Dashboard Studio canvas.
