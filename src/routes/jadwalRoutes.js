const express = require('express');
const router = express.Router();
const jadwalController = require('../controllers/jadwalController');

router.get('/', jadwalController.getJadwalByMonth);
router.put('/', jadwalController.saveJadwalMonth);
router.delete('/', jadwalController.deleteJadwalMonth);
router.post('/generate', jadwalController.generateJadwalMonth);
router.patch('/day', jadwalController.upsertJadwalDay);

module.exports = router;
