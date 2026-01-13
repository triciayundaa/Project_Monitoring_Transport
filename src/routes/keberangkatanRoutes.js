const express = require('express');
const router = express.Router();
const keberangkatanController = require('../controllers/keberangkatanController');

// PUT verifikasi (Valid / Tolak)
router.put('/:id/verifikasi', keberangkatanController.verifikasiKeberangkatan);

module.exports = router;
