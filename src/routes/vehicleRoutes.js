const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

// Pastikan penulisan fungsi di controller sesuai (getTransporters, getVehiclesByPo, dll)
router.get('/transporters', vehicleController.getTransporters);
router.get('/:no_po', vehicleController.getVehiclesByPo);
router.post('/add', vehicleController.addVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.put('/:id', vehicleController.updateVehicle);
module.exports = router;