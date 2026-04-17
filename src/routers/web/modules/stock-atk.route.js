const express = require("express");
const {
    getMonitoringATKController,
    exportMonitoringATKController,
} = require("../../../controllers/web/monitoringATKController");

const stockATKRoute = express.Router();

// ─── GET endpoints ────────────────────────────────────────────────────────────
// GET /api/main/atk/stocks          — daftar stok dengan filter & paginasi
// GET /api/main/atk/stocks/export   — seluruh data tanpa paginasi (untuk export Excel)
// ─────────────────────────────────────────────────────────────────────────────

// PENTING: route /export harus SEBELUM route "/" agar tidak dikonsumsi sebagai segment lain
stockATKRoute.get("/export", exportMonitoringATKController);
stockATKRoute.get("/", getMonitoringATKController);

module.exports = stockATKRoute;
