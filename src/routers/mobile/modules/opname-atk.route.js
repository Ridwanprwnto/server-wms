const express = require("express");
const OpnameController = require("../../../controllers/mobile/opnameATKController");

const opnameATKRoute = express.Router();

// ─── STATIC / ITEM ROUTES ────────────────────────────────────────────────────

// POST   /api-wmsmobile/main/atk/opname/item
//        Body: { id_plano, prdcd, quantity }
//        Simpan/update qty opname (history) + sinkron ke pot_storage_plano
opnameATKRoute.post("/item", OpnameController.upsertItem);

// GET    /api-wmsmobile/main/atk/opname/items/:id_plano
//        Detail lokasi + daftar item opname di lokasi tersebut
opnameATKRoute.get("/items/:id_plano", OpnameController.getItemsByLinePlano);

// PUT    /api-wmsmobile/main/atk/opname/item/:itemId
opnameATKRoute.put("/item/:itemId", OpnameController.updateItem);

// DELETE /api-wmsmobile/main/atk/opname/item/:itemId
opnameATKRoute.delete("/item/:itemId", OpnameController.deleteItem);

// ─── OPNAME BY PRODUCT ────────────────────────────────────────────────────────

// GET    /api-wmsmobile/main/atk/opname/by-product/:prdcd
//        Daftar planogram yang terpasang produk tersebut + detail storage
opnameATKRoute.get("/by-product/:prdcd", OpnameController.getItemsByPrdcd);

// ─── CLEAR STORAGE PLANOGRAM ──────────────────────────────────────────────────

// DELETE /api-wmsmobile/main/atk/opname/clear-plano/:id_plano
//        Kosongkan semua storage (pot_storage_plano) di lokasi planogram tsb
opnameATKRoute.delete("/clear-plano/:id_plano", OpnameController.clearStoragePlano);

module.exports = opnameATKRoute;
