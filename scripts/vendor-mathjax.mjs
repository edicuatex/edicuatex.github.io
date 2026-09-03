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
    // Not join(): what copy() takes is a package specifier, and those are always
    // written with forward slashes. On Windows join() returns a backslashed path,
    // where the package name no longer ends at a slash, and the whole string was
    // handed to require.resolve — which is how the Windows build broke.
    copy(`mathjax/${file}`, file);
}
copy('mathjax/input', 'input');   // TeX extensions: cases, color, mathtools, mhchem
copy('mathjax/output', 'output');
copy('mathjax/ui', 'ui');         // context menu

// The hidden MathML every screen reader reads. It is the whole accessibility
// story here: NVDA, JAWS and VoiceOver turn MathML into speech themselves, and
// this component needs no worker and no fetch, so it survives a page opened
// from the filesystem.
//
// What is deliberately not copied is the Speech Rule Engine and the rest of
// a11y/ that gates it -- the expression explorer, Nemeth braille and MathJax's
// own voicing. That was 5 MB of the tree, it never produced a word in this
// editor, it builds its worker from a blob: URL that a strict CSP refuses and
// that no file:// page can run, and it has speech rules for neither Galician
// nor Basque, both of which this editor is translated into. eXeLearning reached
// the same conclusion for the same reasons (their ADR-2259-03).
copy('mathjax/a11y/assistive-mml.js', 'a11y/assistive-mml.js');

// MathJax 4 splits its font into a base set inside the bundle plus ~40 glyph
// ranges fetched on first use, and mhchem's glyphs moved into a package of
// their own. loader.paths.fonts points at this directory, and MathJax appends
// the package name itself, so the layout has to mirror node_modules. Only the
// SVG halves are copied; the editor has no CHTML output.
copy('@mathjax/mathjax-newcm-font/svg', 'fonts/mathjax-newcm-font/svg');
copy('@mathjax/mathjax-mhchem-font-extension/svg.js', 'fonts/mathjax-mhchem-font-extension/svg.js');
