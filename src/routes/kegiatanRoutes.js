const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController');

console.log('🔥 Routes loading...');
// Debugging: Cek apakah fungsi controller terbaca
if (!kegiatanController.updateTransporterStatus) {
    console.error('❌ FATAL ERROR: Fungsi updateTransporterStatus tidak ditemukan di controller!');
} else {
    console.log('✅ Fungsi updateTransporterStatus tersedia.');
}

// ==================================================================
// 1. ROUTE SPESIFIK (WAJIB DI PALING ATAS)
// ==================================================================
// Taruh di sini agar diprioritaskan oleh Express
router.post('/update-transporter-status', kegiatanController.updateTransporterStatus);

router.get('/transporters', kegiatanController.getAllTransporters);


// ==================================================================
// 2. ROUTE UMUM & DINAMIS (DI BAWAH)
// ==================================================================

// GET Routes
router.get('/', kegiatanController.getAll);
router.get('/:no_po', kegiatanController.getDetailByPO); 

// POST Routes
router.post('/', kegiatanController.create);

// PATCH Routes
router.patch('/:no_po/status', kegiatanController.updateStatus);

// PUT Routes
router.put('/:no_po', kegiatanController.update);

// DELETE Routes
router.delete('/:no_po', kegiatanController.deleteData);

console.log('✅ Routes loaded successfully');

module.exports = router;