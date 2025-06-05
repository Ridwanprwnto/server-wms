const { checkIDModel } = require('../models/userModel');
const { checkCategoryCodeModel, createCategoryModel, readCategoryModel, updateCategoryModel, deleteCategoryModel }  = require('../models/categoryModel');

const createCategoryController = async (req, res) => {
    const { codeCategory, nameCategory } = req.body;

    try {
        const existingCategory = await checkCategoryCodeModel(codeCategory, nameCategory);

        if (existingCategory.length > 0) {
            return res.status(409).json({ error: 'Category code is already registered!' });
        }

        await createCategoryModel(codeCategory, nameCategory);

        res.status(200).json({ message: 'Save category successful' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const readCategoryController = async (req, res) => {
    try {
        const DataUser = await checkIDModel(req.userId);
        if (!DataUser) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const categories = await readCategoryModel();
        const resResults = categories.map(item => ({
            id: item.id_category,
            CTG_CODE: item.code_category,
            CTG_NAME: item.name_category
        }));
        res.status(200).json(resResults);
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

const updateCategoryController = async (req, res) => {
    const { id, CTG_CODE, CTG_NAME } = req.body;

    try {
        await updateCategoryModel(id, CTG_CODE, CTG_NAME);

        res.status(200).json({ message: 'Update category successful' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteCategoryController = async (req, res) => {
    const { id, CTG_CODE, CTG_NAME } = req.body;

    try {
        const deletedCategory = await deleteCategoryModel(id);
        if (deletedCategory.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json({ message: 'Delete category successful' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createCategoryController,
    readCategoryController,
    updateCategoryController,
    deleteCategoryController,
};