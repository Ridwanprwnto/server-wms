const express = require('express');
const { readJenisController, createJenisController } = require('../controllers/jenisController');
const router = express.Router();

router.get('/read', readJenisController);
router.post('/create', createJenisController);

module.exports = router;