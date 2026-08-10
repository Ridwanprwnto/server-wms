"use strict";

const MonitoringSortasiModel = {
    getAllSortasiProgress: async () => {
        // Will be overwritten by actual import
        return [];
    }
}; // Fallback if import fails during analysis, normally handled by require

const RealMonitoringSortasiModel = require("../../models/web/monitoringSortasiModel");

const MonitoringSortasiController = {
    async getProgress(req, res) {
        try {
            const date = req.query.date;
            if (!date) {
                return res.status(200).json({
                    status: 'success',
                    data: []
                });
            }

            const data = await RealMonitoringSortasiModel.getAllSortasiProgress(date);
            
            // Format progress percentage
            const formattedData = data.map(item => {
                const total = parseInt(item.total_containers) || 0;
                const scanned = parseInt(item.scanned_containers) || 0;
                const percentage = total === 0 ? 0 : Math.round((scanned / total) * 100);
                
                return {
                    ...item,
                    total_containers: total,
                    scanned_containers: scanned,
                    progress_percentage: percentage
                };
            });

            return res.status(200).json({
                status: 'success',
                data: formattedData
            });
        } catch (error) {
            console.error('[MonitoringSortasiController.getProgress]', error);
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error while fetching sorting progress'
            });
        }
    },

    async getDetails(req, res) {
        try {
            const nopick = req.params.nopick;
            if (!nopick) {
                return res.status(400).json({
                    status: 'error',
                    message: 'nopick parameter is required'
                });
            }

            const data = await RealMonitoringSortasiModel.getDetailsByNopick(nopick);
            
            return res.status(200).json({
                status: 'success',
                data: data
            });
        } catch (error) {
            console.error('[MonitoringSortasiController.getDetails]', error);
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error while fetching sorting details'
            });
        }
    }
};

module.exports = MonitoringSortasiController;
