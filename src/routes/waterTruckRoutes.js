const express = require('express');
const router = express.Router();
const waterTruckController = require('../controllers/waterTruckController'); // Pastikan path ini benar

// DEBUG: Cek apakah controller terbaca
if (!waterTruckController.getDataPembersihan) {
    console.error("❌ ERROR: waterTruckController tidak terbaca dengan benar!");
}

// Get List
router.get('/', waterTruckController.getDataPembersihan);

// Get Option PO (Dropdown)
router.get('/active-po', waterTruckController.getActivePO);

// Input Baru
router.post('/', waterTruckController.simpanPembersihan);

module.exports = router;