const express = require('express');
const router = express.Router();
const keberangkatanController = require('../controllers/keberangkatanController');

router.post('/cek-po', keberangkatanController.cekPO);
router.post('/simpan', keberangkatanController.simpanKeberangkatan);
router.get('/list', keberangkatanController.getKeberangkatanByDate);
router.delete('/hapus/:id', keberangkatanController.hapusKeberangkatan);

module.exports = router;

