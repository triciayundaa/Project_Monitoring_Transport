const express = require('express');
const router = express.Router();
const {
    cekStatusShiftUser,
    cekPO,
    simpanKeberangkatan,
    getKeberangkatanByDate,
    hapusKeberangkatan,
    verifikasiKeberangkatan,
    updateTruk
} = require('../controllers/keberangkatanController');

// 1. Cek status shift user
router.get('/status-shift', cekStatusShiftUser);

// 2. Cek PO
router.post('/cek-po', cekPO);

// 3. Simpan keberangkatan
router.post('/', simpanKeberangkatan);

// 4. Get data keberangkatan by date
router.get('/', getKeberangkatanByDate);

// 5. Update/Edit data truk - PENTING: Route ini harus ada!
router.put('/:id', updateTruk);

// 6. Verifikasi keberangkatan (update status Valid/Tolak)
router.patch('/:id/verifikasi', verifikasiKeberangkatan);

// 7. Hapus keberangkatan
router.delete('/:id', hapusKeberangkatan);

module.exports = router;