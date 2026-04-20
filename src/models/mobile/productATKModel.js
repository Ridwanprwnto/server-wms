// src/models/mobile/productATKModel.js
// READ-ONLY — data produk bersumber dari pot_prodmast (sync ERP via CSV)
"use strict";

const { pool } = require("../../config/db");

const ProductATKModel = {
    /**
     * Get products dengan pagination dan filter.
     * Kolom search: prdcd, nama, singkat
     * Filter: cat_cod (kategori)
     *
     * @param {{ limit, offset, search, cat_cod }} opts
     */
    async findAll({ limit = 15, offset = 0, search = null, cat_cod = null }) {
        const params = [];
        const conditions = [];
        let idx = 1;

        if (search) {
            conditions.push(
                `(prdcd ILIKE $${idx} OR nama ILIKE $${idx} OR singkat ILIKE $${idx} OR desc2 ILIKE $${idx})`
            );
            params.push(`%${search}%`);
            idx++;
        }
        if (cat_cod) {
            conditions.push(`cat_cod = $${idx++}`);
            params.push(cat_cod);
        }

        const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

        const countSql = `SELECT COUNT(*) FROM pot_prodmast ${where}`;
        const dataSql = `
            SELECT
                prdcd, nama, singkat, desc2, merk, kemasan, prd_size,
                frac, unit, cat_cod, div, ctgr, supco,
                acost, rcost, lcost, upd_date
            FROM pot_prodmast
            ${where}
            ORDER BY prdcd ASC
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
     * Cari produk berdasarkan prdcd (primary key bisnis).
     * Juga mengambil info stok dari pot_stmast (jika ada).
     *
     * @param {string} prdcd
     */
    async findByPrdcd(prdcd) {
        const sql = `
            SELECT
                p.prdcd, p.nama, p.singkat, p.desc2, p.merk,
                p.kemasan, p.prd_size, p.frac, p.unit,
                p.cat_cod, p.div, p.ctgr, p.supco,
                p.acost, p.rcost, p.lcost, p.upd_date,
                s.qty AS stock_qty
            FROM pot_prodmast p
            LEFT JOIN pot_stmast s ON s.prdcd = p.prdcd
            WHERE p.prdcd = $1
            LIMIT 1
        `;
        const result = await pool.query(sql, [prdcd]);
        return result.rows[0] || null;
    },

    /**
     * Ambil daftar kategori produk yang tersedia (distinct cat_cod).
     */
    async getCategories() {
        const sql = `
            SELECT DISTINCT cat_cod
            FROM pot_prodmast
            WHERE cat_cod IS NOT NULL
            ORDER BY cat_cod ASC
        `;
        const result = await pool.query(sql);
        return result.rows.map((r) => r.cat_cod);
    },
};

module.exports = ProductATKModel;
