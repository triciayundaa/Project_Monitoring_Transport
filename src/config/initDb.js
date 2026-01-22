const db = require('./db');
const bcrypt = require('bcryptjs');

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

    // ================= 2. SHIFT =================
    const createShiftTable = `
      CREATE TABLE IF NOT EXISTS shift (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_shift ENUM('Shift 1', 'Shift 2', 'Shift 3', 'Libur') NOT NULL
      );
    `;

    // ================= 3. VENDOR =================
    const createVendorTable = `
      CREATE TABLE IF NOT EXISTS vendor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_vendor VARCHAR(100) NOT NULL
      );
    `;

    // ================= 4. TRANSPORTER =================
    const createTransporterTable = `
      CREATE TABLE IF NOT EXISTS transporter (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_transporter VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // ================= 5. KEGIATAN (PO) =================
    const createKegiatanTable = `
      CREATE TABLE IF NOT EXISTS kegiatan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_po VARCHAR(50) UNIQUE,
        vendor_id INT,
        nama_kapal VARCHAR(100),
        material VARCHAR(100),
        incoterm VARCHAR(20),
        no_bl VARCHAR(50),
        quantity DECIMAL(10,4),
        tanggal_mulai DATE,
        tanggal_selesai DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendor(id)
      );
    `;

    // ================= 6. KEGIATAN - TRANSPORTER =================
    const createKegiatanTransporterTable = `
      CREATE TABLE IF NOT EXISTS kegiatan_transporter (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_id INT NOT NULL,
        transporter_id INT NOT NULL,
        status ENUM('Waiting', 'On Progress', 'Completed') DEFAULT 'Waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id),
        FOREIGN KEY (transporter_id) REFERENCES transporter(id),
        UNIQUE KEY uniq_kegiatan_transporter (kegiatan_id, transporter_id)
      );
    `;

    // ================= 7. KENDARAAN =================
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

    // ================= 8. KEBERANGKATAN TRUK =================
    // (BELUM pakai kegiatan_transporter sesuai permintaan)
    const createKeberangkatanTable = `
  CREATE TABLE IF NOT EXISTS keberangkatan_truk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kegiatan_transporter_id INT NOT NULL,
    kendaraan_id INT NOT NULL,
    email_user VARCHAR(100) NOT NULL,
    shift_id INT NOT NULL,
    tanggal DATE NOT NULL,
    keterangan TEXT,
    no_seri_pengantar VARCHAR(50),
    foto_truk LONGTEXT,
    foto_surat LONGTEXT,
    status ENUM('Valid', 'Tolak') DEFAULT 'Valid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (kegiatan_transporter_id)
      REFERENCES kegiatan_transporter(id),

    FOREIGN KEY (kendaraan_id)
      REFERENCES kendaraan(id),

    FOREIGN KEY (email_user)
      REFERENCES users(email),

    FOREIGN KEY (shift_id)
      REFERENCES shift(id)
  );
`;

    // ================= 9. JADWAL SHIFT =================
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

    // ================= 10. LAPORAN =================
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

    // ================= EKSEKUSI =================
    await db.query(createUsersTable);
    await db.query(createShiftTable);
    await db.query(createVendorTable);
    await db.query(createTransporterTable);
    await db.query(createKegiatanTable);
    await db.query(createKegiatanTransporterTable);
    await db.query(createKendaraanTable);
    await db.query(createKeberangkatanTable);
    await db.query(createJadwalTable);
    await db.query(createReportTable);

    console.log("✅ Semua tabel berhasil dibuat");

    // ================= SEED USERS =================
    const [cekUser] = await db.query(
      "SELECT email FROM users WHERE email = 'admin1234@gmail.com'"
    );

    if (cekUser.length === 0) {
      const hashAdmin = await bcrypt.hash('admin123', 10);
      const hashPersonil = await bcrypt.hash('123456', 10);

      await db.query(`
        INSERT INTO users (email, nama, password, no_telp, role) VALUES
        ('admin1234@gmail.com', 'Admin Sistem', '${hashAdmin}', '081234567890', 'admin'),
        ('personila@semenpadang.co.id', 'Personil A', '${hashPersonil}', '0822222222', 'personil'),
        ('personilb@semenpadang.co.id', 'Personil B', '${hashPersonil}', '0833333333', 'personil'),
        ('personilc@semenpadang.co.id', 'Personil C', '${hashPersonil}', '0844444444', 'personil'),
        ('personild@semenpadang.co.id', 'Personil D', '${hashPersonil}', '0855555555', 'personil');
      `);
    }

    // ================= SEED SHIFT =================
    const [cekShift] = await db.query("SELECT id FROM shift");
    if (cekShift.length === 0) {
      await db.query(`
        INSERT INTO shift (nama_shift)
        VALUES ('Shift 1'), ('Shift 2'), ('Shift 3'), ('Libur')
      `);
    }

  } catch (err) {
    console.error("❌ Gagal inisialisasi database:", err.message);
  }
};

module.exports = initDb;
