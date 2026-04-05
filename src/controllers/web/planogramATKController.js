// src/controllers/planogramATKController.js

const {
    DuplicateError,
    ProtectedError,
    getTypePlanogramModel,
    getMasterPlanogramModel,
    getLinePlanogramModel,
    createMasterPlanogramModel,
    updateMasterPlanogramModel,
    deleteMasterPlanogramModel,
    createLinePlanogramModel,
    updateLinePlanogramModel,
    deleteLinePlanogramModel,
    bulkCreateLinePlanogramModel,
} = require("../../models/web/planogramATKModel");
const { logInfo, logError } = require("../../utils/logger");

// =============================================================================
// HELPER — response seragam untuk tiap jenis error
//   DuplicateError  → 409 Conflict      (data sudah ada)
//   ProtectedError  → 422 Unprocessable (data masih digunakan, tidak bisa dihapus)
//   Error biasa     → 500 Internal Server Error
// =============================================================================
function handleError(res, err, context) {
    if (err instanceof DuplicateError || err.code === "DUPLICATE") {
        logError(`${context} DUPLICATE: ${err.message}`);
        return res.status(409).json({ success: false, error: err.message });
    }
    if (err instanceof ProtectedError || err.code === "PROTECTED") {
        logError(`${context} PROTECTED: ${err.message}`);
        return res.status(422).json({ success: false, error: err.message });
    }
    logError(`${context} ERROR: ${err.message}`);
    return res.status(500).json({ success: false, error: "Terjadi kesalahan pada server." });
}

// =============================================================================
// HELPER — parse CSV file menjadi array of objects
// Format CSV yang diterima (header wajib ada di baris pertama):
//   line_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano
//
// Mengembalikan { rows, errors } agar controller bisa memutuskan reject/proceed
// =============================================================================
function parsePlanogramCsv(fileBuffer) {
    const text = fileBuffer.toString("utf-8");
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    if (lines.length < 2) {
        return { rows: [], errors: ["File CSV kosong atau tidak memiliki data."] };
    }

    // Normalisasi header — hapus BOM jika ada, trim, lowercase
    const headers = lines[0]
        .replace(/^\uFEFF/, "")
        .split(",")
        .map((h) => h.trim().toLowerCase());

    const expectedHeaders = ["line_master_plano", "rack_plano", "shelf_plano", "cell_plano", "loc_plano"];
    const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
        return {
            rows: [],
            errors: [`Header CSV tidak lengkap. Kolom yang hilang: ${missingHeaders.join(", ")}`],
        };
    }

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // skip baris kosong

        const cols = line.split(",").map((c) => c.trim());
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = cols[idx] || null;
        });

        // Normalisasi: ubah string kosong jadi null
        const normalize = (v) => (v && v !== "" ? v : null);

        rows.push({
            line_master_plano: normalize(obj.line_master_plano),
            rack_plano: normalize(obj.rack_plano),
            shelf_plano: normalize(obj.shelf_plano),
            cell_plano: normalize(obj.cell_plano),
            loc_plano: normalize(obj.loc_plano),
            _rowNum: i + 1, // untuk pesan error
        });
    }

    if (rows.length === 0) {
        errors.push("File CSV tidak memiliki baris data.");
    }

    return { rows, errors };
}

// =============================================================================
// GET: Type Planogram
// GET /api/main/atk/planogram/types
// =============================================================================
const getTypePlanogramController = async (req, res) => {
    try {
        const rows = await getTypePlanogramModel();
        logInfo(`getTypePlanogramController OK, rows=${rows.length}`);
        return res.status(200).json(rows);
    } catch (err) {
        return handleError(res, err, "getTypePlanogramController");
    }
};

// =============================================================================
// GET: Master Planogram
// GET /api/main/atk/planogram/masters
// =============================================================================
const getMasterPlanogramController = async (req, res) => {
    try {
        const rows = await getMasterPlanogramModel();
        logInfo(`getMasterPlanogramController OK, rows=${rows.length}`);
        return res.status(200).json(rows);
    } catch (err) {
        return handleError(res, err, "getMasterPlanogramController");
    }
};

// =============================================================================
// GET: Line Planogram
// GET /api/main/atk/planogram/lines
// =============================================================================
const getLinePlanogramController = async (req, res) => {
    try {
        const rows = await getLinePlanogramModel();
        logInfo(`getLinePlanogramController OK, rows=${rows.length}`);
        return res.status(200).json(rows);
    } catch (err) {
        return handleError(res, err, "getLinePlanogramController");
    }
};

// =============================================================================
// POST: Create Master Planogram
// POST /api/main/atk/planogram/masters
// Body: { type_id, line_master_plano, line_plano? }
// =============================================================================
const createMasterPlanogramController = async (req, res) => {
    const { type_id, line_master_plano, line_plano = [] } = req.body;

    if (!type_id) return res.status(400).json({ success: false, error: "type_id wajib diisi." });
    if (!line_master_plano) return res.status(400).json({ success: false, error: "line_master_plano wajib diisi." });

    try {
        const data = await createMasterPlanogramModel({ type_id, line_master_plano, line_plano });
        logInfo(`createMasterPlanogramController OK`);
        return res.status(201).json({ success: true, message: "Master planogram berhasil dibuat.", data });
    } catch (err) {
        return handleError(res, err, "createMasterPlanogramController");
    }
};

// =============================================================================
// PUT: Update Master Planogram
// PUT /api/main/atk/planogram/masters/:id
// Body: { line_master_plano }
// =============================================================================
const updateMasterPlanogramController = async (req, res) => {
    const id = Number(req.params.id);
    const { line_master_plano } = req.body;

    if (!id || isNaN(id)) return res.status(400).json({ success: false, error: "ID tidak valid." });
    if (!line_master_plano) return res.status(400).json({ success: false, error: "line_master_plano wajib diisi." });

    try {
        const data = await updateMasterPlanogramModel(id, { line_master_plano });
        if (!data) return res.status(404).json({ success: false, error: "Master planogram tidak ditemukan." });

        logInfo(`updateMasterPlanogramController OK, id=${id}`);
        return res.status(200).json({ success: true, message: "Master planogram berhasil diupdate.", data });
    } catch (err) {
        return handleError(res, err, "updateMasterPlanogramController");
    }
};

// =============================================================================
// DELETE: Delete Master Planogram
// DELETE /api/main/atk/planogram/masters/:id
// =============================================================================
const deleteMasterPlanogramController = async (req, res) => {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) return res.status(400).json({ success: false, error: "ID tidak valid." });

    try {
        const deleted = await deleteMasterPlanogramModel(id);
        if (!deleted) return res.status(404).json({ success: false, error: "Master planogram tidak ditemukan." });

        logInfo(`deleteMasterPlanogramController OK, id=${id}`);
        return res.status(200).json({ success: true, message: "Master planogram berhasil dihapus." });
    } catch (err) {
        return handleError(res, err, "deleteMasterPlanogramController");
    }
};

// =============================================================================
// POST: Create Line Planogram (single)
// POST /api/main/atk/planogram/lines
// Body: { head_id_master_plano, rack_plano?, shelf_plano?, cell_plano?, loc_plano? }
// =============================================================================
const createLinePlanogramController = async (req, res) => {
    const { head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano } = req.body;

    if (!head_id_master_plano) return res.status(400).json({ success: false, error: "head_id_master_plano wajib diisi." });
    if (!rack_plano && !loc_plano) return res.status(400).json({ success: false, error: "rack_plano atau loc_plano wajib diisi." });

    try {
        const data = await createLinePlanogramModel({
            head_id_master_plano,
            rack_plano: rack_plano || null,
            shelf_plano: shelf_plano || null,
            cell_plano: cell_plano || null,
            loc_plano: loc_plano || null,
        });
        logInfo(`createLinePlanogramController OK`);
        return res.status(201).json({ success: true, message: "Line planogram berhasil dibuat.", data });
    } catch (err) {
        return handleError(res, err, "createLinePlanogramController");
    }
};

// =============================================================================
// PUT: Update Line Planogram
// PUT /api/main/atk/planogram/lines/:id
// Body: { head_id_master_plano, rack_plano?, shelf_plano?, cell_plano?, loc_plano? }
// =============================================================================
const updateLinePlanogramController = async (req, res) => {
    const id = Number(req.params.id);
    const { head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano } = req.body;

    if (!id || isNaN(id)) return res.status(400).json({ success: false, error: "ID tidak valid." });
    if (!head_id_master_plano) return res.status(400).json({ success: false, error: "head_id_master_plano wajib diisi." });
    if (!rack_plano && !loc_plano) return res.status(400).json({ success: false, error: "rack_plano atau loc_plano wajib diisi." });

    try {
        const data = await updateLinePlanogramModel(id, {
            head_id_master_plano,
            rack_plano: rack_plano || null,
            shelf_plano: shelf_plano || null,
            cell_plano: cell_plano || null,
            loc_plano: loc_plano || null,
        });
        if (!data) return res.status(404).json({ success: false, error: "Line planogram tidak ditemukan." });

        logInfo(`updateLinePlanogramController OK, id=${id}`);
        return res.status(200).json({ success: true, message: "Line planogram berhasil diupdate.", data });
    } catch (err) {
        return handleError(res, err, "updateLinePlanogramController");
    }
};

// =============================================================================
// DELETE: Delete Line Planogram
// DELETE /api/main/atk/planogram/lines/:id
// =============================================================================
const deleteLinePlanogramController = async (req, res) => {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) return res.status(400).json({ success: false, error: "ID tidak valid." });

    try {
        const deleted = await deleteLinePlanogramModel(id);
        if (!deleted) return res.status(404).json({ success: false, error: "Line planogram tidak ditemukan." });

        logInfo(`deleteLinePlanogramController OK, id=${id}`);
        return res.status(200).json({ success: true, message: "Line planogram berhasil dihapus." });
    } catch (err) {
        return handleError(res, err, "deleteLinePlanogramController");
    }
};

// =============================================================================
// POST: Bulk Create Line Planogram via CSV upload
// POST /api/main/atk/planogram/lines/bulk
//
// Dua mode pengiriman data yang didukung:
// 1. File upload (multipart/form-data) — field name: "file"
//    Header CSV: line_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano
//    Controller yang me-resolve line_master_plano → head_id_master_plano
//
// 2. JSON body — { rows: [{ head_id_master_plano, rack_plano, ... }] }
//    Digunakan saat dikirim dari frontend SvelteKit (+page.server.js)
// =============================================================================
const bulkCreateLinePlanogramController = async (req, res) => {
    let rows = [];

    // ── Mode 1: File CSV upload ───────────────────────────────────────────────
    if (req.file) {
        const { rows: parsedRows, errors: parseErrors } = parsePlanogramCsv(req.file.buffer);

        if (parseErrors.length > 0) {
            return res.status(400).json({ success: false, error: parseErrors.join(" ") });
        }

        // Resolve line_master_plano → head_id_master_plano
        // Ambil semua master sekaligus untuk menghindari N query
        const { rows: masters } = await require("../../config/db").query(`SELECT id_master_plano, UPPER(line_master_plano) AS line_upper FROM pot_master_plano`);
        const masterMap = new Map(masters.map((m) => [m.line_upper, m.id_master_plano]));

        const resolveErrors = [];
        rows = parsedRows
            .map((r, idx) => {
                const lineUpper = (r.line_master_plano || "").toUpperCase();
                const masterId = masterMap.get(lineUpper);
                if (!masterId) {
                    resolveErrors.push(`Baris ${r._rowNum}: line "${r.line_master_plano}" tidak ditemukan di Master Planogram.`);
                    return null;
                }
                return {
                    head_id_master_plano: masterId,
                    rack_plano: r.rack_plano,
                    shelf_plano: r.shelf_plano,
                    cell_plano: r.cell_plano,
                    loc_plano: r.loc_plano,
                };
            })
            .filter(Boolean); // hapus baris null (line tidak ditemukan)

        if (resolveErrors.length > 0) {
            logError(`bulkCreateLinePlanogramController — resolve errors:\n  ${resolveErrors.join("\n  ")}`);
        }

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Tidak ada baris valid yang dapat diproses.",
                details: resolveErrors,
            });
        }
    }
    // ── Mode 2: JSON body ─────────────────────────────────────────────────────
    else if (req.body?.rows) {
        rows = req.body.rows;
    } else {
        return res.status(400).json({
            success: false,
            error: "Kirim file CSV (field: file) atau JSON body { rows: [...] }.",
        });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: "rows tidak boleh kosong." });
    }

    try {
        const result = await bulkCreateLinePlanogramModel(rows);
        logInfo(`bulkCreateLinePlanogramController OK, inserted=${result.inserted}, skipped=${result.skipped}`);
        return res.status(200).json({
            success: true,
            message: `Import selesai: ${result.inserted} berhasil, ${result.skipped} dilewati.`,
            data: {
                inserted: result.inserted,
                skipped: result.skipped,
                skippedDetails: result.skippedDetails,
            },
        });
    } catch (err) {
        return handleError(res, err, "bulkCreateLinePlanogramController");
    }
};

module.exports = {
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
};
