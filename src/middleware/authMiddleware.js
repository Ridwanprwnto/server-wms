const dotenv = require("dotenv");
dotenv.config();

const authMiddleware = (req, res, next) => {
    // Jika request datang dari Kong Gateway (ada header X-Consumer)
    const Consumer = req.headers["x-consumer-username"];
    if (Consumer) {
        req.user = { username: Consumer };
        return next();
    }

    // Jika request langsung dari frontend (tanpa lewat Kong Gateway)
    const authHeader = req.headers["authorization"] || req.headers["x-api-key"] || req.headers["apikey"];

    if (!authHeader) {
        return res.status(401).json({
            status: "error",
            message: "Akses tidak diizinkan. API key tidak ditemukan.",
        });
    }

    // Support format: "ApiKey <key>" atau langsung "<key>"
    const apiKey = authHeader.startsWith("ApiKey ") ? authHeader.split(" ")[1] : authHeader;

    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({
            status: "error",
            message: "API key tidak valid.",
        });
    }

    // Jika valid, set user pseudo (karena tidak ada JWT decoding)
    req.user = { username: "frontend-client" };
    next();
};

module.exports = authMiddleware;
