// src/utils/csvParser.js
const csv = require("csv-parser");
const { Readable } = require("stream");

/**
 * Parse buffer CSV menjadi array of row objects.
 *
 * Fitur:
 *  - Strip BOM (Byte Order Mark) dari Excel
 *  - Normalkan semua header ke lowercase & trim
 *  - Skip baris kosong
 *  - Separator dapat dikonfigurasi (default: pipe "|")
 *
 * @param {Buffer} buffer       - file buffer dari multer (req.file.buffer)
 * @param {string} [separator]  - karakter pemisah kolom, default "|"
 * @returns {Promise<Array<Record<string, string>>>}
 *
 * @example
 * const rows = await parseCsvBuffer(req.file.buffer, "|");
 * // rows[0] => { prdcd: "20092877", nama: "STRAW BIG FRAPPE", ... }
 */
async function parseCsvBuffer(buffer, separator = "|") {
    return new Promise((resolve, reject) => {
        const rows = [];

        // Konversi buffer ke string dan strip BOM jika ada
        const content = buffer.toString("utf-8").replace(/^\uFEFF/, "");

        Readable.from(content)
            .pipe(
                csv({
                    separator,
                    trim: true,
                    skipEmptyLines: true,
                    // Normalkan header: lowercase + trim spasi
                    mapHeaders: ({ header }) => header.trim().toLowerCase(),
                }),
            )
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve(rows))
            .on("error", (err) => reject(err));
    });
}

module.exports = { parseCsvBuffer };
