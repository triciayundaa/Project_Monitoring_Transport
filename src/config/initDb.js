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

        const createShiftTable = `
            CREATE TABLE IF NOT EXISTS shift (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_shift ENUM('Shift 1', 'Shift 2', 'Shift 3', 'Libur') NOT NULL
            );
            `;
    
        const createActivitiesTable = `
            CREATE TABLE IF NOT EXISTS kegiatan (
            no_po VARCHAR(50) PRIMARY KEY,
            vendor VARCHAR(100) NOT NULL,
            transporter VARCHAR(100) NOT NULL,
            nama_kapal VARCHAR(100),
            material VARCHAR(100),
            incoterm VARCHAR(20),
            no_bl VARCHAR(50),
            quantity DECIMAL(12,4),
            total_truk INT DEFAULT 0,
            status ENUM('Waiting', 'On Progress', 'Completed') DEFAULT 'Waiting' NOT NULL,
            tanggal_mulai DATE NOT NULL,
            tanggal_selesai DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

         `;


         // 3. Tabel Kendaraan (Detail Data - Child dari Kegiatan)
        const createVehiclesTable = `
            CREATE TABLE kendaraan (
            id INT AUTO_INCREMENT PRIMARY KEY,
            no_po VARCHAR(50),
            nopol VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (no_po) REFERENCES kegiatan(no_po) ON DELETE CASCADE
        );`;

    // ================= KEBERANGKATAN TRUK =================
    const createKeberangkatanTable = `
      CREATE TABLE IF NOT EXISTS keberangkatan_truk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_po VARCHAR(50), 
        kendaraan_id INT,
        email_user VARCHAR(100),
        shift_id INT,
        tanggal DATE,
        no_seri_pengantar VARCHAR(50),
        foto_truk LONGTEXT,   
        foto_surat LONGTEXT,  
        status ENUM('Pending', 'Valid', 'Tolak') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (no_po) REFERENCES kegiatan(no_po),
        FOREIGN KEY (kendaraan_id) REFERENCES kendaraan(id),
        FOREIGN KEY (email_user) REFERENCES users(email),
        FOREIGN KEY (shift_id) REFERENCES shift(id)
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