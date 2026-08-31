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

    /**
     * Ambil progress/status terkini untuk satu nopick.
     * Menyertakan data count_log (riwayat input jumlah container).
     */
    async getProgress(nopick) {
        const headerSql  = `SELECT * FROM sorting_pool_header WHERE nopick = $1`;
        const detailSql  = `SELECT * FROM sorting_pool_detail WHERE nopick = $1 ORDER BY dusno ASC`;
        const countLogSql = `
            SELECT
                COALESCE(SUM(jumlah), 0)  AS total_sorted,
                COUNT(*)                   AS batch_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id',         id,
                            'jumlah',     jumlah,
                            'scanned_at', scanned_at,
                            'scanned_by', scanned_by
                        ) ORDER BY id ASC
                    ) FILTER (WHERE id IS NOT NULL),
                    '[]'::json
                ) AS logs
            FROM sorting_pool_count_log
            WHERE nopick = $1
        `;

        const [headerRes, detailRes, countLogRes] = await Promise.all([
            pool.query(headerSql,   [nopick]),
            pool.query(detailSql,   [nopick]),
            pool.query(countLogSql, [nopick])
        ]);

        if (headerRes.rows.length === 0) return null;

        const cl = countLogRes.rows[0];
        return {
            header:    headerRes.rows[0],
            details:   detailRes.rows,
            count_log: {
                total_sorted: parseInt(cl.total_sorted, 10) || 0,
                batch_count:  parseInt(cl.batch_count,  10) || 0,
                logs:         cl.logs || []
            }
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
    },

    /**
     * Scan sejumlah N container sekaligus (count-based sorting).
     *
     * LOGIKA BARU:
     *   - Tidak mengubah tabel sorting_pool_detail sama sekali.
     *   - INSERT satu baris baru ke sorting_pool_count_log per pemanggilan.
     *   - Validasi: SUM(jumlah) yang sudah ada + count_baru <= total detail.
     *
     * @param {string} nopick
     * @param {number} count   - jumlah container yang disortir dalam satu batch
     * @param {string} user
     * @returns {{ updated: number, currentSum: number, totalDetail: number } | null}
     *   null jika count melebihi sisa yang belum disortir
     */
    async scanByCount(nopick, count, user) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Hitung total container yang terdaftar di detail
            const totalRes = await client.query(
                `SELECT COUNT(*) AS total FROM sorting_pool_detail WHERE nopick = $1`,
                [nopick]
            );
            const totalDetail = parseInt(totalRes.rows[0].total, 10);

            // 2. Hitung jumlah yang sudah diinput via count_log
            const sumRes = await client.query(
                `SELECT COALESCE(SUM(jumlah), 0) AS current_sum
                 FROM sorting_pool_count_log WHERE nopick = $1`,
                [nopick]
            );
            const currentSum = parseInt(sumRes.rows[0].current_sum, 10);

            // 3. Tolak jika melampaui total
            if (currentSum + count > totalDetail) {
                await client.query('ROLLBACK');
                return null;
            }

            // 4. INSERT baris baru ke count_log
            const insertRes = await client.query(
                `INSERT INTO sorting_pool_count_log (nopick, jumlah, scanned_by)
                 VALUES ($1, $2, $3)
                 RETURNING id, jumlah, scanned_at, scanned_by`,
                [nopick, count, user]
            );

            await client.query('COMMIT');
            return {
                updated:     count,
                currentSum:  currentSum + count,
                totalDetail: totalDetail,
                log_entry:   insertRes.rows[0]
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = SortingPoolModel;
