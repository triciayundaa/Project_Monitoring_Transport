const express = require('express');
const router = express.Router();
const db = require('../config/db');
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

/* ========================================
    PENGELOLAAN TRANSPORTER & PO
======================================== */
router.get('/transporters', vehicleController.getTransporters);
router.get('/transporters/:no_po', vehicleController.getTransportersByPo);

/* ========================================
    LOGIKA MASTER KATALOG & ALOKASI
======================================== */

// Ambil semua katalog Nopol yang pernah didaftarkan oleh Transporter tertentu
router.get('/master/:transporterId', vehicleController.getMasterAsset);

// Alokasikan kendaraan yang sudah ada di katalog ke PO saat ini (Bulk Assign)
router.post('/assign-master', vehicleController.assignFromMaster);

/* ========================================
    OPERASI CRUD KENDARAAN (PER PO)
======================================== */
router.get('/:noPo', vehicleController.getVehiclesByPo);
router.post('/add', vehicleController.addVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.put('/:id', vehicleController.updateVehicle);

module.exports = router;