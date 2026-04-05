const express = require("express");
const ProductController = require("../../../controllers/mobile/productATKController");

const productATKRoute = express.Router();

// GET /api-wmsmobile/atk/products
productATKRoute.get("/", ProductController.index);

// GET /api-wmsmobile/atk/products/categories
productATKRoute.get("/categories", ProductController.categories);

// GET /api-wmsmobile/atk/products/:prdcd
productATKRoute.get("/:prdcd", ProductController.show);

module.exports = productATKRoute;
