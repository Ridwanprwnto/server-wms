// src/middleware/errorHandler.js
"use strict";

const logger = require("../utils/logger");
const response = require("../utils/response");

/**
 * 404 handler — must be registered after all routes
 */
const notFoundHandler = (req, res) => {
    return response.notFound(res, `Route ${req.method} ${req.originalUrl} tidak ditemukan`);
};

/**
 * Global error handler — must be last middleware (4 params)
 */
const errorHandler = (err, req, res, next) => {
    logger.error("[ErrorHandler]", {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });

    // PostgreSQL unique violation
    if (err.code === "23505") {
        return response.error(res, "Data sudah ada (duplikat)", 409);
    }

    // PostgreSQL foreign key violation
    if (err.code === "23503") {
        return response.error(res, "Data referensi tidak ditemukan", 400);
    }

    // PostgreSQL check constraint
    if (err.code === "23514") {
        return response.error(res, "Data tidak valid (constraint violation)", 400);
    }

    // JWT errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return response.unauthorized(res, "Token tidak valid atau kadaluarsa");
    }

    // Payload too large
    if (err.type === "entity.too.large") {
        return response.error(res, "Ukuran request terlalu besar", 413);
    }

    // Default 500
    const statusCode = err.statusCode || err.status || 500;
    const message = err.expose ? err.message : "Terjadi kesalahan pada server";

    return response.error(res, message, statusCode);
};

module.exports = { notFoundHandler, errorHandler };
