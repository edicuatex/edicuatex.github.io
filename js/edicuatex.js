// --- Language & UI Update Functions ---

/**
 * Setup language selector for standalone mode
 */
function setupLanguageSelector() {
    const languageSelector = document.getElementById('language-selector');
    const languageToggle = document.getElementById('language-toggle');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = Array.from(document.querySelectorAll('.language-option'));

    if (!languageSelector || !languageToggle || !languageDropdown || languageOptions.length === 0) return;
    if (typeof isInExe !== 'undefined' && isInExe) return;

    languageSelector.style.display = 'flex';
    const updateLanguageUI = lang => {
        languageOptions.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    };
    updateLanguageUI(document.documentElement.lang);

    languageToggle.addEventListener('click', e => {
        e.stopPropagation();
        languageDropdown.classList.toggle('open');
    });

    languageOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            changeLanguage(btn.dataset.lang);
            updateLanguageUI(btn.dataset.lang);
            languageDropdown.classList.remove('open');
        });
    });

    document.addEventListener('click', e => {
        if (!languageSelector.contains(e.target)) {
            languageDropdown.classList.remove('open');
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') languageDropdown.classList.remove('open');
    });
}

/**
 * Change application language
 * @param {string} newLang - New language code
 */
function changeLanguage(newLang) {
    document.documentElement.lang = newLang;
    localStorage.setItem('userLanguage', newLang);
    document.querySelectorAll('.language-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === newLang);
    });
    updateAllDynamicTexts();
    addFooter();
}

/**
 * Update all dynamic texts in the UI
 */
function updateAllDynamicTexts() {
    document.title = window._('EdiCuaTeX - LaTeX Equation Editor');
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-key');
        // Special handling for elements with mixed content
        if (el.querySelector('a[data-i18n-key]')) {
            const link = el.querySelector('a');
            const linkKey = link.getAttribute('data-i18n-key');
            link.textContent = window._(linkKey);
            const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                textNode.textContent = window._(key) + " ";
            }
        } else if (el.closest('button#ask-ai-btn')) {
            el.textContent = " " + window._(key);
        } else {
            el.textContent = window._(key);
        }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => el.title = window._(el.getAttribute('data-i18n-title')));
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = window._(el.getAttribute('data-i18n-placeholder')));

    if (window.rebuildToolbarAndUI) {
        window.rebuildToolbarAndUI();
    }
}

/**
 * Add footer to the page (standalone mode only)
 */
function addFooter() {
    const footer = document.getElementById('page-footer');
    const isExeContext = typeof isInExe !== 'undefined' && isInExe;
    if (footer && !isExeContext) {
        footer.innerHTML = `<p style="margin-bottom: 10px;">© <a href="https://bilateria.org" target="_blank" rel="noopener noreferrer">Juan José de Haro</a></p>
<p style="margin-bottom: 0;">${window._('Code license:')} <a href="LICENSE.txt" target="_blank" rel="noopener noreferrer">AGPL v3</a> · ${window._('Content:')} <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>`;
    }
}

// --- Main Application Logic ---

/**
 * Initialize the LaTeX editor application
 */
async function initializeLatexEditor() {
    // Create local alias for window._ to use _() conveniently
    const _ = window._;
    // --- DOM REFERENCES ---
    const latexInput = document.getElementById('latex-input');
    const preview = document.getElementById('preview');
    const copyButton = document.getElementById('copy-button');
    const clearButton = document.getElementById('clear-button');
    const insertButton = document.getElementById('insert-button');
    const viewImageButton = document.getElementById('view-image-button');
    let sendButton = null;
    const delimiterSelector = document.getElementById('delimiter-selector');
    const copyCodeFeedback = document.getElementById('copy-code-feedback');
    const tabsContainer = document.getElementById('tabs-container');
    const toolbar = document.getElementById('toolbar');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const menuTogglerBtn = document.getElementById('menu-toggler-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const urlInput = document.getElementById('url-input');
    const fileInput = document.getElementById('file-input');
    const loadUrlBtn = document.getElementById('load-url-btn');
    const modalFeedback = document.getElementById('modal-feedback');
    const alertModal = document.getElementById('alert-modal');
    const alertModalTitle = document.getElementById('alert-modal-title');
    const alertModalMessage = document.getElementById('alert-modal-message');
    const alertModalCloseBtn = document.getElementById('alert-modal-close-btn');
    const availableMenusList = document.getElementById('available-menus-list');
    const reloadMenusListBtn = document.getElementById('reload-menus-list-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const askAiBtn = document.getElementById('ask-ai-btn');
    const aiModal = document.getElementById('ai-modal');
    const closeAiModalBtn = document.getElementById('close-ai-modal-btn');
    const aiUserPrompt = document.getElementById('ai-user-prompt');
    const generateAiPromptBtn = document.getElementById('generate-ai-prompt-btn');
    const aiGeneratedPrompt = document.getElementById('ai-generated-prompt');
    const openChatGptBtn = document.getElementById('open-chatgpt-btn');
    const copyAiPromptBtn = document.getElementById('copy-ai-prompt-btn');
    const aiFeedback = document.getElementById('ai-feedback');
    const maximizeBtn = document.getElementById('maximize-btn');

    // --- Helper functions ---
    function stripLatexDelimiters(code) {
        if (!code) return code;
        const trimmed = code.trim();
        const patterns = [
            /^\\\(([\s\S]+?)\\\)$/,
            /^\\\[([\s\S]+?)\\\]$/,
            /^\$\$([\s\S]+?)\$\$$/,
            /^\$([\s\S]+?)\$$/
        ];
        for (const p of patterns) {
            const m = trimmed.match(p);
            if (m) return m[1].trim();
        }
        return trimmed;
    }

    function autoPickDelimiter(latexFragment) {
        const selectorEl = document.getElementById('delimiter-selector');
        if (!selectorEl || !latexFragment) return;
        const frag = latexFragment.trim();

        if (/^\\\(.+?\\\)$/.test(frag)) {
            selectorEl.value = 'parentheses';
            return;
        }
        if (/^\\\[([\s\S]+?)\\\]$/.test(frag)) {
            selectorEl.value = 'brackets';
            return;
        }
        if (/^\$\$([\s\S]+?)\$\$$/.test(frag)) {
            selectorEl.value = 'double_dollar';
            return;
        }
        if (/^\$([\s\S]+?)\$$/.test(frag)) {
            selectorEl.value = 'single_dollar';
            return;
        }

        selectorEl.value = isInExe ? 'parentheses' : 'none';
    }

    // --- Contextual UI Adjustments ---
    if (isInExe) {
        const headerEl = document.querySelector('.header');
        const footerEl = document.querySelector('.footer');
        if (headerEl) headerEl.style.display = 'none';
        if (footerEl) footerEl.style.display = 'none';

        if (copyButton) copyButton.style.display = 'none';

        if (delimiterSelector) {
            const allowedDelims = ['none', 'parentheses', 'brackets'];
            Array.from(delimiterSelector.options).forEach(opt => {
                if (!allowedDelims.includes(opt.value)) {
                    opt.remove();
                }
            });
            if (!latexInput.value.trim()) {
                delimiterSelector.value = 'parentheses';
            }
        }
    } else {
        if (insertButton) insertButton.style.display = 'none';
    }

    // --- Prefill from eXeLearning Selection ---
    const urlSel = new URLSearchParams(window.location.search).get('sel');
    if (urlSel) {
        const originalSel = decodeURIComponent(urlSel);
        autoPickDelimiter(originalSel);
        latexInput.value = stripLatexDelimiters(originalSel);
    }

    try {
        if (window.opener && window.opener.PasteMathDialog && window.opener.PasteMathDialog.mathEditor && window.opener.PasteMathDialog.mathEditor.field) {
            const parentLatex = window.opener.PasteMathDialog.mathEditor.field.val().trim();
            if (parentLatex) {
                autoPickDelimiter(parentLatex);
                latexInput.value = stripLatexDelimiters(parentLatex);
            }
        }
    } catch (err) {
        console.warn(_('Could not get code from parent dialog:'), err);
    }

    // --- CONFIG & STATE ---
    const MANIFEST_URL = './menus/menus.json';
    const MAX_RECENTS = 12;
    let loadedMenus = new Map();
    let menuCache = new Map();
    let recentSymbols = [];
    const urlParams = new URLSearchParams(window.location.search);
    const pmEnabled = !isInExe && (urlParams.get('pm') === '1' || urlParams.get('postmessage') === '1');
    const pmOrigin = urlParams.get('origin') ? decodeURIComponent(urlParams.get('origin')) : '';

    // --- CORE FUNCTIONS ---
    const loadRecents = () => {
        recentSymbols = JSON.parse(localStorage.getItem('latexRecents')) || [];
    };
    const saveRecents = () => {
        localStorage.setItem('latexRecents', JSON.stringify(recentSymbols));
    };
    const clearRecents = () => {
        recentSymbols = [];
        localStorage.removeItem('latexRecents');
        rebuildToolbarAndUI();
    };

    const createRecentsTab = () => {
        if (document.querySelector('[data-tab="recientes"]')) return;
        const recentsTabButton = document.createElement('button');
        recentsTabButton.className = 'tab-btn';
        recentsTabButton.dataset.tab = 'recientes';
        recentsTabButton.textContent = _('Recent');
        tabsContainer.prepend(recentsTabButton);
        const recentsContentDiv = document.createElement('div');
        recentsContentDiv.id = 'tab-recientes';
        recentsContentDiv.className = 'tab-content';
        toolbar.prepend(recentsContentDiv);
    };

    const trackSymbolUsage = (latexCode) => {
        const wasEmpty = recentSymbols.length === 0;
        recentSymbols = recentSymbols.filter(item => item !== latexCode);
        recentSymbols.unshift(latexCode);
        if (recentSymbols.length > MAX_RECENTS) recentSymbols = recentSymbols.slice(0, MAX_RECENTS);
        saveRecents();
        if (wasEmpty) {
            createRecentsTab();
            renderTabContent('recientes', getAllCategories());
        } else {
            const recentsContent = document.getElementById('tab-recientes');
            if (recentsContent && recentsContent.classList.contains('active')) {
                renderTabContent('recientes', getAllCategories());
            }
        }
    };

    const saveAddedMenusToStorage = () => {
        const added = Array.from(loadedMenus.values())
            .filter(m => m.source !== 'default' && m.source !== 'localfile')
            .map(m => ({
                id: m.id,
                url: m.url,
                source: m.source,
                name: m.name
            }));
        localStorage.setItem('latexAddedMenus', JSON.stringify(added));
    };

    const loadAddedMenusFromStorage = () => JSON.parse(localStorage.getItem('latexAddedMenus')) || [];
    const loadDisabledMenusFromStorage = () => JSON.parse(localStorage.getItem('latexDisabledMenus')) || [];
    const saveDisabledMenusToStorage = (disabledIds) => {
        localStorage.setItem('latexDisabledMenus', JSON.stringify(Array.from(disabledIds)));
    };

    const resolveMenuUrl = (rawUrl) => {
        if (!rawUrl) return rawUrl;
        const trimmed = rawUrl.trim();
        const absolutePattern = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
        if (absolutePattern.test(trimmed)) return trimmed;
        if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;
        if (trimmed.startsWith('./menus/') || trimmed.startsWith('menus/') || trimmed.startsWith('/')) return trimmed;
        if (trimmed.startsWith('../')) return trimmed;
        const normalized = trimmed.replace(/^\.\/+/, '');
        return `./menus/${normalized}`;
    };

    const fetchMenuData = async (url) => {
        if (menuCache.has(url)) return menuCache.get(url);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            menuCache.set(url, data);
            return data;
        } catch (error) {
            console.error(_('Error loading menu') + ` ${url}:`, error);
            showModalFeedback(_('Could not load') + ` ${url}`, true);
            return null;
        }
    };

    const addMenu = async (menuInfo) => {
        if (loadedMenus.has(menuInfo.id)) return;
        const resolvedUrl = resolveMenuUrl(menuInfo.url);
        const data = await fetchMenuData(resolvedUrl);
        if (data) {
            loadedMenus.set(menuInfo.id, {
                ...menuInfo,
                url: resolvedUrl,
                data
            });
            const disabled = new Set(loadDisabledMenusFromStorage());
            if (disabled.delete(menuInfo.id)) saveDisabledMenusToStorage(disabled);
            rebuildToolbarAndUI();
            saveAddedMenusToStorage();
        }
    };

    const removeMenu = (menuId) => {
        if (loadedMenus.has(menuId)) {
            const menu = loadedMenus.get(menuId);
            loadedMenus.delete(menuId);
            if (menu && menu.source !== 'localfile') {
                const disabled = new Set(loadDisabledMenusFromStorage());
                disabled.add(menuId);
                saveDisabledMenusToStorage(disabled);
            }
            rebuildToolbarAndUI();
            saveAddedMenusToStorage();
        }
    };

    const getAllCategories = () => {
        const allCategories = new Map();
        const menuOrder = ['default', 'github', 'url', 'localfile'];
        const sortedMenus = Array.from(loadedMenus.values()).sort((a, b) => menuOrder.indexOf(a.source) - menuOrder.indexOf(b.source));
        for (const menu of sortedMenus) {
            if (!menu.data || !menu.data.categorias) continue;
            for (const categoria of menu.data.categorias) {
                if (!allCategories.has(categoria.id)) {
                    allCategories.set(categoria.id, {
                        ...categoria,
                        elementos: [...categoria.elementos]
                    });
                } else {
                    allCategories.get(categoria.id).elementos.push(...categoria.elementos);
                }
            }
        }
        return allCategories;
    };

    window.rebuildToolbarAndUI = () => {
        tabsContainer.innerHTML = '';
        toolbar.innerHTML = '';
        const allCategories = getAllCategories();
        let isFirstTab = true;

        if (recentSymbols.length > 0) {
            createRecentsTab();
            isFirstTab = false;
        }

        allCategories.forEach((categoria) => {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-btn';
            tabButton.dataset.tab = categoria.id;
            tabButton.textContent = _(categoria.nombre);
            tabsContainer.appendChild(tabButton);
            const contentDiv = document.createElement('div');
            contentDiv.id = `tab-${categoria.id}`;
            contentDiv.className = 'tab-content';
            toolbar.appendChild(contentDiv);
        });

        let activeTab = tabsContainer.querySelector('.tab-btn.active');
        if (!activeTab) {
            const firstTab = tabsContainer.querySelector('[data-tab="recientes"]') || tabsContainer.querySelector('.tab-btn');
            if (firstTab) {
                activeTab = firstTab;
            }
        }

        if (activeTab) {
            activeTab.classList.add('active');
            const activeContent = document.getElementById(`tab-${activeTab.dataset.tab}`);
            if (activeContent) activeContent.classList.add('active');
            renderTabContent(activeTab.dataset.tab, allCategories);
        } else {
            toolbar.innerHTML = `<p>${_('No menus found.')}</p>`;
        }

        loadAndDisplayAvailableMenus();
    };

    async function loadAndDisplayAvailableMenus(forceReload = false) {
        const menuItemsMap = new Map();
        if (window.__manifestMenus) {
            window.__manifestMenus.forEach(menuItem => {
                const id = menuItem.file;
                menuItemsMap.set(id, {
                    id: id,
                    url: `./${id}`,
                    name: id.replace('.json', ''),
                    source: id === 'base.json' ? 'default' : 'manifest',
                    description: menuItem.description
                });
            });
        }
        loadedMenus.forEach(menu => {
            if (!menuItemsMap.has(menu.id)) menuItemsMap.set(menu.id, {
                ...menu
            });
        });
        loadAddedMenusFromStorage().forEach(stored => {
            if (!menuItemsMap.has(stored.id)) menuItemsMap.set(stored.id, {
                ...stored
            });
        });

        availableMenusList.innerHTML = '';
        if (menuItemsMap.size === 0) {
            availableMenusList.innerHTML = `<li>${_('No menus found.')}</li>`;
            return;
        }
        menuItemsMap.forEach(menu => {
            const li = document.createElement('li');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `menu-checkbox-${menu.id}`;
            cb.checked = loadedMenus.has(menu.id);
            cb.dataset.id = menu.id;
            cb.dataset.url = menu.url;
            cb.dataset.name = menu.name;
            cb.dataset.source = menu.source;
            const label = document.createElement('label');
            label.htmlFor = cb.id;
            label.className = 'menu-list-item-name';

            const menuName = _(menu.name) || menu.id;
            const menuDescription = _(menu.description || '');

            label.textContent = menuDescription ? `${menuName} (${menuDescription})` : menuName;
            label.title = `${_('File')}: ${menu.id}`;

            li.appendChild(cb);
            li.appendChild(label);
            availableMenusList.appendChild(li);
        });
    }

    function showAlert(title, htmlMessage) {
        alertModalTitle.textContent = _(title);
        alertModalMessage.innerHTML = htmlMessage;
        alertModal.classList.add('active');
    }

    function hideAlert() {
        alertModal.classList.remove('active');
    }

    function showImageModal(message, buttons) {
        document.getElementById('modal-message').innerHTML = message;
        const modalButtons = document.getElementById('modal-buttons');
        modalButtons.innerHTML = '';
        buttons.forEach(btnInfo => {
            const button = document.createElement('button');
            button.textContent = _(btnInfo.text);
            button.className = `btn ${btnInfo.class}`;
            button.onclick = () => {
                if (btnInfo.action) btnInfo.action();
                document.getElementById('image-modal').classList.remove('active');
            };
            modalButtons.appendChild(button);
        });
        document.getElementById('image-modal').classList.add('active');
    }

    function showModalFeedback(message, isError = false) {
        modalFeedback.textContent = message;
        modalFeedback.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
        setTimeout(() => modalFeedback.textContent = '', 3000);
    }

    function generateAiPrompt() {
        const userDescription = aiUserPrompt.value.trim();
        if (!userDescription) {
            showAiFeedback(_('Please describe the formula you need.'), true);
            return;
        }
        const prompt = `Provide the LaTeX code for the following mathematical description: "${userDescription}". The result should be only the LaTeX code, without additional explanations or delimiters like $$ or \\[ \\]. It should be ready to copy and paste directly into a LaTeX editor.`;
        aiGeneratedPrompt.value = prompt;
        openChatGptBtn.href = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
        openChatGptBtn.style.display = 'inline-block';
        copyAiPromptBtn.style.display = 'inline-block';
        showAiFeedback(_('Instruction generated. You can now use the buttons.'), false);
    }

    function showAiFeedback(message, isError = false) {
        aiFeedback.textContent = message;
        aiFeedback.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
        aiFeedback.style.opacity = '1';
        setTimeout(() => {
            if (aiFeedback.textContent === message) {
                aiFeedback.style.opacity = '0';
            }
        }, 4000);
    }

    function copyAiPrompt() {
        if (!aiGeneratedPrompt.value) return;
        navigator.clipboard.writeText(aiGeneratedPrompt.value);
        showAiFeedback(_('Instruction copied to clipboard!'), false);
    }

    function updatePreview() {
        const sanitizedInput = DOMPurify.sanitize(latexInput.value.trim());
        preview.innerHTML = sanitizedInput === "" ? "" : `$$${sanitizedInput}$$`;
        MathJax.typesetPromise([preview]).catch(() => {
            preview.innerHTML = `<span style="color:red;">${_('Syntax error')}</span>`;
        });
    }

    function insertAtCursor(textToInsert) {
        const startPos = latexInput.selectionStart;
        latexInput.value = latexInput.value.substring(0, startPos) + textToInsert + latexInput.value.substring(latexInput.selectionEnd);
        let cursorPos = textToInsert.indexOf('{}');
        latexInput.selectionStart = latexInput.selectionEnd = startPos + (cursorPos !== -1 ? cursorPos + 1 : textToInsert.length);
        latexInput.focus();
        updatePreview();
    }

    function computeWrappedLatex(raw) {
        switch (delimiterSelector.value) {
            case 'parentheses':
                return `\\(${raw}\\)`;
            case 'brackets':
                return `\\[${raw}\\]`;
            case 'double_dollar':
                return `$$\n${raw}\n$$`;
            case 'single_dollar':
                return `$${raw}$`;
            default:
                return raw;
        }
    }

    function generateImage(callback) {
        const svgElement = preview.querySelector('svg');
        if (!svgElement) {
            showImageModal(`<p>${_('No formula to capture.')}</p>`, [{
                text: _('Understood'),
                class: 'btn-primary'
            }]);
            return;
        }
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const padding = 20;
            canvas.width = svgElement.width.baseVal.value + padding * 2;
            canvas.height = svgElement.height.baseVal.value + padding * 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding, svgElement.width.baseVal.value, svgElement.height.baseVal.value);
            URL.revokeObjectURL(img.src);
            callback(canvas);
        };
        img.src = URL.createObjectURL(new Blob([svgString], {
            type: "image/svg+xml;charset=utf-8"
        }));
    }

    function handleViewImage() {
        generateImage(canvas => {
            const message = `<div><img src="${canvas.toDataURL('image/png')}" style="max-width: 100%; max-height: 80vh;"><p>${_('Right-click on the image to save or copy it.')}</p></div>`;
            showImageModal(message, [{
                text: _('Close'),
                class: 'btn-secondary'
            }]);
        });
    }

    function createMatrixBuilderUI(elemento) {
        const container = document.createElement('div');
        container.className = 'matrix-builder';
        container.dataset.title = _(elemento.title) || _('Matrix');
        container.innerHTML = `<div class="matrix-builder-group"><label for="mb-rows">${_('Rows:')}</label><input type="number" id="mb-rows" value="2" min="1" max="20"></div><div class="matrix-builder-group"><label for="mb-cols">${_('Columns:')}</label><input type="number" id="mb-cols" value="2" min="1" max="20"></div><div class="matrix-builder-group"><label for="mb-fill">${_('Fill:')}</label><select id="mb-fill"><option value="subscripts">${_('Subscripts (a, b...)')}</option><option value="zeros">${_('Zeros (0)')}</option><option value="ones">${_('Ones (1)')}</option><option value="vars">${_('Variables (a, b, c...)')}</option><option value="numbers">${_('Numbers (1, 2, 3...)')}</option><option value="empty">${_('Empty ({})')}</option></select></div><div class="matrix-builder-delimiters"><button class="btn" data-delimiter="pmatrix">()</button><button class="btn" data-delimiter="bmatrix">[]</button><button class="btn" data-delimiter="vmatrix">||</button><button class="btn" data-delimiter="Vmatrix">|||</button></div>`;
        container.querySelector('.matrix-builder-delimiters').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const rows = parseInt(container.querySelector('#mb-rows').value, 10);
            const cols = parseInt(container.querySelector('#mb-cols').value, 10);
            insertAtCursor(generateMatrixCode(rows, cols, container.querySelector('#mb-fill').value, button.dataset.delimiter));
        });
        return container;
    }

    function generateMatrixCode(rows, cols, fillType, delimiter) {
        if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) return '';
        let content = '',
            counter = 0;
        for (let i = 1; i <= rows; i++) {
            for (let j = 1; j <= cols; j++) {
                let cell;
                switch (fillType) {
                    case 'subscripts':
                        cell = `a_{${i}${j}}`;
                        break;
                    case 'zeros':
                        cell = '0';
                        break;
                    case 'ones':
                        cell = '1';
                        break;
                    case 'vars':
                        cell = 'abcdefghijklmnopqrstuvwxyz' [counter % 26];
                        counter++;
                        break;
                    case 'numbers':
                        cell = (counter + 1).toString();
                        counter++;
                        break;
                    case 'empty':
                        cell = '{}';
                        break;
                    default:
                        cell = '';
                }
                content += cell + (j < cols ? ' & ' : '');
            }
            if (i < rows) content += ' \\\\\n  ';
        }
        return `\\begin{${delimiter}}\n  ${content}\n\\end{${delimiter}}`;
    }

    function normalizeString(str) {
        return typeof str !== 'string' ? '' : str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function renderTabContent(tabId, allCategories) {
        const contentDiv = document.getElementById(`tab-${tabId}`);
        if (!contentDiv) return;
        contentDiv.innerHTML = '';
        let elementsToRender = [],
            gridColumns = "repeat(auto-fill, minmax(80px, 1fr))";
        if (tabId === 'recientes') {
            if (recentSymbols.length === 0) {
                contentDiv.innerHTML = `<p style="color: var(--dark-gray); grid-column: 1 / -1; text-align:center;">${_('No recent symbols yet.')}</p><div id="clear-recents-btn-container" style="grid-column: 1 / -1;"><button id="clear-recents-btn" class="btn btn-sm btn-danger">${_('Clear recent')}</button></div>`;
                if (document.getElementById('clear-recents-btn')) document.getElementById('clear-recents-btn').onclick = clearRecents;
                return;
            }
            recentSymbols.forEach(latexCode => {
                for (const menu of loadedMenus.values()) {
                    if (!menu.data || !menu.data.categorias) continue;
                    for (const categoria of menu.data.categorias) {
                        const found = categoria.elementos.find(el => el && el.latex === latexCode);
                        if (found) {
                            elementsToRender.push(found);
                            return;
                        }
                    }
                }
            });
        } else {
            const categoria = allCategories.get(tabId);
            if (categoria) {
                elementsToRender = categoria.elementos;
                gridColumns = categoria.grid_template_columns || gridColumns;
            }
        }
        contentDiv.style.gridTemplateColumns = gridColumns;
        elementsToRender.forEach(elemento => {
            if (!elemento) return;
            if (elemento.type === 'custom_matrix') {
                contentDiv.appendChild(createMatrixBuilderUI(elemento));
            } else if (elemento.latex) {
                const button = document.createElement('button');
                button.className = 'toolbar-btn';

                const translatedLatex = _(elemento.display || elemento.latex);
                button.dataset.latex = translatedLatex;
                button.dataset.recentKey = elemento.latex;
                button.innerHTML = `\\(${translatedLatex}\\)`;
                button.title = _(elemento.title);

                contentDiv.appendChild(button);
            }
        });
        if (tabId === 'recientes' && recentSymbols.length > 0) {
            const clearBtnContainer = document.createElement('div');
            clearBtnContainer.id = 'clear-recents-btn-container';
            clearBtnContainer.style.gridColumn = '1 / -1';
            clearBtnContainer.innerHTML = `<button id="clear-recents-btn" class="btn btn-sm btn-danger">${_('Clear recent')}</button>`;
            clearBtnContainer.firstElementChild.onclick = clearRecents;
            contentDiv.appendChild(clearBtnContainer);
        }
        MathJax.typesetPromise(contentDiv.querySelectorAll('.toolbar-btn'));
    }

    function handleTabSwitch(event) {
        const button = event.target.closest('.tab-btn');
        if (!button) return;
        tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        toolbar.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        const tabId = button.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');
        renderTabContent(tabId, getAllCategories());
    }

    function setupSendToHostButtonIfNeeded() {
        if (!pmEnabled) return;
        if (!pmOrigin || typeof pmOrigin !== 'string') {
            console.warn('postMessage mode requested but missing origin parameter');
        }
        const actionsContainers = document.querySelectorAll('.panel-actions');
        if (!actionsContainers || actionsContainers.length === 0) return;
        const actions = actionsContainers[0];
        if (!actions) return;
        sendButton = document.createElement('button');
        sendButton.className = 'btn btn-success';
        sendButton.id = 'send-button';
        sendButton.setAttribute('data-i18n-key', 'Send to host');
        sendButton.textContent = _('Send to host');
        actions.insertBefore(sendButton, actions.firstChild);

        sendButton.addEventListener('click', () => {
            const rawLatex = latexInput.value.trim();
            if (!rawLatex) return;
            if (!pmOrigin) {
                copyCodeFeedback.textContent = _('Missing or invalid origin.');
                copyCodeFeedback.style.opacity = '1';
                setTimeout(() => {
                    copyCodeFeedback.style.opacity = '0';
                }, 2000);
                return;
            }
            const payload = {
                type: 'edicuatex:result',
                latex: rawLatex,
                delimiter: delimiterSelector.value,
                wrapped: computeWrappedLatex(rawLatex)
            };
            try {
                let target = null;
                if (window.opener && !window.opener.closed) target = window.opener;
                else if (window.parent && window.parent !== window) target = window.parent;
                if (!target) {
                    copyCodeFeedback.textContent = _('No host window available.');
                    copyCodeFeedback.style.opacity = '1';
                    setTimeout(() => {
                        copyCodeFeedback.style.opacity = '0';
                    }, 2000);
                    return;
                }
                target.postMessage(payload, pmOrigin);
                copyCodeFeedback.textContent = _('Sent!');
                copyCodeFeedback.style.opacity = '1';
                setTimeout(() => {
                    copyCodeFeedback.style.opacity = '0';
                }, 2000);
            } catch (err) {
                console.error('postMessage error:', err);
                copyCodeFeedback.textContent = _('Error');
                copyCodeFeedback.style.opacity = '1';
                setTimeout(() => {
                    copyCodeFeedback.style.opacity = '0';
                }, 2000);
            }
        });
    }

    // --- INITIALIZATION ---

    const initializeApp = async () => {
        loadRecents();
        loadedMenus.clear();
        menuCache.clear();
        const disabledMenus = new Set(loadDisabledMenusFromStorage());
        let manifestMenus = [];
        try {
            const manifestResponse = await fetch(MANIFEST_URL);
            if (!manifestResponse.ok) throw new Error(_('Could not load') + ' menus.json');
            const manifest = await manifestResponse.json();
            manifestMenus = manifest.menus.filter(Boolean);
        } catch (e) {
            console.error('Error loading menus.json:', e);
            showAlert('Error', `Could not load <code>menus.json</code>.`);
        }
        const BASE_NAME = 'base.json';
        if (manifestMenus.find(m => m.file === BASE_NAME) && !disabledMenus.has(BASE_NAME)) {
            const baseUrl = resolveMenuUrl(BASE_NAME);
            const data = await fetchMenuData(baseUrl);
            if (data) loadedMenus.set(BASE_NAME, {
                id: BASE_NAME,
                url: baseUrl,
                source: 'default',
                name: 'Base',
                data
            });
        }
        const previouslyAdded = loadAddedMenusFromStorage();
        for (const menuInfo of previouslyAdded) {
            if (menuInfo.id === BASE_NAME && loadedMenus.has(BASE_NAME)) continue;
            if (disabledMenus.has(menuInfo.id)) continue;
            const data = await fetchMenuData(menuInfo.url);
            if (data) loadedMenus.set(menuInfo.id, {
                ...menuInfo,
                data
            });
        }
        window.__manifestMenus = manifestMenus;
        rebuildToolbarAndUI();
        updatePreview();
        addFooter();
    };

    // --- EVENT LISTENERS ---
    latexInput.addEventListener('input', updatePreview);
    toolbar.addEventListener('click', (event) => {
        const btn = event.target.closest('.toolbar-btn');
        if (!btn || !btn.dataset.latex) return;
        insertAtCursor(btn.dataset.latex);
        trackSymbolUsage(btn.dataset.recentKey || btn.dataset.latex);
    });
    tabsContainer.addEventListener('click', handleTabSwitch);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', {
            bubbles: true
        }));
        searchInput.focus();
    });
    copyButton.addEventListener('click', () => {
        const rawLatex = latexInput.value.trim();
        if (!rawLatex) return;
        let textToCopy;
        switch (delimiterSelector.value) {
            case 'parentheses':
                textToCopy = `\\(${rawLatex}\\)`;
                break;
            case 'brackets':
                textToCopy = `\\[\n${rawLatex}\n\\]`;
                break;
            case 'double_dollar':
                textToCopy = `$$\n${rawLatex}\n$$`;
                break;
            case 'single_dollar':
                textToCopy = `$${rawLatex}$`;
                break;
            default:
                textToCopy = rawLatex;
        }
        navigator.clipboard.writeText(textToCopy);
        copyCodeFeedback.textContent = _('Code copied!');
        copyCodeFeedback.style.opacity = '1';
        setTimeout(() => {
            copyCodeFeedback.style.opacity = '0';
        }, 2000);
    });
    clearButton.addEventListener('click', () => {
        latexInput.value = '';
        latexInput.focus();
        updatePreview();
    });
    insertButton.addEventListener('click', () => {
        const rawLatex = latexInput.value.trim();
        if (!rawLatex) return;
        let latexToInsert;
        switch (delimiterSelector.value) {
            case 'parentheses':
                latexToInsert = `\\(${rawLatex}\\)`;
                break;
            case 'brackets':
                latexToInsert = `\\[${rawLatex}\\]`;
                break;
            default:
                latexToInsert = rawLatex;
        }
        try {
            const tinymceRef = parent && parent.tinymce ? parent.tinymce : null;
            if (isInExe && tinymceRef && tinymceRef.activeEditor) {
                tinymceRef.activeEditor.execCommand('mceReplaceContent', false, latexToInsert);
                tinymceRef.activeEditor.windowManager?.close();
                return;
            }
        } catch (err) {
            console.error('Insert Error:', err);
        }
        window.close();
    });
    viewImageButton.addEventListener('click', handleViewImage);
    menuTogglerBtn.addEventListener('click', function() {
        const tabs = document.getElementById('tabs-container');
        const toolbars = document.getElementById('toolbar-wrapper');
        if (!tabs || !toolbars) return;
        if (tabs.style.display == 'none') {
            tabs.style.display = 'block';
            toolbars.style.display = 'block';
        } else {
            tabs.style.display = 'none';
            toolbars.style.display = 'none';
        }
    });
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

    loadUrlBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showModalFeedback(_('Please enter a URL.'), true);
            return;
        }
        const menuName = url.substring(url.lastIndexOf('/') + 1) || 'menu.json';
        const menuInfo = {
            id: url,
            url: url,
            source: 'url',
            name: menuName
        };

        await addMenu(menuInfo);
        showModalFeedback(_('Menu loaded successfully.'), false);
        urlInput.value = '';
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length === 0) return;
        const [file] = fileInput.files;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                loadedMenus.set(file.name, {
                    id: file.name,
                    url: file.name,
                    source: 'localfile',
                    name: file.name,
                    data: parsed
                });
                rebuildToolbarAndUI();
                showModalFeedback(_('Menu loaded successfully.'), false);
            } catch (err) {
                console.error(_('Error parsing local JSON:'), err);
                showModalFeedback(`${_('The file is not a valid JSON')} (${err.message})`, true);
            }
        };
        reader.readAsText(file, 'utf-8');
        fileInput.value = '';
    });
    availableMenusList.addEventListener('change', (e) => {
        if (e.target.type !== 'checkbox') return;
        const ds = e.target.dataset;
        if (e.target.checked) addMenu(ds);
        else removeMenu(ds.id);
    });
    clearCacheBtn.addEventListener('click', () => location.reload(true));
    alertModalCloseBtn.addEventListener('click', hideAlert);
    askAiBtn.addEventListener('click', () => aiModal.classList.add('active'));
    closeAiModalBtn.addEventListener('click', () => aiModal.classList.remove('active'));
    generateAiPromptBtn.addEventListener('click', generateAiPrompt);
    copyAiPromptBtn.addEventListener('click', copyAiPrompt);
    maximizeBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
            maximizeBtn.textContent = '🗗';
        } else {
            document.exitFullscreen();
            maximizeBtn.textContent = '🗖';
        }
    });

    // Start the application
    initializeApp();

    // Enable contextual send-to-host button if requested via URL
    setupSendToHostButtonIfNeeded();
}

// Expose initializeLatexEditor to the global window object
window.initializeLatexEditor = initializeLatexEditor;

/* DOMCONTENTLOADED EVENT - Initialize UI */
document.addEventListener("DOMContentLoaded", function() {
    // Initialize language selector (standalone mode only)
    if (!isInExe && typeof setupLanguageSelector === 'function') {
        try {
            setupLanguageSelector();
        } catch (e) {
            console.error('Error in setupLanguageSelector:', e);
        }
    } else if (isInExe) {
        const editorLink = document.getElementById('menu-editor-link');
        if (editorLink) {
            try {
                const url = new URL(editorLink.href);
                url.searchParams.set('lang', document.documentElement.lang);
                editorLink.href = url.toString();
            } catch (e) {
                editorLink.href = editorLink.href + '?lang=' + document.documentElement.lang;
            }
        }
    }
    // Update all dynamic texts
    if (typeof updateAllDynamicTexts === 'function') {
        try {
            updateAllDynamicTexts();
        } catch (e) {
            console.error('Error in updateAllDynamicTexts:', e);
        }
    }
    // Add footer
    if (typeof addFooter === 'function') {
        try {
            addFooter();
        } catch (e) {
            console.error('Error in addFooter:', e);
        }
    }
});
