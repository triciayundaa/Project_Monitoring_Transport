const express = require('express');
const cors = require('cors');
const initDb = require('./src/config/initDb'); 
const path = require('path');
require('dotenv').config();

// --- IMPORT ROUTES ---
const authRoutes = require('./src/routes/authRoutes');

// 1. Dari HEAD (Fitur Lama/Fathiya/Trici)
const vehicleRoutes = require('./src/routes/vehicleRoutes'); 
const userRoutes = require('./src/routes/userRoutes');
const jadwalRoutes = require('./src/routes/jadwalRoutes');
const laporanRoutes = require('./src/routes/laporanRoutes');


const keberangkatanRoutes = require('./src/routes/keberangkatanRoutes');
const kegiatanRoutes = require('./src/routes/kegiatanRoutes'); 
const waterTruckRoutes = require('./src/routes/waterTruckRoutes');

const app = express();

// --- Middleware (WAJIB DI ATAS ROUTES) ---
app.use(cors()); 

// 🔥 PERBAIKAN DI SINI: MENAMBAHKAN LIMIT BODY AGAR BISA UPLOAD FOTO
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- Jalankan Inisialisasi Database ---
initDb()
  .then(() => console.log("✅ Database Inisialisasi Berhasil"))
  .catch(err => console.error("❌ Database Inisialisasi Gagal:", err));

// --- DAFTAR ROUTES API ---

// 1. Auth
app.use('/api/auth', authRoutes); 

// 2. Manajemen Users & Vehicles & Laporan
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes); 
app.use('/api/laporan', laporanRoutes); 

// 3. Keberangkatan & Jadwal
app.use('/api/keberangkatan', keberangkatanRoutes);
app.use('/api/jadwal', jadwalRoutes);
app.use('/api/kendaraan', vehicleRoutes);

// 4. Kegiatan (PO) - Fitur Olivia
app.use('/api/kegiatan', kegiatanRoutes);

// 5. Patroler Water Truck
app.use('/api/water-truck', waterTruckRoutes);

// --- Root Route ---
app.get('/', (req, res) => {
    res.send('Server & Database Monitoring Transportasi Aktif!');
});

// --- Jalankan Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});