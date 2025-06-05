// src/models/userModel.js
const pool = require('../config/db');

const checkCategoryCodeModel = async (codeCategory, nameCategory) => {
    const query = 'SELECT * FROM tb_category WHERE code_category = $1 OR name_category = $2';
    const { rows } = await pool.query(query, [codeCategory, nameCategory]);
    return rows;
};

const createCategoryModel = async (codeCategory, nameCategory) => {
    const query = 'INSERT INTO tb_category (code_category, name_category) VALUES ($1, $2)';
    const { rows } = await pool.query(query, [codeCategory, nameCategory]);
    return rows;
};

const readCategoryModel = async () => {
    const query = 'SELECT * FROM tb_category';
    const { rows } = await pool.query(query);
    return rows;
};

const updateCategoryModel = async (id, CTG_CODE, CTG_NAME) => {
    const query = 'UPDATE tb_category SET code_category = $2, name_category = $3 WHERE id_category = $1 RETURNING *';
    const { rows } = await pool.query(query, [id, CTG_CODE, CTG_NAME]);
    return rows;
};

const deleteCategoryModel = async (id) => {
    const query = 'DELETE FROM tb_category WHERE id_category = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows;
};

module.exports = {
    checkCategoryCodeModel,
    createCategoryModel,
    readCategoryModel,
    updateCategoryModel,
    deleteCategoryModel,
};