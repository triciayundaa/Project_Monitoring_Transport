const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

router.get('/', laporanController.getAllLaporan);
router.get('/detail/:id', laporanController.getLaporanDetail); // Pastikan ini ada
router.post('/add', laporanController.createLaporan);
router.delete('/:id', laporanController.deleteLaporan);
router.get('/detail/:id', laporanController.getLaporanDetail);
router.get('/periodik', laporanController.getLaporanPeriodik);

module.exports = router;