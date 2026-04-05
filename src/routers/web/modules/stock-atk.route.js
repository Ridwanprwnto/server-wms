const express = require("express");
const { getMonitoringATKController } = require("../../../controllers/web/monitoringATKController");

const stockATKRoute = express.Router();

// ─── GET endpoints ────────────────────────────────────────────────────────────
// GET /api/main/atk/stocks          — daftar stok dengan filter & paginasi
// ─────────────────────────────────────────────────────────────────────────────
stockATKRoute.get("/", getMonitoringATKController);

module.exports = stockATKRoute;
