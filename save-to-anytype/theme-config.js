/*
    If you want to add a new theme, simply add it to the THEME_DEFINITIONS object. 

    The theme starts with a parameter that will be used to identify the theme (eg 'dark', 'light', 'haze', etc.) and must be unique.
    Then comes the theme parameters object, which should contain:
    - label: The name that is shown to the user - can be anything.
    - variables: An object containing CSS variables and their values ​​for this theme.

    Make sure you provide all the necessary CSS variables for the theme to display correctly. 
    You can use existing themes as an example to create your own. 
    After adding a new theme, it will automatically appear in the theme selection drop-down list in the extension interface.

    Do not delete existing themes or change their name parameter (e.g. 'dark', 'light', etc.) 
    as this may lead to problems with saved user settings.
*/

(function () {
    const THEME_DEFINITIONS = {
        dark: {
            label: 'Dark',
            variables: {
                '--background': '#1a1a1a',
                '--background-focus': '#1a1a1a',
                '--input-text-color': '#e0e0e0',
                '--section-title-color': '#888888',
                '--text-color': '#e0e0e0',
                '--text-color-inverted': '#080808',
                '--back-color': '#0f0f0f',
                '--color1': '#101010',
                '--color2': '#070707',
                '--color3': '#1a1a1a',
                '--color4': '#333333',
                '--color5': '#363636',
                '--card-color': '#000000',
                '--borders-color': '#2a2a2a',
                '--icon-brightness': '255',
                '--btnSaveObject': '#355d33',
                '--btnSaveObjectHover': '#264525'
            }
        },
        light: {
            label: 'Light',
            variables: {
                '--background': '#f5f5f5',
                '--background-focus': '#ebebeb',
                '--input-text-color': '#333333',
                '--section-title-color': '#555555',
                '--text-color': '#333333',
                '--text-color-inverted': '#ffffff',
                '--back-color': '#eaeaea',
                '--color1': '#e0e0e0',
                '--color2': '#f9f9f9',
                '--color3': '#f0f0f0',
                '--color4': '#c0c0c0',
                '--color5': '#e8e8e8',
                '--card-color': '#fafafa',
                '--borders-color': '#aaaaaa',
                '--icon-brightness': '0',
                '--btnSaveObject': '#8fff89',
                '--btnSaveObjectHover': '#74d16f'
            }
        },
        total_black: {
            label: 'Total black',
            variables: {
                '--background': '#1a1a1a',
                '--background-focus': '#1a1a1a',
                '--input-text-color': '#e0e0e0',
                '--section-title-color': '#888888',
                '--text-color': '#e0e0e0',
                '--text-color-inverted': '#080808',
                '--back-color': '#000000',
                '--color1': '#101010',
                '--color2': '#070707',
                '--color3': '#1a1a1a',
                '--color4': '#333333',
                '--color5': '#363636',
                '--card-color': '#000000',
                '--borders-color': '#2a2a2a',
                '--icon-brightness': '255',
                '--btnSaveObject': '#355d33',
                '--btnSaveObjectHover': '#264525'
            }
        },
        haze: {
            label: 'Haze',
            variables: {
                '--background': '#3c3c3c',
                '--background-focus': '#45494e',
                '--input-text-color': '#cccccc',
                '--section-title-color': '#9da1a6',
                '--text-color': '#cccccc',
                '--text-color-inverted': '#1e1e1e',
                '--back-color': '#1e1e1e',
                '--color1': '#3c3c3c',
                '--color2': '#252526',
                '--color3': '#2d2d30',
                '--color4': '#3e3e42',
                '--color5': '#37373d',
                '--card-color': '#252526',
                '--borders-color': '#3e3e42',
                '--icon-brightness': '255',
                '--btnSaveObject': '#355d33',
                '--btnSaveObjectHover': '#264525'
            }
        },
        vs: {
            label: 'VS',
            variables: {
                '--background': '#3c3c3c',
                '--background-focus': '#26374a',
                '--input-text-color': '#cccccc',
                '--section-title-color': '#8fb7d8',
                '--text-color': '#cccccc',
                '--text-color-inverted': '#1e1e1e',
                '--back-color': '#1e1e1e',
                '--color1': '#314050',
                '--color2': '#252526',
                '--color3': '#2d2d30',
                '--color4': '#36506b',
                '--color5': '#223248',
                '--card-color': '#252526',
                '--borders-color': '#36506b',
                '--icon-brightness': '255',
                '--btnSaveObject': '#355d33',
                '--btnSaveObjectHover': '#264525'
            }
        },
        gold: {
            label: 'Gold',
            variables: {
                '--background': '#17130e',
                '--background-focus': '#2a2115',
                '--input-text-color': '#f3e7c9',
                '--section-title-color': '#c9a96a',
                '--text-color': '#f1e6d0',
                '--text-color-inverted': '#120f0a',
                '--back-color': '#0d0a07',
                '--color1': '#3c301c',
                '--color2': '#18120b',
                '--color3': '#231b12',
                '--color4': '#7a6232',
                '--color5': '#2d2316',
                '--card-color': '#120e09',
                '--borders-color': '#8e7340',
                '--icon-brightness': '255',
                '--btnSaveObject': '#91702e',
                '--btnSaveObjectHover': '#6f5624'
            }
        },
        white: {
            label: 'White',
            variables: {
                '--background': '#ffffff',
                '--background-focus': '#ecececff',
                '--input-text-color': '#080808',
                '--section-title-color': '#080808',
                '--text-color': '#080808',
                '--text-color-inverted': '#ffffff',
                '--back-color': '#ebebeb',
                '--color1': '#ddd',
                '--color2': '#fff',
                '--color3': '#f9f9f9',
                '--color4': '#b7b7b7',
                '--color5': '#f2f2f2',
                '--card-color': '#ffffff',
                '--borders-color': '#797979',
                '--icon-brightness': '0',
                '--btnSaveObject': '#8fff89',
                '--btnSaveObjectHover': '#74d16f'
            }
        }
    };

    function getThemeDefinition(themeName) {
        return THEME_DEFINITIONS[themeName] || THEME_DEFINITIONS.dark;
    }

    function getThemeConfig(themeName, accentColor) {
        const themeDefinition = getThemeDefinition(themeName);

        return {
            name: themeName,
            label: themeDefinition.label,
            accentColor: accentColor,
            variables: {
                ...themeDefinition.variables,
                '--accent-color': accentColor
            }
        };
    }

    window.ThemeConfig = Object.freeze({
        themes: THEME_DEFINITIONS,
        getThemeDefinition,
        getThemeConfig
    });
})();