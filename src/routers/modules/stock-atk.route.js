// src/routes/atk/stockATKRoute.js
const express = require("express");
const {
    getMonitoringATKController,
} = require("../../controllers/monitoringATKController");

const stockATKRoute = express.Router();

// ─── GET endpoints ────────────────────────────────────────────────────────────
// GET /api/main/atk/stocks          — daftar stok dengan filter & paginasi
// ─────────────────────────────────────────────────────────────────────────────
stockATKRoute.get("/",       getMonitoringATKController);

module.exports = stockATKRoute;