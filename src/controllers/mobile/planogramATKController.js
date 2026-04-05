// src/controllers/mobile/planogramATKController.js
// READ : master planogram, line planogram
// WRITE: storage produk di lokasi planogram (pot_storage_plano)
"use strict";

const PlanogramModel = require("../../models/mobile/planogramATKModel");
const ProductModel = require("../../models/mobile/productATKModel");
const response = require("../../utils/response");
const { logError, logInfo } = require("../../utils/logger");
const { parsePagination } = require("../../utils/pagination");

const PlanogramController = {
    // =========================================================================
    // TYPE
    // =========================================================================

    /**
     * GET /api/mobile/planogram/types
     * Daftar tipe planogram (RACK, FLOOR, dll.)
     */
    async types(req, res) {
        try {
            const data = await PlanogramModel.findAllTypes();
            return response.success(res, data, "Tipe planogram berhasil dimuat");
        } catch (err) {
            logError(`[Planogram] types error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    // =========================================================================
    // SEARCH BY ADDRESS
    // =========================================================================

    /**
     * GET /api-wmsmobile/main/atk/planogram/search?q=A01
     * Cari lokasi planogram berdasarkan teks bebas (LINE+RAK+SHELF+CELL).
     * Query params: q (wajib), limit (opsional, default 20)
     */
    async searchByAddress(req, res) {
        try {
            const { q, limit } = req.query;
            if (!q || q.trim().length === 0) {
                return response.validationError(res, { q: "Parameter pencarian 'q' wajib diisi" });
            }
            const data = await PlanogramModel.searchByAddress(q.trim(), limit ? parseInt(limit) : 20);
            return response.success(res, data, "Hasil pencarian lokasi planogram");
        } catch (err) {
            logError(`[Planogram] searchByAddress error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    // =========================================================================
    // MASTER PLANOGRAM
    // =========================================================================

    /**
     * GET /api/mobile/planogram
     * List master planogram dengan paginasi.
     * Query params: page, limit, search, type_id
     */
    async index(req, res) {
        try {
            const { page, limit, offset } = parsePagination(req.query);
            const { search, type_id } = req.query;

            const { data, total } = await PlanogramModel.findAllMaster({
                limit,
                offset,
                search: search || null,
                type_id: type_id ? parseInt(type_id) : null,
            });

            return response.paginated(
                res,
                data,
                { page, limit, total },
                "Data master planogram berhasil dimuat"
            );
        } catch (err) {
            logError(`[Planogram] index error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * GET /api/mobile/planogram/:id
     * Detail master planogram beserta semua line (lokasi) miliknya.
     */
    async show(req, res) {
        try {
            const { id } = req.params;
            const master = await PlanogramModel.findMasterById(parseInt(id));
            if (!master) {
                return response.notFound(res, "Master planogram tidak ditemukan");
            }
            return response.success(res, master, "Data planogram berhasil dimuat");
        } catch (err) {
            logError(`[Planogram] show error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    // =========================================================================
    // LINE PLANOGRAM
    // =========================================================================

    /**
     * GET /api/mobile/planogram/line/:id
     * Detail satu lokasi planogram beserta storage produk-nya.
     */
    async showLine(req, res) {
        try {
            const { id } = req.params;
            const line = await PlanogramModel.findLineById(parseInt(id));
            if (!line) {
                return response.notFound(res, "Lokasi planogram tidak ditemukan");
            }
            return response.success(res, line, "Data lokasi planogram berhasil dimuat");
        } catch (err) {
            logError(`[Planogram] showLine error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * GET /api/mobile/planogram/address
     * Cari lokasi planogram berdasarkan alamat.
     * Query params: master_id (wajib), rack, shelf, cell (untuk RACK) atau loc (untuk FLOOR)
     */
    async findByAddress(req, res) {
        try {
            const { master_id, rack, shelf, cell, loc } = req.query;

            if (!master_id) {
                return response.validationError(res, {
                    master_id: "master_id wajib diisi",
                });
            }
            if (!rack && !loc) {
                return response.validationError(res, {
                    rack: "rack atau loc wajib diisi",
                    loc: "rack atau loc wajib diisi",
                });
            }

            const line = await PlanogramModel.findLineByAddress({
                master_id: parseInt(master_id),
                rack: rack || null,
                shelf: shelf || null,
                cell: cell || null,
                loc: loc || null,
            });

            if (!line) {
                return response.notFound(res, "Lokasi planogram tidak ditemukan");
            }
            return response.success(res, line, "Lokasi planogram ditemukan");
        } catch (err) {
            logError(`[Planogram] findByAddress error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    // =========================================================================
    // STORAGE PLANOGRAM (pot_storage_plano)
    // =========================================================================

    /**
     * POST /api/mobile/planogram/storage
     * Simpan atau update produk di suatu lokasi planogram.
     * Body: { id_plano, prdcd, qty }
     */
    async upsertStorage(req, res) {
        try {
            const { id_plano, prdcd, qty } = req.body;

            // Validasi input
            const errors = {};
            if (!id_plano) errors.id_plano = "id_plano wajib diisi";
            if (!prdcd) errors.prdcd = "prdcd wajib diisi";
            if (qty === undefined || qty === null || Number(qty) < 0) {
                errors.qty = "qty wajib diisi dan tidak boleh negatif";
            }
            if (Object.keys(errors).length > 0) {
                return response.validationError(res, errors);
            }

            // Validasi lokasi planogram
            const line = await PlanogramModel.findLineById(parseInt(id_plano));
            if (!line) {
                return response.notFound(res, "Lokasi planogram tidak ditemukan");
            }

            // Validasi produk
            const product = await ProductModel.findByPrdcd(prdcd);
            if (!product) {
                return response.notFound(res, `Produk "${prdcd}" tidak ditemukan`);
            }

            const storage = await PlanogramModel.upsertStorage({
                id_plano: parseInt(id_plano),
                prdcd,
                qty: parseFloat(qty),
            });

            logInfo(`[Planogram] Storage upserted: line=${id_plano} prdcd=${prdcd} qty=${qty}`);
            return response.success(
                res,
                {
                    ...storage,
                    nama: product.nama,
                    singkat: product.singkat,
                    unit: product.unit,
                },
                "Storage berhasil disimpan",
                201
            );
        } catch (err) {
            logError(`[Planogram] upsertStorage error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },

    /**
     * DELETE /api/mobile/planogram/storage/:id
     * Hapus storage produk dari suatu lokasi planogram.
     */
    async deleteStorage(req, res) {
        try {
            const { id } = req.params;

            const existing = await PlanogramModel.findStorageById(parseInt(id));
            if (!existing) {
                return response.notFound(res, "Storage tidak ditemukan");
            }

            const deleted = await PlanogramModel.deleteStorage(parseInt(id));
            logInfo(`[Planogram] Storage deleted: id=${id} prdcd=${existing.prdcd}`);
            return response.success(res, deleted, "Storage berhasil dihapus");
        } catch (err) {
            logError(`[Planogram] deleteStorage error: ${err.message}`);
            return response.error(res, "Terjadi kesalahan pada server");
        }
    },
};

module.exports = PlanogramController;
