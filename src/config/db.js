// src/config/db.js
"use strict";

require("dotenv").config();
const { Pool } = require("pg");
const { logger } = require("../utils/logger");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: parseInt(process.env.DB_POOL_MAX || "10"),
    min: parseInt(process.env.DB_POOL_MIN || "2"),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || "2000"),
});

pool.on("connect", () => {
    logger.debug("[DB] New client connected to PostgreSQL");
});

pool.on("error", (err) => {
    logger.error("[DB] Unexpected error on idle client:", err.message);
});

/**
 * Execute a single query
 * @param {string} text  - SQL query string
 * @param {Array}  params - Query parameters
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug(`[DB] query executed in ${duration}ms — rows: ${result.rowCount}`);
        return result;
    } catch (err) {
        logger.error("[DB] Query error:", err.message);
        logger.error("[DB] Query text:", text);
        throw err;
    }
};

/**
 * Get a dedicated client for transactions
 */
const getClient = async () => {
    const client = await pool.connect();
    const originalRelease = client.release.bind(client);

    // Auto-release after 5 seconds to avoid connection leaks
    const timeout = setTimeout(() => {
        logger.warn("[DB] Client connection leaked — forcing release");
        originalRelease();
    }, 5000);

    client.release = () => {
        clearTimeout(timeout);
        originalRelease();
    };

    return client;
};

/**
 * Run callback inside a transaction — auto commit/rollback
 * @param {Function} callback  - async (client) => { ... }
 */
const withTransaction = async (callback) => {
    const client = await getClient();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Test database connection
 */
const testConnection = async () => {
    try {
        const result = await query("SELECT NOW() AS now");
        logger.info("[DB] PostgreSQL connected at:", result.rows[0].now);
        return true;
    } catch (err) {
        logger.error("[DB] Connection test failed:", err.message);
        return false;
    }
};

module.exports = { pool, query, getClient, withTransaction, testConnection };
