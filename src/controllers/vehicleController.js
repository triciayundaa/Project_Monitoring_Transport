const db = require('../config/db');

// backend/controllers/vehicleController.js

// backend/controllers/vehicleController.js

exports.getTransporters = async (req, res) => {
    try {
        const query = `
            SELECT 
                k.no_po, 
                k.transporter, 
                COUNT(ken.id) AS totalVehicles 
            FROM kegiatan k
            LEFT JOIN kendaraan ken ON k.no_po = ken.no_po
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

// --- FUNGSI LAINNYA ---
exports.getVehiclesByPo = async (req, res) => {
    const { no_po } = req.params;
    try {
        const [vehicles] = await db.query('SELECT * FROM kendaraan WHERE no_po = ?', [no_po]);
        const [kegiatan] = await db.query('SELECT transporter FROM kegiatan WHERE no_po = ?', [no_po]);
        
        res.json({
            transporter: kegiatan[0]?.transporter || '',
            vehicles: vehicles
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addVehicle = async (req, res) => {
    const { no_po, nopol } = req.body;
    if (!no_po || !nopol) {
        return res.status(400).json({ message: 'No PO dan Nopol harus diisi' });
    }
    try {
        await db.query('INSERT INTO kendaraan (no_po, nopol) VALUES (?, ?)', [no_po, nopol]);
        res.status(201).json({ message: 'Nopol berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteVehicle = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM kendaraan WHERE id = ?', [id]);
        res.json({ message: 'Nopol berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 

const saveAllVehicles = async () => {
    try {
        setLoading(true);
        // Kirim semua nopol sekaligus ke database
        await Promise.all(
            tempNopolList.map(nopol => 
                axios.post('http://localhost:3000/api/vehicles/add', { no_po: noPo, nopol: nopol })
            )
        );
        setIsModalOpen(false); // Tutup modal input
        setIsSuccessModalOpen(true); // Munculkan pop-up centang sukses (Gambar 2)
        fetchVehicleData(); // Update tabel di halaman detail
    } catch (error) {
        alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
        setLoading(false);
    }
};

exports.updateVehicle = async (req, res) => {
    const { id } = req.params; // Mengambil ID dari URL
    const { nopol } = req.body; // Mengambil Nopol baru dari body request

    if (!nopol) {
        return res.status(400).json({ message: 'Nopol baru harus diisi' });
    }

    try {
        const query = 'UPDATE kendaraan SET nopol = ? WHERE id = ?';
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