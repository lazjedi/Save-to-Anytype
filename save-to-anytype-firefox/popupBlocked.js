let stateBlocked = {
    theme: null,
    language: null,
    accentColor: null,
    zoom: null
};

if (document.readyState === "complete" || document.readyState === "interactive") {
    localPopapInited();
} else {
    document.addEventListener("DOMContentLoaded", localPopapInited);
}

async function localPopapInited() {
    const DEFAULT_ACCENT_COLOR = '#ff3030ff';

    const elements = {
        blockedSection: document.getElementById('blockedSection'),
        blockedSectionText: document.getElementById('blockedSectionText'),
        loadingSection: document.getElementById('loadingSection'),
        OpenAnytypeBtn: document.getElementById('OpenAnytypeBtn')
    };

    // Tab management
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });

    function ChangeTheme() {
        const linkCSS = document.documentElement;
        const themeConfig = window.ThemeConfig.getThemeConfig(stateBlocked.theme, stateBlocked.accentColor);

        Object.entries(themeConfig.variables).forEach(([key, val]) => {
            linkCSS.style.setProperty(key, val);
        });
    }

    async function loadState() {
        const saved = await chrome.storage.local.get(
            ['theme', 'language', 'accentColor', 'zoom']
        );

        if (saved.theme) {
            stateBlocked.theme = saved.theme;
        }
        else {
            stateBlocked.theme = 'dark';
        }

        if (saved.language) {
            stateBlocked.language = saved.language;
        }
        else {
            stateBlocked.language = "en";

            loadLocalization().then(() => {
                const langShort = (navigator.language || navigator.userLanguage).split('-')[0];

                const languageExist = CheckLanguageExist(langShort);

                console.log("language: " + langShort + " , language exist: " + languageExist);

                if (languageExist)
                    stateBlocked.language = langShort;

                elements.blockedSectionText.innerText = Localize("blockedSectionURLRejected", stateBlocked.language);
            });
        }

        if (saved.accentColor) {
            stateBlocked.accentColor = saved.accentColor;
        }
        else {
            stateBlocked.accentColor = DEFAULT_ACCENT_COLOR;
        }

        if (saved.zoom) {
            stateBlocked.zoom = saved.zoom;
        }
        else {
            stateBlocked.zoom = 1;
        }

        loadLocalization().then(() => {
            elements.blockedSectionText.innerText = Localize("blockedSectionURLRejected", stateBlocked.language);
        });

        console.log("load saved state: ", saved);
        ChangeTheme();
    }

    loadState();

    elements.loadingSection.classList.add('hidden');
    elements.blockedSection.classList.remove('hidden');

    elements.blockedSectionText.innerText = Localize("blockedSectionURLRejected", stateBlocked.language);
    elements.OpenAnytypeBtn.classList.add('hidden');

};