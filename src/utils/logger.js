const winston = require("winston");
const fs = require("fs");
const path = require("path");

// Menentukan path folder logs
const logDir = path.join(__dirname, "../../logs");

// Membuat folder logs jika belum ada
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Create a logger instance
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.json()
    ),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        // File transport untuk error
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
        }),
        // File transport untuk semua log
        new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
        }),
    ],
});

// Function to log info messages
const logInfo = (message) => {
    logger.info(message);
};

// Function to log error messages
const logError = (message) => {
    logger.error(message);
};

// Export the logger and logging functions
module.exports = {
    logger,
    logInfo,
    logError,
};
