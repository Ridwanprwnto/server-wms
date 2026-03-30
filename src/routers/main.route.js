const express = require("express");
const moduleMasterATK = require("./modules/master-atk.route.js");
const modulePlanogramATK = require("./modules/planogram-atk.route.js");
const moduleStockATK = require("./modules/stock-atk.route.js");

const mainRouter = express.Router();

mainRouter.use("/atk/master", moduleMasterATK);
mainRouter.use("/atk/planogram", modulePlanogramATK);
mainRouter.use("/atk/stocks", moduleStockATK);

module.exports = mainRouter;
