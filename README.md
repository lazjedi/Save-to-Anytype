# Save to Anytype Browser Extension

Save important web pages with your selected text in Markdown format to Anytype. Lightweight and easy-to-use alternative web clipper.

- [Chrome Webstore](https://chromewebstore.google.com/detail/save-to-anytype/ihbpeejeggadkdkapklgnmpebfnipkco)
- [Firefox Add-ons](https://addons.mozilla.org/tr/firefox/addon/save-to-anytype/)
- [Microsoft Edge Addons](https://microsoftedge.microsoft.com/addons/detail/save-to-anytype/dclpkaljnjdfanngmhccigekcnpgjkhj)
- ~~Opera: Waiting approval~~

# Core Functionality

- **Web Clipping**: Extracts the main content of a web page, removing clutter (ads, sidebars).
- **Markdown Conversion**: Converts the extracted HTML content into Markdown format.
- **Form system**: You can think of forms as templates. The most effective way to use Types created on Anytype. With unlimited properties.
- **File management**: Managing images on web pages during web content saving with Anytype Files API.
- **Element selector**: You can select a specific element on the page as a data source - you can parse strings and numbers.

# Third-party Libraries

- **[defuddle](https://github.com/kepano/defuddle)**: Converts the web page to extracted HTML.
- **[Turndown](https://github.com/mixmark-io/turndown)**: Converts the extracted HTML content into Markdown format.
- **[turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm)**: Plugin that converts HTML tables to Markdown for Turndown.
- **[jscolor](https://github.com/EastDesire/jscolor)**: JavaScript color picker.
- **[Sortable](https://github.com/SortableJS/Sortable)**: Reordering the form list by drag-and-drop.
- **[Choices](https://github.com/Choices-js/Choices)**: For textbox and text input settings.

# Project Structure (Chrome version, `save-to-anytype/`)

```
manifest.json, rules.json
assets/                  icons
lib/                     third-party libraries
localization/            localizations.json + localization-service.js
styles/style.css
src/
  background/            service worker: messages, overlay, context menu, page scripts, file upload
  content/               content scripts: overlay iframe, element selector
  shared/                theme config, property icons, log formatting
  popup-blocked/         popup for pages where the extension can't work
  popup/                 the main popup (ES modules), entry point main.js
    core/                constants, persisted state, DOM elements, i18n, logging
    api/                 Anytype API client (pagination, errors)
    page/                page data, markdown, file sources, file names, element selector
    ui/                  sections, status, tooltips, theme, Choices helpers, property field markup
    features/            auth, settings, forms list, form editor, saving an object
```

# Storage Using

The extension stores the following using `chrome.storage.local`:

- `apiKey`: Anytype API Key
- `forms`: Saved forms
- `LastUsedForm`: Id of the last used form
- `theme`, `language`, `accentColor`, `whatDoOnStart`, `zoom`, `height`, `width`, `textAreaHeightPx`, `collapseOnOpenForm`, `stringsRemovedFromTabTitle`: Settings
- `selectedText`: Temporarily selected text (5 seconds)
- `selectedTextTimestamp`: Selection time

The last page screenshot (for the "screenshot" file source) is kept in `chrome.storage.session`, it is replaced on every opening and cleared when the browser is closed.

# Developers

**[LazJedi](https://github.com/lazjedi)** - **[D!EMONIC](https://github.com/diemonic1)**

# Disclaimer

This is my first JavaScript open source project. The methods used may differ depending on you. I'm just an amateur coder. Enjoy it!

# License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the [LICENSE](https://github.com/lazjedi/Save-to-Anytype/blob/main/LICENSE) file for more details.
