const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

// GET semua laporan
router.get('/', laporanController.getAllLaporan);

// GET detail laporan
router.get('/:id', laporanController.getLaporanById);

// POST tambah laporan
router.post('/', laporanController.createLaporan);

// DELETE hapus laporan
router.delete('/:id', laporanController.deleteLaporan);

module.exports = router;