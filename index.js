const express = require('express');
const cors = require('cors');
require('dotenv').config();

// --- Import Config & Routes ---
const initDb = require('./src/config/initDb'); 
const authRoutes = require('./src/routes/authRoutes');
const keberangkatanRoutes = require('./src/routes/keberangkatanRoutes');
const kegiatanRoutes = require('./src/routes/kegiatanRoutes');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Jalankan Inisialisasi Database ---
initDb()
  .then(() => console.log("✅ Database Inisialisasi Berhasil"))
  .catch(err => console.error("❌ Database Inisialisasi Gagal:", err));

// --- Routes ---
// Gunakan awalan /api untuk membedakan jalur API dengan frontend
app.use('/api/auth', authRoutes);
app.use('/api/kegiatan', kegiatanRoutes);
app.use('/api/keberangkatan', keberangkatanRoutes);

// --- Route Default ---
app.get('/', (req, res) => {
    res.send('Server & Database Monitoring Transportasi Aktif!');
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
