// HTML -> Markdown with Turndown (lib/turndown.js and lib/turndown-plugin-gfm.js are loaded as globals)

let turndownService = null;

function createTurndownService() {
    const service = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '_'
    });

    service.use(turndownPluginGfm.gfm);

    // Embedded content is kept as html, scripts and styles are useless in a note
    service.keep(['iframe']);
    service.remove(['script', 'style']);

    service.addRule('figures', {
        filter: 'figure',
        replacement: (content, node) => {
            const img = node.querySelector('img');
            if (!img) return content;

            const alt = img.getAttribute('alt') || '';
            const src = img.getAttribute('src') || '';
            const captionText = node.querySelector('figcaption')?.textContent || '';
            return `![${alt}](${src})\n${captionText}`;
        }
    });

    return service;
}

export function htmlToMarkdown(html) {
    turndownService ??= createTurndownService();

    return turndownService.turndown(html || '')
        // Collapse 3+ newlines into 2
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
