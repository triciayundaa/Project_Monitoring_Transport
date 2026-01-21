const db = require('../config/db');

// backend/controllers/vehicleController.js

// 1. GET TRANSPORTERS (Daftar Transporter beserta Jumlah Kendaraan)
exports.getTransporters = async (req, res) => {
  try {
    const query = `
      SELECT
        k.no_po,
        t.id AS transporter_id,
        t.nama_transporter,
        kt.status AS status_transporter,
        COUNT(DISTINCT ken.id) AS total_kendaraan_vendor
      FROM kegiatan k
      JOIN vendor v ON k.vendor_id = v.id
      JOIN kegiatan_transporter kt ON kt.kegiatan_id = k.id
      JOIN transporter t ON t.id = kt.transporter_id
      LEFT JOIN kendaraan ken ON ken.vendor_id = v.id
      GROUP BY k.no_po, t.id, kt.status
      ORDER BY k.no_po, t.nama_transporter
    `;

    const [rows] = await db.query(query);
    res.json(rows);

  } catch (error) {
    console.error("getTransporters ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// 2. GET VEHICLES BY PO (Detail Kendaraan berdasarkan No PO)
// Bisa menerima transporter_id='all' untuk menampilkan semua transporter
exports.getVehiclesByPo = async (req, res) => {
    const { no_po, transporter_id } = req.query;

    if (!no_po) {
        return res.status(400).json({ message: "no_po wajib" });
    }

    try {
        // Ambil kegiatan
        const [[kegiatan]] = await db.query(
            `SELECT id, vendor_id FROM kegiatan WHERE no_po = ?`,
            [no_po]
        );

        if (!kegiatan) return res.status(404).json({ message: "PO tidak ditemukan" });

        // Ambil list transporter untuk PO ini
        const [transporters] = await db.query(`
            SELECT t.id AS transporter_id, t.nama_transporter, kt.status AS status_transporter
            FROM kegiatan_transporter kt
            JOIN transporter t ON t.id = kt.transporter_id
            WHERE kt.kegiatan_id = ?
            ORDER BY t.nama_transporter
        `, [kegiatan.id]);

        let vehicles = [];

        if (!transporter_id || transporter_id === 'all') {
            // Ambil semua kendaraan dari semua transporter
            const [allVehicles] = await db.query(`
                SELECT ken.id, ken.plat_nomor, ken.status
                FROM kendaraan ken
                WHERE ken.vendor_id = ?
                ORDER BY ken.plat_nomor
            `, [kegiatan.vendor_id]);

            // Tandai penggunaan masing-masing kendaraan
            vehicles = allVehicles.map(v => {
                return {
                    ...v,
                    penggunaan: 'belum_digunakan'
                };
            });

        } else {
            // Ambil transporter spesifik
            const [[kt]] = await db.query(`
                SELECT id FROM kegiatan_transporter
                WHERE kegiatan_id = ? AND transporter_id = ?
            `, [kegiatan.id, transporter_id]);

            if (!kt) return res.status(404).json({ message: "Transporter tidak terdaftar di PO ini" });

            const [specificVehicles] = await db.query(`
                SELECT ken.id, ken.plat_nomor, ken.status,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM keberangkatan_truk kbt
                            WHERE kbt.kendaraan_id = ken.id
                            AND kbt.kegiatan_transporter_id = ?
                        )
                        THEN 'digunakan'
                        ELSE 'belum_digunakan'
                    END AS penggunaan
                FROM kendaraan ken
                WHERE ken.vendor_id = ?
                ORDER BY ken.plat_nomor
            `, [kt.id, kegiatan.vendor_id]);

            vehicles = specificVehicles;
        }

        res.json({
            no_po,
            transporters,
            vehicles
        });

    } catch (error) {
        console.error("getVehiclesByPo ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};


// 3. ADD VEHICLE (Tambah Kendaraan Baru)
exports.addVehicle = async (req, res) => {
  const { no_po, nopol } = req.body;

  if (!no_po || !nopol) {
    return res.status(400).json({ message: "no_po dan nopol wajib" });
  }

  try {
    const [[kegiatan]] = await db.query(
      `SELECT vendor_id FROM kegiatan WHERE no_po = ?`,
      [no_po]
    );

    if (!kegiatan) {
      return res.status(404).json({ message: "PO tidak ditemukan" });
    }

    await db.query(`
      INSERT INTO kendaraan (vendor_id, plat_nomor, status)
      VALUES (?, ?, 'aktif')
    `, [kegiatan.vendor_id, nopol]);

    res.status(201).json({ message: "Kendaraan berhasil ditambahkan" });

  } catch (error) {
    console.error("addVehicle ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// 4. DELETE VEHICLE (Hapus Kendaraan)
exports.deleteVehicle = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM kendaraan WHERE id = ?', [id]);
        res.json({ message: 'Kendaraan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 

// 5. UPDATE VEHICLE (Edit Nopol)
exports.updateVehicle = async (req, res) => {
    const { id } = req.params; 
    const { nopol } = req.body; 

    if (!nopol) {
        return res.status(400).json({ message: 'Nopol baru harus diisi' });
    }

    try {
        // Gunakan nama kolom baru 'plat_nomor'
        const query = 'UPDATE kendaraan SET plat_nomor = ? WHERE id = ?';
        const [result] = await db.query(query, [nopol, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Data kendaraan tidak ditemukan' });
        }

        res.status(200).json({ message: 'Nopol berhasil diperbarui' });
    } catch (error) {
        console.error("Kesalahan Update Database:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// 6. GET TRANSPORTERS BY PO (List Transporter untuk satu PO)
exports.getTransportersByPo = async (req, res) => {
  const { no_po } = req.params;

  try {
    const [[kegiatan]] = await db.query(
      `SELECT id, vendor_id FROM kegiatan WHERE no_po = ?`,
      [no_po]
    );

    if (!kegiatan) {
      return res.status(404).json({ message: "PO tidak ditemukan" });
    }

    const [transporters] = await db.query(`
      SELECT 
        t.id AS transporter_id,
        t.nama_transporter,
        kt.status AS status_transporter
      FROM kegiatan_transporter kt
      JOIN transporter t ON t.id = kt.transporter_id
      WHERE kt.kegiatan_id = ?
      ORDER BY t.nama_transporter
    `, [kegiatan.id]);

    res.json({
      no_po,
      vendor_id: kegiatan.vendor_id,
      transporters
    });

  } catch (error) {
    console.error("getTransportersByPo ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
// 0. GET ALL VEHICLES (UNTUK AUTOCOMPLETE)
exports.getAllVehicles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, plat_nomor 
      FROM kendaraan
      ORDER BY plat_nomor
    `);

    res.json(rows);
  } catch (error) {
    console.error("getAllVehicles ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
