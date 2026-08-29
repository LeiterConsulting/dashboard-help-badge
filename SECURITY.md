# Security policy

## Supported version

Security fixes are made against the latest release on the `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** flow in the repository Security tab so the report and any proof of concept remain private while they are reviewed.

Include the affected version, Splunk version, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within five business days.

## Security design

The app has no inputs, scripted searches, custom REST handlers, credential storage, telemetry, or runtime network requests. Dashboard-authored options and tokens are treated as untrusted input: text is length-bounded and rendered with `textContent`, colors and enums are allowlisted, and structured token values are not evaluated.
