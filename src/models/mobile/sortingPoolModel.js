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
                INSERT INTO sorting_pool_header (nopick, no_urutsp, tglpic, toko, gate, tokoname, status, fscanfraction, floading)
                VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, $8)
                ON CONFLICT (nopick) DO NOTHING
            `;
            const fscanValue = (headerData.fscanfraction === true || headerData.fscanfraction === 'true' || headerData.fscanfraction == 1) ? 1 : 0;
            const floadingValue = (headerData.floading === true || headerData.floading === 'true' || headerData.floading == 1) ? 1 : 0;
            
            await client.query(headerSql, [
                headerData.NoToko, 
                headerData.NO_URUTSP, 
                headerData.TglPic, 
                headerData.Toko, 
                headerData.Gate, 
                headerData.TOK_NAME,
                fscanValue,
                floadingValue
            ]);

            // Insert Details (Optimized Bulk Insert)
            if (detailsData && detailsData.length > 0) {
                // Ambil daftar dusno yang sudah ada untuk nopick ini
                const existingRes = await client.query(
                    `SELECT dusno FROM sorting_pool_detail WHERE nopick = $1`,
                    [headerData.NoToko]
                );
                const existingDusno = new Set(existingRes.rows.map(r => r.dusno));

                const values = [];
                const params = [];
                let paramIndex = 1;

                for (const detail of detailsData) {
                    if (!existingDusno.has(detail.DusNo)) {
                        values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                        params.push(headerData.NoToko, detail.Zona, detail.DusNo, detail.FPakai);
                    }
                }

                if (values.length > 0) {
                    const detailSql = `
                        INSERT INTO sorting_pool_detail (nopick, zona, dusno, fpakai)
                        VALUES ${values.join(', ')}
                    `;
                    await client.query(detailSql, params);
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
    },

    async syncContainers(nopick, headerData, detailsData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update fscanfraction dan floading jika headerData tersedia
            if (headerData) {
                const updateFields = [];
                const updateParams = [];
                let pIdx = 1;

                if (headerData.fscanfraction !== undefined) {
                    const fscanValue = (headerData.fscanfraction === true || headerData.fscanfraction === 'true' || headerData.fscanfraction == 1) ? 1 : 0;
                    updateFields.push(`fscanfraction = $${pIdx++}`);
                    updateParams.push(fscanValue);
                }

                if (headerData.floading !== undefined) {
                    const floadingValue = (headerData.floading === true || headerData.floading === 'true' || headerData.floading == 1) ? 1 : 0;
                    updateFields.push(`floading = $${pIdx++}`);
                    updateParams.push(floadingValue);
                }

                if (updateFields.length > 0) {
                    updateParams.push(nopick);
                    await client.query(
                        `UPDATE sorting_pool_header SET ${updateFields.join(', ')} WHERE nopick = $${pIdx}`,
                        updateParams
                    );
                }
            }

            if (detailsData && detailsData.length > 0) {
                // Ambil daftar dusno yang sudah ada untuk nopick ini
                const existingRes = await client.query(
                    `SELECT dusno FROM sorting_pool_detail WHERE nopick = $1`,
                    [nopick]
                );
                const existingDusno = new Set(existingRes.rows.map(r => r.dusno));

                const values = [];
                const params = [];
                let paramIndex = 1;

                for (const detail of detailsData) {
                    if (!existingDusno.has(detail.DusNo)) {
                        values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                        params.push(nopick, detail.Zona, detail.DusNo, detail.FPakai);
                    }
                }

                if (values.length > 0) {
                    const detailSql = `
                        INSERT INTO sorting_pool_detail (nopick, zona, dusno, fpakai)
                        VALUES ${values.join(', ')}
                    `;
                    await client.query(detailSql, params);
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = SortingPoolModel;
