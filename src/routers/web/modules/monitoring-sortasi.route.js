const express = require('express');
const router = express.Router();
const MonitoringSortasiController = require('../../../controllers/web/monitoringSortasiController');

// Optional: you can add authentication middleware here if required by web routes
// const { verifyToken } = require('../../../middleware/auth');

router.get('/', MonitoringSortasiController.getProgress);
router.get('/:nopick/details', MonitoringSortasiController.getDetails);

module.exports = router;
