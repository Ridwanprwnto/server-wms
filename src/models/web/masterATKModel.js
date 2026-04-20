// src/models/masterATKModel.js

const { pool } = require("../../config/db");
const { logInfo, logError } = require("../../utils/logger");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER KONVERSI — private, tidak di-export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse string ke desimal. Mengembalikan null jika kosong/tidak valid.
 * @param {string|null|undefined} val
 * @returns {number|null}
 */
function parseDecimal(val) {
    if (val === null || val === undefined || String(val).trim() === "") return null;
    const num = parseFloat(
        String(val)
            .replace(/,/g, ".")
            .replace(/[^0-9.\-]/g, ""),
    );
    return isNaN(num) ? null : num;
}

/**
 * Parse string ke integer. Mengembalikan null jika kosong/tidak valid.
 * @param {string|null|undefined} val
 * @returns {number|null}
 */
function parseInteger(val) {
    if (val === null || val === undefined || String(val).trim() === "") return null;
    const num = parseInt(String(val).trim(), 10);
    return isNaN(num) ? null : num;
}

/**
 * Parse string tanggal ke format ISO (PostgreSQL menerima ISO string langsung).
 * Mengembalikan null jika tidak valid.
 * @param {string|null|undefined} val
 * @returns {string|null}
 */
function parseDate(val) {
    if (!val || String(val).trim() === "") return null;
    try {
        const d = new Date(String(val).trim());
        return isNaN(d.getTime()) ? null : d.toISOString();
    } catch {
        return null;
    }
}

/**
 * Trim string. Mengembalikan null jika kosong.
 * @param {string|null|undefined} val
 * @returns {string|null}
 */
function parseStr(val) {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s === "" ? null : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING CSV → RECORD DB (produk)
// Header CSV (58 kolom, pipe-separated, sudah dinormalisasi ke lowercase
// oleh csvParser sebelum sampai ke sini)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Petakan satu baris CSV ke object kolom tabel pot_prodmast.
 *
 * @param {Record<string,string>} row    - satu baris dari parseCsvBuffer
 * @param {string}                office - kode office/warehouse
 * @returns {Record<string,any>}
 */
function mapProdukRow(row, office) {
    return {
        ware_house: parseStr(row["ware_house"]) ?? office, // fallback ke office jika kosong di CSV
        cat_cod: parseStr(row["cat_cod"]),
        prdcd: parseStr(row["prdcd"]), // PK bisnis — wajib ada
        prd_mode: parseStr(row["prd_mode"]),
        prd_desc: parseStr(row["prd_desc"]),
        singkat: parseStr(row["singkat"]),
        merk: parseStr(row["merk"]),
        nama: parseStr(row["nama"]),
        flavour: parseStr(row["flavour"]),
        kemasan: parseStr(row["kemasan"]),
        prd_size: parseStr(row["prd_size"]),
        prd_bkp: parseStr(row["prd_bkp"]),
        desc2: parseStr(row["desc2"]),
        frac: parseStr(row["frac"]),
        unit: parseStr(row["unit"]),
        acost: parseDecimal(row["acost"]) ?? 0,
        rcost: parseDecimal(row["rcost"]),
        lcost: parseDecimal(row["lcost"]) ?? 0,
        markup1: parseDecimal(row["markup1"]) ?? 0,
        markup2: parseDecimal(row["markup2"]) ?? 0,
        markup3: parseDecimal(row["markup3"]) ?? 0,
        markup4: parseDecimal(row["markup4"]) ?? 0,
        markup5: parseDecimal(row["markup5"]) ?? 0,
        markup6: parseDecimal(row["markup6"]) ?? 0,
        price_a: parseDecimal(row["price_a"]) ?? 0,
        price_b: parseDecimal(row["price_b"]) ?? 0,
        price_c: parseDecimal(row["price_c"]) ?? 0,
        price_d: parseDecimal(row["price_d"]) ?? 0,
        price_e: parseDecimal(row["price_e"]) ?? 0,
        price_f: parseDecimal(row["price_f"]) ?? 0,
        div: parseStr(row["div"]),
        prdgrp: parseStr(row["prdgrp"]),
        ctgr: parseStr(row["ctgr"]),
        kons: parseStr(row["kons"]),
        supco: parseStr(row["supco"]),
        supco_1: parseStr(row["supco_1"]),
        ptag: parseStr(row["ptag"]),
        tgl_tambah: parseDate(row["tgl_tambah"]),
        tgl_rubah: parseDate(row["tgl_rubah"]),
        tgl_harga1: parseDate(row["tgl_harga1"]),
        tgl_harga2: parseDate(row["tgl_harga2"]),
        tgl_harga3: parseDate(row["tgl_harga3"]),
        tgl_harga4: parseDate(row["tgl_harga4"]),
        tgl_harga5: parseDate(row["tgl_harga5"]),
        tgl_harga6: parseDate(row["tgl_harga6"]),
        reorder: parseDecimal(row["reorder"]) ?? 0,
        prd_length: parseDecimal(row["prd_length"]),
        width: parseDecimal(row["width"]),
        height: parseDecimal(row["height"]),
        k_length: parseDecimal(row["k_length"]),
        k_width: parseDecimal(row["k_width"]),
        k_height: parseDecimal(row["k_height"]),
        berat_sat: parseDecimal(row["berat_sat"]),
        berat_krt: parseDecimal(row["berat_krt"]),
        exp_month: parseInteger(row["exp_month"]),
        exp_day: parseInteger(row["exp_day"]),
        upd_date: parseDate(row["upd_date"]),
        prd_st_bkp: parseStr(row["prd_st_bkp"]),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING CSV → RECORD DB (supplier)
// Header CSV (29 kolom, pipe-separated):
//   RECID|SUPCO|SUPCO_1|SNAMA|SALM|SKOTA|SCP|SDR|TELP_1|TELP_2|TELP_3|
//   FAX_1|FAX_2|FAX_3|SKTR|BUAT_PO|SCENTRE|SDATANG|JADWAL|DISC|PKP|NPWP|
//   SKP|TGLSKP|LEAD|DLVR_RP|DLVR_M3|UP_DATE|FLAG_TDK_TAXTEMP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Petakan satu baris CSV ke object kolom tabel pot_supmast.
 * PK bisnis: supco
 *
 * @param {Record<string,string>} row - satu baris dari parseCsvBuffer
 * @returns {Record<string,any>}
 */
function mapSupplierRow(row) {
    return {
        supco: parseStr(row["supco"]), // PK bisnis — wajib ada
        supco_1: parseStr(row["supco_1"]),
        snama: parseStr(row["snama"]),
        salm: parseStr(row["salm"]),
        skota: parseStr(row["skota"]),
        scp: parseStr(row["scp"]),
        sdr: parseStr(row["sdr"]),
        telp_1: parseStr(row["telp_1"]),
        telp_2: parseStr(row["telp_2"]),
        telp_3: parseStr(row["telp_3"]),
        fax_1: parseStr(row["fax_1"]),
        fax_2: parseStr(row["fax_2"]),
        fax_3: parseStr(row["fax_3"]),
        sktr: parseStr(row["sktr"]),
        buat_po: parseStr(row["buat_po"]),
        scentre: parseStr(row["scentre"]),
        sdatang: parseStr(row["sdatang"]),
        jadwal: parseStr(row["jadwal"]),
        disc: parseDecimal(row["disc"]),
        pkp: parseStr(row["pkp"]),
        npwp: parseStr(row["npwp"]),
        skp: parseStr(row["skp"]),
        tglskp: parseDate(row["tglskp"]),
        lead: parseInteger(row["lead"]),
        dlvr_rp: parseDecimal(row["dlvr_rp"]),
        dlvr_m3: parseDecimal(row["dlvr_m3"]),
        up_date: parseDate(row["up_date"]),
        flag_tdk_taxtemp: parseStr(row["flag_tdk_taxtemp"]),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING CSV → RECORD DB (stock)
// Header CSV (28 kolom, pipe-separated):
//   RECID|GUDANG|LOKASI|DIV|KLPT|PRDCD|MAX|MIN|LAST|QTY|BEGBAL|
//   TRFIN|TRFOUT|ADJUST|TRFIN_H|TRFOUT_H|ADJUST_H|LCOST|LCOST_H|KONS|
//   DISPID|LT|RAK|BAR|CELL|QTY_MAX|LAST_TRANS|KETER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Petakan satu baris CSV ke object kolom tabel pot_stmast.
 * PK bisnis: (gudang, prdcd) — keduanya wajib ada.
 *
 * @param {Record<string,string>} row    - satu baris dari parseCsvBuffer
 * @param {string}                office - kode office/warehouse (fallback gudang)
 * @returns {Record<string,any>}
 */
function mapStockRow(row, office) {
    return {
        gudang: parseStr(row["gudang"]) ?? office, // fallback ke office jika kosong
        lokasi: parseStr(row["lokasi"]),
        div: parseStr(row["div"]),
        klpt: parseStr(row["klpt"]),
        prdcd: parseStr(row["prdcd"]), // wajib ada
        max: parseDecimal(row["max"]) ?? 0,
        min: parseDecimal(row["min"]) ?? 0,
        last: parseDecimal(row["last"]) ?? 0,
        qty: parseDecimal(row["qty"]) ?? 0,
        begbal: parseDecimal(row["begbal"]) ?? 0,
        trfin: parseDecimal(row["trfin"]) ?? 0,
        trfout: parseDecimal(row["trfout"]) ?? 0,
        adjust: parseDecimal(row["adjust"]) ?? 0,
        trfin_h: parseDecimal(row["trfin_h"]) ?? 0,
        trfout_h: parseDecimal(row["trfout_h"]) ?? 0,
        adjust_h: parseDecimal(row["adjust_h"]) ?? 0,
        lcost: parseDecimal(row["lcost"]) ?? 0,
        lcost_h: parseDecimal(row["lcost_h"]) ?? 0,
        kons: parseStr(row["kons"]),
        dispid: parseStr(row["dispid"]),
        lt: parseInteger(row["lt"]),
        rak: parseStr(row["rak"]),
        bar: parseStr(row["bar"]),
        cell: parseStr(row["cell"]),
        qty_max: parseDecimal(row["qty_max"]) ?? 0,
        last_trans: parseDate(row["last_trans"]),
        keter: parseStr(row["keter"]),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC — tabel pot_sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil info sinkronisasi terakhir untuk kombinasi office + master.
 *
 * @param {string} office  - kode office, contoh "G113"
 * @param {string} master  - kode master, contoh "produk" | "supplier" | "stock"
 * @returns {Promise<Array<{ office_sync: string, date_sync: Date }>>}
 */
const getSyncModel = async (office, master) => {
    const query = `
        SELECT office_sync, date_sync
        FROM   pot_sync
        WHERE  office_sync = $1
          AND  master_sync = $2
        ORDER  BY date_sync DESC
        LIMIT  1
    `;
    try {
        const result = await pool.query(query, [office, master]);
        logInfo(`getSyncModel OK — office: ${office}, master: ${master}`);
        return result.rows;
    } catch (err) {
        logError(`getSyncModel ERROR: ${err.message}`);
        throw err;
    }
};

/**
 * Catat atau perbarui waktu sinkronisasi terakhir di pot_sync.
 * Menggunakan UPSERT agar tidak duplikat jika office+master sudah ada.
 *
 * @param {string} office
 * @param {string} master
 * @returns {Promise<void>}
 */
const upsertSyncModel = async (office, master) => {
    const query = `
        INSERT INTO pot_sync (office_sync, master_sync, date_sync)
        VALUES ($1, $2, NOW())
        ON CONFLICT (office_sync, master_sync)
        DO UPDATE SET date_sync = EXCLUDED.date_sync
    `;
    try {
        await pool.query(query, [office, master]);
        logInfo(`upsertSyncModel OK — office: ${office}, master: ${master}`);
    } catch (err) {
        logError(`upsertSyncModel ERROR: ${err.message}`);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUK — tabel pot_prodmast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua produk berdasarkan warehouse (office).
 * Kolom dikembalikan sesuai kebutuhan frontend.
 *
 * @param {string} office
 * @returns {Promise<Array>}
 */
const getProdukModel = async (office) => {
    const query = `
        SELECT
            cat_cod, prdcd, prd_desc, singkat, desc2, merk, nama,
            kemasan, prd_size, frac, unit,
            acost, rcost, lcost,
            div, ctgr, supco, ptag, upd_date
        FROM  pot_prodmast
        WHERE ware_house = $1
        ORDER BY prdcd ASC
    `;
    try {
        const result = await pool.query(query, [office]);
        logInfo(`getProdukModel OK — office: ${office}, rows: ${result.rows.length}`);
        return result.rows;
    } catch (err) {
        logError(`getProdukModel ERROR: ${err.message}`);
        throw err;
    }
};

/**
 * Batch UPSERT produk dari baris CSV ke tabel pot_prodmast.
 * Menggunakan ON CONFLICT (prdcd) karena prdcd adalah PRIMARY KEY.
 *
 * Alur per baris:
 *   - prdcd belum ada → INSERT baru
 *   - prdcd sudah ada → UPDATE semua kolom kecuali prdcd
 *
 * @param {Array<Record<string,string>>} csvRows - baris mentah dari parseCsvBuffer
 * @param {string}                       office  - kode office/warehouse
 * @returns {Promise<{ inserted: number, updated: number, skipped: number }>}
 */
const upsertProdukFromCsv = async (csvRows, office) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let inserted = 0,
            updated = 0,
            skipped = 0;

        for (const raw of csvRows) {
            const rec = mapProdukRow(raw, office);

            // Skip baris tanpa prdcd (primary key wajib ada)
            if (!rec.prdcd) {
                skipped++;
                continue;
            }

            const cols = Object.keys(rec);
            const vals = Object.values(rec);
            const params = cols.map((_, i) => `$${i + 1}`).join(", ");

            // SET clause: update semua kolom kecuali prdcd (conflict target / PK)
            const setCols = cols
                .filter((c) => c !== "prdcd")
                .map((c) => `${c} = EXCLUDED.${c}`)
                .join(", ");

            const sql = `
                INSERT INTO pot_prodmast (${cols.join(", ")})
                VALUES (${params})
                ON CONFLICT (prdcd) DO UPDATE
                SET ${setCols}
                RETURNING (xmax = 0) AS is_insert
            `;

            // xmax = 0 → INSERT baru, xmax > 0 → UPDATE baris lama
            const { rows } = await client.query(sql, vals);
            if (rows[0]?.is_insert) inserted++;
            else updated++;
        }

        await client.query("COMMIT");
        logInfo(`upsertProdukFromCsv OK — inserted:${inserted}, updated:${updated}, skipped:${skipped}`);
        return { inserted, updated, skipped };
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`upsertProdukFromCsv ERROR (rollback): ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER — tabel pot_supmast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua data supplier.
 * @returns {Promise<Array>}
 */
const getSupplierModel = async () => {
    const query = `
        SELECT supco, snama, salm, skota, telp_1, jadwal, up_date
        FROM   pot_supmast
        ORDER  BY supco ASC
    `;
    try {
        const result = await pool.query(query);
        logInfo(`getSupplierModel OK — rows: ${result.rows.length}`);
        return result.rows;
    } catch (err) {
        logError(`getSupplierModel ERROR: ${err.message}`);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCK — tabel pot_stmast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua data stock berdasarkan warehouse (office).
 * @param {string} office
 * @returns {Promise<Array>}
 */
const getStockModel = async (office) => {
    const query = `
        SELECT gudang, div, klpt, prdcd, max, min, qty, last_trans
        FROM   pot_stmast
        WHERE  gudang = $1
        ORDER  BY prdcd ASC
    `;
    try {
        const result = await pool.query(query, [office]);
        logInfo(`getStockModel OK — office: ${office}, rows: ${result.rows.length}`);
        return result.rows;
    } catch (err) {
        logError(`getStockModel ERROR: ${err.message}`);
        throw err;
    }
};

/**
 * Batch UPSERT supplier dari baris CSV ke tabel pot_supmast.
 * ON CONFLICT (supco) — supco adalah PRIMARY KEY.
 *
 * @param {Array<Record<string,string>>} csvRows
 * @returns {Promise<{ inserted: number, updated: number, skipped: number }>}
 */
const upsertSupplierFromCsv = async (csvRows) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let inserted = 0,
            updated = 0,
            skipped = 0;

        for (const raw of csvRows) {
            const rec = mapSupplierRow(raw);

            // Skip baris tanpa supco (PK wajib ada)
            if (!rec.supco) {
                skipped++;
                continue;
            }

            const cols = Object.keys(rec);
            const vals = Object.values(rec);
            const params = cols.map((_, i) => `$${i + 1}`).join(", ");

            const setCols = cols
                .filter((c) => c !== "supco")
                .map((c) => `${c} = EXCLUDED.${c}`)
                .join(", ");

            const sql = `
                INSERT INTO pot_supmast (${cols.join(", ")})
                VALUES (${params})
                ON CONFLICT (supco) DO UPDATE
                SET ${setCols}
                RETURNING (xmax = 0) AS is_insert
            `;

            const { rows } = await client.query(sql, vals);
            if (rows[0]?.is_insert) inserted++;
            else updated++;
        }

        await client.query("COMMIT");
        logInfo(`upsertSupplierFromCsv OK — inserted:${inserted}, updated:${updated}, skipped:${skipped}`);
        return { inserted, updated, skipped };
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`upsertSupplierFromCsv ERROR (rollback): ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Batch UPSERT stock dari baris CSV ke tabel pot_stmast.
 * ON CONFLICT (gudang, prdcd) — composite PK.
 *
 * @param {Array<Record<string,string>>} csvRows
 * @param {string}                       office
 * @returns {Promise<{ inserted: number, updated: number, skipped: number }>}
 */
const upsertStockFromCsv = async (csvRows, office) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let inserted = 0,
            updated = 0,
            skipped = 0;

        for (const raw of csvRows) {
            const rec = mapStockRow(raw, office);

            // Skip baris tanpa gudang, lokasi atau prdcd (ketiganya bagian PK)
            if (!rec.gudang || !rec.lokasi || !rec.prdcd) {
                skipped++;
                continue;
            }

            const cols = Object.keys(rec);
            const vals = Object.values(rec);
            const params = cols.map((_, i) => `$${i + 1}`).join(", ");

            const setCols = cols
                .filter((c) => c !== "gudang" && c !== "lokasi" && c !== "prdcd")
                .map((c) => `${c} = EXCLUDED.${c}`)
                .join(", ");

            const sql = `
                INSERT INTO pot_stmast (${cols.join(", ")})
                VALUES (${params})
                ON CONFLICT (gudang, lokasi, prdcd) DO UPDATE
                SET ${setCols}
                RETURNING (xmax = 0) AS is_insert
            `;

            const { rows } = await client.query(sql, vals);
            if (rows[0]?.is_insert) inserted++;
            else updated++;
        }

        await client.query("COMMIT");
        logInfo(`upsertStockFromCsv OK — inserted:${inserted}, updated:${updated}, skipped:${skipped}`);
        return { inserted, updated, skipped };
    } catch (err) {
        await client.query("ROLLBACK");
        logError(`upsertStockFromCsv ERROR (rollback): ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    // sync
    getSyncModel,
    upsertSyncModel,
    // produk
    getProdukModel,
    upsertProdukFromCsv,
    // supplier
    getSupplierModel,
    upsertSupplierFromCsv,
    // stock
    getStockModel,
    upsertStockFromCsv,
};
