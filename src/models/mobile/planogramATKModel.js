// src/models/mobile/planogramATKModel.js
// READ: pot_master_plano, pot_line_plano, pot_type_plano
// WRITE: pot_storage_plano (simpan/update produk di lokasi planogram)
"use strict";

const { pool } = require("../../config/db");

const PlanogramATKModel = {
    // =========================================================================
    // TYPE PLANOGRAM
    // =========================================================================

    /**
     * Ambil semua tipe planogram (RACK, FLOOR, dll.)
     */
    async findAllTypes() {
        const sql = `
            SELECT id_type_plano, name_type_plano
            FROM pot_type_plano
            ORDER BY name_type_plano ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    },

    // =========================================================================
    // MASTER PLANOGRAM (pot_master_plano)
    // =========================================================================

    /**
     * List semua master planogram dengan paginasi dan filter.
     * Filter: search (line_master_plano), type_id
     *
     * @param {{ limit, offset, search, type_id }} opts
     */
    async findAllMaster({ limit = 15, offset = 0, search = null, type_id = null }) {
        const params = [];
        const conditions = [];
        let idx = 1;

        if (search) {
            conditions.push(`m.line_master_plano ILIKE $${idx++}`);
            params.push(`%${search}%`);
        }
        if (type_id) {
            conditions.push(`m.head_id_type_plano = $${idx++}`);
            params.push(type_id);
        }

        const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

        const countSql = `
            SELECT COUNT(*)
            FROM pot_master_plano m
            ${where}
        `;
        const dataSql = `
            SELECT
                m.id_master_plano,
                m.line_master_plano,
                m.head_id_type_plano,
                t.name_type_plano,
                (SELECT COUNT(*) FROM pot_line_plano l WHERE l.head_id_master_plano = m.id_master_plano) AS total_lines
            FROM pot_master_plano m
            LEFT JOIN pot_type_plano t ON t.id_type_plano = m.head_id_type_plano
            ${where}
            ORDER BY m.line_master_plano ASC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;

        params.push(limit, offset);

        const [countRes, dataRes] = await Promise.all([
            pool.query(countSql, params.slice(0, -2)),
            pool.query(dataSql, params),
        ]);

        return {
            data: dataRes.rows,
            total: parseInt(countRes.rows[0].count),
        };
    },

    /**
     * Ambil detail satu master planogram beserta semua line (lokasi) miliknya.
     *
     * @param {number} id - id_master_plano
     */
    async findMasterById(id) {
        const masterSql = `
            SELECT
                m.id_master_plano,
                m.line_master_plano,
                m.head_id_type_plano,
                t.name_type_plano
            FROM pot_master_plano m
            LEFT JOIN pot_type_plano t ON t.id_type_plano = m.head_id_type_plano
            WHERE m.id_master_plano = $1
            LIMIT 1
        `;

        const linesSql = `
            SELECT
                l.id_plano,
                l.rack_plano,
                l.shelf_plano,
                l.cell_plano,
                l.loc_plano,
                (SELECT COUNT(*) FROM pot_storage_plano s WHERE s.head_id_plano = l.id_plano) AS total_storage
            FROM pot_line_plano l
            WHERE l.head_id_master_plano = $1
            ORDER BY
                l.rack_plano ASC NULLS LAST,
                l.shelf_plano ASC NULLS LAST,
                l.cell_plano ASC NULLS LAST,
                l.loc_plano ASC NULLS LAST
        `;

        const [masterRes, linesRes] = await Promise.all([
            pool.query(masterSql, [id]),
            pool.query(linesSql, [id]),
        ]);

        if (!masterRes.rows[0]) return null;

        return {
            ...masterRes.rows[0],
            lines: linesRes.rows,
        };
    },

    // =========================================================================
    // LINE PLANOGRAM (pot_line_plano)
    // =========================================================================

    /**
     * Ambil detail satu line planogram (lokasi) beserta storage produk-nya.
     *
     * @param {number} id - id_plano
     */
    async findLineById(id) {
        const lineSql = `
            SELECT
                l.id_plano,
                l.head_id_master_plano,
                l.rack_plano,
                l.shelf_plano,
                l.cell_plano,
                l.loc_plano,
                m.line_master_plano,
                t.name_type_plano
            FROM pot_line_plano l
            INNER JOIN pot_master_plano m ON m.id_master_plano = l.head_id_master_plano
            LEFT JOIN  pot_type_plano   t ON t.id_type_plano   = m.head_id_type_plano
            WHERE l.id_plano = $1
            LIMIT 1
        `;

        const storageSql = `
            SELECT
                s.id_str_plano,
                s.prdcd_str_plano AS prdcd,
                s.qty_str_plano   AS qty,
                s.date_str_plano  AS updated_at,
                p.nama,
                p.singkat,
                p.kemasan,
                p.unit,
                p.frac
            FROM pot_storage_plano s
            LEFT JOIN pot_prodmast p ON p.prdcd = s.prdcd_str_plano
            WHERE s.head_id_plano = $1
            ORDER BY s.prdcd_str_plano ASC
        `;

        const [lineRes, storageRes] = await Promise.all([
            pool.query(lineSql, [id]),
            pool.query(storageSql, [id]),
        ]);

        if (!lineRes.rows[0]) return null;

        return {
            ...lineRes.rows[0],
            storage: storageRes.rows,
        };
    },

    /**
     * Cari line planogram berdasarkan alamat lokasi.
     * Untuk RACK: master_id + rack + shelf + cell
     * Untuk FLOOR: master_id + loc
     *
     * @param {{ master_id, rack, shelf, cell, loc }} addr
     */
    async findLineByAddress({ master_id, rack, shelf, cell, loc }) {
        let sql, params;

        if (rack) {
            sql = `
                SELECT l.id_plano, l.rack_plano, l.shelf_plano, l.cell_plano, l.loc_plano,
                       m.line_master_plano, t.name_type_plano
                FROM pot_line_plano l
                INNER JOIN pot_master_plano m ON m.id_master_plano = l.head_id_master_plano
                LEFT JOIN  pot_type_plano   t ON t.id_type_plano   = m.head_id_type_plano
                WHERE l.head_id_master_plano       = $1
                  AND l.rack_plano                 = $2
                  AND COALESCE(l.shelf_plano, '')  = COALESCE($3, '')
                  AND COALESCE(l.cell_plano, '')   = COALESCE($4, '')
                LIMIT 1
            `;
            params = [master_id, rack, shelf || null, cell || null];
        } else {
            sql = `
                SELECT l.id_plano, l.rack_plano, l.shelf_plano, l.cell_plano, l.loc_plano,
                       m.line_master_plano, t.name_type_plano
                FROM pot_line_plano l
                INNER JOIN pot_master_plano m ON m.id_master_plano = l.head_id_master_plano
                LEFT JOIN  pot_type_plano   t ON t.id_type_plano   = m.head_id_type_plano
                WHERE l.head_id_master_plano = $1
                  AND l.loc_plano            = $2
                LIMIT 1
            `;
            params = [master_id, loc];
        }

        const result = await pool.query(sql, params);
        return result.rows[0] || null;
    },

    // =========================================================================
    // SEARCH BY ADDRESS (input bebas LINE+RAK+SHELF+CELL)
    // =========================================================================

    /**
     * Cari lokasi planogram berdasarkan input teks gabungan.
     * Mencari di line_master_plano, rack_plano, shelf_plano, cell_plano, loc_plano.
     * Mengembalikan lokasi beserta informasi produk yang terpasang (jika ada).
     *
     * @param {string} query - teks pencarian bebas
     * @param {number} limit
     */
    async searchByAddress(query, limit = 20) {
        const like = `%${query}%`;
        const sql = `
            SELECT
                l.id_plano,
                l.rack_plano,
                l.shelf_plano,
                l.cell_plano,
                l.loc_plano,
                m.line_master_plano,
                t.name_type_plano,
                (
                    SELECT COUNT(*)
                    FROM pot_storage_plano sp
                    WHERE sp.head_id_plano = l.id_plano
                ) AS total_storage,
                CONCAT_WS('-',
                    m.line_master_plano,
                    l.rack_plano,
                    l.shelf_plano,
                    l.cell_plano
                ) AS full_address
            FROM pot_line_plano   l
            INNER JOIN pot_master_plano m ON m.id_master_plano = l.head_id_master_plano
            LEFT  JOIN pot_type_plano   t ON t.id_type_plano   = m.head_id_type_plano
            WHERE
                m.line_master_plano ILIKE $1
                OR l.rack_plano     ILIKE $1
                OR l.shelf_plano    ILIKE $1
                OR l.cell_plano     ILIKE $1
                OR l.loc_plano      ILIKE $1
                OR CONCAT_WS('-', m.line_master_plano, l.rack_plano, l.shelf_plano, l.cell_plano) ILIKE $1
            ORDER BY m.line_master_plano ASC, l.rack_plano ASC NULLS LAST,
                     l.shelf_plano ASC NULLS LAST, l.cell_plano ASC NULLS LAST
            LIMIT $2
        `;
        const result = await pool.query(sql, [like, limit]);
        return result.rows;
    },

    // =========================================================================
    // STORAGE PLANOGRAM (pot_storage_plano)
    // Mobile dapat WRITE (upsert/delete) storage produk di suatu lokasi
    // =========================================================================

    /**
     * Upsert storage produk pada suatu lokasi planogram.
     * Jika prdcd sudah ada di lokasi tersebut → update qty.
     * Jika belum → insert baru.
     *
     * @param {{ id_plano, prdcd, qty }} data
     */
    async upsertStorage({ id_plano, prdcd, qty }) {
        // Cek apakah sudah ada record untuk kombinasi (head_id_plano, prdcd_str_plano)
        const checkSql = `
            SELECT id_str_plano
            FROM pot_storage_plano
            WHERE head_id_plano = $1 AND prdcd_str_plano = $2
            LIMIT 1
        `;
        const checkResult = await pool.query(checkSql, [id_plano, prdcd]);

        let result;
        if (checkResult.rows.length > 0) {
            // UPDATE jika sudah ada
            const updateSql = `
                UPDATE pot_storage_plano
                SET qty_str_plano  = $1,
                    date_str_plano = NOW()
                WHERE head_id_plano = $2 AND prdcd_str_plano = $3
                RETURNING
                    id_str_plano,
                    head_id_plano,
                    prdcd_str_plano AS prdcd,
                    qty_str_plano   AS qty,
                    date_str_plano  AS updated_at
            `;
            result = await pool.query(updateSql, [qty, id_plano, prdcd]);
        } else {
            // INSERT jika belum ada
            const insertSql = `
                INSERT INTO pot_storage_plano (head_id_plano, prdcd_str_plano, qty_str_plano, date_str_plano)
                VALUES ($1, $2, $3, NOW())
                RETURNING
                    id_str_plano,
                    head_id_plano,
                    prdcd_str_plano AS prdcd,
                    qty_str_plano   AS qty,
                    date_str_plano  AS updated_at
            `;
            result = await pool.query(insertSql, [id_plano, prdcd, qty]);
        }

        return result.rows[0];
    },

    /**
     * Hapus satu storage produk dari lokasi planogram.
     *
     * @param {number} id_str_plano
     */
    async deleteStorage(id_str_plano) {
        const sql = `
            DELETE FROM pot_storage_plano
            WHERE id_str_plano = $1
            RETURNING id_str_plano, prdcd_str_plano AS prdcd, head_id_plano
        `;
        const result = await pool.query(sql, [id_str_plano]);
        return result.rows[0] || null;
    },

    /**
     * Ambil satu record storage berdasarkan id_str_plano.
     *
     * @param {number} id_str_plano
     */
    async findStorageById(id_str_plano) {
        const sql = `
            SELECT
                s.id_str_plano,
                s.head_id_plano,
                s.prdcd_str_plano AS prdcd,
                s.qty_str_plano   AS qty,
                s.date_str_plano  AS updated_at,
                p.nama,
                p.singkat,
                p.unit
            FROM pot_storage_plano s
            LEFT JOIN pot_prodmast p ON p.prdcd = s.prdcd_str_plano
            WHERE s.id_str_plano = $1
            LIMIT 1
        `;
        const result = await pool.query(sql, [id_str_plano]);
        return result.rows[0] || null;
    },
};

module.exports = PlanogramATKModel;
