#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const excludedDirectories = new Set([
    '.appinspect-venv',
    '.git',
    'dist',
    'node_modules',
    'stage',
]);
const forbiddenNames = /^(?:\.DS_Store|\.env(?:\..*)?|appinspect-report\.json)$|__pycache__|\.pyc$/;
const sensitivePatterns = [
    { label: 'private IPv4 address', regex: /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/ },
    { label: 'private home.arpa hostname', regex: /\b[a-z0-9.-]+\.home\.arpa\b/i },
    { label: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { label: 'credential in URL', regex: /https?:\/\/[^\s/:]+:[^\s/@]+@/i },
    { label: 'GitHub token', regex: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { label: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { label: 'Slack token', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
];

const findings = [];

function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
        const absolutePath = join(directory, entry.name);
        const relativePath = relative(projectRoot, absolutePath);
        if (forbiddenNames.test(entry.name) || forbiddenNames.test(relativePath)) {
            findings.push(`${relativePath}: forbidden local artifact`);
            continue;
        }
        if (entry.isDirectory()) {
            visit(absolutePath);
            continue;
        }
        if (!entry.isFile()) continue;

        if (relativePath === 'scripts/scan-public-tree.mjs') continue;

        const bytes = readFileSync(absolutePath);
        if (bytes.includes(0)) continue;
        const text = bytes.toString('utf8');
        for (const pattern of sensitivePatterns) {
            if (pattern.regex.test(text)) findings.push(`${relativePath}: ${pattern.label}`);
        }
    }
}

visit(projectRoot);

if (findings.length) {
    throw new Error(`Public-tree scan failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`);
}

console.log('Public-tree scan passed: no local artifacts or recognized secret patterns found.');
