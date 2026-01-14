const express = require('express');
const router = express.Router();
const keberangkatanController = require('../controllers/keberangkatanController');

// ================= ROUTE DARI HEAD (Fitur Utama) =================

// 1. Cek Shift User (Real-time check di Frontend)
router.get('/status-shift', keberangkatanController.cekStatusShiftUser);

// 2. Cek Detail PO
router.post('/cek-po', keberangkatanController.cekPO);

// 3. Simpan Data Keberangkatan
router.post('/simpan', keberangkatanController.simpanKeberangkatan);

// 4. Ambil List Data (Filter Tanggal)
router.get('/list', keberangkatanController.getKeberangkatanByDate);

// 5. Hapus Data
router.delete('/hapus/:id', keberangkatanController.hapusKeberangkatan);


// ================= ROUTE DARI OLIVIA (Fitur Verifikasi) =================

// 6. Verifikasi Status (Valid / Tolak)
// Digunakan oleh Admin/Personil untuk memvalidasi keberangkatan
router.put('/:id/verifikasi', keberangkatanController.verifikasiKeberangkatan);

module.exports = router;