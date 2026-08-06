// src/models/mobile/sortingPoolModel.js
"use strict";

const { pool } = require("../../config/db");

const SortingPoolModel = {
    async checkHeaderExists(nopick) {
        const sql = `SELECT * FROM sorting_pool_header WHERE nopick = $1`;
        const result = await pool.query(sql, [nopick]);
        return result.rows.length > 0;
    },

    async saveSortingData(headerData, detailsData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert Header
            const headerSql = `
                INSERT INTO sorting_pool_header (nopick, no_urutsp, tglpic, toko, gate, tokoname, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'in_progress')
                ON CONFLICT (nopick) DO NOTHING
            `;
            await client.query(headerSql, [
                headerData.NoToko, 
                headerData.NO_URUTSP, 
                headerData.TglPic, 
                headerData.Toko, 
                headerData.Gate, 
                headerData.TOK_NAME
            ]);

            // Insert Details
            if (detailsData && detailsData.length > 0) {
                const detailSql = `
                    INSERT INTO sorting_pool_detail (nopick, zona, dusno, fpakai)
                    VALUES ($1, $2, $3, $4)
                `;
                for (const detail of detailsData) {
                    // Cek apakah dusno sudah ada untuk menghindari duplikat jika dipanggil berkali-kali
                    const checkDetail = await client.query(
                        `SELECT 1 FROM sorting_pool_detail WHERE nopick = $1 AND dusno = $2 LIMIT 1`,
                        [headerData.NoToko, detail.DusNo]
                    );
                    
                    if (checkDetail.rowCount === 0) {
                        await client.query(detailSql, [
                            headerData.NoToko,
                            detail.Zona,
                            detail.DusNo,
                            detail.FPakai
                        ]);
                    }
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getProgress(nopick) {
        const headerSql = `SELECT * FROM sorting_pool_header WHERE nopick = $1`;
        const detailSql = `SELECT * FROM sorting_pool_detail WHERE nopick = $1 ORDER BY dusno ASC`;

        const [headerRes, detailRes] = await Promise.all([
            pool.query(headerSql, [nopick]),
            pool.query(detailSql, [nopick])
        ]);

        if (headerRes.rows.length === 0) return null;

        return {
            header: headerRes.rows[0],
            details: detailRes.rows
        };
    },

    async updateScanStatus(nopick, dusno, user) {
        const sql = `
            UPDATE sorting_pool_detail 
            SET is_scanned = TRUE, scanned_at = CURRENT_TIMESTAMP, scanned_by = $3 
            WHERE nopick = $1 AND dusno = $2
            RETURNING *
        `;
        const result = await pool.query(sql, [nopick, dusno, user]);
        return result.rows[0];
    },

    async completeSortingProcess(nopick, user) {
        const sql = `
            UPDATE sorting_pool_header 
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP, completed_by = $2 
            WHERE nopick = $1
            RETURNING *
        `;
        const result = await pool.query(sql, [nopick, user]);
        return result.rows[0];
    }
};

module.exports = SortingPoolModel;
