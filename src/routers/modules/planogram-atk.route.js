// src/routes/main/atk/planogramATKRoute.js

const express = require("express");
const { upload } = require("../../utils/upload");
const {
    getTypePlanogramController,
    getMasterPlanogramController,
    getLinePlanogramController,
    createMasterPlanogramController,
    updateMasterPlanogramController,
    deleteMasterPlanogramController,
    createLinePlanogramController,
    updateLinePlanogramController,
    deleteLinePlanogramController,
    bulkCreateLinePlanogramController,
} = require("../../controllers/planogramATKController");

const planogramATKRoute = express.Router();

// ─── TYPE ─────────────────────────────────────────────────────────────────────
planogramATKRoute.get("/types", getTypePlanogramController);

// ─── MASTER ───────────────────────────────────────────────────────────────────
planogramATKRoute.get("/masters", getMasterPlanogramController);
planogramATKRoute.post("/masters", createMasterPlanogramController);
planogramATKRoute.put("/masters/:id", updateMasterPlanogramController);
planogramATKRoute.delete("/masters/:id", deleteMasterPlanogramController);

// ─── LINE ─────────────────────────────────────────────────────────────────────
// PENTING: /lines/bulk HARUS didaftarkan sebelum /lines/:id
// agar Express tidak salah menafsirkan string "bulk" sebagai nilai :id

// Bulk via CSV upload (multipart) ATAU JSON body
planogramATKRoute.post(
    "/lines/bulk",
    // upload.single("file") dipasang sebagai middleware opsional:
    // jika request adalah multipart, Multer akan memproses file-nya.
    // Jika JSON body biasa, Multer akan melewatinya tanpa error.
    (req, res, next) => {
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("multipart/form-data")) {
            upload.single("file")(req, res, next);
        } else {
            next(); // JSON body — skip Multer
        }
    },
    bulkCreateLinePlanogramController,
);

planogramATKRoute.get("/lines", getLinePlanogramController);
planogramATKRoute.post("/lines", createLinePlanogramController);
planogramATKRoute.put("/lines/:id", updateLinePlanogramController);
planogramATKRoute.delete("/lines/:id", deleteLinePlanogramController);

// ─── Multer error handler ──────────────────────────────────────────────────────
planogramATKRoute.use((err, _req, res, _next) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, error: "Ukuran file melebihi batas 10 MB." });
    }
    if (err?.code === "INVALID_FILE_TYPE" || err?.name === "MulterError") {
        return res.status(400).json({ success: false, error: err.message ?? "Tipe file tidak diizinkan." });
    }
    _next(err);
});

module.exports = planogramATKRoute;
