const db = require('../config/db');

// backend/controllers/vehicleController.js

// 1. GET TRANSPORTERS (Daftar Transporter beserta Jumlah Kendaraan)
exports.getTransporters = async (req, res) => {
    try {
        // Query disesuaikan dengan relasi baru: Kegiatan -> Vendor <- Kendaraan
        // Kita hitung jumlah kendaraan berdasarkan vendor yang sama
        const query = `
            SELECT 
                k.no_po, 
                k.transporter, 
                COUNT(ken.id) AS totalVehicles 
            FROM kegiatan k
            LEFT JOIN vendor v ON k.vendor_id = v.id
            LEFT JOIN kendaraan ken ON v.id = ken.vendor_id
            GROUP BY k.no_po, k.transporter
        `;
        
        const [rows] = await db.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Kesalahan Database:", error.message); 
        res.status(500).json({ 
            message: "Gagal mengambil data transporter", 
            error: error.message 
        });
    }
};

// 2. GET VEHICLES BY PO (Detail Kendaraan berdasarkan No PO)
exports.getVehiclesByPo = async (req, res) => {
    const { no_po } = req.params;
    try {
        // 1. Cari Vendor ID dari Kegiatan berdasarkan No PO
        const [kegiatan] = await db.query('SELECT vendor_id, transporter FROM kegiatan WHERE no_po = ?', [no_po]);
        
        if (kegiatan.length === 0) {
            return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
        }

        const vendorId = kegiatan[0].vendor_id;
        const transporterName = kegiatan[0].transporter;

        // 2. Ambil Kendaraan berdasarkan Vendor ID
        // Perhatikan: Kolom 'plat_nomor' adalah nama baru untuk 'nopol'
        const [vehicles] = await db.query('SELECT id, plat_nomor as nopol, status FROM kendaraan WHERE vendor_id = ?', [vendorId]);
        
        res.json({
            transporter: transporterName,
            vehicles: vehicles
        });
    } catch (error) {
        console.error("Error getVehiclesByPo:", error);
        res.status(500).json({ message: error.message });
    }
};

// 3. ADD VEHICLE (Tambah Kendaraan Baru)
exports.addVehicle = async (req, res) => {
    const { no_po, nopol } = req.body; // Frontend lama mengirim 'nopol' dan 'no_po'
    
    if (!no_po || !nopol) {
        return res.status(400).json({ message: 'No PO dan Nopol harus diisi' });
    }

    try {
        // 1. Cari Vendor ID dari No PO
        const [kegiatan] = await db.query('SELECT vendor_id FROM kegiatan WHERE no_po = ? LIMIT 1', [no_po]);
        
        if (kegiatan.length === 0) {
            return res.status(404).json({ message: 'No PO tidak valid / Kegiatan tidak ditemukan' });
        }

        const vendorId = kegiatan[0].vendor_id;

        // 2. Insert ke Tabel Kendaraan (gunakan kolom baru: 'plat_nomor')
        await db.query('INSERT INTO kendaraan (vendor_id, plat_nomor, status) VALUES (?, ?, ?)', [vendorId, nopol, 'aktif']);
        
        res.status(201).json({ message: 'Kendaraan berhasil ditambahkan' });
    } catch (error) {
        console.error("Error addVehicle:", error);
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