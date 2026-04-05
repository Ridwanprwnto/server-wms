const dotenv = require("dotenv");
dotenv.config();

const authMiddleware = (req, res, next) => {
    // Jika request datang dari Kong Gateway
    const consumer = req.headers["x-consumer-username"];
    
    if (consumer) {
        req.user = { username: consumer };
        return next();
    }

    // Jika request langsung dari frontend (via API Key)
    const authHeader = req.headers["authorization"] || req.headers["x-api-key"] || req.headers["apikey"];

    if (!authHeader) {
        return res.status(401).json({
            status: "error",
            message: "Akses tidak diizinkan. API key tidak ditemukan.",
        });
    }

    const apiKey = authHeader.startsWith("ApiKey ") ? authHeader.split(" ")[1] : authHeader;

    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({
            status: "error",
            message: "API key tidak valid.",
        });
    }

    // Jika valid, set user pseudo
    // Ambil username/role dari header custom jika dikirim manual oleh frontend
    req.user = { 
        username: req.headers["x-user-username"] || "frontend-client"
    };
    next();
};

module.exports = authMiddleware;
