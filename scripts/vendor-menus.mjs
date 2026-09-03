#!/usr/bin/env node
/**
 * Regenerates menus/vendor/, what menus/editor.html loads instead of a CDN.
 * Both files ARE committed, so a plain clone works offline; this only has to be
 * run when the pinned versions in package.json change:
 *
 *   npm install && npm run vendor
 *
 * The page used to pull SortableJS as @latest, which meant the code shipped to
 * users changed on its own, with no commit to point at, and put the editor one
 * compromised release away from running someone else's script. Tailwind came
 * from its Play CDN, which compiles in the browser and its own documentation
 * advises against in production; compiled once here it is 17 KB instead of 400.
 */
import { cpSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'menus', 'vendor');
mkdirSync(target, { recursive: true });

// Resolved through node's own lookup for the same reason as vendor-mathjax.mjs:
// installed as a dependency, sortablejs sits in the consumer's node_modules.
cpSync(join(dirname(require.resolve('sortablejs/package.json')), 'Sortable.min.js'),
       join(target, 'Sortable.min.js'));
console.log('menus/vendor/Sortable.min.js');

// Tailwind only scans what tailwind.config.js lists; editor.js is in there
// because it builds markup with classes that appear nowhere in the HTML.
// Run through node's resolution and not npx, which would reach for the network
// when tailwindcss is missing instead of saying so.
let cli;
try {
    cli = require.resolve('tailwindcss/lib/cli.js');
} catch {
    console.error('tailwindcss is a devDependency and is not installed here; ' +
                  'menus/vendor/tailwind.css is committed, so it only needs ' +
                  'rebuilding from a checkout with `npm install`.');
    process.exit(1);
}
execFileSync(process.execPath, [cli, '-c', join(root, 'tailwind.config.js'),
                                '-i', join(root, 'scripts', 'tailwind-input.css'),
                                '-o', join(target, 'tailwind.css'), '--minify'],
             { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
console.log('menus/vendor/tailwind.css');
