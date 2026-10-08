import { writeLog, LOG_SOURCES } from '../shared/logger.js';

export function consoleLog(message, ...args) {
    writeLog('log', LOG_SOURCES.background, message, args);
}

export function consoleError(message, ...args) {
    writeLog('error', LOG_SOURCES.background, message, args);
}
