// src/utils/csvValidator.js

// ─── Definisi kolom wajib per tipe upload ────────────────────────────────────
// Key  = nilai field "type" dari form upload
// Value = array kolom yang WAJIB ada di header CSV (lowercase)

const REQUIRED_COLUMNS = {
    produk: ["prdcd"], // minimal prdcd — kolom lain boleh kosong
    supplier: ["supco"], // kode supplier wajib
    stock: ["prdcd", "qty"], // kode produk & qty wajib
};

/**
 * Validasi apakah semua kolom wajib ada di baris pertama CSV.
 *
 * @param {Record<string, string>} sampleRow  - baris pertama hasil parseCsvBuffer
 * @param {"produk"|"supplier"|"stock"} type  - tipe upload
 * @returns {string[]}  array kolom yang hilang; kosong berarti valid
 *
 * @example
 * const missing = validateRequiredColumns(rows[0], "produk");
 * if (missing.length > 0) { ... } // kolom tidak lengkap
 */
function validateRequiredColumns(sampleRow, type) {
    const required = REQUIRED_COLUMNS[type] ?? [];
    const existing = Object.keys(sampleRow).map((k) => k.trim().toLowerCase());
    return required.filter((col) => !existing.includes(col));
}

/**
 * Cek apakah file CSV tidak kosong (ada minimal 1 baris data setelah header).
 *
 * @param {Array} rows
 * @returns {boolean}
 */
function isNotEmpty(rows) {
    return Array.isArray(rows) && rows.length > 0;
}

/**
 * Hitung statistik baris:
 *  - total   : jumlah baris di CSV
 *  - valid   : baris yang punya kolom kunci tidak kosong
 *  - invalid : baris yang kolom kuncinya kosong (akan di-skip)
 *
 * @param {Array<Record<string,string>>} rows
 * @param {string} keyColumn  - nama kolom kunci (lowercase), contoh: "prdcd"
 * @returns {{ total: number, valid: number, invalid: number }}
 */
function countRowStats(rows, keyColumn) {
    let valid = 0,
        invalid = 0;
    for (const row of rows) {
        const val = String(row[keyColumn] ?? "").trim();
        if (val) valid++;
        else invalid++;
    }
    return { total: rows.length, valid, invalid };
}

module.exports = {
    validateRequiredColumns,
    isNotEmpty,
    countRowStats,
    REQUIRED_COLUMNS,
};
