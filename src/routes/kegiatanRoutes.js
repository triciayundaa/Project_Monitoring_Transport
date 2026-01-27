const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController');

console.log('🔥 Routes loading...');

// ==================================================================
// 1. ROUTE SPESIFIK (WAJIB DI PALING ATAS)
// ==================================================================
// API untuk update status manual
router.post('/update-transporter-status', kegiatanController.updateTransporterStatus);

// API untuk master data transporter
router.get('/transporters', kegiatanController.getAllTransporters);

// 🔥 API BARU: Ambil truk berdasarkan alokasi PO + Transporter
// Harus di atas route /:no_po agar kata 'truk-alokasi' tidak dianggap No PO
router.get('/truk-alokasi/:kegiatan_id/:transporter_id', kegiatanController.getTrukByAlokasi);


// ==================================================================
// 2. ROUTE UMUM & DINAMIS (DI BAWAH)
// ==================================================================

router.get('/', kegiatanController.getAll);
router.get('/:no_po', kegiatanController.getDetailByPO); 

router.post('/', kegiatanController.create);
router.patch('/:no_po/status', kegiatanController.updateStatus);
router.put('/:no_po', kegiatanController.update);
router.delete('/:no_po', kegiatanController.deleteData);

console.log('✅ Routes loaded successfully');

module.exports = router;