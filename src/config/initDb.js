const db = require('./db');

const initDb = async () => {
  try {
    // ================= USERS =================
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(100) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        no_telp VARCHAR(15),
        role ENUM('admin', 'personil') NOT NULL
      );
    `;

    // ================= SHIFT =================
    const createShiftTable = `
      CREATE TABLE IF NOT EXISTS shift (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_shift ENUM('Shift 1', 'Shift 2', 'Shift 3', 'Libur') NOT NULL
      );
    `;

    // (removed old jadwal_shift mapping table) - using jadwal_shift as main schedule table below

    // ================= VENDOR =================
    const createVendorTable = `
      CREATE TABLE IF NOT EXISTS vendor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_vendor VARCHAR(100) NOT NULL
      );
    `;

    // ================= KEGIATAN (PO) =================
    const createKegiatanTable = `
      CREATE TABLE IF NOT EXISTS kegiatan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal_kegiatan DATE,
        no_po VARCHAR(50),
        vendor_id INT,
        transporter VARCHAR(100),
        nama_kapal VARCHAR(100),
        material VARCHAR(100),
        incoterm VARCHAR(20),
        no_bl VARCHAR(50),
        quantity INT,
        status ENUM('waiting', 'on_progress', 'completed') DEFAULT 'waiting',
        total_truk INT,
        FOREIGN KEY (vendor_id) REFERENCES vendor(id)
      );
    `;

    // ================= KENDARAAN =================
    const createKendaraanTable = `
      CREATE TABLE IF NOT EXISTS kendaraan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT,
        plat_nomor VARCHAR(20) NOT NULL,
        status ENUM('aktif', 'non-aktif') DEFAULT 'aktif',
        FOREIGN KEY (vendor_id) REFERENCES vendor(id)
      );
    `;

    // ================= KEBERANGKATAN TRUK =================
    const createKeberangkatanTable = `
      CREATE TABLE IF NOT EXISTS keberangkatan_truk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_id INT,
        kendaraan_id INT,
        email_user VARCHAR(100),
        shift_id INT,
        tanggal DATE,
        no_seri_pengantar VARCHAR(50),
        foto_truk LONGTEXT,   /* <--- GANTI JADI LONGTEXT */
        foto_surat LONGTEXT,  /* <--- GANTI JADI LONGTEXT */
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id),
        FOREIGN KEY (kendaraan_id) REFERENCES kendaraan(id),
        FOREIGN KEY (email_user) REFERENCES users(email),
        FOREIGN KEY (shift_id) REFERENCES shift(id)
      );
    `;

    // ================= JADWAL (Harian) =================
    // Use `jadwal_shift` as the single jadwal table where each tanggal stores shifts
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

    // ================= EKSEKUSI =================
    await db.query(createUsersTable);
    await db.query(createShiftTable);
    await db.query(createVendorTable);
    await db.query(createKegiatanTable);
    await db.query(createKendaraanTable);
    await db.query(createKeberangkatanTable);
    await db.query(createJadwalTable);

    console.log("✅ Semua tabel database berhasil dibuat");
  } catch (err) {
    console.error("❌ Gagal inisialisasi database:", err.message);
  }
};

module.exports = initDb;
