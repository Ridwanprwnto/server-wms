// src/routers/mobile/modules/sortingpool.route.js
const express = require("express");
const SortingPoolController = require("../../../controllers/mobile/sortingPoolController");

const sortingPoolRoute = express.Router();

// POST /init -> Menerima data nopick dari mobile app (berisi data dari backend 1)
sortingPoolRoute.post("/init", SortingPoolController.initSortingProcess);

// PUT /scan -> Proses scan container/dusno per item
sortingPoolRoute.put("/scan", SortingPoolController.scanContainer);

// PUT /complete -> Selesaikan proses scan untuk satu nopick
sortingPoolRoute.put("/complete", SortingPoolController.completeProcess);

// GET /progress/:nopick -> Ambil progress/status terkini
sortingPoolRoute.get("/progress/:nopick", SortingPoolController.getProgress);

module.exports = sortingPoolRoute;
