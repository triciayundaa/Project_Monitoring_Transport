const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ⬅️ PENTING
const vehicleController = require('../controllers/vehicleController');

/* ================================
   GET ALL KENDARAAN (DROPDOWN)
================================ */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, plat_nomor
      FROM kendaraan
      ORDER BY plat_nomor
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/kendaraan ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ===== ROUTE LAIN JANGAN DIPINDAH ===== */
router.get('/transporters', vehicleController.getTransporters);
router.get('/transporters/:no_po', vehicleController.getTransportersByPo);
router.get('/:no_po', vehicleController.getVehiclesByPo);
router.post('/add', vehicleController.addVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.put('/:id', vehicleController.updateVehicle);

module.exports = router;
