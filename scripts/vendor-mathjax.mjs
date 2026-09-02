#!/usr/bin/env node
/**
 * Regenerates js/mathjax/, the copy of MathJax the pages load (see
 * js/edicuatex-tools.js). That directory IS committed, so the editor serves
 * itself with no external request and a plain clone works offline; this script
 * only has to be run when the pinned versions in package.json change:
 *
 *   npm install && npm run vendor
 *
 * Only the SVG path is copied. The full package is ~29 MB, most of it the CHTML
 * output the editor never selects and the combined bundles it never loads; what
 * is kept is ~18 MB on disk and ~3.4 MB in git.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'js', 'mathjax');

// Resolved through node's own lookup rather than assuming node_modules sits
// next to this script: when the package is installed as a dependency npm hoists
// mathjax to the consumer's top-level node_modules, and joining a path here
// would miss it.
function packageDir(name) {
    return dirname(require.resolve(name + '/package.json'));
}

function copy(from, to) {
    const slash = from.indexOf('/', from.startsWith('@') ? from.indexOf('/') + 1 : 0);
    const pkg = slash === -1 ? from : from.slice(0, slash);
    const rest = slash === -1 ? '' : from.slice(slash + 1);
    const destination = join(target, to);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(packageDir(pkg), rest), destination, { recursive: true });
    console.log('js/mathjax/' + to);
}

rmSync(target, { recursive: true, force: true });

// tex-svg.js is the only bundle the <script> tag loads; the rest is what MathJax
// resolves against that directory and fetches when a formula first needs it.
for (const file of ['tex-svg.js', 'loader.js', 'startup.js', 'core.js', 'LICENSE']) {
    copy(join('mathjax', file), file);
}
copy('mathjax/input', 'input');   // TeX extensions: cases, color, mathtools, mhchem
copy('mathjax/output', 'output');
copy('mathjax/ui', 'ui');         // context menu

// Accessibility. assistive-mml (the hidden MathML every screen reader reads) is
// already inside tex-svg.js; these add the spoken descriptions, the keyboard
// explorer and Nemeth braille, with speech rules for es, ca, de among others.
// Nothing here is downloaded unless a reader opens the accessibility menu.
copy('mathjax/a11y', 'a11y');
copy('mathjax/sre', 'sre');

// MathJax 4 splits its font into a base set inside the bundle plus ~40 glyph
// ranges fetched on first use, and mhchem's glyphs moved into a package of
// their own. loader.paths.fonts points at this directory, and MathJax appends
// the package name itself, so the layout has to mirror node_modules. Only the
// SVG halves are copied; the editor has no CHTML output.
copy('@mathjax/mathjax-newcm-font/svg', 'fonts/mathjax-newcm-font/svg');
copy('@mathjax/mathjax-mhchem-font-extension/svg.js', 'fonts/mathjax-mhchem-font-extension/svg.js');
