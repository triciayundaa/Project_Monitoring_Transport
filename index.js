const express = require('express');
const cors = require('cors');
const initDb = require('./src/config/initDb'); 
const authRoutes = require('./src/routes/authRoutes');

// --- IMPORT DARI HEAD (Fitur Lama) ---
const vehicleRoutes = require('./src/routes/vehicleRoutes'); 
const userRoutes = require('./src/routes/userRoutes');

// --- IMPORT DARI FATHIYA (Fitur Baru) ---
const keberangkatanRoutes = require('./src/routes/keberangkatanRoutes');
const jadwalRoutes = require('./src/routes/jadwalRoutes');
// Jika Anda punya file laporanRoutes, jangan lupa import di sini juga

require('dotenv').config();

const app = express();

// --- Middleware (WAJIB DI ATAS ROUTES) ---
app.use(cors()); // Mengizinkan akses dari port berbeda (Frontend 5173)
app.use(express.json()); // Membaca data JSON dari body request

// --- Jalankan Inisialisasi Database ---
initDb()
  .then(() => console.log("✅ Database Inisialisasi Berhasil"))
  .catch(err => console.error("❌ Database Inisialisasi Gagal:", err));

// --- DAFTAR ROUTES API ---

// 1. Auth (Login)
app.use('/api/auth', authRoutes); 

// 2. Manajemen Users & Vehicles (Dari HEAD)
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes); 

// 3. Keberangkatan & Jadwal (Dari Fathiya)
app.use('/api/keberangkatan', keberangkatanRoutes);
app.use('/api/jadwal', jadwalRoutes);

// --- Root Route ---
app.get('/', (req, res) => {
    res.send('Server & Database Monitoring Transportasi Aktif!');
});

// --- Jalankan Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0',() => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});