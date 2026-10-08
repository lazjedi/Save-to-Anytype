// Popup logs are written to the service worker console (see src/background/background.js)

function send(type, message, args) {
    chrome.runtime.sendMessage({ type, message, args: toSerializable(args) }).catch(() => { });
}

// Errors are not serializable by the messaging API
function toSerializable(args) {
    return args.map(arg => arg instanceof Error ? `${arg.name}: ${arg.message}` : arg);
}

export function consoleLog(message, ...args) {
    send('log', message, args);
}

export function consoleError(message, ...args) {
    console.error(message, ...args);
    send('error', message, args);
}
