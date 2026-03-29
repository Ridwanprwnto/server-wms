// src/utils/upload.js
const multer = require("multer");

// Ekstensi & MIME type yang diizinkan
const ALLOWED_MIME = ["text/csv", "application/vnd.ms-excel", "text/plain"];
const ALLOWED_EXT = [".csv"];
const MAX_SIZE_MB = 10;

const upload = multer({
    storage: multer.memoryStorage(), // file disimpan di RAM, tidak ke disk

    limits: {
        fileSize: MAX_SIZE_MB * 1024 * 1024,
    },

    fileFilter: (_req, file, cb) => {
        const ext = "." + file.originalname.split(".").pop().toLowerCase();
        const ok = ALLOWED_MIME.includes(file.mimetype) || ALLOWED_EXT.includes(ext);

        if (ok) {
            cb(null, true);
        } else {
            cb(
                Object.assign(new Error(`Hanya file ${ALLOWED_EXT.join("/")} yang diizinkan.`), {
                    code: "INVALID_FILE_TYPE",
                }),
            );
        }
    },
});

module.exports = { upload };
