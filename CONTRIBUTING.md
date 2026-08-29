# Contributing

Contributions and field-testing reports are welcome.

## Development

1. Use Node.js 22 or later and npm 10 or later.
2. Fork and clone the repository.
3. Run `npm ci`.
4. Make a focused change without adding instance credentials, internal hostnames, generated archives, or local Splunk configuration.
5. Run `npm run verify`.
6. Describe the Dashboard Studio and accessibility behavior exercised by the change in the pull request.

The installable archive is generated from `package/app/app.conf`, which is the Splunk app identity source of truth. Keep its two version fields synchronized with `package.json`.

By contributing, you agree that your contribution is licensed under the MIT License.
