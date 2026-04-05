// handlers/serverInfo.js
const { logInfo } = require("../../utils/logger");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const getServerInfo = async (req, res) => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../package.json"), "utf8"));

    const serverInfo = {
        webServer: process.env.WEB_SERVER || "Express",
        backendVersion: packageJson.dependencies.express,
        nodeVersion: process.version,
        developer: packageJson.author,
        website: process.env.PERSONAL_WEB,
    };

    logInfo(`API ${process.env.PATH_API + "/app/info"} accessed`);
    res.json(serverInfo);
};

module.exports = {
    getServerInfo,
};
