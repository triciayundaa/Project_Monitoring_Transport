const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController');

// Debugging: Pastikan controller tidak kosong
if (!kegiatanController || !kegiatanController.getAll) {
    console.error("❌ CRITICAL ERROR: Fungsi di kegiatanController tidak terbaca!");
    console.error("Isi Controller:", kegiatanController);
}

// 1. GET Semua Kegiatan
router.get('/', kegiatanController.getAll);

// 2. GET Detail Kegiatan
router.get('/:no_po', kegiatanController.getDetailByPO);

// 3. POST Tambah Kegiatan
router.post('/', kegiatanController.create);

// 4. UPDATE Status Kegiatan (Tandai Selesai / Batalkan)
// Endpoint: PATCH /api/kegiatan/:no_po/status
router.patch('/:no_po/status', kegiatanController.updateStatus);
// CATATAN: Jangan ada router.put di sini jika controller.update belum dibuat!
router.put('/:no_po', kegiatanController.update);

router.delete('/:no_po', kegiatanController.deleteData);

module.exports = router;