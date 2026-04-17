// src/controllers/monitoringATKController.js
const { getMonitoringStockModel, getMonitoringSummaryModel, getAllMonitoringStockModel } = require("../../models/web/monitoringATKModel");
const { logInfo, logError } = require("../../utils/logger");

// =============================================================================
// HELPER: handleError
// =============================================================================
function handleError(res, err, context) {
    const message = err?.message ?? String(err);
    logError(`[${context}] ERROR: ${message}`);
    return res.status(500).json({
        success: false,
        message: `Terjadi kesalahan pada ${context}.`,
        error: message,
    });
}

// =============================================================================
// HELPER: parseIntParam
// =============================================================================
function parseIntParam(value, defaultVal, min = 1) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < min) return defaultVal;
    return parsed;
}

// =============================================================================
// GET: Monitoring Stock — dengan filter & paginasi
// GET /api/main/atk/stocks
//
// Query params:
//   search  {string}  — pencarian pada prdcd, nama, singkat  (opsional)
//   page    {number}  — halaman saat ini, default 1
//   limit   {number}  — jumlah data per halaman, default 10
//
// Response:
//   {
//     success:    true,
//     data:       StockItem[],
//     pagination: { total, page, limit, totalPages },
//     summary:    { totalItems, totalStock, totalPlano, totalVariance }
//   }
// =============================================================================
const getMonitoringATKController = async (req, res) => {
    const context = "getMonitoringATKController";
    try {
        const search = (req.query.search ?? "").toString().trim();
        const page = parseIntParam(req.query.page, 1);
        const limit = parseIntParam(req.query.limit, 10);
        const offset = (page - 1) * limit;

        // Jalankan query data halaman dan summary secara paralel
        const [{ rows, total }, summary] = await Promise.all([
            getMonitoringStockModel({ search, limit, offset }),
            // Summary dihitung dari seluruh data (tidak terpengaruh paginasi)
            getMonitoringSummaryModel({ search }),
        ]);

        logInfo(`${context} OK — page=${page}, limit=${limit}, total=${total}, search="${search}"`);

        return res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            summary,
        });
    } catch (err) {
        return handleError(res, err, context);
    }
};

// =============================================================================
// GET: Export All Stock — tanpa paginasi (untuk unduh Excel)
// GET /api/main/atk/stocks/export
//
// Query params:
//   search  {string}  — pencarian pada prdcd, nama, singkat (opsional)
//
// Response:
//   {
//     success: true,
//     data:    StockItem[],
//     total:   number
//   }
// =============================================================================
const exportMonitoringATKController = async (req, res) => {
    const context = "exportMonitoringATKController";
    try {
        const search = (req.query.search ?? "").toString().trim();

        const rows = await getAllMonitoringStockModel({ search });

        logInfo(`${context} OK — total=${rows.length}, search="${search}"`);

        return res.status(200).json({
            success: true,
            data:    rows,
            total:   rows.length,
        });
    } catch (err) {
        return handleError(res, err, context);
    }
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
    getMonitoringATKController,
    exportMonitoringATKController,
};
