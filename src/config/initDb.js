const db = require('./db');

const initDb = async () => {
    try {
        // 1. Definisikan Query Tabel Users
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                email VARCHAR(100) PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL,
                no_telp VARCHAR(15),
                role ENUM('admin', 'personil') NOT NULL
            );
        `;

        // 2. Definisikan Query Tabel Kendaraan
        const createVehiclesTable = `
            CREATE TABLE IF NOT EXISTS kendaraan (
                id INT PRIMARY KEY AUTO_INCREMENT,
                plat_nomor VARCHAR(20) NOT NULL,
                jenis_kendaraan VARCHAR(50),
                status ENUM('aktif', 'non-aktif') DEFAULT 'aktif'
            );
        `;

        // 3. Jalankan Query secara berurutan
        await db.query(createUsersTable);
        console.log("✅ Berhasil Tersambung!!!");
        
    } catch (err) {
        console.error("❌ Gagal inisialisasi database:", err.message);
    }
};

module.exports = initDb;