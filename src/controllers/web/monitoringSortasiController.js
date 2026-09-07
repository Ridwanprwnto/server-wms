"use strict";

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
            
            // Format progress percentage and method
            const formattedData = data.map(item => {
                const total = parseInt(item.total_containers) || 0;
                const scanned = parseInt(item.scanned_containers) || 0;
                const countSorted = parseInt(item.count_sorted_total) || 0;
                
                // Determine which method was used
                let method = 'scan';
                if (countSorted > 0 && scanned === 0) {
                    method = 'count';
                } else if (countSorted > 0 && scanned > 0) {
                    method = countSorted >= scanned ? 'count' : 'scan';
                }
                const actualProgressVal = method === 'count' ? countSorted : scanned;
                const percentage = total === 0 ? 0 : Math.round((actualProgressVal / total) * 100);
                
                return {
                    ...item,
                    total_containers: total,
                    scanned_containers: actualProgressVal, // override with actual progress based on method
                    progress_percentage: percentage,
                    scan_method: method
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

            const details = await RealMonitoringSortasiModel.getDetailsByNopick(nopick);
            const countLogs = await RealMonitoringSortasiModel.getCountLogsByNopick(nopick);
            
            const method = countLogs.length > 0 ? 'count' : 'scan';

            return res.status(200).json({
                status: 'success',
                data: {
                    method,
                    details: details,
                    countLogs: countLogs
                }
            });
        } catch (error) {
            console.error('[MonitoringSortasiController.getDetails]', error);
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error while fetching sorting details'
            });
        }
    },

    /**
     * Reset fscanfraction menjadi 0 untuk nopick tertentu.
     * PUT /main/sortasi/monitoring/:nopick/reset-container
     */
    async resetContainer(req, res) {
        try {
            const nopick = req.params.nopick;
            if (!nopick) {
                return res.status(400).json({
                    status: 'error',
                    message: 'nopick parameter is required'
                });
            }

            const result = await RealMonitoringSortasiModel.resetFscanfraction(nopick);

            if (!result) {
                return res.status(404).json({
                    status: 'error',
                    message: `Data dengan nopick "${nopick}" tidak ditemukan`
                });
            }

            return res.status(200).json({
                status: 'success',
                message: `Status pemakaian container untuk nopick "${nopick}" berhasil direset`,
                data: result
            });
        } catch (error) {
            console.error('[MonitoringSortasiController.resetContainer]', error);
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error while resetting container status'
            });
        }
    }
};

module.exports = MonitoringSortasiController;
