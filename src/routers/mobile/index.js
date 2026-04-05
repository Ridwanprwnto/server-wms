const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const main = require("./main.route");

const appRouter = express.Router();

// Base: /api-wmsmobile/main/atk/...
appRouter.use("/main", authMiddleware, main);

module.exports = appRouter;
