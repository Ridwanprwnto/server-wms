const express = require("express");
const {
    uploadProdukController,
    uploadSupplierController,
    uploadStockController,
    getProdukController,
    getSupplierController,
    getStockController,
} = require("../../../controllers/web/masterATKController");
const { upload } = require("../../../utils/upload");

const masterATKRoute = express.Router();

// ─── GET endpoints ────────────────────────────────────────────────────────────
masterATKRoute.post("/produk", getProdukController);
masterATKRoute.post("/supplier", getSupplierController);
masterATKRoute.post("/stock", getStockController);

// ─── UPLOAD endpoints ─────────────────────────────────────────────────────────
masterATKRoute.post("/upload/produk", upload.single("file"), uploadProdukController);
masterATKRoute.post("/upload/supplier", upload.single("file"), uploadSupplierController);
masterATKRoute.post("/upload/stock", upload.single("file"), uploadStockController);

// ─── Multer error handler ─────────────────────────────────────────────────────
masterATKRoute.use((err, _req, res, _next) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "Ukuran file melebihi batas 10 MB." });
    }
    if (err?.code === "INVALID_FILE_TYPE" || err?.name === "MulterError") {
        return res.status(400).json({ success: false, message: err.message ?? "Tipe file tidak diizinkan." });
    }
    _next(err);
});

module.exports = masterATKRoute;
