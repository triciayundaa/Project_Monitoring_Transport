const express = require('express');
const cors = require('cors');
// Baris 3 & 4 harus seperti ini:
const initDb = require('./src/config/initDb'); 
const authRoutes = require('./src/routes/authRoutes');
const keberangkatanRoutes = require('./src/routes/keberangkatanRoutes');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Jalankan Inisialisasi Database ---
initDb()
  .then(() => console.log("✅ Database Inisialisasi Berhasil"))
  .catch(err => console.error("❌ Database Inisialisasi Gagal:", err));

// --- Routes ---
// Gunakan awalan /api untuk membedakan jalur API dengan jalur frontend
app.use('/api/auth', authRoutes);
app.use('/api/keberangkatan', keberangkatanRoutes); 

app.get('/', (req, res) => {
    res.send('Server & Database Monitoring Transportasi Aktif!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});