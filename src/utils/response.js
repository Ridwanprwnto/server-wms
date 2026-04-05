// src/utils/response.js
"use strict";

/**
 * ─── Standard success response ────────────────────────────────
 * @param {object} res        - Express response object
 * @param {*}      data       - Payload data (object, array, atau null)
 * @param {string} message    - Pesan sukses
 * @param {number} statusCode - HTTP status (default 200)
 *
 * Response shape:
 * {
 *   "status":  "success",
 *   "message": "...",
 *   "data":    { ... }
 * }
 */
const success = (res, data = null, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({
        status: "success",
        message,
        data,
    });
};

/**
 * ─── Paginated success response ───────────────────────────────
 * @param {object} res    - Express response object
 * @param {Array}  data   - Array of items
 * @param {object} meta   - { page, limit, total }
 * @param {string} message
 *
 * Response shape:
 * {
 *   "status":  "success",
 *   "message": "...",
 *   "data":    [ ... ],
 *   "meta": {
 *     "current_page": 1,
 *     "per_page":     15,
 *     "total":        100,
 *     "last_page":    7
 *   }
 * }
 */
const paginated = (res, data, meta, message = "Success") => {
    const lastPage = meta.limit > 0 ? Math.ceil(meta.total / meta.limit) : 1;

    return res.status(200).json({
        status: "success",
        message,
        data,
        meta: {
            current_page: meta.page,
            per_page: meta.limit,
            total: meta.total,
            last_page: lastPage,
        },
    });
};

/**
 * ─── Generic error response ───────────────────────────────────
 * @param {object} res        - Express response object
 * @param {string} message    - Pesan error
 * @param {number} statusCode - HTTP status (default 500)
 * @param {object} errors     - Detail error per field (opsional)
 *
 * Response shape:
 * {
 *   "status":  "error",
 *   "message": "...",
 *   "errors":  { "field": "pesan" }   // hanya jika ada
 * }
 */
const error = (res, message = "Internal Server Error", statusCode = 500, errors = null) => {
    const body = {
        status: "error",
        message,
    };
    if (errors && Object.keys(errors).length > 0) {
        body.errors = errors;
    }
    return res.status(statusCode).json(body);
};

/**
 * ─── 404 Not Found ────────────────────────────────────────────
 */
const notFound = (res, message = "Data tidak ditemukan") => {
    return error(res, message, 404);
};

/**
 * ─── 401 Unauthorized ─────────────────────────────────────────
 */
const unauthorized = (res, message = "Tidak terotorisasi, silakan login kembali") => {
    return error(res, message, 401);
};

/**
 * ─── 403 Forbidden ────────────────────────────────────────────
 */
const forbidden = (res, message = "Akses ditolak, hak akses tidak mencukupi") => {
    return error(res, message, 403);
};

/**
 * ─── 422 Validation Error ─────────────────────────────────────
 * @param {object} res     - Express response object
 * @param {object} errors  - { fieldName: 'pesan error', ... }
 * @param {string} message
 *
 * Response shape:
 * {
 *   "status":  "error",
 *   "message": "Validasi gagal",
 *   "errors": {
 *     "username": "Username wajib diisi",
 *     "password": "Password minimal 6 karakter"
 *   }
 * }
 */
const validationError = (res, errors = {}, message = "Validasi gagal") => {
    // Filter out undefined values dari errors object
    const cleanErrors = Object.fromEntries(Object.entries(errors).filter(([, v]) => v !== undefined && v !== null));

    return res.status(422).json({
        status: "error",
        message,
        errors: cleanErrors,
    });
};

/**
 * ─── 409 Conflict ─────────────────────────────────────────────
 */
const conflict = (res, message = "Data sudah ada") => {
    return error(res, message, 409);
};

/**
 * ─── 201 Created ──────────────────────────────────────────────
 */
const created = (res, data, message = "Data berhasil dibuat") => {
    return success(res, data, message, 201);
};

module.exports = {
    success,
    paginated,
    error,
    notFound,
    unauthorized,
    forbidden,
    validationError,
    conflict,
    created,
};
