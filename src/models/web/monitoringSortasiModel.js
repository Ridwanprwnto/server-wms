"use strict";

const { pool } = require("../../config/db");

const MonitoringSortasiModel = {
    async getAllSortasiProgress(date) {
        if (!date) return [];

        const sql = `
            SELECT 
                h.nopick, 
                h.no_urutsp, 
                h.tglpic, 
                h.toko, 
                h.gate, 
                h.tokoname, 
                h.status,
                h.created_at,
                h.updated_at,
                COUNT(d.dusno) as total_containers,
                SUM(CASE WHEN d.is_scanned = TRUE THEN 1 ELSE 0 END) as scanned_containers
            FROM sorting_pool_header h
            LEFT JOIN sorting_pool_detail d ON h.nopick = d.nopick
            WHERE h.tglpic::DATE = $1::DATE
            GROUP BY h.nopick, h.no_urutsp, h.tglpic, h.toko, h.gate, h.tokoname, h.status, h.created_at, h.updated_at
            ORDER BY h.created_at DESC NULLS LAST, h.tglpic DESC, h.nopick DESC;
        `;
        const result = await pool.query(sql, [date]);
        return result.rows;
    }
};

module.exports = MonitoringSortasiModel;
