const express = require('express');
const router = express.Router();
const keberangkatanController = require('../controllers/keberangkatanController');

// === TAMBAHKAN BARIS INI (SANGAT PENTING) ===
// Ini agar Frontend bisa mengecek shift user secara real-time
router.get('/status-shift', keberangkatanController.cekStatusShiftUser);
// ============================================

router.post('/cek-po', keberangkatanController.cekPO);
router.post('/simpan', keberangkatanController.simpanKeberangkatan);
router.get('/list', keberangkatanController.getKeberangkatanByDate);
router.delete('/hapus/:id', keberangkatanController.hapusKeberangkatan);

module.exports = router;