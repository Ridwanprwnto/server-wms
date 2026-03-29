const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const app = require("./app.route");
// const auth = require("./auth.route.js");
const main = require("./main.route");

const appRouter = express.Router();

appRouter.use("/app", app);
// appRouter.route("/auth", auth);
appRouter.use("/main", authMiddleware, main);

module.exports = appRouter;
