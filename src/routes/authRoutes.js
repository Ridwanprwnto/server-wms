const express = require('express');
const { authController } = require('../controllers/authController');
const { registController } = require('../controllers/registController');
const router = express.Router();

router.post('/login', authController);
router.post('/register', registController);

module.exports = router;