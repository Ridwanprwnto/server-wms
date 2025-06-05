// src/models/userModel.js
const pool = require('../config/db');

const readJenisModel = async () => {
    const query = 'SELECT * FROM tb_jenis';
    const { rows } = await pool.query(query);
    return rows;
};

const checkJenisModel = async (data) => {
    const checkQuery = 'SELECT * FROM tb_jenis WHERE fk_code_category = $1 AND code_jenis = $2';
    
    for (const item of data) {
        const { CTG_ITEM, JNS_CODE } = item;

        const { rows: existingRows } = await pool.query(checkQuery, [CTG_ITEM, JNS_CODE]);
        if (existingRows.length > 0) {
            return true;
        }
    }
    return false;
};

const createJenisModel = async (data) => {
    const query = 'INSERT INTO tb_jenis (fk_code_category, code_jenis, name_jenis, desc_jenis) VALUES ($1, $2, $3, $4) RETURNING *';
    const results = [];

    for (const item of data) {
        const { CTG_ITEM, JNS_CODE, JNS_ITEM, DSC_ITEM } = item;
        const { rows } = await pool.query(query, [CTG_ITEM, JNS_CODE, JNS_ITEM, DSC_ITEM]);
        results.push(rows[0]);
    }
    return results; 
};

module.exports = {
    readJenisModel,
    checkJenisModel,
    createJenisModel
};