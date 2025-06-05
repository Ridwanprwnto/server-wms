const pool = require('../config/db');

const checkUserModel = async (username) => {
    const query = 'SELECT id_users, nik_users, name_users, email_users, password_users, role_id FROM tb_users WHERE name_users = $1';
    const { rows } = await pool.query(query, [username]);
    return rows;
};

const checkIDModel = async (id) => {
    const query = 'SELECT id_users, nik_users, name_users, email_users, password_users, role_id FROM tb_users WHERE id_users = $1';
    const { rows } = await pool.query(query, [id]);
    return rows;
};

module.exports = { 
    checkUserModel,
    checkIDModel,
};
