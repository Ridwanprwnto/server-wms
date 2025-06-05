const { checkIDModel } = require('../models/userModel');
const { readJenisModel, checkJenisModel, createJenisModel }  = require('../models/jenisModel');

const createJenisController = async (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of items.' });
    }
    
    const seen = new Set();
    for (const item of data) {
        const identifier = `${item.CTG_ITEM}-${item.JNS_CODE}`;
        if (seen.has(identifier)) {
            return res.status(409).json({ message: `Duplicate entry found for CTG_ITEM: ${item.CTG_ITEM} and JNS_CODE: ${item.JNS_CODE}` });
        }
        seen.add(identifier);
    }
    
    try {
        const isDuplicate = await checkJenisModel(data);
        if (isDuplicate) {
            return res.status(409).json({ message: 'Duplicate entry found in the database for one or more items.' });
        }

        await createJenisModel(data);
        res.status(200).json({ message: 'Save jenis successful' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const readJenisController = async (req, res) => {
    try {
        const DataUser = await checkIDModel(req.userId);
        if (!DataUser) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const jenis = await readJenisModel();
        const resResults = jenis.map(item => ({
            id: item.id_jenis,
            JNS_CODE: item.code_jenis,
            JNS_NAME: item.name_jenis
        }));
        res.status(200).json(resResults);
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

module.exports = {
    readJenisController,
    createJenisController,
};