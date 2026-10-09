#!/usr/bin/env node
'use strict';

/**
 * Run the front-end suites one file per process.
 *
 * Node's test runner may execute several files inside a single process, and
 * `chat-flow.test.cjs` deliberately invalidates the require cache and installs
 * its own sandbox globals to boot the chat page from scratch. Sharing a process
 * with the other suites made the run order observable — i.e. flaky. One file
 * per process removes the coupling entirely, with no experimental flags.
 *
 * Usage: node scripts/run-js-tests.cjs [dir]
 * Exit code: 0 only when every suite passed.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const dir = path.resolve(root, process.argv[2] || 'tests-js');

const files = fs.readdirSync(dir)
    .filter(name => name.endsWith('.test.cjs'))
    .sort()
    .map(name => path.join(dir, name));

if (!files.length) {
    console.error(`no *.test.cjs files found in ${dir}`);
    process.exit(2);
}

let failed = 0;
for (const file of files) {
    const label = path.relative(root, file);
    const result = spawnSync(process.execPath, ['--test', file], {
        stdio: 'inherit',
        cwd: root
    });
    if (result.status !== 0) {
        failed += 1;
        console.error(`\n✖ ${label} failed (exit ${result.status})`);
    } else {
        console.log(`✔ ${label}`);
    }
}

console.log(`\n${files.length - failed}/${files.length} JS suites passed`);
process.exit(failed === 0 ? 0 : 1);
