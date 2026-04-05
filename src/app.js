// app.js
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const webRoute = require("./routers/web/index");
const mobileRoute = require("./routers/mobile/index");
const { logger } = require("./utils/logger");
const setupCors = require("./middleware/corsConfig");

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    res.setHeader("X-Powered-By", "Express");
    next();
});

// Middleware: CORS
app.use(setupCors());

// Middleware: JSON Parser
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Root static page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use(process.env.PATH_API, webRoute);
app.use(process.env.PATH_API_MOBILE, mobileRoute);

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
