const db = require('../config/db');

// 1. GET TRANSPORTERS (Daftar Transporter beserta Jumlah Kendaraan)
exports.getTransporters = async (req, res) => {
  try {
    const query = `
      SELECT
        k.no_po,
        t.id AS transporter_id,
        t.nama_transporter,
        kt.status AS status_transporter,
        -- Menghitung kendaraan yang spesifik milik transporter tersebut
        (SELECT COUNT(*) FROM kendaraan ken WHERE ken.transporter_id = t.id) AS total_kendaraan_vendor
      FROM kegiatan k
      JOIN kegiatan_transporter kt ON kt.kegiatan_id = k.id
      JOIN transporter t ON t.id = kt.transporter_id
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

// 2. GET VEHICLES BY PO (Detail Kendaraan berdasarkan No PO dan Filter Transporter)
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

        const [transporters] = await db.query(`
            SELECT t.id AS transporter_id, t.nama_transporter, kt.status AS status_transporter
            FROM kegiatan_transporter kt
            JOIN transporter t ON t.id = kt.transporter_id
            WHERE kt.kegiatan_id = ?
            ORDER BY t.nama_transporter
        `, [kegiatan.id]);

        let vehicles = [];

        // PERBAIKAN LOGIKA: Filter kendaraan berdasarkan Transporter, bukan Vendor PO
        if (!transporter_id || transporter_id === 'all') {
            const [allVehicles] = await db.query(`
                SELECT ken.id, ken.plat_nomor, ken.status, t.nama_transporter as nama_milik
                FROM kendaraan ken
                JOIN transporter t ON ken.transporter_id = t.id
                JOIN kegiatan_transporter kt ON kt.transporter_id = t.id
                WHERE kt.kegiatan_id = ?
                ORDER BY ken.plat_nomor
            `, [kegiatan.id]);

            vehicles = allVehicles.map(v => ({
                ...v,
                penggunaan: 'belum_digunakan' 
            }));
        } else {
            // Mengambil kendaraan HANYA yang terikat dengan transporter_id tersebut
            const [specificVehicles] = await db.query(`
                SELECT ken.id, ken.plat_nomor, ken.status,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM keberangkatan_truk kbt
                            JOIN kegiatan_transporter kt_check ON kbt.kegiatan_transporter_id = kt_check.id
                            WHERE kbt.kendaraan_id = ken.id
                            AND kt_check.kegiatan_id = ? 
                            AND kt_check.transporter_id = ?
                        )
                        THEN 'digunakan'
                        ELSE 'belum_digunakan'
                    END AS penggunaan
                FROM kendaraan ken
                WHERE ken.transporter_id = ?
                ORDER BY ken.plat_nomor
            `, [kegiatan.id, transporter_id, transporter_id]);

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

exports.addVehicle = async (req, res) => {
    const { nopol, transporter_id } = req.body; 

    // 1. Validasi Panjang Karakter
    if (nopol && nopol.length > 15) {
        return res.status(400).json({ 
            message: "Gagal: Nomor Polisi tidak boleh lebih dari 15 karakter." 
        });
    }

    // 2. Validasi Kelengkapan Data
    if (!transporter_id || !nopol) {
        return res.status(400).json({ message: "Transporter dan nopol wajib diisi" });
    }

    try {
        await db.query(`
            INSERT INTO kendaraan (transporter_id, plat_nomor, status)
            VALUES (?, ?, 'aktif')
        `, [transporter_id, nopol]);

        res.status(201).json({ message: "Kendaraan berhasil didaftarkan ke transporter ini" });
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