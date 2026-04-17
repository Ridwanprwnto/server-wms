// src/models/monitoringATKModel.js
const { pool } = require("../../config/db");
const { logInfo, logError } = require("../../utils/logger");

// =============================================================================
// HELPER: buildWhereClause
// =============================================================================
function buildWhereClause({ search = "" }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
        conditions.push(`(
            LOWER(A.prdcd)   LIKE LOWER($${idx})
            OR LOWER(A.nama)    LIKE LOWER($${idx})
            OR LOWER(A.singkat) LIKE LOWER($${idx})
        )`);
        params.push(`%${search}%`);
        idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    return { where, params, nextIndex: idx };
}

// =============================================================================
// HELPER: mapRow
//
// Status stok hanya dibedakan menjadi dua:
//   out_of_stock — qty <= 0
//   in_stock     — qty > 0
//
// frac tidak digunakan untuk menentukan status karena merupakan data
// satuan/pecahan produk, bukan batas minimum stok.
// =============================================================================
function mapRow(row) {
    const quantity = Number(row.qty ?? 0);
    const frac = Number(row.frac ?? 0);
    const plano = row.total_plano != null ? Number(row.total_plano) : null;
    const variance = plano != null ? plano - quantity : null;

    const status = quantity > 0 ? "in_stock" : "out_of_stock";

    return {
        id: row.prdcd,
        sku: row.prdcd,
        name: row.nama,
        shortName: row.singkat,
        kemasan: row.kemasan,
        frac,
        quantity,
        plano,
        variance,
        status,
        lastUpdated: row.date_str_plano ?? null,
    };
}

// =============================================================================
// GET MONITORING STOCK — dengan filter & paginasi
// =============================================================================
const getMonitoringStockModel = async ({ search = "", limit = 10, offset = 0 }) => {
    const { where, params, nextIndex } = buildWhereClause({ search });

    const dataQuery = `
        SELECT
            A.prdcd,
            A.nama,
            A.singkat,
            A.kemasan,
            A.frac,
            B.qty,
            SUM(C.qty_str_plano)  AS total_plano,
            MAX(C.date_str_plano) AS date_str_plano
        FROM       pot_prodmast       AS A
        INNER JOIN pot_stmast         AS B ON A.prdcd = B.prdcd
        LEFT JOIN  pot_storage_plano  AS C ON A.prdcd = C.prdcd_str_plano
        ${where}
        GROUP BY A.prdcd, A.nama, A.singkat, A.kemasan, A.frac, B.qty
        ORDER BY A.prdcd ASC
        LIMIT  $${nextIndex}
        OFFSET $${nextIndex + 1}
    `;
    const dataParams = [...params, limit, offset];

    const countQuery = `
        SELECT COUNT(*) AS total
        FROM (
            SELECT A.prdcd
            FROM       pot_prodmast       AS A
            INNER JOIN pot_stmast         AS B ON A.prdcd = B.prdcd
            LEFT JOIN  pot_storage_plano  AS C ON A.prdcd = C.prdcd_str_plano
            ${where}
            GROUP BY A.prdcd
        ) AS counted
    `;

    try {
        const [dataResult, countResult] = await Promise.all([pool.query(dataQuery, dataParams), pool.query(countQuery, params)]);

        const total = parseInt(countResult.rows[0]?.total ?? 0, 10);
        const rows = dataResult.rows.map(mapRow);

        logInfo(`getMonitoringStockModel OK — total=${total}, returned=${rows.length}, offset=${offset}, limit=${limit}`);
        return { rows, total };
    } catch (err) {
        logError(`getMonitoringStockModel ERROR: ${err.message}`);
        throw err;
    }
};

// =============================================================================
// GET SUMMARY — agregat keseluruhan (tidak terpengaruh paginasi)
// =============================================================================
const getMonitoringSummaryModel = async ({ search = "" }) => {
    const { where, params } = buildWhereClause({ search });

    const query = `
        SELECT
            COUNT(DISTINCT A.prdcd)               AS total_items,
            COALESCE(SUM(B.qty), 0)               AS total_stock,
            COALESCE(SUM(C.sum_plano), 0)         AS total_plano,
            COALESCE(SUM(C.sum_plano), 0)
                - COALESCE(SUM(B.qty), 0)         AS total_variance
        FROM       pot_prodmast  AS A
        INNER JOIN pot_stmast    AS B ON A.prdcd = B.prdcd
        LEFT JOIN (
            SELECT prdcd_str_plano, SUM(qty_str_plano) AS sum_plano
            FROM   pot_storage_plano
            GROUP BY prdcd_str_plano
        ) AS C ON A.prdcd = C.prdcd_str_plano
        ${where}
    `;

    try {
        const result = await pool.query(query, params);
        const row = result.rows[0] ?? {};

        const summary = {
            totalItems: parseInt(row.total_items ?? 0, 10),
            totalStock: parseInt(row.total_stock ?? 0, 10),
            totalPlano: parseInt(row.total_plano ?? 0, 10),
            totalVariance: parseInt(row.total_variance ?? 0, 10),
        };

        logInfo(`getMonitoringSummaryModel OK — ${JSON.stringify(summary)}`);
        return summary;
    } catch (err) {
        logError(`getMonitoringSummaryModel ERROR: ${err.message}`);
        throw err;
    }
};

// =============================================================================
// GET ALL MONITORING STOCK — tanpa paginasi (untuk export)
// =============================================================================
const getAllMonitoringStockModel = async ({ search = "" }) => {
    const { where, params } = buildWhereClause({ search });

    const query = `
        SELECT
            A.prdcd,
            A.nama,
            A.singkat,
            A.kemasan,
            A.frac,
            B.qty,
            SUM(C.qty_str_plano)  AS total_plano,
            MAX(C.date_str_plano) AS date_str_plano
        FROM       pot_prodmast       AS A
        INNER JOIN pot_stmast         AS B ON A.prdcd = B.prdcd
        LEFT JOIN  pot_storage_plano  AS C ON A.prdcd = C.prdcd_str_plano
        ${where}
        GROUP BY A.prdcd, A.nama, A.singkat, A.kemasan, A.frac, B.qty
        ORDER BY A.prdcd ASC
    `;

    try {
        const result = await pool.query(query, params);
        const rows = result.rows.map(mapRow);

        logInfo(`getAllMonitoringStockModel OK — returned=${rows.length}, search="${search}"`);
        return rows;
    } catch (err) {
        logError(`getAllMonitoringStockModel ERROR: ${err.message}`);
        throw err;
    }
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
    getMonitoringStockModel,
    getMonitoringSummaryModel,
    getAllMonitoringStockModel,
};
