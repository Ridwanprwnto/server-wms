const { checkUserModel } = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const authController = async (req, res) => {
    const encryptedData = req.body.data;
    if (!encryptedData) {
        return res.status(400).json({ message: 'Missing encrypted data' });
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, process.env.SECRET_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) {
            return res.status(400).json({ message: 'Failed to decrypt data' });
        }

        const { username, password } = JSON.parse(decryptedString);

        const user = await checkUserModel(username);
        if (!user || user.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const foundUser  = user[0];
        const isPasswordValid = await bcrypt.compare(password, foundUser.password_users);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Wrong Password' });
        }

        const token = jwt.sign(
            { id: foundUser.id_users, username: foundUser.name_users },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: foundUser.id_users,
                nik: foundUser.nik_users,
                name: foundUser.name_users,
                email: foundUser.email_users,
                role: foundUser.role_id
            },
            token
        });
    } catch (err) {
        console.error('Error during registration:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { 
    authController,
};