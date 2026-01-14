const express = require('express');
const router = express.Router();
const controller = require('../controllers/kegiatanController');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:old_no_po', controller.update);
router.delete('/:no_po', controller.remove);

// Patch: update status only
router.patch('/:no_po/status', controller.setStatus);

// ✅ DETAIL KEGIATAN
router.get('/:no_po', controller.getDetail);

module.exports = router;
