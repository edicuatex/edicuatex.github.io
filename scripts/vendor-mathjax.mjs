#!/usr/bin/env node
/**
 * Copies MathJax out of node_modules into js/mathjax/, where the pages look for
 * it before falling back to the CDN (see js/edicuatex-tools.js). Run it once
 * after `npm install` to serve the editor with no external requests.
 *
 *   npm install && npm run vendor
 *
 * The result is not committed: it is ~29 MB and reproducible from the pinned
 * versions in package.json.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'js', 'mathjax');

function copy(from, to) {
    const destination = join(target, to);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(root, 'node_modules', from), destination, { recursive: true });
    console.log('js/mathjax/' + to);
}

rmSync(target, { recursive: true, force: true });

// The whole package, not just tex-svg.js: MathJax resolves its TeX extensions,
// speech rules and menu against the directory of the #MathJax-script tag and
// fetches them when a formula first needs one.
copy('mathjax', '.');

// MathJax 4 splits its font into a base set inside the bundle plus ~40 glyph
// ranges fetched on first use, and mhchem's glyphs moved into a package of
// their own. loader.paths.fonts points at this directory, and MathJax appends
// the package name itself, so the layout has to mirror node_modules. Only the
// SVG halves are copied; the editor has no CHTML output.
copy('@mathjax/mathjax-newcm-font/svg', 'fonts/mathjax-newcm-font/svg');
copy('@mathjax/mathjax-mhchem-font-extension/svg.js', 'fonts/mathjax-mhchem-font-extension/svg.js');
