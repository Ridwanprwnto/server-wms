// src/models/planogramATKModel.js

const pool = require("../config/db");
const { logInfo, logError } = require("../utils/logger");

// =============================================================================
// CUSTOM ERROR — digunakan untuk membedakan error duplikat (409)
// dari error server (500) di layer controller
// =============================================================================
class DuplicateError extends Error {
    constructor(message) {
        super(message);
        this.name = "DuplicateError";
        this.code = "DUPLICATE";
    }
}

// Dilempar saat data tidak bisa dihapus karena masih digunakan (prdcd tidak null)
class ProtectedError extends Error {
    constructor(message) {
        super(message);
        this.name = "ProtectedError";
        this.code = "PROTECTED";
    }
}

// =============================================================================
// HELPER: CEK DUPLIKAT MASTER (line_master_plano)
// excludeId diisi saat UPDATE agar tidak mendeteksi dirinya sendiri
// =============================================================================
async function checkDuplicateMasterLine(client, line_master_plano, excludeId = null) {
    const query = excludeId
        ? `SELECT id_master_plano FROM pot_master_plano
           WHERE  UPPER(line_master_plano) = UPPER($1)
             AND  id_master_plano <> $2 LIMIT 1`
        : `SELECT id_master_plano FROM pot_master_plano
           WHERE  UPPER(line_master_plano) = UPPER($1) LIMIT 1`;

    const params = excludeId ? [line_master_plano, excludeId] : [line_master_plano];
    const result = await client.query(query, params);

    if (result.rowCount > 0) {
        throw new DuplicateError(`Line "${line_master_plano}" sudah terdaftar di Master Planogram.`);
    }
}

// =============================================================================
// HELPER: CEK DUPLIKAT LINE PLANOGRAM
// Untuk RACK : kombinasi head_id_master_plano + rack + shelf + cell harus unik
// Untuk FLOOR: kombinasi head_id_master_plano + loc harus unik
// excludeId diisi saat UPDATE
// =============================================================================
async function checkDuplicateLinePlano(client, { head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano }, excludeId = null) {
    let query, params;

    if (rack_plano) {
        // RACK — shelf dan cell boleh NULL, COALESCE agar NULL = NULL dianggap sama
        query = `
            SELECT id_plano FROM pot_line_plano
            WHERE  head_id_master_plano          = $1
              AND  rack_plano                    = $2
              AND  COALESCE(shelf_plano, '')     = COALESCE($3, '')
              AND  COALESCE(cell_plano,  '')     = COALESCE($4, '')
              ${excludeId ? "AND id_plano <> $5" : ""}
            LIMIT 1`;
        params = excludeId ? [head_id_master_plano, rack_plano, shelf_plano || null, cell_plano || null, excludeId] : [head_id_master_plano, rack_plano, shelf_plano || null, cell_plano || null];

        const label = `R${rack_plano}${shelf_plano ? "-S" + shelf_plano : ""}${cell_plano ? "-C" + cell_plano : ""}`;
        const result = await client.query(query, params);
        if (result.rowCount > 0) {
            throw new DuplicateError(`Lokasi ${label} sudah terdaftar pada master planogram ini.`);
        }
    } else if (loc_plano) {
        // FLOOR
        query = `
            SELECT id_plano FROM pot_line_plano
            WHERE  head_id_master_plano = $1
              AND  loc_plano            = $2
              ${excludeId ? "AND id_plano <> $3" : ""}
            LIMIT 1`;
        params = excludeId ? [head_id_master_plano, loc_plano, excludeId] : [head_id_master_plano, loc_plano];

        const result = await client.query(query, params);
        if (result.rowCount > 0) {
            throw new DuplicateError(`Lokasi LOC-${loc_plano} sudah terdaftar pada master planogram ini.`);
        }
    }
}

// =============================================================================
// GET TYPE PLANOGRAM
// =============================================================================
const getTypePlanogramModel = async () => {
    const query = `
        SELECT id_type_plano, name_type_plano
        FROM   pot_type_plano
        ORDER  BY name_type_plano ASC
    `;
    try {
        const result = await pool.query(query);
        logInfo(`getTypePlanogramModel OK — rows: ${result.rows.length}`);
        return result.rows;
    } catch (err) {
        logError(`getTypePlanogramModel ERROR: ${err.message}`);
        throw err;
    }
};

// =============================================================================
// GET MASTER PLANOGRAM
// =============================================================================
const getMasterPlanogramModel = async () => {
    const query = `
        SELECT id_master_plano, head_id_type_plano, line_master_plano
        FROM   pot_master_plano
        ORDER  BY line_master_plano ASC
    `;
    try {
        const result = await pool.query(query);
        logInfo(`getMasterPlanogramModel OK — rows: ${result.rows.length}`);
        return result.rows;
    } catch (err) {
        logError(`getMasterPlanogramModel ERROR: ${err.message}`);
        throw err;
    }
};

// =============================================================================
// GET LINE PLANOGRAM
// =============================================================================
const getLinePlanogramModel = async () => {
    const query = `
        SELECT
            A.id_plano,
            A.head_id_master_plano,
            A.rack_plano,
            A.shelf_plano,
            A.cell_plano,
            A.loc_plano,
            B.line_master_plano
        FROM  pot_line_plano    AS A
        INNER JOIN pot_master_plano AS B ON A.head_id_master_plano = B.id_master_plano
        ORDER BY B.line_master_plano ASC,
                 A.rack_plano        ASC,
                 A.shelf_plano       ASC,
                 A.cell_plano        ASC
    `;
    try {
        const result = await pool.query(query);
        logInfo(`getLinePlanogramModel OK — rows: ${result.rows.length}`);
        return result.rows;
    } catch (err) {
        logError(`getLinePlanogramModel ERROR: ${err.message}`);
        throw err;
    }
};

// =============================================================================
// CREATE MASTER PLANOGRAM
// Validasi: line_master_plano tidak boleh duplikat (case-insensitive)
// Transaksi: insert master + insert lokasi awal (opsional) atomik
// =============================================================================
const createMasterPlanogramModel = async ({ type_id, line_master_plano, line_plano = [] }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ── Validasi duplikat line ─────────────────────────────────────────────
        await checkDuplicateMasterLine(client, line_master_plano);

        // ── Insert master ──────────────────────────────────────────────────────
        const masterResult = await client.query(
            `INSERT INTO pot_master_plano (head_id_type_plano, line_master_plano)
             VALUES ($1, $2)
             RETURNING id_master_plano, head_id_type_plano, line_master_plano`,
            [type_id, line_master_plano],
        );
        const master = masterResult.rows[0];

        // ── Insert lokasi awal (opsional) ──────────────────────────────────────
        const insertedLines = [];
        for (const lp of line_plano) {
            // Validasi duplikat tiap lokasi dalam batch ini
            await checkDuplicateLinePlano(client, {
                head_id_master_plano: master.id_master_plano,
                rack_plano: lp.rack_plano || null,
                shelf_plano: lp.shelf_plano || null,
                cell_plano: lp.cell_plano || null,
                loc_plano: lp.loc_plano || null,
            });

            const lineResult = await client.query(
                `INSERT INTO pot_line_plano
                    (head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id_plano, head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano`,
                [master.id_master_plano, lp.rack_plano || null, lp.shelf_plano || null, lp.cell_plano || null, lp.loc_plano || null],
            );
            insertedLines.push(lineResult.rows[0]);
        }

        await client.query("COMMIT");
        logInfo(`createMasterPlanogramModel OK — master id: ${master.id_master_plano}, lines: ${insertedLines.length}`);
        return { master, lines: insertedLines };
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`createMasterPlanogramModel ERROR: ${err.message}`);
        throw err; // DuplicateError maupun Error biasa diteruskan ke controller
    } finally {
        client.release();
    }
};

// =============================================================================
// UPDATE MASTER PLANOGRAM
// Validasi: line_master_plano baru tidak boleh duplikat dengan master LAIN
// head_id_type_plano tidak boleh diubah (aturan bisnis)
// =============================================================================
const updateMasterPlanogramModel = async (id, { line_master_plano }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ── Cek master ada ─────────────────────────────────────────────────────
        const existCheck = await client.query(`SELECT id_master_plano, line_master_plano FROM pot_master_plano WHERE id_master_plano = $1`, [id]);
        if (existCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // ── Validasi duplikat line (exclude id sendiri) ────────────────────────
        await checkDuplicateMasterLine(client, line_master_plano, id);

        const lineName = existCheck.rows[0].line_master_plano;

        // ── Cek apakah ada lokasi yang masih memiliki prdcd (tidak NULL) ───────
        const prdcdCheck = await client.query(
            `SELECT COUNT(*) AS total FROM pot_master_plano AS A 
             INNER JOIN pot_line_plano AS B ON A.id_master_plano = B.head_id_master_plano 
             INNER JOIN pot_storage_plano AS C ON B.id_plano = C.head_id_plano 
             WHERE A.id_master_plano = $1`, 
            [id],
        );
        const totalPrdcd = parseInt(prdcdCheck.rows[0].total, 10);
        if (totalPrdcd > 0) {
            throw new ProtectedError(`Master planogram "${lineName}" tidak dapat diupdate karena memiliki ${totalPrdcd} lokasi yang masih terpasang storage produk (prdcd).`);
        }

        // ── Update ─────────────────────────────────────────────────────────────
        const result = await client.query(
            `UPDATE pot_master_plano
             SET    line_master_plano = $1
             WHERE  id_master_plano   = $2
             RETURNING id_master_plano, head_id_type_plano, line_master_plano`,
            [line_master_plano, id],
        );

        await client.query("COMMIT");
        logInfo(`updateMasterPlanogramModel OK — id: ${id}`);
        return result.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`updateMasterPlanogramModel ERROR: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// =============================================================================
// DELETE MASTER PLANOGRAM (cascade manual)
// Validasi: gagal jika ada lokasi line plano milik master ini
//           yang kolom prdcd_plano-nya tidak NULL (berarti sedang digunakan)
// =============================================================================
const deleteMasterPlanogramModel = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ── Cek master ada ─────────────────────────────────────────────────────
        const masterCheck = await client.query(
            `SELECT id_master_plano, line_master_plano
             FROM   pot_master_plano
             WHERE  id_master_plano = $1`,
            [id],
        );
        if (masterCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }
        const lineName = masterCheck.rows[0].line_master_plano;

        // ── Cek apakah ada lokasi yang masih memiliki prdcd ───────
        const prdcdCheck = await client.query(
            `SELECT COUNT(*) AS total FROM pot_master_plano AS A 
             INNER JOIN pot_line_plano AS B ON A.id_master_plano = B.head_id_master_plano 
             INNER JOIN pot_storage_plano AS C ON B.id_plano = C.head_id_plano 
             WHERE A.id_master_plano = $1`, 
            [id],
        );
        const totalPrdcd = parseInt(prdcdCheck.rows[0].total, 10);
        if (totalPrdcd > 0) {
            throw new ProtectedError(`Master planogram "${lineName}" tidak dapat dihapus karena memiliki ${totalPrdcd} lokasi yang masih terpasang storage produk (prdcd).`);
        }

        // ── Hapus semua line planogram terkait (prdcd sudah dipastikan NULL) ───
        await client.query(`DELETE FROM pot_line_plano WHERE head_id_master_plano = $1`, [id]);

        // ── Hapus master ───────────────────────────────────────────────────────
        const result = await client.query(`DELETE FROM pot_master_plano WHERE id_master_plano = $1 RETURNING id_master_plano`, [id]);

        await client.query("COMMIT");
        logInfo(`deleteMasterPlanogramModel OK — id: ${id}`);
        return result.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`deleteMasterPlanogramModel ERROR: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// =============================================================================
// CREATE LINE PLANOGRAM (single)
// Validasi: kombinasi lokasi tidak boleh duplikat dalam master yang sama
// =============================================================================
const createLinePlanogramModel = async ({ head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ── Validasi duplikat lokasi ───────────────────────────────────────────
        await checkDuplicateLinePlano(client, {
            head_id_master_plano,
            rack_plano: rack_plano || null,
            shelf_plano: shelf_plano || null,
            cell_plano: cell_plano || null,
            loc_plano: loc_plano || null,
        });

        // ── Insert ─────────────────────────────────────────────────────────────
        const result = await client.query(
            `INSERT INTO pot_line_plano
                (head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id_plano, head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano`,
            [head_id_master_plano, rack_plano || null, shelf_plano || null, cell_plano || null, loc_plano || null],
        );

        await client.query("COMMIT");
        logInfo(`createLinePlanogramModel OK — id: ${result.rows[0].id_plano}`);
        return result.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`createLinePlanogramModel ERROR: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// =============================================================================
// UPDATE LINE PLANOGRAM
// Validasi: kombinasi lokasi baru tidak boleh duplikat (exclude id sendiri)
// =============================================================================
const updateLinePlanogramModel = async (id, { head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ── Cek baris ada ──────────────────────────────────────────────────────
        const existCheck = await client.query(`SELECT A.rack_plano, A.shelf_plano, A.cell_plano, A.loc_plano, B.prdcd_str_plano FROM pot_line_plano AS A LEFT JOIN pot_storage_plano AS B ON A.id_plano = B.head_id_plano WHERE A.id_plano = $1`, [id]);
        if (existCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // ── Validasi duplikat lokasi (exclude id sendiri) ──────────────────────
        await checkDuplicateLinePlano(
            client,
            {
                head_id_master_plano,
                rack_plano: rack_plano || null,
                shelf_plano: shelf_plano || null,
                cell_plano: cell_plano || null,
                loc_plano: loc_plano || null,
            },
            id,
        );

        const row = existCheck.rows[0];

        // ── Validasi prdcd ─────────────────────────────────────────────────────
        if (row.prdcd_str_plano !== null) {
            // Buat label lokasi yang informatif untuk pesan error
            const lokasiLabel = row.rack_plano ? `R${row.rack_plano}${row.shelf_plano ? "-S" + row.shelf_plano : ""}${row.cell_plano ? "-C" + row.cell_plano : ""}` : `LOC-${row.loc_plano}`;

            throw new ProtectedError(`Lokasi ${lokasiLabel} tidak dapat dirubah karena masih terdapat storage yang terpasang atas produk (prdcd: ${row.prdcd_str_plano}).`);
        }

        // ── Update ─────────────────────────────────────────────────────────────
        const result = await client.query(
            `UPDATE pot_line_plano
             SET    head_id_master_plano = $1,
                    rack_plano           = $2,
                    shelf_plano          = $3,
                    cell_plano           = $4,
                    loc_plano            = $5
             WHERE  id_plano             = $6
             RETURNING id_plano, head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano`,
            [head_id_master_plano, rack_plano || null, shelf_plano || null, cell_plano || null, loc_plano || null, id],
        );

        await client.query("COMMIT");
        logInfo(`updateLinePlanogramModel OK — id: ${id}`);
        return result.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`updateLinePlanogramModel ERROR: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// =============================================================================
// DELETE LINE PLANOGRAM (single)
// Validasi: gagal jika prdcd_plano tidak NULL (lokasi masih memiliki produk)
// =============================================================================
const deleteLinePlanogramModel = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ── Cek baris ada + ambil info prdcd sekaligus ─────────────────────────
        const check = await client.query(`SELECT A.rack_plano, A.shelf_plano, A.cell_plano, A.loc_plano, B.prdcd_str_plano FROM pot_line_plano AS A LEFT JOIN pot_storage_plano AS B ON A.id_plano = B.head_id_plano WHERE A.id_plano = $1`, [id]);
       
        if (check.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const row = check.rows[0];

        // ── Validasi prdcd ─────────────────────────────────────────────────────
        if (row.prdcd_str_plano !== null) {
            // Buat label lokasi yang informatif untuk pesan error
            const lokasiLabel = row.rack_plano ? `R${row.rack_plano}${row.shelf_plano ? "-S" + row.shelf_plano : ""}${row.cell_plano ? "-C" + row.cell_plano : ""}` : `LOC-${row.loc_plano}`;

            throw new ProtectedError(`Lokasi ${lokasiLabel} tidak dapat dihapus karena masih terdapat storage yang terpasang atas produk (prdcd: ${row.prdcd_str_plano}).`);
        }

        // ── Hapus ──────────────────────────────────────────────────────────────
        const result = await client.query(`DELETE FROM pot_line_plano WHERE id_plano = $1 RETURNING id_plano`, [id]);

        await client.query("COMMIT");
        logInfo(`deleteLinePlanogramModel OK — id: ${id}`);
        return result.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`deleteLinePlanogramModel ERROR: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// =============================================================================
// BULK CREATE LINE PLANOGRAM — dari upload file CSV
//
// Menerima:
//   - rows  : array object yang sudah diparsing dari CSV
//             Format tiap baris: { head_id_master_plano, rack_plano?,
//                                  shelf_plano?, cell_plano?, loc_plano? }
//
// Strategi:
//   - Satu transaksi untuk seluruh batch
//   - Tiap baris dicek duplikat terlebih dahulu
//   - Baris duplikat atau tidak valid → skipped (tidak menggagalkan batch)
//   - Semua baris valid → inserted
//
// Return: { inserted, skipped, skippedDetails[] }
//   skippedDetails memudahkan debugging di log server
// =============================================================================
const bulkCreateLinePlanogramModel = async (rows) => {
    const client = await pool.connect();
    let inserted = 0;
    let skipped = 0;
    const skippedDetails = []; // untuk logging detail baris yang dilewati

    try {
        await client.query("BEGIN");

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const { head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano } = row;

            const rowLabel = `baris-${i + 1}`;

            // ── Validasi wajib ────────────────────────────────────────────────
            if (!head_id_master_plano) {
                skipped++;
                skippedDetails.push(`${rowLabel}: head_id_master_plano kosong`);
                continue;
            }
            if (!rack_plano && !loc_plano) {
                skipped++;
                skippedDetails.push(`${rowLabel}: rack_plano dan loc_plano keduanya kosong`);
                continue;
            }

            // ── Validasi master ada ───────────────────────────────────────────
            const masterCheck = await client.query(`SELECT id_master_plano FROM pot_master_plano WHERE id_master_plano = $1 LIMIT 1`, [head_id_master_plano]);
            if (masterCheck.rowCount === 0) {
                skipped++;
                skippedDetails.push(`${rowLabel}: master_id ${head_id_master_plano} tidak ditemukan`);
                continue;
            }

            // ── Cek duplikat ──────────────────────────────────────────────────
            try {
                await checkDuplicateLinePlano(client, {
                    head_id_master_plano,
                    rack_plano: rack_plano || null,
                    shelf_plano: shelf_plano || null,
                    cell_plano: cell_plano || null,
                    loc_plano: loc_plano || null,
                });
            } catch (dupErr) {
                skipped++;
                skippedDetails.push(`${rowLabel}: ${dupErr.message}`);
                continue;
            }

            // ── Insert ────────────────────────────────────────────────────────
            await client.query(
                `INSERT INTO pot_line_plano
                    (head_id_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano)
                 VALUES ($1, $2, $3, $4, $5)`,
                [head_id_master_plano, rack_plano || null, shelf_plano || null, cell_plano || null, loc_plano || null],
            );
            inserted++;
        }

        await client.query("COMMIT");

        if (skippedDetails.length > 0) {
            logInfo(`bulkCreateLinePlanogramModel — skipped details:\n  ${skippedDetails.join("\n  ")}`);
        }
        logInfo(`bulkCreateLinePlanogramModel OK — inserted: ${inserted}, skipped: ${skipped}`);

        return { inserted, skipped, skippedDetails };
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`bulkCreateLinePlanogramModel ERROR: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
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
};
