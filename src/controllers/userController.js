const { checkIDModel } = require('../models/userModel');
require('dotenv').config();

const userController = async (req, res) => {
    try {
        const user = await checkIDModel(req.userId);
        if (!user || user.length === 0) {
            return res.status(404).send({ message: 'User not found.' });
        }

        const foundUser  = user[0];
        res.status(200).json({
            id: foundUser.id_users,
            nik: foundUser.nik_users,
            name: foundUser.name_users,
            email: foundUser.email_users,
            role: foundUser.id_role
        });
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

module.exports = {
    userController,
};