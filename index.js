const express = require('express');
const cors = require('cors');
const initDb = require('./src/config/initDb'); 
const authRoutes = require('./src/routes/authRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes'); 
const userRoutes = require('./src/routes/userRoutes');
require('dotenv').config();

const app = express();

// --- Middleware (WAJIB DI ATAS ROUTES) ---
app.use(cors()); // Mengizinkan akses dari port berbeda (Frontend 5173)
app.use(express.json());
app.use('/api/users', userRoutes);

// --- Jalankan Inisialisasi Database ---
initDb()
  .then(() => console.log("✅ Database Inisialisasi Berhasil"))
  .catch(err => console.error("❌ Database Inisialisasi Gagal:", err));

// --- Routes ---
app.use('/api/auth', authRoutes); 
app.use('/api/vehicles', vehicleRoutes); 

app.get('/', (req, res) => {
    res.send('Server & Database Monitoring Transportasi Aktif!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0',() => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});