// src/models/mobile/opnameATKModel.js
// Model untuk opname langsung (tanpa sesi) — menulis ke pot_storage_plano
// dan mencatat history ke opname_items.
"use strict";

const { pool } = require("../../config/db");

const OpnameATKModel = {
    // =========================================================================
    // DASHBOARD SUMMARY
    // =========================================================================

    /**
     * Ambil ringkasan: Total Produk, Total Lokasi Planogram, Total Produk Tanpa Planogram
     */
    async getDashboardSummary() {
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM pot_prodmast)                              AS total_product,
                (SELECT COUNT(*) FROM pot_line_plano)                            AS total_lokasi_plano,
                (
                    SELECT COUNT(*) FROM pot_prodmast p
                    WHERE NOT EXISTS (
                        SELECT 1 FROM pot_storage_plano sp
                        WHERE sp.prdcd_str_plano = p.prdcd
                    )
                )                                                                AS total_produk_tanpa_plano
        `;
        const result = await pool.query(sql);
        const row = result.rows[0];
        return {
            total_product:          parseInt(row.total_product),
            total_lokasi_plano:     parseInt(row.total_lokasi_plano),
            total_produk_tanpa_plano: parseInt(row.total_produk_tanpa_plano),
        };
    },

    // =========================================================================
    // OPNAME ITEMS (tabel: opname_items)
    // Digunakan untuk mencatat history opname per lokasi planogram
    // =========================================================================

    /**
     * Upsert item opname (history pencatatan qty per lokasi planogram).
     * Menggunakan manual check-then-insert/update agar tidak bergantung
     * pada keberadaan unique constraint (id_plano, prdcd) di database.
     */
    async upsertItem({ id_plano, prdcd, quantity, created_by }) {
        // Cek apakah sudah ada record untuk kombinasi ini
        const existing = await pool.query(
            `SELECT id FROM opname_items WHERE id_plano = $1 AND prdcd = $2 LIMIT 1`,
            [id_plano, prdcd]
        );

        if (existing.rows.length > 0) {
            // Update record yang sudah ada
            const sql = `
                UPDATE opname_items
                SET quantity = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
            `;
            const result = await pool.query(sql, [quantity, existing.rows[0].id]);
            return result.rows[0];
        } else {
            // Insert record baru
            const sql = `
                INSERT INTO opname_items (id_plano, prdcd, quantity, created_by)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await pool.query(sql, [id_plano, prdcd, quantity, created_by]);
            return result.rows[0];
        }
    },

    /**
     * Ambil semua item opname berdasarkan id_plano (lokasi planogram).
     * Berguna untuk menampilkan detail opname di suatu lokasi.
     */
    async getItemsByLinePlano(id_plano) {
        const sql = `
            SELECT
                oi.id,
                oi.id_plano,
                oi.prdcd,
                oi.quantity,
                oi.created_by,
                oi.created_at,
                oi.updated_at,
                p.nama,
                p.singkat,
                p.unit,
                p.kemasan,
                p.frac
            FROM opname_items oi
            LEFT JOIN pot_prodmast p ON p.prdcd = oi.prdcd
            WHERE oi.id_plano = $1
            ORDER BY oi.prdcd ASC
        `;
        const result = await pool.query(sql, [id_plano]);
        return result.rows;
    },

    /**
     * Ambil semua planogram (storage) yang terpasang suatu produk,
     * beserta data opname terbaru di tiap lokasi (jika ada).
     *
     * @param {string} prdcd
     */
    async getItemsByPrdcd(prdcd) {
        const sql = `
            SELECT
                sp.id_str_plano,
                sp.head_id_plano     AS id_plano,
                sp.prdcd_str_plano   AS prdcd,
                sp.qty_str_plano     AS qty_plano,
                sp.date_str_plano    AS last_updated,
                l.rack_plano,
                l.shelf_plano,
                l.cell_plano,
                l.loc_plano,
                m.line_master_plano,
                t.name_type_plano,
                p.nama,
                p.singkat,
                p.unit,
                p.frac,
                p.kemasan,
                oi.quantity          AS last_opname_qty,
                oi.created_by        AS last_opname_by,
                oi.updated_at        AS last_opname_at
            FROM pot_storage_plano sp
            INNER JOIN pot_line_plano   l ON l.id_plano            = sp.head_id_plano
            INNER JOIN pot_master_plano m ON m.id_master_plano      = l.head_id_master_plano
            LEFT  JOIN pot_type_plano   t ON t.id_type_plano        = m.head_id_type_plano
            LEFT  JOIN pot_prodmast     p ON p.prdcd                = sp.prdcd_str_plano
            LEFT  JOIN opname_items    oi ON oi.id_plano            = sp.head_id_plano
                                        AND oi.prdcd               = sp.prdcd_str_plano
            WHERE sp.prdcd_str_plano = $1
            ORDER BY m.line_master_plano ASC, l.rack_plano ASC NULLS LAST
        `;
        const result = await pool.query(sql, [prdcd]);
        return result.rows;
    },

    /**
     * Kosongkan semua storage (pot_storage_plano) di suatu lokasi planogram.
     * Digunakan ketika user menekan tombol "Kosongkan" pada suatu alamat plano.
     *
     * @param {number} id_plano
     */
    async clearStoragePlano(id_plano) {
        const sql = `
            DELETE FROM pot_storage_plano
            WHERE head_id_plano = $1
            RETURNING id_str_plano, prdcd_str_plano AS prdcd
        `;
        const result = await pool.query(sql, [id_plano]);
        return result.rows;
    },

    /**
     * Update satu item opname.
     */
    async updateItem(item_id, { quantity }) {
        const sql = `
            UPDATE opname_items
            SET quantity = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(sql, [quantity, item_id]);
        return result.rows[0] || null;
    },

    /**
     * Hapus satu item opname.
     */
    async deleteItem(item_id) {
        const sql = `DELETE FROM opname_items WHERE id = $1 RETURNING id`;
        const result = await pool.query(sql, [item_id]);
        return result.rows[0] || null;
    },
};

module.exports = OpnameATKModel;
