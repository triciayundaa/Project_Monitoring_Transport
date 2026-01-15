const db = require('./db');
const bcrypt = require('bcryptjs'); // Pastikan bcrypt terinstall

const initDb = async () => {
  try {
    // ================= 1. USERS =================
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(100) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        no_telp VARCHAR(15),
        role ENUM('admin', 'personil') NOT NULL
      );
    `;

    // ================= 2. SHIFT (Master Data) =================
    const createShiftTable = `
      CREATE TABLE IF NOT EXISTS shift (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_shift ENUM('Shift 1', 'Shift 2', 'Shift 3', 'Libur') NOT NULL
      );
    `;

    // ================= 3. VENDOR (Master Data) =================
    const createVendorTable = `
      CREATE TABLE IF NOT EXISTS vendor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_vendor VARCHAR(100) NOT NULL
      );
    `;

    // ================= 4. KEGIATAN (PO) =================
    const createKegiatanTable = `
      CREATE TABLE IF NOT EXISTS kegiatan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_po VARCHAR(50) UNIQUE,  -- UNIQUE agar bisa dicari by PO
        vendor_id INT,
        transporter VARCHAR(100),
        nama_kapal VARCHAR(100),
        material VARCHAR(100),
        incoterm VARCHAR(20),
        no_bl VARCHAR(50),
        quantity DECIMAL(10,4),    -- Pakai DECIMAL agar presisi
        status ENUM('Waiting', 'On Progress', 'Completed') DEFAULT 'Waiting',
        tanggal_mulai DATE,
        tanggal_selesai DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendor(id)
      );
    `;

    // ================= 5. KENDARAAN =================
    const createKendaraanTable = `
      CREATE TABLE IF NOT EXISTS kendaraan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT,
        plat_nomor VARCHAR(20) NOT NULL,
        status ENUM('aktif', 'non-aktif') DEFAULT 'aktif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendor(id)
      );
    `;

    // ================= 6. KEBERANGKATAN TRUK (Transaksi Utama) =================
    const createKeberangkatanTable = `
      CREATE TABLE IF NOT EXISTS keberangkatan_truk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_id INT,
        kendaraan_id INT,
        email_user VARCHAR(100),
        shift_id INT,
        tanggal DATE,
        no_seri_pengantar VARCHAR(50),
        foto_truk LONGTEXT,   -- Support Upload Foto Base64
        foto_surat LONGTEXT,  -- Support Upload Foto Base64
        status ENUM('Valid', 'Tolak') DEFAULT 'Valid', -- Tambahan Status Validasi
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id),
        FOREIGN KEY (kendaraan_id) REFERENCES kendaraan(id),
        FOREIGN KEY (email_user) REFERENCES users(email),
        FOREIGN KEY (shift_id) REFERENCES shift(id)
      );
    `;

    // ================= 7. JADWAL SHIFT (Manajemen Jadwal) =================
    const createJadwalTable = `
      CREATE TABLE IF NOT EXISTS jadwal_shift (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        shift1 VARCHAR(100),
        shift2 VARCHAR(100),
        shift3 VARCHAR(100),
        libur VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tanggal (tanggal)
      );
    `;

    // ================= 8. LAPORAN (Fitur Laporan) =================
    const createReportTable = `
      CREATE TABLE IF NOT EXISTS laporan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judul VARCHAR(255) NOT NULL,
        tipe_laporan ENUM('Mingguan', 'Bulanan', 'Inventaris', 'Lainnya') DEFAULT 'Lainnya',
        file_path VARCHAR(255) NOT NULL,
        dibuat_oleh VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // ================= EKSEKUSI PEMBUATAN TABEL =================
    await db.query(createUsersTable);
    await db.query(createShiftTable);
    await db.query(createVendorTable);
    await db.query(createKegiatanTable);
    await db.query(createKendaraanTable);
    await db.query(createKeberangkatanTable);
    await db.query(createJadwalTable);
    await db.query(createReportTable);

    console.log("✅ Semua tabel database berhasil dibuat (Struktur Baru + Laporan)");

    // ================= SEEDING DATA AWAL (Opsional) =================
    
    // 1. Buat User Default
    const [cekUser] = await db.query("SELECT * FROM users WHERE email = 'admin1234@gmail.com'");
    if (cekUser.length === 0) {
        console.log("⚙️  Membuat user default...");
        const hashAdmin = await bcrypt.hash('admin123', 10);
        const hashPersonil = await bcrypt.hash('123456', 10);

        const insertUsers = `
            INSERT INTO users (email, nama, password, no_telp, role) VALUES 
            ('admin1234@gmail.com', 'Admin Sistem', ?, '081234567890', 'admin'),
            ('personila@semenpadang.co.id', 'Personil A', ?, '0822222222', 'personil'),
            ('personilb@semenpadang.co.id', 'Personil B', ?, '0833333333', 'personil'),
            ('personilc@semenpadang.co.id', 'Personil C', ?, '0844444444', 'personil'),
            ('personild@semenpadang.co.id', 'Personil D', ?, '0855555555', 'personil');
        `;
        await db.query(insertUsers, [hashAdmin, hashPersonil, hashPersonil, hashPersonil, hashPersonil]);
    }

    // 2. Buat Data Shift Default
    const [cekShift] = await db.query("SELECT * FROM shift");
    if (cekShift.length === 0) {
       await db.query(`INSERT INTO shift (nama_shift) VALUES ('Shift 1'), ('Shift 2'), ('Shift 3'), ('Libur')`);
       console.log("✅ Data Shift Default dibuat");
    }

  } catch (err) {
    console.error("❌ Gagal inisialisasi database:", err.message);
  }
};

module.exports = initDb;