// src/models/registModel.js
const pool = require('../config/db');

const checkNIKUserModel =  async (nik, nickname) => {
    const query = 'SELECT * FROM tb_users WHERE nik_users = $1 OR name_users = $2';
    const { rows } = await pool.query(query, [nik, nickname]);
    return rows;
};

const registUserModel = async (nik, nickname, email, password) => {
    const query = 'INSERT INTO tb_users (nik_users, name_users, email_users, password_users) VALUES ($1, $2, $3, $4)';
    const { rows } = await pool.query(query, [nik, nickname, email, password]);
    return rows;
};

module.exports = {
    checkNIKUserModel,
    registUserModel,
};