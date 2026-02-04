const db = require('./db');
const bcrypt = require('bcryptjs');

const initDb = async () => {
  try {
    console.log("Starting Database Initialization...");

    // 1. USERS
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(100) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        no_telp VARCHAR(15),
        role ENUM('admin', 'personil', 'patroler') NOT NULL
      ) ENGINE=InnoDB;
    `);

    // 2. SHIFT
    await db.query(`
      CREATE TABLE IF NOT EXISTS shift (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_shift ENUM('Shift 1', 'Shift 2', 'Shift 3', 'Libur') NOT NULL
      ) ENGINE=InnoDB;
    `);

    // 3. VENDOR
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_vendor VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB;
    `);

    // 4. TRANSPORTER
    await db.query(`
      CREATE TABLE IF NOT EXISTS transporter (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_transporter VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 5. KEGIATAN (PO)
    await db.query(`
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
        FOREIGN KEY (vendor_id) REFERENCES vendor(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // 6. KEGIATAN_TRANSPORTER
    await db.query(`
      CREATE TABLE IF NOT EXISTS kegiatan_transporter (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_id INT NOT NULL,
        transporter_id INT NOT NULL,
        status ENUM('Waiting', 'On Progress', 'Completed') DEFAULT 'Waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id) ON DELETE CASCADE,
        FOREIGN KEY (transporter_id) REFERENCES transporter(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_keg_trans (kegiatan_id, transporter_id)
      ) ENGINE=InnoDB;
    `);

    // 7. KENDARAAN
    await db.query(`
      CREATE TABLE IF NOT EXISTS kendaraan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transporter_id INT NOT NULL,
        plat_nomor VARCHAR(20) NOT NULL,
        status ENUM('aktif', 'non-aktif') DEFAULT 'aktif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transporter_id) REFERENCES transporter(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_nopol_per_transporter (plat_nomor, transporter_id)
      ) ENGINE=InnoDB;
    `);

    // 8. KEGIATAN_KENDARAAN
    await db.query(`
      CREATE TABLE IF NOT EXISTS kegiatan_kendaraan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_transporter_id INT NOT NULL,
        kendaraan_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kegiatan_transporter_id) REFERENCES kegiatan_transporter(id) ON DELETE CASCADE,
        FOREIGN KEY (kendaraan_id) REFERENCES kendaraan(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_kegiatan_nopol (kegiatan_transporter_id, kendaraan_id)
      ) ENGINE=InnoDB;
    `);

    // 9. KEBERANGKATAN_TRUK
    await db.query(`
      CREATE TABLE IF NOT EXISTS keberangkatan_truk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_kendaraan_id INT NOT NULL,
        email_user VARCHAR(100) NOT NULL,
        shift_id INT NOT NULL,
        tanggal DATE NOT NULL,
        keterangan TEXT,
        no_seri_pengantar VARCHAR(50),
        foto_truk VARCHAR(255),
        foto_surat VARCHAR(255),
        status ENUM('Valid', 'Tolak') DEFAULT 'Valid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kegiatan_kendaraan_id) REFERENCES kegiatan_kendaraan(id) ON DELETE CASCADE,
        FOREIGN KEY (email_user) REFERENCES users(email) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shift(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 10. JADWAL_SHIFT
    await db.query(`
      CREATE TABLE IF NOT EXISTS jadwal_shift (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        email_user VARCHAR(100) NOT NULL,
        shift_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (email_user) REFERENCES users(email) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shift(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_jadwal_user (tanggal, email_user, shift_id)
      ) ENGINE=InnoDB;
    `);

    // ============================================================
    // 11. PEMBERSIHAN_JALAN (HEADER / DATA UTAMA) - DIPERBAIKI
    // ============================================================
    // UPDATE: Menambahkan kolom nama_petugas, no_telp_petugas, lokasi_pembersihan
    await db.query(`
      CREATE TABLE IF NOT EXISTS pembersihan_jalan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_transporter_id INT NOT NULL,
        email_patroler VARCHAR(100) NOT NULL,
        nama_petugas VARCHAR(100),       
        no_telp_petugas VARCHAR(20),     
        lokasi_pembersihan TEXT,         
        status ENUM('Draft', 'Completed') DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_bersih_kt FOREIGN KEY (kegiatan_transporter_id) REFERENCES kegiatan_transporter(id) ON DELETE CASCADE,
        CONSTRAINT fk_bersih_patroler FOREIGN KEY (email_patroler) REFERENCES users(email) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 11.A PEMBERSIHAN_TRUK (DETAIL TRUK AIR)
    await db.query(`
      CREATE TABLE IF NOT EXISTS pembersihan_truk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pembersihan_id INT NOT NULL,
        plat_nomor VARCHAR(20) NOT NULL,
        foto_truk TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pembersihan_id) REFERENCES pembersihan_jalan(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 11.B PEMBERSIHAN_FOTO (DOKUMENTASI KEGIATAN)
    await db.query(`
      CREATE TABLE IF NOT EXISTS pembersihan_foto (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pembersihan_id INT NOT NULL,
        tahap ENUM('sebelum', 'sedang', 'setelah') NOT NULL,
        foto_path TEXT NOT NULL,
        jam_foto DATETIME,
        lokasi_foto TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pembersihan_id) REFERENCES pembersihan_jalan(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    // ============================================================


    // 12. LAPORAN
    await db.query(`
      CREATE TABLE IF NOT EXISTS laporan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judul VARCHAR(255) NOT NULL,
        tipe_laporan ENUM('Mingguan', 'Bulanan', 'Inventaris', 'Lainnya') DEFAULT 'Lainnya',
        file_path VARCHAR(255) NOT NULL,
        dibuat_oleh VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    console.log("✅ Database Clean Build: Success!");

    // ================= SEED DATA =================
    const hashAdmin = await bcrypt.hash('admin123', 10);
    const hashPersonil = await bcrypt.hash('123456', 10);
    const hashPatroler = await bcrypt.hash('patroler123', 10);

    await db.query(`
      INSERT IGNORE INTO users (email, nama, password, no_telp, role) VALUES
      ('admin1234@gmail.com', 'Admin Sistem', '${hashAdmin}', '081234567890', 'admin'),
      ('personila@semenpadang.co.id', 'Personil A', '${hashPersonil}', '0822222222', 'personil'),
      ('personilb@semenpadang.co.id', 'Personil B', '${hashPersonil}', '0833333333', 'personil'),
      ('personilc@semenpadang.co.id', 'Personil C', '${hashPersonil}', '0844444444', 'personil'),
      ('personild@semenpadang.co.id', 'Personil D', '${hashPersonil}', '0855555555', 'personil'),
      ('patrolerA@gmail.com', 'PatrolerA', '${hashPatroler}', '0899999999', 'patroler')
    `);

    const [cekShift] = await db.query("SELECT id FROM shift");
    if (cekShift.length === 0) {
      await db.query(`INSERT INTO shift (nama_shift) VALUES ('Shift 1'), ('Shift 2'), ('Shift 3'), ('Libur')`);
    }

    console.log("✅ Seed Data: Success!");

  } catch (err) {
    console.error("❌ Gagal inisialisasi database:", err.message);
  }
};

module.exports = initDb;