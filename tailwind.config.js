/**
 * Solo para menus/editor.html, la única página que usa Tailwind. Antes lo hacía
 * el «Play CDN», que compila en el navegador leyendo el DOM; aquí se compila una
 * vez a menus/vendor/tailwind.css, que va versionado. El escaneo tiene que
 * incluir editor.js porque allí se generan clases al construir el HTML.
 */
module.exports = {
    content: ['./menus/editor.html', './menus/editor.js'],
    theme: { extend: {} },
    plugins: [],
};
