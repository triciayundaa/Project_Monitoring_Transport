const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');

// Route lama untuk ambil master data shift
router.get('/', shiftController.getAllShifts);

// 🔥 Route baru untuk cari personil (URL: /api/shift/cari-personil)
router.get('/cari-personil', shiftController.getPersonilByJadwal);

module.exports = router;