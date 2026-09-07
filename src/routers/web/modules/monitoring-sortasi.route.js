const express = require('express');
const router = express.Router();
const MonitoringSortasiController = require('../../../controllers/web/monitoringSortasiController');

// Optional: you can add authentication middleware here if required by web routes
// const { verifyToken } = require('../../../middleware/auth');

router.get('/', MonitoringSortasiController.getProgress);
router.get('/:nopick/details', MonitoringSortasiController.getDetails);

/**
 * Reset status pemakaian container (fscanfraction) menjadi 0.
 * PUT /main/sortasi/monitoring/:nopick/reset-container
 */
router.put('/:nopick/reset-container', MonitoringSortasiController.resetContainer);

module.exports = router;
