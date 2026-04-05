// src/controllers/mobile/opnameATKController.js
"use strict";

const OpnameModel   = require("../../models/mobile/opnameATKModel");
const PlanogramModel = require("../../models/mobile/planogramATKModel");
const ProductModel  = require("../../models/mobile/productATKModel");
const response      = require("../../utils/response");
const { logError, logInfo } = require("../../utils/logger");

const OpnameController = {
    // =========================================================================
    // DASHBOARD
    // =========================================================================

    /**
     * GET /api-wmsmobile/main/atk/dashboard/summary
     * Mengembalikan 3 metric: total_product, total_lokasi_plano, total_produk_tanpa_plano
     */
    async dashboardSummary(req, res) {
        try {
            const data = await OpnameModel.getDashboardSummary();
            return response.success(res, data, "Summary berhasil dimuat");
        } catch (err) {
            logError(`[Opname] dashboardSummary error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    // =========================================================================
    // OPNAME ITEMS
    // =========================================================================

    /**
     * POST /api-wmsmobile/main/atk/opname/item
     * Body: { id_plano, prdcd, quantity }
     * Menyimpan/update qty opname di opname_items DAN sinkron ke pot_storage_plano.
     */
    async upsertItem(req, res) {
        try {
            const { id_plano, prdcd, quantity } = req.body;

            // Validasi input
            const errors = {};
            if (!id_plano)  errors.id_plano  = "id_plano wajib diisi";
            if (!prdcd)     errors.prdcd     = "prdcd wajib diisi";
            if (quantity === undefined || quantity === null || isNaN(Number(quantity)) || Number(quantity) < 0) {
                errors.quantity = "quantity wajib diisi dan tidak boleh negatif";
            }
            if (Object.keys(errors).length > 0) {
                return response.validationError(res, errors);
            }

            // Validasi lokasi planogram
            const line = await PlanogramModel.findLineById(parseInt(id_plano));
            if (!line) return response.notFound(res, "Lokasi planogram tidak ditemukan");

            // Validasi produk
            const product = await ProductModel.findByPrdcd(prdcd);
            if (!product) return response.notFound(res, `Produk "${prdcd}" tidak ditemukan`);

            // ─── Aturan bisnis: 1 lokasi planogram = 1 produk ────────────────
            // Cek apakah storage di lokasi ini sudah terisi produk lain.
            // Jika terisi dan bukan produk yang sama → tolak, minta kosongkan dulu.
            const existingStorage = line.storage || [];
            if (existingStorage.length > 0) {
                const occupiedPrdcd = existingStorage[0].prdcd;
                if (occupiedPrdcd !== prdcd) {
                    return response.error(
                        res,
                        `Lokasi ini sudah ditempati produk ${occupiedPrdcd}. ` +
                        `Kosongkan planogram terlebih dahulu sebelum memasang produk baru.`,
                        400
                    );
                }
            }
            // ─────────────────────────────────────────────────────────────────

            // Simpan ke opname_items (history)
            const item = await OpnameModel.upsertItem({
                id_plano:   parseInt(id_plano),
                prdcd,
                quantity:   quantity,
                created_by: req.user.username,
            });

            // Sinkron ke pot_storage_plano (qty aktual planogram)
            await PlanogramModel.upsertStorage({
                id_plano: parseInt(id_plano),
                prdcd,
                qty:      quantity,
            });

            logInfo(`[Opname] Item upserted: plano=${id_plano} prdcd=${prdcd} qty=${quantity} by ${req.user.username}`);
            return response.success(
                res,
                { ...item, nama: product.nama, singkat: product.singkat, unit: product.unit, frac: product.frac },
                "Item opname disimpan",
                201
            );
        } catch (err) {
            logError(`[Opname] upsertItem error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * GET /api-wmsmobile/main/atk/opname/items/:id_plano
     * Ambil semua item opname (history) berdasarkan lokasi planogram.
     * Juga mengembalikan data storage aktual (pot_storage_plano) dari PlanogramModel.
     */
    async getItemsByLinePlano(req, res) {
        try {
            const id_plano = parseInt(req.params.id_plano);

            // Detail lokasi
            const line = await PlanogramModel.findLineById(id_plano);
            if (!line) return response.notFound(res, "Lokasi planogram tidak ditemukan");

            // Items opname history
            const items = await OpnameModel.getItemsByLinePlano(id_plano);

            return response.success(res, { line, items }, "Data opname lokasi berhasil dimuat");
        } catch (err) {
            logError(`[Opname] getItemsByLinePlano error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * GET /api-wmsmobile/main/atk/opname/by-product/:prdcd
     * Ambil semua planogram & detail storage yang terpasang suatu produk/barang.
     */
    async getItemsByPrdcd(req, res) {
        try {
            const { prdcd } = req.params;

            // Cek produk ada
            const product = await ProductModel.findByPrdcd(prdcd);
            if (!product) return response.notFound(res, `Produk "${prdcd}" tidak ditemukan`);

            const rows = await OpnameModel.getItemsByPrdcd(prdcd);
            return response.success(res, { product, planograms: rows }, "Data planogram produk berhasil dimuat");
        } catch (err) {
            logError(`[Opname] getItemsByPrdcd error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * DELETE /api-wmsmobile/main/atk/opname/clear-plano/:id_plano
     * Kosongkan semua storage di lokasi planogram (hapus dari pot_storage_plano).
     */
    async clearStoragePlano(req, res) {
        try {
            const id_plano = parseInt(req.params.id_plano);

            const line = await PlanogramModel.findLineById(id_plano);
            if (!line) return response.notFound(res, "Lokasi planogram tidak ditemukan");

            const deleted = await OpnameModel.clearStoragePlano(id_plano);
            logInfo(`[Opname] Storage cleared: plano=${id_plano} (${deleted.length} items) by ${req.user.username}`);
            return response.success(res, { id_plano, deleted_count: deleted.length, deleted }, "Storage planogram dikosongkan");
        } catch (err) {
            logError(`[Opname] clearStoragePlano error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * PUT /api-wmsmobile/main/atk/opname/item/:itemId
     * Update qty item opname. Juga sinkron ke pot_storage_plano.
     */
    async updateItem(req, res) {
        try {
            const { quantity } = req.body;
            const updated = await OpnameModel.updateItem(parseInt(req.params.itemId), {
                quantity: quantity,
            });
            if (!updated) return response.notFound(res, "Item tidak ditemukan");

            // Sinkron ke pot_storage_plano
            await PlanogramModel.upsertStorage({
                id_plano: updated.id_plano,
                prdcd:    updated.prdcd,
                qty:      quantity,
            });

            return response.success(res, updated, "Item diperbarui");
        } catch (err) {
            logError(`[Opname] updateItem error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * DELETE /api-wmsmobile/main/atk/opname/item/:itemId
     * Hapus item opname dari history.
     */
    async deleteItem(req, res) {
        try {
            const deleted = await OpnameModel.deleteItem(parseInt(req.params.itemId));
            if (!deleted) return response.notFound(res, "Item tidak ditemukan");
            return response.success(res, null, "Item dihapus");
        } catch (err) {
            logError(`[Opname] deleteItem error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },
};

module.exports = OpnameController;
