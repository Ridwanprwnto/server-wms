const { checkNIKUserModel, registUserModel } = require('../models/registModel');
const bcrypt = require('bcrypt');

const registController = async (req, res) => {
    const { nik, nickname, password, email } = req.body;

    try {
        const existingUsers = await checkNIKUserModel(nik, nickname);

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'NIK or Username is already registered!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await registUserModel(nik, nickname, email, hashedPassword);

        res.status(201).json({ message: 'Register successful' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    registController,
};