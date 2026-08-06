// src/controllers/mobile/sortingPoolController.js
const SortingPoolModel = require("../../models/mobile/sortingPoolModel");

const SortingPoolController = {
    // 1. Inisiasi proses dari backend 1
    async initSortingProcess(req, res) {
        try {
            const { nopick, headerData, detailsData } = req.body;
            
            if (!nopick) {
                return res.status(400).json({ success: false, message: "nopick is required" });
            }

            // Cek apakah data sudah ada di postgresql
            const exists = await SortingPoolModel.checkHeaderExists(nopick);
            
            if (!exists) {
                // Jika belum ada, simpan data dari req.body (yang didapat dari backend 1)
                if (!headerData) {
                    return res.status(400).json({ success: false, message: "headerData is required to initialize" });
                }
                await SortingPoolModel.saveSortingData(headerData, detailsData);
            }

            // Return progress/data terbaru
            const progress = await SortingPoolModel.getProgress(nopick);
            return res.status(200).json({
                success: true,
                message: "Data initialized successfully",
                data: progress
            });

        } catch (error) {
            console.error("Error in initSortingProcess:", error);
            return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        }
    },

    // 2. Scan per container
    async scanContainer(req, res) {
        try {
            const { nopick, dusno, user } = req.body;

            if (!nopick || !dusno) {
                return res.status(400).json({ success: false, message: "nopick and dusno are required" });
            }

            const updated = await SortingPoolModel.updateScanStatus(nopick, dusno, user);
            
            if (!updated) {
                return res.status(404).json({ success: false, message: "Container not found or update failed" });
            }

            // Return current progress to update UI
            const progress = await SortingPoolModel.getProgress(nopick);

            return res.status(200).json({
                success: true,
                message: "Container scanned successfully",
                data: progress
            });

        } catch (error) {
            console.error("Error in scanContainer:", error);
            return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        }
    },

    // 3. Selesaikan proses
    async completeProcess(req, res) {
        try {
            const { nopick, user } = req.body;

            if (!nopick) {
                return res.status(400).json({ success: false, message: "nopick is required" });
            }

            const completed = await SortingPoolModel.completeSortingProcess(nopick, user);
            
            if (!completed) {
                return res.status(404).json({ success: false, message: "Data not found or update failed" });
            }

            return res.status(200).json({
                success: true,
                message: "Sorting process completed successfully",
                data: completed
            });

        } catch (error) {
            console.error("Error in completeProcess:", error);
            return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        }
    },

    // GET progress (optional helper)
    async getProgress(req, res) {
        try {
            const { nopick } = req.params;
            const progress = await SortingPoolModel.getProgress(nopick);
            
            if (!progress) {
                return res.status(404).json({ success: false, message: "Data not found" });
            }

            return res.status(200).json({
                success: true,
                data: progress
            });
        } catch (error) {
            console.error("Error in getProgress:", error);
            return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        }
    }
};

module.exports = SortingPoolController;
