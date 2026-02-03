const express = require('express');
const router = express.Router();
// Sesuaikan path ke file controller di atas
const waterTruckController = require('../controllers/waterTruckController');

// GET LIST DAFTAR TRUK AIR
router.get('/list', waterTruckController.getListTrukAir);

// GET ACTIVE PO
router.get('/active-po', waterTruckController.getActivePO);

// GET DETAIL RECAP (Untuk Halaman Detail Rekap Truk Air)
router.get('/detail/:id', waterTruckController.getDetailWaterTruck);

// GET DETAIL SINGLE (Untuk Detail Satu Laporan Pembersihan)
// 🔥 Sekarang ini tidak akan error lagi karena getDetailPembersihan sudah ada
router.get('/:id', waterTruckController.getDetailPembersihan);

// GET ALL (Untuk Mobile/List)
router.get('/', waterTruckController.getDataPembersihan);

// POST SAVE
router.post('/', waterTruckController.simpanPembersihan);

module.exports = router;