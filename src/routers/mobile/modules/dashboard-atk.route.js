const express = require("express");
const OpnameController = require("../../../controllers/mobile/opnameATKController");

const dashboardATKRoute = express.Router();

// GET /api-wmsmobile/atk/dashboard/summary
dashboardATKRoute.get("/summary", OpnameController.dashboardSummary);

module.exports = dashboardATKRoute;
