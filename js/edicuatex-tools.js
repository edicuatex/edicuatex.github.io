/* LANGUAGE TOOLS */
// Safe check for parent context
const hasParent = typeof parent !== 'undefined' && parent !== window;

// Define the object that will hold the translations
window.$i18n = window.$i18n || {};

// Check if it's in eXe and translate (if possible)
let isInExe = false;
try {
    isInExe = hasParent &&
        typeof parent.eXeLearning === 'object' &&
        typeof parent.tinymce === 'object' &&
        typeof parent.jQuery === 'function';
} catch (e) {
    console.warn('Cannot access parent context (cross-origin restriction):', e);
}

// Global placeholder for the translation function
window._ = function(str) {
    return str;
};

if (isInExe) {
    document.documentElement.className = 'exelearning';

    // Safe access to eXe's language
    try {
        if (parent.eXeLearning?.app?.locale?.lang) {
            document.documentElement.lang = parent.eXeLearning.app.locale.lang;
        }
    } catch (e) {
        console.warn('Cannot access eXeLearning language:', e);
    }

    // Use eXe's _ function to translate
    try {
        if (typeof parent._ === 'function') {
            window._ = parent._;
        }
    } catch (e) {
        console.warn('Cannot access parent translation function:', e);
    }
} else {
    // Setup for standalone execution
    const supportedLangs = ['en', 'es', 'ca', 'gl', 'eu', 'de'];

    /**
     * Get language parameter from URL
     * @returns {string} Language code or empty string
     */
    function getLangParam() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const lang = urlParams.get('lang') || '';

            //Sanitize: only allow alphanumeric characters and hyphens
            const sanitized = lang.replace(/[^a-zA-Z0-9-]/g, '');

            return sanitized;
        } catch (e) {
            return '';
        }
    }

    /**
     * Get saved language from localStorage
     * @returns {string|null} Saved language or null
     */
    function getSavedLang() {
        try {
            return localStorage.getItem('userLanguage');
        } catch (e) {
            console.warn('localStorage not available:', e);
            return null;
        }
    }

    /**
     * Detect browser language
     * @returns {string} Browser language code
     */
    function getBrowserLang() {
        try {
            const browserLang = navigator.language?.split('-')[0] || 'en';
            return supportedLangs.includes(browserLang) ? browserLang : 'en';
        } catch (e) {
            return 'en';
        }
    }

    // Determine default language with priority: URL > localStorage > Browser > English
    const urlLang = getLangParam();
    const savedLang = getSavedLang();
    const browserLang = getBrowserLang();
    let defaultLang = 'en';
    if (urlLang && supportedLangs.includes(urlLang)) {
        defaultLang = urlLang;
    } else if (savedLang && supportedLangs.includes(savedLang)) {
        defaultLang = savedLang;
    } else {
        defaultLang = browserLang;
    }

    document.documentElement.lang = defaultLang;
}

/* MATHJAX CONFIGURATION */
window.MathJax = {
    loader: {
        load: ['[tex]/color', '[tex]/mhchem']
    },
    tex: {
        inlineMath: [
            ['\\(', '\\)']
        ],
        displayMath: [
            ['$$', '$$'],
            ['\\[', '\\]']
        ],
        processEscapes: true,
        packages: {
            '[+]': ['cases', 'mathtools', 'color', 'mhchem']
        }
    },
    svg: {
        fontCache: 'local'
    },
    startup: {
        ready: () => {
            MathJax.startup.defaultReady();
            if (typeof window.initializeLatexEditor === 'function') {
                try {
                    window.initializeLatexEditor();
                } catch (e) {
                    console.error('Error initializing LaTeX editor:', e);
                }
            }
        }
    }
};

/**
 * Resolve MathJax URL based on context
 * @returns {string} Resolved MathJax URL
 */
function getMathJaxUrl() {
    const defaultUrl = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js";

    if (!isInExe) {
        return defaultUrl;
    }

    try {
        if (!parent?.tinymce?.activeEditor?.settings?.edicuatex_mathjax_url) {
            console.warn('MathJax URL not configured in eXe, using default');
            return defaultUrl;
        }

        let url = parent.tinymce.activeEditor.settings.edicuatex_mathjax_url;

        // Detect app base path from edicuatex iframe URL for subdirectory deployments
        const pathname = window.location.pathname;
        const appIndex = pathname.indexOf('/app/');
        const appBasePath = appIndex > 0 ? pathname.substring(0, appIndex) : '';

        // Handle different URL formats
        if (url.startsWith('/')) {
            if (appBasePath && url.startsWith(appBasePath)) {
                return window.location.origin + url;
            } else {
                return window.location.origin + appBasePath + url;
            }
        } else if (url.startsWith('./')) {
            return window.location.origin + appBasePath + '/' + url.substring(2);
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        } else {
            return window.location.origin + appBasePath + '/' + url;
        }
    } catch (e) {
        console.warn('Error resolving MathJax URL, using default:', e);
        return defaultUrl;
    }
}

/**
 * Load MathJax script
 */
function loadMathJax() {
    var url = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js";
    if (isInExe) {
        url = parent.tinymce.activeEditor.settings.edicuatex_mathjax_url;

        // Detect app base path from edicuatex iframe URL for subdirectory deployments
        // e.g., /dist/static/app/common/edicuatex/index.html → /dist/static
        var appBasePath = '';
        var pathname = window.location.pathname;
        var appIndex = pathname.indexOf('/app/');
        if (appIndex > 0) {
            appBasePath = pathname.substring(0, appIndex);
        }

        // The URL may be absolute (e.g., /app/...) but the <base> tag
        // in this document would resolve it as relative, causing path duplication.
        // Prepend origin + basePath to make it a fully qualified URL that ignores the <base> tag.
        // Only prepend appBasePath if the URL doesn't already include it.
        // In online mode, getAssetURL() already adds the base path to the URL.
        if (url && url.startsWith('/')) {
            // Check if URL already starts with appBasePath (online mode)
            if (appBasePath && url.startsWith(appBasePath)) {
                // URL already has base path, just prepend origin
                url = window.location.origin + url;
            } else {
                // URL is root-relative, prepend origin + basePath
                url = window.location.origin + appBasePath + url;
            }
        } else if (url && url.startsWith('./')) {
            // Handle relative URLs with ./ prefix - convert to absolute from root
            // This avoids the <base> tag resolving ./app/... as /app/common/edicuatex/app/...
            url = window.location.origin + appBasePath + '/' + url.substring(2);
        }
    }
    var s;
    s = document.createElement("script");
    s['async'] = "";
    s.id = "MathJax-script";
    s.src = url;
    document.getElementsByTagName("head")[0].appendChild(s);
}

/* DOMCONTENTLOADED EVENT */
document.addEventListener("DOMContentLoaded", function() {
    // Save reference to the initial translation function
    const originalTranslationFn = window._;

    /**
     * Redefine window._ with complete translation logic
     * In iframe mode: ALWAYS use parent._() from eXeLearning
     * In standalone mode: use local $i18n translations
     * @param {string} str - String to translate
     * @returns {string} Translated string
     */
    window._ = function(str) {
        if (!str) return str;

        // IFRAME MODE: Always use parent._() from eXeLearning
        if (isInExe && typeof originalTranslationFn === 'function') {
            try {
                return originalTranslationFn(str);
            } catch (e) {
                console.warn('Translation failed in eXe context:', e);
                return str;
            }
        }

        // STANDALONE MODE: Use local $i18n translations
        const appLang = document.documentElement.lang;

        if (window.$i18n && typeof window.$i18n === 'object') {
            // Try language-specific translations first
            if (window.$i18n[appLang] && typeof window.$i18n[appLang] === 'object') {
                if (typeof window.$i18n[appLang][str] === 'string') {
                    return window.$i18n[appLang][str];
                }
            }

            // Fallback to default 'eXe' translations
            if (window.$i18n['eXe'] && typeof window.$i18n['eXe'] === 'object') {
                if (typeof window.$i18n['eXe'][str] === 'string') {
                    return window.$i18n['eXe'][str];
                }
            }
        }

        // Otherwise, return the original string
        return str;
    };

    // Load MathJax
    loadMathJax();
});
