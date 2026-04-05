const express = require("express");
const PlanogramController = require("../../../controllers/mobile/planogramATKController");

const planogramATKRoute = express.Router();

// ─── STATIC ROUTES (harus sebelum dynamic :id) ────────────────────────────────

// GET /api-wmsmobile/main/atk/planogram/search?q=A01-R01
//     Cari lokasi planogram berdasarkan teks bebas (LINE+RAK+SHELF+CELL)
planogramATKRoute.get("/search", PlanogramController.searchByAddress);

// GET /api-wmsmobile/atk/planogram/types
planogramATKRoute.get("/types", PlanogramController.types);

// GET /api-wmsmobile/atk/planogram/address?master_id=&rack=&shelf=&cell=&loc=
planogramATKRoute.get("/address", PlanogramController.findByAddress);

// GET /api-wmsmobile/atk/planogram/line/:id — detail lokasi + storage
planogramATKRoute.get("/line/:id", PlanogramController.showLine);

// POST   /api-wmsmobile/atk/planogram/storage — upsert storage produk
planogramATKRoute.post("/storage", PlanogramController.upsertStorage);

// DELETE /api-wmsmobile/atk/planogram/storage/:id — hapus storage
planogramATKRoute.delete("/storage/:id", PlanogramController.deleteStorage);

// ─── DYNAMIC ROUTES ──────────────────────────────────────────────────────────

// GET /api-wmsmobile/atk/planogram               — list semua master
planogramATKRoute.get("/", PlanogramController.index);

// GET /api-wmsmobile/atk/planogram/:id           — detail master + list lines
planogramATKRoute.get("/:id", PlanogramController.show);

module.exports = planogramATKRoute;
