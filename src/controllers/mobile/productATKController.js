// src/controllers/mobile/productATKController.js
// READ-ONLY controller — data produk diambil dari pot_prodmast (ERP)
"use strict";

const ProductModel = require("../../models/mobile/productATKModel");
const response = require("../../utils/response");
const { logError } = require("../../utils/logger");
const { parsePagination } = require("../../utils/pagination");

const ProductController = {
    /**
     * GET /api/mobile/products
     * List produk dengan paginasi dan filter.
     * Query params: page, limit, search, cat_cod
     */
    async index(req, res) {
        try {
            const { page, limit, offset } = parsePagination(req.query);
            const { search, cat_cod } = req.query;

            const { data, total } = await ProductModel.findAll({
                limit,
                offset,
                search: search || null,
                cat_cod: cat_cod || null,
            });

            return response.paginated(
                res,
                data,
                { page, limit, total },
                "Data produk berhasil dimuat"
            );
        } catch (err) {
            logError(`[Product] index error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * GET /api/mobile/products/categories
     * Daftar kategori produk (cat_cod distinct dari pot_prodmast).
     */
    async categories(req, res) {
        try {
            const data = await ProductModel.getCategories();
            return response.success(res, data, "Kategori berhasil dimuat");
        } catch (err) {
            logError(`[Product] categories error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * GET /api/mobile/products/:prdcd
     * Detail satu produk berdasarkan prdcd.
     */
    async show(req, res) {
        try {
            const { prdcd } = req.params;
            const product = await ProductModel.findByPrdcd(prdcd);
            if (!product) {
                return response.notFound(res, `Produk "${prdcd}" tidak ditemukan`);
            }
            return response.success(res, product, "Data produk berhasil dimuat");
        } catch (err) {
            logError(`[Product] show error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },
};

module.exports = ProductController;
