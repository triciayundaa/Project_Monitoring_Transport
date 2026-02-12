const express = require('express');
const router = express.Router();
const {
    cekStatusShiftUser,
    cekPO,
    simpanKeberangkatan,
    simpanKeberangkatanManual,  // 🔥 IMPORT FUNGSI MANUAL
    getKeberangkatanByDate,
    hapusKeberangkatan,
    verifikasiKeberangkatan,
    updateTruk
} = require('../controllers/keberangkatanController');

// 1. Cek status shift user
router.get('/status-shift', cekStatusShiftUser);

// 2. Cek PO
router.post('/cek-po', cekPO);

// 🔥 3. ROUTE MANUAL - HARUS SEBELUM ROUTE GENERIC '/'
router.post('/manual', simpanKeberangkatanManual);

// 4. Simpan keberangkatan (route generic)
router.post('/', simpanKeberangkatan);

// 5. Get data keberangkatan by date
router.get('/', getKeberangkatanByDate);

// 6. Update/Edit data truk
router.put('/:id', updateTruk);

// 7. Verifikasi keberangkatan (update status Valid/Tolak)
router.patch('/:id/verifikasi', verifikasiKeberangkatan);

// 8. Hapus keberangkatan
router.delete('/:id', hapusKeberangkatan);

console.log('✅ Keberangkatan routes loaded with /manual endpoint');

module.exports = router;