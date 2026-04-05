const express = require("express");
const moduleDashboardATK  = require("./modules/dashboard-atk.route.js");
const moduleProductATK    = require("./modules/product-atk.route.js");
const moduleOpnameATK     = require("./modules/opname-atk.route.js");
const modulePlanogramATK  = require("./modules/planogram-atk.route.js");

const mainRouter = express.Router();

// /api-wmsmobile/main/atk/dashboard
mainRouter.use("/atk/dashboard", moduleDashboardATK);

// /api-wmsmobile/main/atk/products
mainRouter.use("/atk/products", moduleProductATK);

// /api-wmsmobile/main/atk/opname
mainRouter.use("/atk/opname", moduleOpnameATK);

// /api-wmsmobile/main/atk/planogram
mainRouter.use("/atk/planogram", modulePlanogramATK);

module.exports = mainRouter;
