const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController');

// 🔥 HARUS PALING ATAS
router.get('/transporters', kegiatanController.getAllTransporters);

// GET semua kegiatan
router.get('/', kegiatanController.getAll);

// GET detail by PO
router.get('/:no_po', kegiatanController.getDetailByPO);

// POST
router.post('/', kegiatanController.create);

// PATCH status
router.patch('/:no_po/status', kegiatanController.updateStatus);

// PUT update
router.put('/:no_po', kegiatanController.update);

// DELETE
router.delete('/:no_po', kegiatanController.deleteData);

module.exports = router;
