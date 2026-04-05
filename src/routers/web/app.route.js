const express = require("express");
const moduleInfo = require("./modules/info.route");

const appRouter = express.Router();

appRouter.use("/info", moduleInfo);

module.exports = appRouter;
