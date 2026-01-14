const db = require('./db');

const initDb = async () => {
    try {
        // 1. Tabel Users
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                email VARCHAR(100) PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL,
                no_telp VARCHAR(15),
                role ENUM('admin', 'personil') NOT NULL
            );
        `;

        // 2. Tabel Kegiatan (Master Data)
        const createActivitiesTable = `
            CREATE TABLE IF NOT EXISTS kegiatan (
                no_po VARCHAR(50) PRIMARY KEY,
                vendor VARCHAR(100) NOT NULL,
                transporter VARCHAR(100) NOT NULL,
                nama_kapal VARCHAR(100),
                material VARCHAR(100),
                incoterm VARCHAR(20),
                no_bl VARCHAR(50),
                quantity DECIMAL(10,2),
                total_truk INT DEFAULT 0,
                status ENUM('Waiting', 'On Progress', 'Completed') DEFAULT 'Waiting',
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

const createReportTable = `
CREATE TABLE laporan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    tipe_laporan ENUM('Mingguan', 'Bulanan', 'Inventaris', 'Lainnya') DEFAULT 'Lainnya',
    file_path VARCHAR(255) NOT NULL,
    dibuat_oleh VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;


        // Jalankan Query secara berurutan
        await db.query(createUsersTable);
        
        // Penting: Tabel 'kegiatan' harus dibuat sebelum 'kendaraan' 
        // karena ada Foreign Key (Hubungan Relasi)
        await db.query(createActivitiesTable); 
        await db.query(createVehiclesTable);
        
        console.log("✅ Database & Semua Tabel Berhasil Diinisialisasi!");
        
    } catch (err) {
        // Menampilkan pesan error yang lebih spesifik jika query gagal
        console.error("❌ Gagal inisialisasi database:", err.message);
    }
};

module.exports = initDb;