# Authoring a token-controlled Help Badge

The installed **Dashboard Help Badge — Interactive Tutorial** is the primary learning artifact. Clone it before editing so the shipped reference remains an answer key.

## Visual-editor workflow

1. In View mode choose **Actions → Clone dashboard**, assign a new title and ID, and open the clone in Edit mode.
2. Choose **Add chart → Help Trigger** (element 1 of 2). Size it to 50 × 50 and place it at the edge of the tile being explained.
3. Configure its accessible label, token name, open and closed values, glyph, color, and size.
4. Under **Interactions**, add **Set tokens**. Enter the same token name, select the predefined token `value`, enable Default value, enter `closed`, and apply.
5. Choose **Add chart → Help Panel** (element 2 of 2). Position the open card, configure its content, and give it the same token name and closed value.
6. Give the panel the same Set tokens interaction so its close button can write the closed value.
7. Under the panel's **Visibility** section, create a condition such as `$help_service$ = "open"` and select **Show when condition is met**.
8. Enter View mode and test full-tile click, repeated click, ×, Escape, Enter, and Space.

Dashboard Studio shows conditionally hidden panels in Edit mode so authors can select and configure them. In View mode the panel is not materialized while its token is closed.

## Reuse within a dashboard

Splunk 10.4 supports multi-select copy and paste. Select both elements with Command/Control, copy, and paste. Give the duplicated pair a new token name in both Token pairing sections and both interactions, then create a new visibility condition. Reusing one token for multiple pairs causes all associated panels to open together.

## Save protection

Splunk object ACLs do not distinguish editing from saving. Removing write access removes normal edit mode; users with `admin_all_objects` can modify nearly any object regardless. The app therefore uses the supported clone-first workflow and restricts the installed dashboards to administrative writers. This protects the tutorial for ordinary users without adding unsupported parent-page JavaScript or Splunk-side modifications.
