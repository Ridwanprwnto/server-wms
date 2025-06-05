const express = require('express');
const { createCategoryController, readCategoryController, updateCategoryController, deleteCategoryController } = require('../controllers/categoryController');
const router = express.Router();

router.post('/create', createCategoryController);
router.get('/read', readCategoryController);
router.post('/update', updateCategoryController);
router.post('/delete', deleteCategoryController);

module.exports = router;