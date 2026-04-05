// src/utils/pagination.js
"use strict";

const DEFAULT_LIMIT = parseInt(process.env.PAGINATION_DEFAULT_LIMIT || "15");
const MAX_LIMIT = parseInt(process.env.PAGINATION_MAX_LIMIT || "100");

/**
 * ─── Parse pagination params dari req.query ───────────────────
 * @param {object} query - req.query
 * @returns {{ page, limit, offset }}
 *
 * Contoh:
 *   GET /api/products?page=2&limit=20
 *   → { page: 2, limit: 20, offset: 20 }
 */
const parsePagination = (query = {}) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

/**
 * ─── Build ORDER BY clause ────────────────────────────────────
 * @param {string} sortBy      - Nama kolom dari req.query.sort_by
 * @param {string} sortDir     - 'asc' atau 'desc' dari req.query.sort_dir
 * @param {Array}  allowedCols - Kolom yang diizinkan untuk sort (whitelist)
 * @param {string} defaultCol  - Kolom default jika sortBy tidak valid
 * @returns {string} - Contoh: "ORDER BY created_at DESC"
 *
 * Contoh:
 *   buildOrderBy('name', 'asc', ['name','created_at'], 'created_at')
 *   → "ORDER BY name ASC"
 */
const buildOrderBy = (sortBy, sortDir, allowedCols = [], defaultCol = "created_at") => {
    const col = allowedCols.includes(sortBy) ? sortBy : defaultCol;
    const dir = sortDir?.toLowerCase() === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${col} ${dir}`;
};

/**
 * ─── Build WHERE clause dari filters object ───────────────────
 * @param {object} filters   - { 'table.column': value, ... }
 *                             Gunakan '%value%' untuk ILIKE search
 * @param {number} startIdx  - Index parameter $N awal (default 1)
 * @returns {{ whereClause: string, params: Array }}
 *
 * Contoh:
 *   buildWhereClause({
 *     'o.status':    'pending',
 *     'p.name':      '%kertas%',   // akan pakai ILIKE
 *   })
 *   → {
 *       whereClause: "WHERE o.status = $1 AND p.name ILIKE $2",
 *       params: ['pending', '%kertas%']
 *     }
 */
const buildWhereClause = (filters = {}, startIdx = 1) => {
    const conditions = [];
    const params = [];
    let idx = startIdx;

    for (const [col, value] of Object.entries(filters)) {
        // Skip nilai kosong
        if (value === undefined || value === null || value === "") continue;

        if (typeof value === "string" && (value.startsWith("%") || value.endsWith("%"))) {
            conditions.push(`${col} ILIKE $${idx}`);
        } else if (Array.isArray(value)) {
            // IN clause: { 'o.status': ['pending', 'in_progress'] }
            const placeholders = value.map((_, i) => `$${idx + i}`).join(", ");
            conditions.push(`${col} IN (${placeholders})`);
            params.push(...value);
            idx += value.length;
            continue;
        } else {
            conditions.push(`${col} = $${idx}`);
        }

        params.push(value);
        idx++;
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    return { whereClause, params };
};

/**
 * ─── Hitung metadata pagination ──────────────────────────────
 * @param {number} total  - Total semua data
 * @param {number} page   - Halaman saat ini
 * @param {number} limit  - Jumlah item per halaman
 * @returns {object}
 *
 * Contoh:
 *   buildPaginationMeta(47, 2, 15)
 *   → {
 *       current_page: 2,
 *       per_page:     15,
 *       total:        47,
 *       last_page:    4,
 *       from:         16,
 *       to:           30,
 *       has_prev:     true,
 *       has_next:     true
 *     }
 */
const buildPaginationMeta = (total, page, limit) => {
    const lastPage = limit > 0 ? Math.ceil(total / limit) : 1;
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return {
        current_page: page,
        per_page: limit,
        total,
        last_page: lastPage,
        from,
        to,
        has_prev: page > 1,
        has_next: page < lastPage,
    };
};

module.exports = {
    parsePagination,
    buildOrderBy,
    buildWhereClause,
    buildPaginationMeta,
    DEFAULT_LIMIT,
    MAX_LIMIT,
};
