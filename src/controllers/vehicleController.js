const db = require('../config/db');

// 1. GET ALL TRANSPORTERS
exports.getTransporters = async (req, res) => {
  try {
    const query = `
      SELECT
        k.no_po,
        t.id AS transporter_id,
        t.nama_transporter,
        kt.status AS status_transporter,
        -- MENGHITUNG UNIT YANG DIALOKASIKAN KHUSUS UNTUK PO + TRANSPORTER INI
        (SELECT COUNT(*) 
         FROM kegiatan_kendaraan kk 
         WHERE kk.kegiatan_transporter_id = kt.id) AS total_kendaraan_vendor
      FROM kegiatan k
      JOIN kegiatan_transporter kt ON kt.kegiatan_id = k.id
      JOIN transporter t ON t.id = kt.transporter_id
      ORDER BY k.no_po, t.nama_transporter
    `;

    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. GET VEHICLES BY PO (DIPERBARUI: Sesuaikan Cek Penggunaan dengan DB Baru)
exports.getVehiclesByPo = async (req, res) => {
    const { noPo } = req.params; 
    const { transporter_id } = req.query;

    if (!noPo) {
        return res.status(400).json({ message: "no_po wajib" });
    }

    try {
        const [[kegiatan]] = await db.query(
            `SELECT id, vendor_id FROM kegiatan WHERE no_po = ?`,
            [noPo]
        );

        if (!kegiatan) return res.status(404).json({ message: "PO tidak ditemukan" });

        // Ambil ID kegiatan_transporter untuk filter alokasi
        const [[ktRecord]] = await db.query(
            `SELECT id FROM kegiatan_transporter WHERE kegiatan_id = ? AND transporter_id = ?`,
            [kegiatan.id, transporter_id]
        );

        const [transporters] = await db.query(`
            SELECT t.id AS transporter_id, t.nama_transporter, kt.status AS status_transporter
            FROM kegiatan_transporter kt
            JOIN transporter t ON t.id = kt.transporter_id
            WHERE kt.kegiatan_id = ?
            ORDER BY t.nama_transporter
        `, [kegiatan.id]);

        let vehicles = [];

        // Jika filter 'all', ambil semua kendaraan yang teralokasi di PO ini
        if (!transporter_id || transporter_id === 'all') {
            const [allVehicles] = await db.query(`
                SELECT kk.id, ken.plat_nomor, ken.status, t.nama_transporter as nama_milik
                FROM kegiatan_kendaraan kk
                JOIN kendaraan ken ON kk.kendaraan_id = ken.id
                JOIN transporter t ON ken.transporter_id = t.id
                JOIN kegiatan_transporter kt ON kk.kegiatan_transporter_id = kt.id
                WHERE kt.kegiatan_id = ?
                ORDER BY ken.plat_nomor
            `, [kegiatan.id]);
            vehicles = allVehicles;
        } else {
            // Ambil kendaraan yang teralokasi KHUSUS untuk transporter ini di PO ini
            // 🔥 PERBAIKAN QUERY DISINI: Cek keberangkatan_truk pakai kegiatan_kendaraan_id
            const [specificVehicles] = await db.query(`
                SELECT kk.id, ken.plat_nomor, ken.status,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM keberangkatan_truk kbt
                            WHERE kbt.kegiatan_kendaraan_id = kk.id
                        )
                        THEN 'digunakan'
                        ELSE 'belum_digunakan'
                    END AS penggunaan
                FROM kegiatan_kendaraan kk
                JOIN kendaraan ken ON kk.kendaraan_id = ken.id
                WHERE kk.kegiatan_transporter_id = ?
                ORDER BY ken.plat_nomor
            `, [ktRecord?.id || 0]);
            vehicles = specificVehicles;
        }

        res.json({
            no_po: noPo,
            transporters,
            vehicles
        });

    } catch (error) {
        console.error("getVehiclesByPo ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 3. ADD VEHICLE (DIPERBARUI: Simpan ke Master jika baru, lalu Alokasikan ke PO)
exports.addVehicle = async (req, res) => {
    const { nopol, transporter_id, no_po } = req.body; 

    if (!transporter_id || !nopol || !no_po) {
        return res.status(400).json({ message: "Data tidak lengkap" });
    }

    try {
        // 1. Dapatkan ID kegiatan_transporter
        const [[ktRecord]] = await db.query(
            `SELECT kt.id FROM kegiatan_transporter kt 
             JOIN kegiatan k ON kt.kegiatan_id = k.id 
             WHERE k.no_po = ? AND kt.transporter_id = ?`,
            [no_po, transporter_id]
        );

        if (!ktRecord) return res.status(404).json({ message: "Relasi PO dan Transporter tidak ditemukan" });

        // 2. Cek/Simpan ke Master Kendaraan
        let [[vehicle]] = await db.query(
            "SELECT id FROM kendaraan WHERE plat_nomor = ? AND transporter_id = ?",
            [nopol, transporter_id]
        );

        let vehicleId;
        if (!vehicle) {
            const [newVehicle] = await db.query(
                "INSERT INTO kendaraan (transporter_id, plat_nomor, status) VALUES (?, ?, 'aktif')",
                [transporter_id, nopol]
            );
            vehicleId = newVehicle.insertId;
        } else {
            vehicleId = vehicle.id;
        }

        // 3. Alokasikan ke PO (Tabel kegiatan_kendaraan)
        await db.query(
            "INSERT IGNORE INTO kegiatan_kendaraan (kegiatan_transporter_id, kendaraan_id) VALUES (?, ?)",
            [ktRecord.id, vehicleId]
        );

        res.status(201).json({ message: "Kendaraan berhasil dialokasikan ke PO ini" });
    } catch (error) {
        console.error("addVehicle ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 4. DELETE VEHICLE (DIPERBARUI: Hanya hapus alokasi di PO ini, bukan master kendaraan)
exports.deleteVehicle = async (req, res) => {
    const { id } = req.params; // ID dari tabel kegiatan_kendaraan
    try {
        await db.query('DELETE FROM kegiatan_kendaraan WHERE id = ?', [id]);
        res.json({ message: 'Kendaraan dilepas dari PO ini' });
    } catch (error) {
        console.error("deleteVehicle ERROR:", error);
        res.status(500).json({ message: error.message });
    }
}; 

// 5. UPDATE VEHICLE (DIPERBARUI: Mengubah nopol di Master Katalog)
exports.updateVehicle = async (req, res) => {
    const { id } = req.params; // ID dari kegiatan_kendaraan
    const { nopol } = req.body; 

    try {
        // Ambil kendaraan_id dari alokasi
        const [[kkRecord]] = await db.query("SELECT kendaraan_id FROM kegiatan_kendaraan WHERE id = ?", [id]);
        if (!kkRecord) return res.status(404).json({ message: 'Data tidak ditemukan' });

        // Update di tabel Master Kendaraan
        await db.query("UPDATE kendaraan SET plat_nomor = ? WHERE id = ?", [nopol, kkRecord.kendaraan_id]);

        res.status(200).json({ message: 'Nopol katalog berhasil diperbarui' });
    } catch (error) {
        console.error("updateVehicle ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 6. GET TRANSPORTERS BY PO
exports.getTransportersByPo = async (req, res) => {
  const { no_po } = req.params;
  try {
    const [[kegiatan]] = await db.query(`SELECT id, vendor_id FROM kegiatan WHERE no_po = ?`, [no_po]);
    if (!kegiatan) return res.status(404).json({ message: "PO tidak ditemukan" });

    const [transporters] = await db.query(`
      SELECT t.id AS transporter_id, t.nama_transporter, kt.status AS status_transporter
      FROM kegiatan_transporter kt
      JOIN transporter t ON t.id = kt.transporter_id
      WHERE kt.kegiatan_id = ?
      ORDER BY t.nama_transporter
    `, [kegiatan.id]);

    res.json({ no_po, vendor_id: kegiatan.vendor_id, transporters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 0. GET MASTER ASSET (FUNGSI BARU: Untuk menarik daftar asset lama si transporter)
exports.getMasterAsset = async (req, res) => {
    const { transporterId } = req.params;
    try {
        const [rows] = await db.query(
            "SELECT id, plat_nomor FROM kendaraan WHERE transporter_id = ? ORDER BY plat_nomor",
            [transporterId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. ASSIGN MASSAL DARI MASTER (FUNGSI BARU: Untuk checklist asset lama)
exports.assignFromMaster = async (req, res) => {
    const { transporter_id, no_po, vehicle_ids } = req.body;
    try {
        const [[ktRecord]] = await db.query(
            `SELECT kt.id FROM kegiatan_transporter kt 
             JOIN kegiatan k ON kt.kegiatan_id = k.id 
             WHERE k.no_po = ? AND kt.transporter_id = ?`,
            [no_po, transporter_id]
        );

        if (!ktRecord) return res.status(404).json({ message: "Relasi tidak ditemukan" });

        const values = vehicle_ids.map(vId => [ktRecord.id, vId]);
        await db.query("INSERT IGNORE INTO kegiatan_kendaraan (kegiatan_transporter_id, kendaraan_id) VALUES ?", [values]);

        res.json({ message: "Asset berhasil ditambahkan ke PO ini" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};