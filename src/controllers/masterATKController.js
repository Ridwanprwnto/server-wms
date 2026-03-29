// src/controllers/masterATKController.js
const { getSyncModel, upsertSyncModel, getProdukModel, upsertProdukFromCsv, getSupplierModel, upsertSupplierFromCsv, getStockModel, upsertStockFromCsv } = require("../models/masterATKModel");

const { parseCsvBuffer } = require("../utils/csvParser");
const { validateRequiredColumns, isNotEmpty, countRowStats } = require("../utils/csvValidator");
const { logInfo, logError } = require("../utils/logger");

// ─────────────────────────────────────────────────────────────────────────────
// GET: Master Produk
// POST /api/main/atk/produk
// Body: { office: "office", master: "master" }
// ─────────────────────────────────────────────────────────────────────────────

const getProdukController = async (req, res) => {
    const { office, master } = req.body;

    if (!office || !master) {
        logError("getProdukController: office dan master wajib diisi");
        return res.status(400).json({
            success: false,
            error: "Field 'office' dan 'master' wajib diisi.",
        });
    }

    try {
        // Ambil sync info dan data produk secara paralel
        const [syncRows, dataRows] = await Promise.all([getSyncModel(office, master), getProdukModel(office)]);

        if (!dataRows || dataRows.length === 0) {
            logInfo(`getProdukController: tidak ada data untuk office=${office}`);
            return res.status(404).json({
                success: false,
                error: "Data produk tidak ditemukan.",
            });
        }

        logInfo(`getProdukController OK — office=${office}, rows=${dataRows.length}`);
        return res.status(200).json({
            sync: syncRows,
            data: dataRows,
        });
    } catch (err) {
        logError(`getProdukController ERROR: ${err.message}`);
        return res.status(500).json({
            success: false,
            error: "Gagal mengambil data produk.",
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Master Supplier
// POST /api/main/atk/supplier
// Body: { office: "office", master: "master" }
// ─────────────────────────────────────────────────────────────────────────────

const getSupplierController = async (req, res) => {
    const { office, master } = req.body;

    if (!office || !master) {
        logError("getSupplierController: office dan master wajib diisi");
        return res.status(400).json({
            success: false,
            error: "Field 'office' dan 'master' wajib diisi.",
        });
    }

    try {
        const [syncRows, dataRows] = await Promise.all([getSyncModel(office, master), getSupplierModel()]);

        if (!dataRows || dataRows.length === 0) {
            logInfo("getSupplierController: tidak ada data supplier");
            return res.status(404).json({
                success: false,
                error: "Data supplier tidak ditemukan.",
            });
        }

        logInfo(`getSupplierController OK — rows=${dataRows.length}`);
        return res.status(200).json({
            sync: syncRows,
            data: dataRows,
        });
    } catch (err) {
        logError(`getSupplierController ERROR: ${err.message}`);
        return res.status(500).json({
            success: false,
            error: "Gagal mengambil data supplier.",
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Master Stock
// POST /api/main/atk/stock
// Body: { office: "office", master: "master" }
// ─────────────────────────────────────────────────────────────────────────────

const getStockController = async (req, res) => {
    const { office, master } = req.body;

    if (!office || !master) {
        logError("getStockController: office dan master wajib diisi");
        return res.status(400).json({
            success: false,
            error: "Field 'office' dan 'master' wajib diisi.",
        });
    }

    try {
        const [syncRows, dataRows] = await Promise.all([getSyncModel(office, master), getStockModel(office)]);

        if (!dataRows || dataRows.length === 0) {
            logInfo(`getStockController: tidak ada data untuk office=${office}`);
            return res.status(404).json({
                success: false,
                error: "Data stock tidak ditemukan.",
            });
        }

        logInfo(`getStockController OK — office=${office}, rows=${dataRows.length}`);
        return res.status(200).json({
            sync: syncRows,
            data: dataRows,
        });
    } catch (err) {
        logError(`getStockController ERROR: ${err.message}`);
        return res.status(500).json({
            success: false,
            error: "Gagal mengambil data stock.",
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD: CSV Produk
// POST /api/main/atk/upload/produk
// Multipart: file (CSV), office (string)
// ─────────────────────────────────────────────────────────────────────────────

const uploadProdukController = async (req, res) => {
    // ── 1. Validasi file ──────────────────────────────────────────────────────
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'File CSV tidak ditemukan. Pastikan field name adalah "file".',
        });
    }

    // ── 2. Validasi office ────────────────────────────────────────────────────
    const office = String(req.body?.office ?? "").trim();
    if (!office) {
        return res.status(400).json({
            success: false,
            message: 'Field "office" wajib diisi.',
        });
    }

    // ── 3. Parse CSV ──────────────────────────────────────────────────────────
    let rows;
    try {
        rows = await parseCsvBuffer(req.file.buffer, "|");
    } catch (parseErr) {
        logError(`uploadProdukController: CSV parse error — ${parseErr.message}`);
        return res.status(422).json({
            success: false,
            message: 'Gagal mem-parse CSV. Pastikan format dan separator "|" sudah benar.',
        });
    }

    // ── 4. Validasi tidak kosong ──────────────────────────────────────────────
    if (!isNotEmpty(rows)) {
        return res.status(400).json({
            success: false,
            message: "File CSV kosong atau hanya berisi header.",
        });
    }

    // ── 5. Validasi kolom wajib ───────────────────────────────────────────────
    const missingCols = validateRequiredColumns(rows[0], "produk");
    if (missingCols.length > 0) {
        return res.status(422).json({
            success: false,
            message: `Kolom wajib tidak ditemukan: ${missingCols.join(", ")}`,
        });
    }

    // ── 6. Log statistik sebelum proses ──────────────────────────────────────
    const stats = countRowStats(rows, "prdcd");
    logInfo(`uploadProdukController: office=${office}, file=${req.file.originalname}, ` + `size=${req.file.size}B, total=${stats.total}, valid=${stats.valid}, invalid=${stats.invalid}`);

    // ── 7. Upsert ke database ─────────────────────────────────────────────────
    try {
        const { inserted, updated, skipped } = await upsertProdukFromCsv(rows, office);

        // Catat waktu sync terakhir di pot_sync
        await upsertSyncModel(office, "PRODMAST");

        const total = inserted + updated + skipped;
        logInfo(`uploadProdukController DONE — inserted=${inserted}, updated=${updated}, ` + `skipped=${skipped}, total=${total}`);

        return res.status(200).json({
            success: true,
            message: `Upload produk berhasil. ${inserted} baru, ${updated} diperbarui, ${skipped} dilewati.`,
            inserted,
            updated,
            skipped,
            total,
        });
    } catch (dbErr) {
        logError(`uploadProdukController DB ERROR: ${dbErr.message}`);
        return res.status(500).json({
            success: false,
            message: "Gagal menyimpan data ke database.",
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD: CSV Supplier
// POST /api/main/atk/upload/supplier
// Multipart: file (CSV pipe-separated), office (string)
// ─────────────────────────────────────────────────────────────────────────────

const uploadSupplierController = async (req, res) => {
    // ── 1. Validasi file ──────────────────────────────────────────────────────
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'File CSV tidak ditemukan. Pastikan field name adalah "file".',
        });
    }

    // ── 2. Validasi office ────────────────────────────────────────────────────
    const office = String(req.body?.office ?? "").trim();
    if (!office) {
        return res.status(400).json({
            success: false,
            message: 'Field "office" wajib diisi.',
        });
    }

    // ── 3. Parse CSV ──────────────────────────────────────────────────────────
    let rows;
    try {
        rows = await parseCsvBuffer(req.file.buffer, "|");
    } catch (parseErr) {
        logError(`uploadSupplierController: CSV parse error — ${parseErr.message}`);
        return res.status(422).json({
            success: false,
            message: 'Gagal mem-parse CSV. Pastikan format dan separator "|" sudah benar.',
        });
    }

    // ── 4. Validasi tidak kosong ──────────────────────────────────────────────
    if (!isNotEmpty(rows)) {
        return res.status(400).json({
            success: false,
            message: "File CSV kosong atau hanya berisi header.",
        });
    }

    // ── 5. Validasi kolom wajib (supco) ──────────────────────────────────────
    const missingCols = validateRequiredColumns(rows[0], "supplier");
    if (missingCols.length > 0) {
        return res.status(422).json({
            success: false,
            message: `Kolom wajib tidak ditemukan: ${missingCols.join(", ")}`,
        });
    }

    // ── 6. Log statistik ──────────────────────────────────────────────────────
    const stats = countRowStats(rows, "supco");
    logInfo(`uploadSupplierController: office=${office}, file=${req.file.originalname}, ` + `size=${req.file.size}B, total=${stats.total}, valid=${stats.valid}, invalid=${stats.invalid}`);

    // ── 7. Upsert ke database ─────────────────────────────────────────────────
    try {
        const { inserted, updated, skipped } = await upsertSupplierFromCsv(rows);

        await upsertSyncModel(office, "SUPMAST");

        const total = inserted + updated + skipped;
        logInfo(`uploadSupplierController DONE — inserted=${inserted}, updated=${updated}, ` + `skipped=${skipped}, total=${total}`);

        return res.status(200).json({
            success: true,
            message: `Upload supplier berhasil. ${inserted} baru, ${updated} diperbarui, ${skipped} dilewati.`,
            inserted,
            updated,
            skipped,
            total,
        });
    } catch (dbErr) {
        logError(`uploadSupplierController DB ERROR: ${dbErr.message}`);
        return res.status(500).json({
            success: false,
            message: "Gagal menyimpan data supplier ke database.",
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD: CSV Stock
// POST /api/main/atk/upload/stock
// Multipart: file (CSV pipe-separated), office (string)
// ─────────────────────────────────────────────────────────────────────────────

const uploadStockController = async (req, res) => {
    // ── 1. Validasi file ──────────────────────────────────────────────────────
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'File CSV tidak ditemukan. Pastikan field name adalah "file".',
        });
    }

    // ── 2. Validasi office ────────────────────────────────────────────────────
    const office = String(req.body?.office ?? "").trim();
    if (!office) {
        return res.status(400).json({
            success: false,
            message: 'Field "office" wajib diisi.',
        });
    }

    // ── 3. Parse CSV ──────────────────────────────────────────────────────────
    let rows;
    try {
        rows = await parseCsvBuffer(req.file.buffer, "|");
    } catch (parseErr) {
        logError(`uploadStockController: CSV parse error — ${parseErr.message}`);
        return res.status(422).json({
            success: false,
            message: 'Gagal mem-parse CSV. Pastikan format dan separator "|" sudah benar.',
        });
    }

    // ── 4. Validasi tidak kosong ──────────────────────────────────────────────
    if (!isNotEmpty(rows)) {
        return res.status(400).json({
            success: false,
            message: "File CSV kosong atau hanya berisi header.",
        });
    }

    // ── 5. Validasi kolom wajib (prdcd & qty) ────────────────────────────────
    const missingCols = validateRequiredColumns(rows[0], "stock");
    if (missingCols.length > 0) {
        return res.status(422).json({
            success: false,
            message: `Kolom wajib tidak ditemukan: ${missingCols.join(", ")}`,
        });
    }

    // ── 6. Log statistik ──────────────────────────────────────────────────────
    const stats = countRowStats(rows, "prdcd");
    logInfo(`uploadStockController: office=${office}, file=${req.file.originalname}, ` + `size=${req.file.size}B, total=${stats.total}, valid=${stats.valid}, invalid=${stats.invalid}`);

    // ── 7. Upsert ke database ─────────────────────────────────────────────────
    try {
        const { inserted, updated, skipped } = await upsertStockFromCsv(rows, office);

        await upsertSyncModel(office, "STMAST");

        const total = inserted + updated + skipped;
        logInfo(`uploadStockController DONE — inserted=${inserted}, updated=${updated}, ` + `skipped=${skipped}, total=${total}`);

        return res.status(200).json({
            success: true,
            message: `Upload stock berhasil. ${inserted} baru, ${updated} diperbarui, ${skipped} dilewati.`,
            inserted,
            updated,
            skipped,
            total,
        });
    } catch (dbErr) {
        logError(`uploadStockController DB ERROR: ${dbErr.message}`);
        return res.status(500).json({
            success: false,
            message: "Gagal menyimpan data stock ke database.",
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    getProdukController,
    getSupplierController,
    getStockController,
    uploadProdukController,
    uploadSupplierController,
    uploadStockController,
};
