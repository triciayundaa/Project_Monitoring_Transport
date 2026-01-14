// file: src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
    // --- DARI HEAD (Agar koneksi aman di port 3307) ---
    port: process.env.DB_PORT || 3306, 

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // --- DARI FATHIYA (Agar Tanggal Jadwal tidak Error/Bergeser) ---
    // Ini memaksa MySQL mengembalikan tanggal sebagai string "YYYY-MM-DD"
    // Bukan sebagai objek Date yang rawan kena konversi zona waktu.
    dateStrings: true 
});

module.exports = db;