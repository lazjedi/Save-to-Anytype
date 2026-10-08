// Every log of the extension ends up in the service worker console with a source tag

const LOG_PREFIX = '[SaveToAnytype]';

export const LOG_SOURCES = Object.freeze({
    background: { tag: 'Back', color: 'green' },
    popup: { tag: 'Popap', color: 'yellow' }
});

export function writeLog(level, source, message, args = []) {
    const output = level === 'error' ? console.error : console.log;
    const sourceStyle = `color: ${source.color}; font-weight: bold;`;

    if (args && args.length > 0)
        output(`${LOG_PREFIX} %c[${source.tag}]%c ${message} %c[Params]%c`, sourceStyle, '', 'color: blue; font-weight: bold;', '', args);
    else
        output(`${LOG_PREFIX} %c[${source.tag}]%c ${message}`, sourceStyle, '');
}
