const config = require('../config/config');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = logLevels[config.logging.level] || logLevels.info;

const formatLog = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

const logger = {
  error: (message) => {
    if (currentLevel >= logLevels.error) {
      console.error(formatLog('error', message));
    }
  },
  
  warn: (message) => {
    if (currentLevel >= logLevels.warn) {
      console.warn(formatLog('warn', message));
    }
  },
  
  info: (message) => {
    if (currentLevel >= logLevels.info) {
      console.log(formatLog('info', message));
    }
  },
  
  debug: (message) => {
    if (currentLevel >= logLevels.debug) {
      console.log(formatLog('debug', message));
    }
  }
};

module.exports = logger;
